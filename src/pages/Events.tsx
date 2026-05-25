import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamEvent, UserProfile, Payment, Submission, Question, OperationType } from '../types';
import { Calendar, Clock, Trophy, Users, CreditCard, CheckCircle2, AlertCircle, Play, Edit, Trash2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError } from '../lib/error-handler';
import { MathRenderer } from '../components/MathRenderer';

interface EventsProps {
  profile: UserProfile | null;
}

export default function Events({ profile }: EventsProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ExamEvent | null>(null);
  const [paymentData, setPaymentData] = useState({
    method: 'Bkash',
    trxId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ongoing' | 'upcoming' | 'ended'>('ongoing');
  const [activeClass, setActiveClass] = useState<string>('All');

  // Admin States
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExamEvent | null>(null);
  const [eventData, setEventData] = useState<Partial<ExamEvent>>({});
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamEvent));
      setEvents(fetchedEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'payments'), where('uid', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setUserPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'submissions'), where('uid', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setUserSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));
    });
    return () => unsub();
  }, [profile]);

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!eventData.questions || eventData.questions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    try {
      await updateDoc(doc(db, 'events', editingEvent.id), eventData);
      setShowEditForm(false);
      setEditingEvent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${editingEvent.id}`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  };

  const startEdit = (event: ExamEvent) => {
    setEditingEvent(event);
    setEventData({ ...event });
    setShowEditForm(true);
  };

  const addOrUpdateQuestion = () => {
    if (!currentQuestion.text || currentQuestion.options?.some(o => !o)) {
      alert('Please fill in question text and all options.');
      return;
    }

    if (editingQuestionIndex !== null) {
      const updatedQuestions = [...(eventData.questions || [])];
      updatedQuestions[editingQuestionIndex] = {
        ...updatedQuestions[editingQuestionIndex],
        ...currentQuestion,
      } as Question;
      
      setEventData(prev => ({
        ...prev,
        questions: updatedQuestions
      }));
      setEditingQuestionIndex(null);
    } else {
      const newQuestion: Question = { 
        ...currentQuestion,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      } as Question;
      
      setEventData(prev => ({
        ...prev,
        questions: [...(prev.questions || []), newQuestion]
      }));
    }

    setCurrentQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    });
  };

  const handleEditQuestion = (index: number) => {
    const q = eventData.questions![index];
    setCurrentQuestion({
      text: q.text,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
    });
    setEditingQuestionIndex(index);
  };

  const removeQuestion = (index: number) => {
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
      setCurrentQuestion({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      });
    }
    setEventData(prev => ({
      ...prev,
      questions: (prev.questions || []).filter((_, i) => i !== index)
    }));
  };

  const getEventTimeStatus = (event: ExamEvent) => {
    const category = getCategory(event);
    if (category === 'upcoming') return 'Coming Soon';
    if (category === 'ended') return 'Time Up';
    return 'Ongoing';
  };

  const getCategory = (event: ExamEvent) => {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : new Date(startTime.getTime() + event.duration * 60000);

    if (now < startTime) return 'upcoming';
    if (now > endTime) return 'ended';
    return 'ongoing';
  };

  const filteredEvents = events.filter(e => {
    const isCategoryMatch = getCategory(e) === activeCategory;
    const isClassMatch = activeClass === 'All' || e.class === activeClass;
    return isCategoryMatch && isClassMatch;
  });

  const getRegistrationStatus = (eventId: string) => {
    const payment = userPayments.find(p => p.eventId === eventId);
    if (!payment) return 'none';
    return payment.status;
  };

  const hasSubmitted = (eventId: string) => {
    return userSubmissions.some(s => s.eventId === eventId && s.completed);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedEvent) return;

    setSubmitting(true);
    setError('');
    try {
      const newPayment: Omit<Payment, 'id'> = {
        uid: profile.uid,
        eventId: selectedEvent.id,
        method: paymentData.method,
        trxId: paymentData.trxId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      // Save to Firestore
      await addDoc(collection(db, 'payments'), newPayment);

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Failed to submit registration. Please try again.');
      handleFirestoreError(err, OperationType.CREATE, 'payments');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-32 text-slate-500 font-bold uppercase tracking-[0.3em] bg-slate-900 rounded-[3rem] border border-slate-800 shadow-inner flex flex-col items-center justify-center space-y-6">
    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
    <span>Loading Secure Data</span>
  </div>;

  return (
    <div className="space-y-12">
      <header className="relative overflow-hidden bg-slate-900 p-8 sm:p-14 md:p-20 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl border border-slate-800 text-center group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-5 py-2 bg-amber-500/10 text-[#D4AF37] border border-amber-500/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-6 shadow-lg"
          >
            Numinous Arena
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 font-serif leading-tight tracking-tight">
            Academic <span className="text-[#D4AF37]">Events</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Challenge your limits, earn prestigious recognition, and prepare for the world's most competitive examinations.
          </p>
        </div>
        
        {/* Background Decorative */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
          <Calendar className="w-full h-full text-white" />
        </div>
      </header>

      <div className="flex flex-col items-center space-y-8 bg-slate-950 p-6 sm:p-10 rounded-[3rem] border border-slate-900 shadow-inner">
        <div className="inline-flex p-1.5 bg-slate-900 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-slate-800">
          {(['ongoing', 'upcoming', 'ended'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 sm:px-10 py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all relative ${
                activeCategory === cat 
                  ? 'bg-gradient-to-r from-amber-600 to-[#D4AF37] text-slate-950 shadow-xl' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {['All', 'Class 9', 'Class 10', 'SSC Candidate', 'College Admission'].map((c) => (
            <button
              key={c}
              onClick={() => setActiveClass(c)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                activeClass === c 
                  ? 'bg-slate-900 text-[#D4AF37] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                  : 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700 hover:text-slate-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 pb-20">
        {filteredEvents.map((event, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={event.id}
            className="bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800 hover:border-amber-500/30 transition-all flex flex-col group relative"
          >
            {isAdmin && (
              <div className="absolute top-8 right-8 flex space-x-3 z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); startEdit(event); }}
                  className="p-3.5 bg-slate-800/90 backdrop-blur shadow-xl rounded-2xl text-blue-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-700 active:scale-95"
                  title="Edit Event"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                  className="p-3.5 bg-slate-800/90 backdrop-blur shadow-xl rounded-2xl text-rose-400 hover:bg-rose-600 hover:text-white transition-all border border-slate-700 active:scale-95"
                  title="Delete Event"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <div className="p-8 sm:p-12 flex-grow">
              <div className="flex justify-between items-center mb-10">
                <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] flex items-center space-x-2 ${
                  getCategory(event) === 'upcoming' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  getCategory(event) === 'ended' ? 'bg-slate-800 text-slate-500 border border-slate-700' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    getCategory(event) === 'upcoming' ? 'bg-blue-400 animate-pulse' :
                    getCategory(event) === 'ended' ? 'bg-slate-600' :
                    'bg-emerald-400 animate-ping'
                  }`} />
                  <span>{getEventTimeStatus(event)}</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-[#D4AF37] bg-clip-text text-transparent font-serif drop-shadow-[0_0_10px_rgba(212,175,55,0.2)]">Tk {event.entryFee}</div>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 font-serif group-hover:text-amber-500 transition-colors tracking-tight">{event.title}</h2>
              <div className="inline-block px-3 py-1 bg-slate-950 text-[#D4AF37] border border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest mb-8">
                {event.class || 'All Levels'}
              </div>
              <p className="text-slate-400 mb-10 line-clamp-3 leading-relaxed text-sm sm:text-base font-medium">
                {event.description}
              </p>
              
              <div className="grid grid-cols-2 gap-y-8 gap-x-6 p-8 bg-slate-950 rounded-[2.5rem] border border-slate-800 shadow-inner relative group/data overflow-hidden">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover/data:opacity-100 transition-opacity" />
                <div className="relative z-10 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Scheduled Date</p>
                  <div className="flex items-center space-x-3 text-sm sm:text-base font-bold text-white">
                    <Calendar className="w-5 h-5 text-amber-500/70" />
                    <span>{new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="relative z-10 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Chronometer</p>
                  <div className="flex items-center space-x-3 text-sm sm:text-base font-bold text-white">
                    <Clock className="w-5 h-5 text-amber-500/70" />
                    <span>{event.duration} Minutes</span>
                  </div>
                </div>
                <div className="relative z-10 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Capacity Gate</p>
                  <div className="flex items-center space-x-3 text-sm sm:text-base font-bold text-white">
                    <Users className="w-5 h-5 text-amber-500/70" />
                    <span>{event.maxCandidates} Global Candidates</span>
                  </div>
                </div>
                <div className="relative z-10 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Distinction</p>
                  <div className="flex items-center space-x-3 text-sm sm:text-base font-bold text-white">
                    <Trophy className="w-5 h-5 text-amber-500/70" />
                    <span className="truncate">{event.prize}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-12 bg-slate-950/30 border-t border-slate-800">
              {getRegistrationStatus(event.id) === 'approved' ? (
                hasSubmitted(event.id) ? (
                  <div className="w-full bg-slate-900 text-slate-600 py-5 rounded-[1.5rem] font-bold text-center flex items-center justify-center space-x-3 border border-slate-800 shadow-inner grayscale opacity-60">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="uppercase tracking-widest text-xs">Assessment Finalized</span>
                  </div>
                ) : getCategory(event) === 'upcoming' ? (
                  <div className="w-full bg-blue-500/10 text-blue-400 py-5 rounded-[1.5rem] font-bold text-center border border-blue-500/20 flex flex-col items-center justify-center space-y-1">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6" />
                      <span>Synchronization Active</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Proceed to hall at exact scheduled time</p>
                  </div>
                ) : getCategory(event) === 'ended' ? (
                  <div className="w-full bg-slate-900 text-slate-600 py-5 rounded-[1.5rem] font-bold text-center border border-slate-800 flex items-center justify-center space-x-3 grayscale">
                    <AlertCircle className="w-6 h-6" />
                    <span className="uppercase tracking-[0.2em] text-xs">Timeline Elapsed</span>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/exam/${event.id}`)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-5 rounded-[1.5rem] font-bold hover:shadow-[0_0_25px_rgba(5,150,105,0.4)] transition-all flex items-center justify-center space-x-4 shadow-xl transform hover:-translate-y-1 active:scale-95 group/btn"
                  >
                    <Play className="w-6 h-6 group-hover/btn:scale-125 transition-transform" />
                    <span className="uppercase tracking-[0.15em]">Enter Selection Hall</span>
                  </button>
                )
              ) : getRegistrationStatus(event.id) === 'pending' ? (
                <div className="w-full bg-amber-500/5 text-amber-500 p-6 rounded-[1.5rem] font-bold text-center border border-amber-500/10 flex flex-col items-center justify-center space-y-2">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Clock className="w-6 h-6" />
                    </motion.div>
                    <span className="uppercase tracking-[0.1em]">Verification Queue</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Reviewing Payment Transmission</p>
                </div>
              ) : getRegistrationStatus(event.id) === 'rejected' ? (
                <div className="space-y-4">
                  <div className="w-full bg-rose-500/10 text-rose-400 py-5 rounded-[1.5rem] font-bold text-center border border-rose-500/20 flex items-center justify-center space-x-3 text-xs uppercase tracking-[0.3em] font-black">
                    <X className="w-6 h-6" />
                    <span>Rejected Access</span>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="w-full py-4 text-white bg-slate-900 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 active:scale-95"
                  >
                    Resubmit Auth Token
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedEvent(event)}
                  disabled={getCategory(event) === 'ended'}
                  className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl transform hover:-translate-y-1 active:scale-95 ${
                    getCategory(event) === 'ended' 
                      ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-slate-800' 
                      : 'bg-gradient-to-r from-amber-600 to-[#D4AF37] text-slate-950 shadow-amber-900/40 hover:shadow-amber-500/30'
                  }`}
                >
                  {getCategory(event) === 'ended' ? 'Arena Closed' : 'Request Registry Access'}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {filteredEvents.length === 0 && (
          <div className="col-span-full py-32 text-center bg-slate-900 p-8 sm:p-20 rounded-[3.5rem] border-2 border-dashed border-slate-800 shadow-inner flex flex-col items-center justify-center space-y-6">
            <Calendar className="w-24 h-24 text-slate-800 mb-6 opacity-30 rotate-6" />
            <div>
              <p className="text-white font-bold text-2xl font-serif mb-2">No active {activeCategory} schedule.</p>
              <p className="text-slate-500 max-w-sm mx-auto font-medium">We are currently preparing several high-intensity evaluations. Check back frequently for updates.</p>
            </div>
          </div>
        )}
      </div>


      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] max-w-lg w-full p-8 relative border border-slate-800"
            >
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {success ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 border border-emerald-500/20 shadow-lg"
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-white mb-2">Registration Submitted!</h2>
                  <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Your registration is now <span className="font-bold text-[#D4AF37]">Pending Verification</span>. 
                    Our team will verify your payment details and update your status shortly.
                  </p>
                  <button 
                    onClick={() => {
                      setSuccess(false);
                      setSelectedEvent(null);
                      setPaymentData({ method: 'Bkash', trxId: '' });
                    }}
                    className="mt-8 px-8 py-3 bg-[#D4AF37] text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg"
                  >
                    Close & Monitor Status
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2 font-serif">Event Registration</h2>
                  <p className="text-slate-400 mb-8">{selectedEvent.title}</p>

                  <div className="bg-amber-500/5 p-6 rounded-2xl mb-8 border border-amber-500/10 shadow-inner">
                    <div className="flex items-center space-x-2 text-[#D4AF37] font-bold mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-xs uppercase tracking-widest">Payment Instructions</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Please send <strong>Tk {selectedEvent.entryFee}</strong> to our merchant number: <strong>017XXXXXXXX</strong> using {paymentData.method} "Send Money" or "Payment" option. Enter the Transaction ID below.
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Bkash', 'Nagad', 'Rocket', 'Upay'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentData({ ...paymentData, method: m })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all font-bold ${paymentData.method === m ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Transaction ID (Trx ID)</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                        <input
                          type="text"
                          value={paymentData.trxId}
                          onChange={(e) => setPaymentData({ ...paymentData, trxId: e.target.value })}
                          placeholder="Enter Trx ID"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-[#D4AF37]/30 outline-none"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center space-x-2 text-rose-400 text-sm font-medium bg-rose-500/10 p-4 rounded-lg border border-rose-500/20">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#D4AF37] text-slate-900 py-4 rounded-xl font-bold text-lg hover:bg-amber-400 shadow-xl shadow-amber-500/10 transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Complete Registration'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Edit Modal */}
      <AnimatePresence>
        {showEditForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-5xl w-full p-8 max-h-[90vh] overflow-y-auto border border-slate-800"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white font-serif">Edit Event Settings</h2>
                <button onClick={() => setShowEditForm(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateEvent} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Event Title</label>
                      <input 
                        type="text" 
                        value={eventData.title} 
                        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-800 bg-slate-950 text-white focus:border-[#D4AF37]/50 outline-none transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Description</label>
                      <textarea 
                        value={eventData.description} 
                        onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-800 bg-slate-950 text-white focus:border-[#D4AF37]/50 outline-none h-32 transition-all font-medium"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Entry Fee (Tk)</label>
                        <input 
                          type="number" 
                          value={eventData.entryFee} 
                          onChange={(e) => setEventData({ ...eventData, entryFee: parseInt(e.target.value) || 0 })}
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-800 bg-slate-950 text-white focus:border-[#D4AF37]/50 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Duration (min)</label>
                        <input 
                          type="number" 
                          value={eventData.duration} 
                          onChange={(e) => setEventData({ ...eventData, duration: parseInt(e.target.value) || 0 })}
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-800 bg-slate-950 text-white focus:border-[#D4AF37]/50 outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Target Level</label>
                      <select 
                        value={eventData.class} 
                        onChange={(e) => setEventData({ ...eventData, class: e.target.value })}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-800 bg-slate-950 text-white focus:border-[#D4AF37]/50 outline-none font-bold"
                      >
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                        <option value="SSC Candidate">SSC Candidate</option>
                        <option value="College Admission">College Admission</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-[2rem] border-2 border-dashed border-slate-800 shadow-inner">
                      <h4 className="font-bold text-white mb-4 flex items-center uppercase text-xs tracking-widest">
                        {editingQuestionIndex !== null ? <Edit className="w-5 h-5 mr-2 text-blue-400" /> : <Plus className="w-5 h-5 mr-2 text-indigo-400" />}
                        {editingQuestionIndex !== null ? 'Edit Question' : 'Add New Question'}
                      </h4>
                      <div className="space-y-4">
                        <textarea 
                          value={currentQuestion.text} 
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} 
                          placeholder="Question Text..." 
                          className="w-full px-4 py-2 text-sm rounded-xl border border-slate-800 bg-slate-900 text-white outline-none"
                        />
                        <div className="grid grid-cols-1 gap-2">
                          {currentQuestion.options?.map((opt, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <input 
                                type="radio" 
                                name="correctOptAdmin"
                                checked={currentQuestion.correctAnswer === i}
                                onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: i })}
                                className="accent-[#D4AF37]"
                              />
                              <input 
                                type="text" 
                                value={opt}
                                onChange={(e) => {
                                  const opts = [...(currentQuestion.options || [])];
                                  opts[i] = e.target.value;
                                  setCurrentQuestion({ ...currentQuestion, options: opts });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-800 bg-slate-900 text-white outline-none font-medium"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            type="button" 
                            onClick={addOrUpdateQuestion}
                            className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg ${editingQuestionIndex !== null ? 'bg-blue-600 text-white' : 'bg-[#D4AF37] text-slate-900'}`}
                          >
                            {editingQuestionIndex !== null ? 'Update Question' : 'Add to Event'}
                          </button>
                          {editingQuestionIndex !== null && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setEditingQuestionIndex(null);
                                setCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
                              }}
                              className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs border border-slate-700"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-500 text-[10px] uppercase mb-4 tracking-widest flex items-center">
                        <span className="bg-[#D4AF37] text-slate-900 w-5 h-5 rounded-full flex items-center justify-center mr-2 text-[8px]">{eventData.questions?.length || 0}</span>
                        Event Questions
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {eventData.questions?.map((q, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-xs flex justify-between items-start ${editingQuestionIndex === i ? 'bg-amber-500/10 border-[#D4AF37]' : 'bg-slate-950 border-slate-800 shadow-inner'}`}>
                            <div className="flex-1 truncate pr-4">
                              <span className="font-bold text-[#D4AF37] mr-1">{i + 1}.</span>
                              <MathRenderer content={q.text} className="text-slate-300 inline" engine={profile?.mathEngine} />
                            </div>
                            <div className="flex space-x-1 shrink-0">
                              <button type="button" onClick={() => handleEditQuestion(i)} className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => removeQuestion(i)} className="text-rose-400 hover:text-rose-300 transition-colors p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-800 flex justify-end space-x-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditForm(false)}
                    className="px-8 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-10 py-3 bg-[#D4AF37] text-slate-900 rounded-xl font-bold shadow-xl shadow-amber-500/10 hover:bg-amber-400 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
