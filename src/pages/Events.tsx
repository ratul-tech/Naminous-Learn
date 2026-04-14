import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamEvent, UserProfile, Payment, Submission } from '../types';
import { Calendar, Clock, Trophy, Users, CreditCard, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

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

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamEvent));
      
      // Fallback for demo
      if (fetchedEvents.length === 0) {
        setEvents([{
          id: 'demo-event-1',
          title: 'Naminous Mega Mock Test 2026',
          description: 'A comprehensive mock test covering all major board subjects. Top 10 will receive special prizes!',
          entryFee: 100,
          startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
          endTime: new Date(Date.now() + 86400000 * 2 + 3600000).toISOString(),
          duration: 60,
          maxCandidates: 100,
          prize: 'Tk 5000 + Certificate',
          status: 'upcoming',
          questions: [],
          createdAt: new Date().toISOString()
        }]);
      } else {
        setEvents(fetchedEvents);
      }
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

  const getEventTimeStatus = (event: ExamEvent) => {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : new Date(startTime.getTime() + event.duration * 60000);

    if (now < startTime) return 'Coming Soon';
    if (now > endTime) return 'Time Up';
    return 'Ongoing';
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.map((event) => (
          <motion.div
            key={event.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-3xl shadow-sm overflow-hidden border-2 border-transparent hover:border-[#D4AF37] transition-all"
          >
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
      </div>

      {/* Registration Modal */}
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
                <Clock className="w-6 h-6 rotate-45" />
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
    </div>
  );
}
