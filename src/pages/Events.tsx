import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamEvent, UserProfile, Payment, Submission, Question, OperationType } from '../types';
import { Calendar, Clock, Trophy, Users, CreditCard, CheckCircle2, AlertCircle, Play, Edit, Trash2, Plus, X, Copy } from 'lucide-react';
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
    method: 'bKash',
    trxId: '',
  });
  const [copied, setCopied] = useState(false);
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

  if (loading) return <div className="text-center py-32 text-slate-500 font-bold uppercase tracking-[0.3em] bg-transparent rounded-none flex flex-col items-center justify-center space-y-6">
    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
    <span>Loading Secure Data</span>
  </div>;

  return (
    <div className="space-y-16">
      <header className="relative py-12 text-center group">
        <div className="relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-0 py-1 text-[#D4AF37] rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] mb-4"
          >
            Numinous Arena
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 uppercase leading-none tracking-tight">
            Academic <span className="text-[#D4AF37]">Events</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed font-medium">
            Challenge your limits, earn prestigious recognition, and prepare for competitive examinations.
          </p>
        </div>
      </header>

      <div className="flex flex-col items-center space-y-6">
        <div className="inline-flex p-1 bg-transparent border-b border-[#D4AF37]/20 pb-2">
          {(['ongoing', 'upcoming', 'ended'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 sm:px-8 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                activeCategory === cat 
                  ? 'text-[#D4AF37]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat}
              {activeCategory === cat && (
                <motion.div 
                  layoutId="activeCategoryBorder" 
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" 
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {['All', 'SSC Candidate', 'College Admission'].map((c) => (
            <button
              key={c}
              onClick={() => setActiveClass(c)}
              className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                activeClass === c 
                  ? 'text-[#D4AF37] border-b border-[#D4AF37]/45' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 pb-20">
        {filteredEvents.map((event, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={event.id}
            className="flex flex-col group relative p-6 sm:p-8 rounded-[2rem] bg-slate-950/45 border border-slate-900/80 hover:border-[#D4AF37]/25 transition-all shadow-xl hover:shadow-[0_8px_35px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Custom Abstract Background Image Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.08] group-hover:opacity-[0.15] transition-all duration-700 scale-100 group-hover:scale-105">
              <img 
                src="/src/assets/images/exam_event_bg_1779876991995.png" 
                alt="Exam Event Abstract Background" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20" />
            </div>

            {isAdmin && (
              <div className="absolute top-4 right-4 flex space-x-2 z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); startEdit(event); }}
                  className="p-2 bg-slate-900/95 border border-slate-800 rounded-xl text-blue-400 hover:text-white transition-all active:scale-95"
                  title="Edit Event"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                  className="p-2 bg-slate-900/95 border border-slate-800 rounded-xl text-rose-450 hover:text-white transition-all active:scale-95"
                  title="Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="relative z-10 flex-grow flex flex-col">
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-6">
                  <div className={`text-[10px] font-black uppercase tracking-[0.25em] flex items-center space-x-2 ${
                    getCategory(event) === 'upcoming' ? 'text-blue-400' :
                    getCategory(event) === 'ended' ? 'text-slate-600' :
                    'text-[#D4AF37]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      getCategory(event) === 'upcoming' ? 'bg-blue-450 animate-pulse' :
                      getCategory(event) === 'ended' ? 'bg-slate-600' :
                      'bg-[#D4AF37] animate-ping'
                    }`} />
                    <span>{getEventTimeStatus(event)}</span>
                  </div>
                  <div className="text-xl font-extrabold text-[#D4AF37]">{event.entryFee ? `Tk ${event.entryFee}` : 'Free'}</div>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 tracking-tight group-hover:text-[#D4AF37] transition-all">{event.title}</h2>
                <div className="inline-block text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-6 border-b border-[#D4AF37]/20 pb-0.5 font-mono">
                  {event.class || 'All Levels'}
                </div>
                <p className="text-slate-400 mb-8 line-clamp-3 leading-relaxed text-xs sm:text-sm font-medium">
                  {event.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4 pb-8 text-xs font-bold text-slate-400">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/75">Scheduled</p>
                    <div className="flex items-center space-x-2 text-white font-bold">
                      <Calendar className="w-4 h-4 text-[#D4AF37]" />
                      <span>{new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/75">Chronometer</p>
                    <div className="flex items-center space-x-2 text-white font-bold">
                      <Clock className="w-4 h-4 text-[#D4AF37]" />
                      <span>{event.duration} Mins</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/75">Capacity</p>
                    <div className="flex items-center space-x-2 text-white font-bold">
                      <Users className="w-4 h-4 text-[#D4AF37]" />
                      <span>{event.maxCandidates} Nodes</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/75">Award</p>
                    <div className="flex items-center space-x-2 text-white font-bold">
                      <Trophy className="w-4 h-4 text-[#D4AF37]" />
                      <span className="truncate max-w-[120px]">{event.prize}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900/60 mt-auto">
              {getRegistrationStatus(event.id) === 'approved' ? (
                hasSubmitted(event.id) ? (
                  <div className="w-full text-slate-500 py-3 font-bold text-center flex items-center justify-center space-x-2 text-xs uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Assessment Finalized</span>
                  </div>
                ) : getCategory(event) === 'upcoming' ? (
                  <div className="w-full text-blue-400 py-3 font-bold text-center flex flex-col items-center justify-center space-y-1">
                    <div className="flex items-center justify-center space-x-2 text-xs uppercase tracking-widest">
                      <Clock className="w-4 h-4" />
                      <span>Synchronization Active</span>
                    </div>
                  </div>
                ) : getCategory(event) === 'ended' ? (
                  <div className="w-full text-slate-600 py-3 font-bold text-center flex items-center justify-center space-x-2 text-xs uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" />
                    <span>Timeline Elapsed</span>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/exam/${event.id}`)}
                    className="w-full border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-400 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest"
                  >
                    <Play className="w-4 h-4" />
                    <span>Enter Selection Hall</span>
                  </button>
                )
              ) : getRegistrationStatus(event.id) === 'pending' ? (
                <div className="w-full text-amber-500 py-3 font-bold text-center flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center justify-center space-x-2 text-xs uppercase tracking-widest">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Verification Queue</span>
                  </div>
                </div>
              ) : getRegistrationStatus(event.id) === 'rejected' ? (
                <div className="space-y-3">
                  <div className="w-full text-rose-500 py-3 font-bold text-center flex items-center justify-center space-x-2 text-[10px] uppercase tracking-widest">
                    <X className="w-4 h-4" />
                    <span>Rejected Access</span>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="w-full py-3 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    Resubmit Auth Token
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedEvent(event)}
                  disabled={getCategory(event) === 'ended'}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
                    getCategory(event) === 'ended' 
                      ? 'text-slate-705 border border-slate-900 cursor-not-allowed' 
                      : 'border border-[#D4AF37]/35 hover:bg-[#D4AF37]/5 text-[#D4AF37]'
                  }`}
                >
                  {getCategory(event) === 'ended' ? 'Arena Closed' : 'Request Registry Access'}
                </button>
              )}
            </div>
          </div>
          </motion.div>
        ))}
      </div>  {filteredEvents.length === 0 && (
          <div className="col-span-full py-32 text-center bg-slate-900 p-8 sm:p-20 rounded-[3.5rem] border-2 border-dashed border-slate-800 shadow-inner flex flex-col items-center justify-center space-y-6">
            <Calendar className="w-24 h-24 text-slate-800 mb-6 opacity-30 rotate-6" />
            <div>
              <p className="text-white font-bold text-2xl font-serif mb-2">No active {activeCategory} schedule.</p>
              <p className="text-slate-500 max-w-sm mx-auto font-medium">We are currently preparing several high-intensity evaluations. Check back frequently for updates.</p>
            </div>
          </div>
        )}
      

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
                      setPaymentData({ method: 'bKash', trxId: '' });
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

                  <div className="bg-gradient-to-r from-pink-500/10 to-pink-500/5 p-5 sm:p-6 rounded-2xl mb-6 border border-pink-500/20 shadow-[0_4px_20px_rgba(236,72,153,0.05)]">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-pink-500/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 shadow-md">
                          <span className="font-sans font-black text-xs text-pink-500 tracking-tighter">bKash</span>
                        </div>
                        <div>
                          <span className="text-sm font-black text-pink-400 tracking-wide uppercase">bKash Personal</span>
                          <p className="text-[9px] text-slate-500 font-bold tracking-wider">ONLY ACCEPTED METHOD</p>
                        </div>
                      </div>
                      
                      <div className="bg-pink-500/15 border border-pink-500/30 text-pink-300 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                        Send Money
                      </div>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850 flex items-center justify-between mb-5 shadow-inner">
                      <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Personal Account Number</p>
                        <p className="text-xl sm:text-2xl font-mono font-black text-pink-200 tracking-wider">01925779217</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('01925779217');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-4 py-2 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-xl hover:bg-pink-500 hover:text-white transition-all duration-300 flex items-center space-x-2 shrink-0 active:scale-95"
                        title="Copy Number"
                      >
                        {copied ? (
                          <span className="text-xs font-black uppercase tracking-wider">Copied!</span>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-4 pt-1 text-xs sm:text-sm">
                      <div className="flex items-center space-x-2 text-pink-400 font-black uppercase tracking-wider text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Crucial Instructions / জরুরি শর্তাবলী</span>
                      </div>
                      
                      <div className="space-y-3.5 text-slate-350 leading-relaxed font-semibold text-xs sm:text-[13px]">
                        <p className="pl-4 border-l-2 border-pink-500/30">
                          Please transfer exactly <span className="text-white font-extrabold">Tk {selectedEvent.entryFee}</span> to our personal number <span className="text-pink-300 font-mono font-bold select-all bg-pink-500/5 px-1.5 py-0.5 rounded border border-pink-500/10">01925779217</span> using the <strong className="text-white font-extrabold underline decoration-pink-500/50 decoration-2 underline-offset-2">"Send Money"</strong> option inside your bKash app or dial *247#.
                        </p>
                        
                        <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl space-y-2.5 text-rose-300 font-bold">
                          <p className="font-extrabold uppercase tracking-wide text-xs text-rose-400 flex items-center space-x-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>Strict Terms / সতর্কবার্তা:</span>
                          </p>
                          <p className="text-xs sm:text-xs text-slate-300 leading-normal font-medium">
                            The verification will <strong className="text-rose-400 font-extrabold uppercase">not be confirmed</strong> if you cash out, recharge, or make a payment. Under any such circumstances, our authorities cannot assume any liability or responsibility.
                          </p>
                          <p className="text-xs sm:text-xs text-slate-300 leading-normal font-medium border-t border-rose-500/10 pt-2 text-right">
                            (ক্যাশ আউট, মোবাইল রিচার্জ বা পেমেন্ট করলে ভেরিফিকেশন নিশ্চিত করা হবে না এবং এর জন্য কর্তৃপক্ষ কোনোভাবেই দায়বদ্ধ থাকবে না।)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Transaction ID (Trx ID)</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                        <input
                          type="text"
                          value={paymentData.trxId}
                          onChange={(e) => setPaymentData({ ...paymentData, trxId: e.target.value })}
                          placeholder="Enter Trx ID from bKash confirmation message"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-pink-500/30 outline-none placeholder:text-slate-600 text-sm font-semibold font-mono"
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
