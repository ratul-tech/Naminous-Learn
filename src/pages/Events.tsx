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

  const filteredEvents = events.filter(e => getCategory(e) === activeCategory);

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
      setTimeout(() => {
        setSuccess(false);
        setSelectedEvent(null);
        setPaymentData({ method: 'Bkash', trxId: '' });
      }, 3000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Failed to submit registration. Please try again.');
      handleFirestoreError(err, OperationType.CREATE, 'payments');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading events...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#7A4900] mb-2">Online Exam Events</h1>
        <p className="text-[#545454]">Participate in competitive exams and win exciting prizes</p>
      </div>

      <div className="flex justify-center border-b border-gray-100">
        <div className="flex space-x-8">
          {(['ongoing', 'upcoming', 'ended'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${
                activeCategory === cat ? 'text-[#D4AF37]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {cat} Events
              {activeCategory === cat && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredEvents.map((event) => (
          <motion.div
            key={event.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-3xl shadow-sm overflow-hidden border-2 border-transparent hover:border-[#D4AF37] transition-all relative group"
          >
            {isAdmin && (
              <div className="absolute top-4 right-4 flex space-x-1 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); startEdit(event); }}
                  className="p-2 bg-white/90 backdrop-blur shadow-md rounded-xl text-blue-600 hover:bg-blue-50 transition-all"
                  title="Edit Event"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                  className="p-2 bg-white/90 backdrop-blur shadow-md rounded-xl text-red-600 hover:bg-red-50 transition-all"
                  title="Delete Event"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  getEventTimeStatus(event) === 'Coming Soon' ? 'bg-blue-50 text-blue-600' :
                  getEventTimeStatus(event) === 'Time Up' ? 'bg-red-50 text-red-600' :
                  'bg-green-50 text-green-600'
                }`}>
                  {getEventTimeStatus(event)}
                </div>
                <div className="text-2xl font-bold text-[#D4AF37]">Tk {event.entryFee}</div>
              </div>
              <h2 className="text-2xl font-bold text-[#7A4900] mb-4">{event.title}</h2>
              <p className="text-[#545454] mb-8 line-clamp-2">{event.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center space-x-2 text-sm text-[#545454]">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  <span>{new Date(event.startTime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-[#545454]">
                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                  <span>{event.duration} Minutes</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-[#545454]">
                  <Users className="w-4 h-4 text-[#D4AF37]" />
                  <span>Max {event.maxCandidates} Students</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-[#545454]">
                  <Trophy className="w-4 h-4 text-[#D4AF37]" />
                  <span>{event.prize}</span>
                </div>
              </div>

              {getRegistrationStatus(event.id) === 'approved' ? (
                hasSubmitted(event.id) ? (
                  <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-center">
                    Exam Completed
                  </div>
                ) : getEventTimeStatus(event) === 'Coming Soon' ? (
                  <div className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-center border border-blue-100">
                    Coming Soon
                  </div>
                ) : getEventTimeStatus(event) === 'Time Up' ? (
                  <div className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-center border border-red-100">
                    Time Up
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/exam/${event.id}`)}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Join Exam Now</span>
                  </button>
                )
              ) : getRegistrationStatus(event.id) === 'pending' ? (
                <div className="w-full bg-yellow-50 text-yellow-600 py-3 rounded-xl font-bold text-center border border-yellow-100">
                  Pending Approval
                </div>
              ) : getRegistrationStatus(event.id) === 'rejected' ? (
                <div className="space-y-2">
                  <div className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-center border border-red-100">
                    Payment Rejected
                  </div>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-[#D4AF37] font-bold text-sm hover:underline"
                  >
                    Try again with new Trx ID
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="w-full bg-[#D4AF37] text-white py-3 rounded-xl font-bold hover:bg-[#B8860B] transition-all"
                >
                  Register Now
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {filteredEvents.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Calendar className="w-16 h-16 text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No {activeCategory} events found at the moment.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative"
            >
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>

              {success ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-[#7A4900] mb-2">Registration Submitted!</h2>
                  <p className="text-[#545454]">Our team will verify your payment and update your status shortly.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-[#7A4900] mb-2">Event Registration</h2>
                  <p className="text-[#545454] mb-8">{selectedEvent.title}</p>

                  <div className="bg-yellow-50 p-6 rounded-2xl mb-8 border border-yellow-100">
                    <div className="flex items-center space-x-2 text-yellow-800 font-bold mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Payment Instructions</span>
                    </div>
                    <p className="text-sm text-yellow-700 leading-relaxed">
                      Please send <strong>Tk {selectedEvent.entryFee}</strong> to our merchant number: <strong>017XXXXXXXX</strong> using {paymentData.method} "Send Money" or "Payment" option. Enter the Transaction ID below.
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[#545454] mb-2">Payment Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Bkash', 'Nagad', 'Rocket', 'Upay'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentData({ ...paymentData, method: m })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${paymentData.method === m ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#545454] mb-2">Transaction ID (Trx ID)</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={paymentData.trxId}
                          onChange={(e) => setPaymentData({ ...paymentData, trxId: e.target.value })}
                          placeholder="Enter Trx ID"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#D4AF37] outline-none"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center space-x-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#D4AF37] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#B8860B] shadow-lg transition-all disabled:opacity-50"
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-[#7A4900]">Edit Event Settings</h2>
                <button onClick={() => setShowEditForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateEvent} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-widest">Event Title</label>
                      <input 
                        type="text" 
                        value={eventData.title} 
                        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                        className="w-full px-5 py-3 rounded-2xl border-2 focus:border-[#D4AF37] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-widest">Description</label>
                      <textarea 
                        value={eventData.description} 
                        onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                        className="w-full px-5 py-3 rounded-2xl border-2 focus:border-[#D4AF37] outline-none h-32"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-widest">Entry Fee (Tk)</label>
                        <input 
                          type="number" 
                          value={eventData.entryFee} 
                          onChange={(e) => setEventData({ ...eventData, entryFee: parseInt(e.target.value) || 0 })}
                          className="w-full px-5 py-3 rounded-2xl border-2 focus:border-[#D4AF37] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-widest">Duration (min)</label>
                        <input 
                          type="number" 
                          value={eventData.duration} 
                          onChange={(e) => setEventData({ ...eventData, duration: parseInt(e.target.value) || 0 })}
                          className="w-full px-5 py-3 rounded-2xl border-2 focus:border-[#D4AF37] outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-gray-200">
                      <h4 className="font-bold text-[#7A4900] mb-4 flex items-center">
                        {editingQuestionIndex !== null ? <Edit className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                        {editingQuestionIndex !== null ? 'Edit Question' : 'Add New Question'}
                      </h4>
                      <div className="space-y-4">
                        <textarea 
                          value={currentQuestion.text} 
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} 
                          placeholder="Question Text..." 
                          className="w-full px-4 py-2 text-sm rounded-xl border outline-none"
                        />
                        <div className="grid grid-cols-1 gap-2">
                          {currentQuestion.options?.map((opt, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <input 
                                type="radio" 
                                name="correctOptAdmin"
                                checked={currentQuestion.correctAnswer === i}
                                onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: i })}
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
                                className="flex-1 px-3 py-1.5 text-xs rounded-lg border outline-none font-medium"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            type="button" 
                            onClick={addOrUpdateQuestion}
                            className="flex-1 py-2 bg-[#7A4900] text-white rounded-xl font-bold text-xs"
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
                              className="px-3 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-xs"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-[#7A4900] text-xs uppercase mb-3">Event Questions ({eventData.questions?.length})</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {eventData.questions?.map((q, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-xs flex justify-between items-start ${editingQuestionIndex === i ? 'bg-yellow-50 border-[#D4AF37]' : 'bg-white'}`}>
                            <div className="flex-1 truncate pr-4">
                              <span className="font-bold text-[#D4AF37] mr-1">{i + 1}.</span>
                              <MathRenderer content={q.text} className="text-gray-600 inline" />
                            </div>
                            <div className="flex space-x-1 shrink-0">
                              <button type="button" onClick={() => handleEditQuestion(i)} className="text-blue-500 hover:text-blue-700">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t flex justify-end space-x-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditForm(false)}
                    className="px-8 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-10 py-3 bg-[#D4AF37] text-white rounded-xl font-bold shadow-lg shadow-yellow-100 hover:bg-[#B8860B] transition-all"
                  >
                    Save Event Changes
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
