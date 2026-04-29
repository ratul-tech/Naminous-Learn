import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc, where, increment } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Question, UserProfile, Payment, ExamEvent, Feedback, MathEngine } from '../types';
import { Plus, Trash2, CheckCircle2, XCircle, Users, User, BookOpen, CreditCard, Calendar, Settings, MessageSquare, AlertCircle, Shield, Edit, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';
import { MathRenderer } from '../components/MathRenderer';

interface AdminProps {
  profile: UserProfile | null;
}

export default function Admin({ profile }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'events' | 'questions' | 'feedback' | 'admins' | 'submissions'>(
    profile?.adminType === 'question_holder' ? 'questions' : 'users'
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const isFullAdmin = profile?.role === 'admin';

  useEffect(() => {
    const unsubQuestions = onSnapshot(query(collection(db, 'questions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'students'), orderBy('createdAt', 'desc')), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
      setUsers(fetchedUsers);
    });
    const unsubAdmins = onSnapshot(query(collection(db, 'admins'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdmins(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
    });
    const unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc')), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    const unsubEvents = onSnapshot(query(collection(db, 'events'), orderBy('createdAt', 'desc')), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    const unsubFeedback = onSnapshot(query(collection(db, 'feedback'), orderBy('createdAt', 'desc')), (snapshot) => {
      setFeedback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    const unsubSubmissions = onSnapshot(query(collection(db, 'submissions'), orderBy('submittedAt', 'desc')), (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    setLoading(false);
    return () => {
      unsubQuestions();
      unsubUsers();
      unsubAdmins();
      unsubPayments();
      unsubEvents();
      unsubFeedback();
      unsubSubmissions();
    };
  }, []);

  const handleApprovePayment = async (id: string) => {
    try {
      await updateDoc(doc(db, 'payments', id), { status: 'approved' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${id}`);
    }
  };

  const handleRejectPayment = async (id: string) => {
    try {
      await updateDoc(doc(db, 'payments', id), { status: 'rejected' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${id}`);
    }
  };

  const handleActivateAdmin = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'admins', uid), { status: 'active' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admins/${uid}`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This will remove all associated data.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'events', id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
        }
      }
    });
  };

  const handleDeleteQuestion = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'questions', id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
        }
      }
    });
  };

  const handleDeleteStudent = async (uid: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Student',
      message: 'Are you sure you want to delete this student record? Their exam history will remain but they will lose access.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'students', uid));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `students/${uid}`);
        }
      }
    });
  };

  const handleDeleteAdmin = async (uid: string) => {
    if (uid === auth.currentUser?.uid) {
      setConfirmModal({
        show: true,
        title: 'Action Prohibited',
        message: 'You cannot delete your own administrator account while logged in.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Delete Admin',
      message: 'Are you sure you want to remove this administrator? They will lose all administrative privileges.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'admins', uid));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `admins/${uid}`);
        }
      }
    });
  };

  if (loading) return <div className="text-center py-20">Loading admin panel...</div>;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#7A4900] truncate">Admin Control Center</h1>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border overflow-x-auto max-w-full no-scrollbar w-full lg:w-auto">
          {isFullAdmin && (
            <>
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Students" />
              <TabButton active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} icon={Shield} label="Admins" />
            </>
          )}
          <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} icon={BookOpen} label="Questions" />
          {isFullAdmin && (
            <>
              <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={CreditCard} label="Payments" />
            </>
          )}
          <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={Calendar} label="Events" />
          {isFullAdmin && (
            <>
              <TabButton active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')} icon={BookOpen} label="Submissions" />
              <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} icon={MessageSquare} label="Feedback" />
            </>
          )}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Students" 
          value={users.length} 
          color="bg-blue-50 text-blue-600" 
          description="Registered students"
        />
        <StatCard 
          icon={BookOpen} 
          label="Total Questions" 
          value={questions.length} 
          color="bg-purple-50 text-purple-600" 
          description="In question bank"
        />
        <StatCard 
          icon={Calendar} 
          label="Upcoming Events" 
          value={events.filter(e => new Date(e.startTime) > new Date()).length} 
          color="bg-yellow-50 text-yellow-600" 
          description="Scheduled exams"
        />
        <StatCard 
          icon={MessageSquare} 
          label="Recent Feedback" 
          value={feedback.length} 
          color="bg-green-50 text-green-600" 
          description="User submissions"
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && <UserManager key="users" users={users} onDelete={handleDeleteStudent} />}
        {activeTab === 'admins' && <AdminManager key="admins" admins={admins} onDelete={handleDeleteAdmin} onActivate={handleActivateAdmin} currentProfile={profile} />}
        {activeTab === 'questions' && <QuestionManager key="questions" questions={questions} onDelete={handleDeleteQuestion} isFullAdmin={isFullAdmin} mathEngine={profile?.mathEngine} />}
        {activeTab === 'payments' && <PaymentManager key="payments" payments={payments} onApprove={handleApprovePayment} onReject={handleRejectPayment} />}
        {activeTab === 'events' && <EventManager key="events" events={events} onDelete={handleDeleteEvent} isFullAdmin={isFullAdmin} mathEngine={profile?.mathEngine} />}
        {activeTab === 'submissions' && <SubmissionManager key="submissions" submissions={submissions} events={events} users={users} mathEngine={profile?.mathEngine} />}
        {activeTab === 'feedback' && <FeedbackManager key="feedback" feedback={feedback} />}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="flex items-center space-x-3 text-red-600 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">{confirmModal.title}</h2>
              </div>
              <p className="text-[#545454] mb-8">{confirmModal.message}</p>
              <div className="flex space-x-4">
                {confirmModal.title !== 'Action Prohibited' && (
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                    confirmModal.title === 'Action Prohibited' 
                      ? 'bg-[#D4AF37] hover:bg-[#B8860B] shadow-yellow-100' 
                      : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                  }`}
                >
                  {confirmModal.title === 'Action Prohibited' ? 'OK' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubmissionManager({ submissions, events, users, mathEngine }: { submissions: any[], events: ExamEvent[], users: UserProfile[], mathEngine?: MathEngine }) {
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [filterEvent, setFilterEvent] = useState<string>('all');

  const filteredSubmissions = filterEvent === 'all' 
    ? submissions 
    : submissions.filter(s => s.eventId === filterEvent);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-[#7A4900]">User Submissions ({filteredSubmissions.length})</h2>
        <select 
          value={filterEvent} 
          onChange={(e) => setFilterEvent(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border outline-none font-bold text-[#7A4900] bg-white shadow-sm text-sm"
        >
          <option value="all">All Events</option>
          {events.map(e => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px] lg:min-w-[800px]">
            <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-[10px] sm:text-xs font-bold">
              <tr>
                <th className="px-4 sm:px-6 py-4">Student</th>
                <th className="px-4 sm:px-6 py-4">Event</th>
                <th className="px-4 sm:px-6 py-4">Score</th>
                <th className="px-4 sm:px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {filteredSubmissions.map((s) => {
                const user = users.find(u => u.uid === s.uid);
                const event = events.find(e => e.id === s.eventId);
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <p className="font-bold text-[#7A4900] truncate max-w-[150px]">{user?.displayName || 'Unknown'}</p>
                      <p className="text-[10px] text-[#545454] truncate max-w-[150px]">{user?.email}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <p className="font-medium truncate max-w-[150px]">{event?.title || 'Unknown Event'}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{new Date(s.submittedAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#D4AF37]">{s.score} pts</span>
                        <span className="text-[9px] text-gray-400">Correct</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <button 
                        onClick={() => setSelectedSubmission(s)}
                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all whitespace-nowrap"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-gray-400">No submissions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Detail Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            >
              <div className="p-4 sm:p-8 border-b flex justify-between items-center bg-[#fdfaf5]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[8px] sm:text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Detailed Submission Review</span>
                    <span className="hidden sm:inline w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">ID: {selectedSubmission.id}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#7A4900] font-serif truncate">
                    {users.find(u => u.uid === selectedSubmission.uid)?.displayName}'s Entry
                  </h2>
                  <p className="text-xs sm:text-sm text-[#545454] truncate">{events.find(e => e.id === selectedSubmission.eventId)?.title}</p>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-white rounded-full shadow-sm shrink-0 ml-4">
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-gray-50/30">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1 sm:mb-2">Final Score</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[#D4AF37]">{selectedSubmission.score}</p>
                    <p className="text-[10px] text-gray-500 mt-1">out of {events.find(e => e.id === selectedSubmission.eventId)?.questions?.length || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1 sm:mb-2">Completion Time</p>
                    <p className="text-base sm:text-lg font-bold text-[#7A4900]">
                      {new Date(selectedSubmission.submittedAt).toLocaleTimeString()}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(selectedSubmission.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1 sm:mb-2">Success Rate</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                      {Math.round((selectedSubmission.score / (events.find(e => e.id === selectedSubmission.eventId)?.questions?.length || 1)) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-[#7A4900] uppercase tracking-widest text-[10px] sm:text-xs mb-4">Question Breakdown</h3>
                  {events.find(e => e.id === selectedSubmission.eventId)?.questions?.map((q: Question, idx: number) => {
                    const userAnswer = selectedSubmission.answers[q.id];
                    const isCorrect = userAnswer === q.correctAnswer;
                    
                    return (
                      <div key={q.id} className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 bg-white transition-all ${isCorrect ? 'border-emerald-50' : 'border-red-50'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-[#7A4900] text-xs sm:text-sm shrink-0">{idx + 1}</span>
                            <div className="min-w-0">
                              <MathRenderer content={q.text} className="font-bold text-[#7A4900] text-sm sm:text-lg" engine={mathEngine} />
                            </div>
                          </div>
                          {isCorrect ? (
                            <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase shrink-0 ml-2">
                              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                              Correct
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600 bg-red-50 px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase shrink-0 ml-2">
                              <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                              Incorrect
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-6">
                          {q.options.map((opt, i) => (
                            <div 
                              key={i} 
                              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border text-xs sm:text-sm flex items-center space-x-3 ${
                                i === q.correctAnswer 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                                  : i === userAnswer 
                                    ? 'bg-red-50 border-red-200 text-red-700' 
                                    : 'bg-gray-50 border-gray-200 text-gray-400'
                              }`}
                            >
                              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[8px] sm:text-[10px] font-bold shrink-0 ${
                                i === q.correctAnswer ? 'bg-emerald-600 text-white' : i === userAnswer ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
                              }`}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <MathRenderer content={opt} engine={mathEngine} />
                              </div>
                              {i === q.correctAnswer && <span className="ml-auto text-[8px] sm:text-[10px] uppercase font-black shrink-0">Official</span>}
                              {i === userAnswer && i !== q.correctAnswer && <span className="ml-auto text-[8px] sm:text-[10px] uppercase font-black shrink-0">Yours</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${active ? 'bg-[#D4AF37] text-white shadow-md' : 'text-[#545454] hover:bg-gray-50'}`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-bold text-sm">{label}</span>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color, description }: { icon: any, label: string, value: number, color: string, description: string }) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`p-2.5 sm:p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-xl sm:text-2xl font-bold text-[#7A4900]">{value}</h3>
          <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium">{description}</p>
        </div>
      </div>
    </div>
  );
}

function FeedbackManager({ feedback }: { feedback: Feedback[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <h2 className="text-xl font-bold text-[#7A4900]">User Feedback ({feedback.length})</h2>
      <div className="grid grid-cols-1 gap-4">
        {feedback.map((f) => (
          <div key={f.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${f.type === 'Issue' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  {f.type === 'Issue' ? <AlertCircle className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-[#7A4900]">{f.displayName}</h3>
                  <p className="text-xs text-gray-400">{f.email}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${f.type === 'Issue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {f.type}
              </span>
            </div>
            <p className="text-[#545454] bg-gray-50 p-4 rounded-xl text-sm leading-relaxed">
              {f.message}
            </p>
            <div className="mt-4 text-right">
              <span className="text-[10px] text-gray-400 font-mono">
                {new Date(f.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
        {feedback.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No feedback submitted yet.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AdminManager({ admins, onDelete, onActivate, currentProfile }: { admins: UserProfile[], onDelete: (uid: string) => void, onActivate: (uid: string) => void, currentProfile: UserProfile | null }) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminType, setAdminType] = useState<'full' | 'question_holder'>('question_holder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pendingAdmins = admins.filter(a => a.status === 'pending');
  const activeAdmins = admins.filter(a => a.status !== 'pending');

  const handleUpdateRole = async (uid: string, newType: 'full' | 'question_holder') => {
    try {
      await updateDoc(doc(db, 'admins', uid), { adminType: newType });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admins/${uid}`);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const secondaryApp = getApps().find(app => app.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const user = userCredential.user;

      const newAdmin: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${name}&background=random`,
        role: 'admin',
        adminType,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'admins', user.uid), newAdmin);
      
      await signOut(secondaryAuth);
      
      setShowAdd(false);
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      console.error("Admin creation error:", err);
      setError(err.message || "Failed to create admin account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
      {/* Pending Requests Section */}
      {pendingAdmins.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-[#7A4900]">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            <h2 className="text-lg sm:text-xl font-bold">Access Requests ({pendingAdmins.length})</h2>
          </div>
          <div className="bg-amber-50 rounded-2xl sm:rounded-3xl border-2 border-[#D4AF37] overflow-hidden shadow-lg">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[500px] sm:min-w-[600px]">
                <thead className="bg-[#D4AF37] text-white uppercase text-[10px] sm:text-xs font-bold">
                  <tr>
                    <th className="px-4 sm:px-6 py-4">Candidate</th>
                    <th className="px-4 sm:px-6 py-4">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/20 text-xs sm:text-sm">
                  {pendingAdmins.map((a) => (
                    <tr key={a.uid} className="bg-white/50 hover:bg-white transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img src={a.photoURL} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-sm shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-[#7A4900] truncate">{a.displayName}</p>
                            <p className="text-[10px] text-[#545454] truncate">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px] font-bold">PENDING</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => onActivate(a.uid)}
                            className="bg-green-600 text-white p-2 rounded-xl text-xs font-bold hover:bg-green-700 shadow-md transition-all shrink-0"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDelete(a.uid)}
                            className="bg-red-50 text-red-600 p-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-all shrink-0"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin List Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-[#7A4900]">Active Administrators ({activeAdmins.length})</h2>
          <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto bg-[#7A4900] text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-black shadow-lg transition-all transform hover:-translate-y-1">
            <Plus className="w-5 h-5" />
            <span>Add Admin</span>
          </button>
        </div>

        {showAdd && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-xl border-4 border-[#7A4900]/10">
            <form onSubmit={handleCreateAdmin} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase ml-2">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-gray-50 focus:border-[#7A4900] outline-none transition-all font-medium text-sm sm:text-base" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase ml-2">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-gray-50 focus:border-[#7A4900] outline-none transition-all font-medium text-sm sm:text-base" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase ml-2">Initial Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" title="Minimum 6 characters" className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-gray-50 focus:border-[#7A4900] outline-none transition-all font-medium text-sm sm:text-base" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase ml-2">Permission Level</label>
                  <select 
                    value={adminType} 
                    onChange={(e) => setAdminType(e.target.value as any)}
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-gray-50 focus:border-[#7A4900] outline-none transition-all font-bold text-[#7A4900] text-sm sm:text-base"
                  >
                    <option value="full">Full Administrator</option>
                    <option value="question_holder">Question Holder Only</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-red-500 text-xs sm:text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors order-2 sm:order-1">Cancel</button>
                <button type="submit" disabled={loading} className="bg-[#7A4900] text-white px-8 py-4 rounded-xl sm:rounded-2xl font-bold shadow-xl shadow-amber-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 order-1 sm:order-2">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[600px] lg:min-w-[800px]">
              <thead className="bg-[#fcfcfa] text-[#7A4900] uppercase text-[10px] sm:text-xs font-black tracking-widest border-b">
                <tr>
                  <th className="px-4 sm:px-8 py-4 sm:py-6">Administrator</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-6">Privileges</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-6">Email</th>
                  <th className="px-4 sm:px-8 py-4 sm:py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                {activeAdmins.map((a) => (
                  <tr key={a.uid} className="hover:bg-[#fcfcfa] transition-colors">
                    <td className="px-4 sm:px-8 py-4 sm:py-6">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <img src={a.photoURL || undefined} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-gray-50 shadow-sm shrink-0" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="font-bold text-[#7A4900] truncate">{a.displayName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate">ID: {a.uid.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6">
                      <select
                        value={a.adminType}
                        onChange={(e) => handleUpdateRole(a.uid, e.target.value as any)}
                        className={`text-[9px] sm:text-[10px] font-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl uppercase outline-none border transition-all cursor-pointer ${
                          a.adminType === 'full' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}
                      >
                        <option value="full">Full Admin</option>
                        <option value="question_holder">Question Holder</option>
                      </select>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 font-medium text-[#545454] truncate max-w-[150px]">{a.email}</td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
                      <button onClick={() => onDelete(a.uid)} className="p-2 sm:p-3 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group">
                        <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuestionManager({ questions, onDelete, isFullAdmin, mathEngine }: { questions: Question[], onDelete: (id: string) => void, isFullAdmin: boolean, mathEngine?: MathEngine }) {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-[#7A4900]">Question Bank ({questions.length})</h2>
        <button 
          onClick={() => navigate('/questions')} 
          className="w-full sm:w-auto bg-[#D4AF37] text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-[#B8860B] transition-all"
        >
          <Edit className="w-4 h-4" />
          <span>Full Management</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px] sm:min-w-[600px] lg:min-w-[800px]">
            <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-[10px] sm:text-xs font-bold">
              <tr>
                <th className="px-4 sm:px-6 py-4">Question</th>
                <th className="hidden sm:table-cell px-6 py-4">Metadata</th>
                <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {questions.slice(0, 10).map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="min-w-0 max-w-[200px] sm:max-w-md">
                      <MathRenderer content={q.text} className="font-medium line-clamp-1 truncate" engine={mathEngine} />
                      <div className="sm:hidden mt-1 flex flex-wrap gap-1">
                        <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 uppercase">{q.category}</span>
                        <span className="text-[8px] px-1.5 py-0.5 bg-[#D4AF37]/10 rounded text-[#7A4900] uppercase">{q.subject}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded-full uppercase text-gray-500 mr-2">{q.category}</span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#D4AF37]/10 rounded-full uppercase text-[#7A4900]">{q.subject}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                      <button 
                        onClick={() => navigate('/questions', { state: { editQuestion: q } })}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      {isFullAdmin && (
                        <button 
                          onClick={() => onDelete(q.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-20 text-gray-400">No questions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {questions.length > 10 && (
          <div className="p-4 border-t text-center">
            <button onClick={() => navigate('/questions')} className="text-[#D4AF37] font-bold text-xs hover:underline">
              View All {questions.length} Questions
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function UserManager({ users, onDelete }: { users: UserProfile[], onDelete: (uid: string) => void }) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditData({
      displayName: user.displayName,
      class: user.class,
      group: user.group,
      school: user.school,
      phone: user.phone,
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'students', editingUser.uid), editData);
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${editingUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <h2 className="text-lg sm:text-xl font-bold text-[#7A4900]">Student Management ({users.length})</h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[700px] lg:min-w-[800px]">
            <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-[10px] sm:text-xs font-bold">
              <tr>
                <th className="px-4 sm:px-6 py-4">Student</th>
                <th className="px-4 sm:px-6 py-4">Class/Group</th>
                <th className="px-4 sm:px-6 py-4">Institution</th>
                <th className="px-4 sm:px-6 py-4">Phone</th>
                <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full border border-gray-100 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-[#7A4900] truncate max-w-[120px]">{u.displayName}</p>
                        <p className="text-[10px] text-[#545454] truncate max-w-[120px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <p className="font-medium whitespace-nowrap">{u.class}</p>
                    <p className="text-[10px] text-[#545454] truncate max-w-[100px]">{u.group}</p>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <p className="truncate max-w-[150px]" title={u.school}>{u.school}</p>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">{u.phone || 'N/A'}</td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                      <button onClick={() => handleEdit(u)} className="p-2 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-all" title="Edit">
                        <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button onClick={() => onDelete(u.uid)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#7A4900]">Edit Student</h2>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-2">Display Name</label>
                  <input
                    type="text"
                    value={editData.displayName}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#7A4900] mb-2">Class</label>
                    <select
                      value={editData.class}
                      onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37] font-bold"
                    >
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="SSC Candidate">SSC Candidate</option>
                      <option value="College Admission">College Admission</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#7A4900] mb-2">Group</label>
                    <input
                      type="text"
                      value={editData.group}
                      onChange={(e) => setEditData({ ...editData, group: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-2">School/College</label>
                  <input
                    type="text"
                    value={editData.school}
                    onChange={(e) => setEditData({ ...editData, school: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-2">Phone</label>
                  <input
                    type="text"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>

                <div className="pt-6 flex space-x-4">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-[#D4AF37] hover:bg-[#B8860B] transition-all flex items-center justify-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PaymentManager({ payments, onApprove, onReject }: { payments: Payment[], onApprove: (id: string) => void, onReject: (id: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-2xl shadow-sm overflow-hidden border">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-[10px] sm:text-xs font-bold">
          <tr>
            <th className="px-4 sm:px-6 py-4">User</th>
            <th className="px-4 sm:px-6 py-4">Method</th>
            <th className="px-4 sm:px-6 py-4">Status</th>
            <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y text-xs sm:text-sm">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 sm:px-6 py-4">
                <p className="font-mono text-[10px] sm:text-xs text-gray-500">ID: {p.uid.slice(0, 8)}...</p>
                <p className="font-mono text-[10px] text-gray-400">Trx: {p.trxId}</p>
              </td>
              <td className="px-4 sm:px-6 py-4 font-bold text-[#7A4900]">{p.method}</td>
              <td className="px-4 sm:px-6 py-4">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                  p.status === 'approved' ? 'bg-green-100 text-green-600' :
                  p.status === 'rejected' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {p.status}
                </span>
              </td>
              <td className="px-4 sm:px-6 py-4 text-right">
                {p.status === 'pending' && (
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => onApprove(p.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg border border-green-100 transition-all" title="Approve"><CheckCircle2 className="w-5 h-5" /></button>
                    <button onClick={() => onReject(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-100 transition-all" title="Reject"><XCircle className="w-5 h-5" /></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-20 text-gray-400">No payment records found.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </motion.div>
  );
}

function EventManager({ events, onDelete, isFullAdmin, mathEngine }: { events: ExamEvent[], onDelete: (id: string) => void, isFullAdmin: boolean, mathEngine?: MathEngine }) {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExamEvent | null>(null);
  const [eventData, setEventData] = useState<Partial<ExamEvent>>({
    title: '',
    description: '',
    entryFee: 100,
    startTime: '',
    endTime: '',
    duration: 60,
    maxCandidates: 100,
    prize: '',
    questions: [],
    class: 'Class 9',
  });

  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  });

  const [viewingResults, setViewingResults] = useState<string | null>(null);
  const [eventResults, setEventResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'students'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (viewingResults) {
      setLoadingResults(true);
      const q = query(collection(db, 'results'), where('eventId', '==', viewingResults));
      const unsubArr = onSnapshot(q, (snapshot) => {
        setEventResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        setLoadingResults(false);
      });
      return () => unsubArr();
    }
  }, [viewingResults]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData.questions || eventData.questions.length === 0) {
      alert('Please add at least one question for the event.');
      return;
    }

    try {
      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          status: 'upcoming',
          createdAt: new Date().toISOString(),
        });
        // Increment global events count (persistent even if event deleted)
        await setDoc(doc(db, 'global_stats', 'counters'), { 
          eventsCount: increment(1) 
        }, { merge: true });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingEvent ? OperationType.UPDATE : OperationType.CREATE, editingEvent ? `events/${editingEvent.id}` : 'events');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setEditingQuestionIndex(null);
    setEventData({
      title: '',
      description: '',
      entryFee: 100,
      startTime: '',
      endTime: '',
      duration: 60,
      maxCandidates: 100,
      prize: '',
      questions: [],
      class: 'Class 9',
    });
  };

  const startEdit = (event: ExamEvent) => {
    setEditingEvent(event);
    setEventData({ ...event });
    setShowForm(true);
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#7A4900]">Manage Events ({events.length})</h2>
        {isFullAdmin && (
          <button onClick={() => setShowForm(true)} className="bg-[#D4AF37] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-[#B8860B]">
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-[#D4AF37]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-[#7A4900]">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
            <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSaveEvent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">Event Title</label>
                  <input type="text" value={eventData.title} onChange={(e) => setEventData({ ...eventData, title: e.target.value })} placeholder="e.g. Mega Mock Test 2026" className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">Description</label>
                  <textarea value={eventData.description} onChange={(e) => setEventData({ ...eventData, description: e.target.value })} placeholder="Event details and rules..." className="w-full px-4 py-3 rounded-xl border outline-none h-32 focus:ring-2 focus:ring-[#D4AF37]" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">Entry Fee (Tk)</label>
                    <input type="number" value={eventData.entryFee} onChange={(e) => setEventData({ ...eventData, entryFee: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">Duration (min)</label>
                    <input type="number" value={eventData.duration} onChange={(e) => setEventData({ ...eventData, duration: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">Start Time</label>
                    <input type="datetime-local" value={eventData.startTime} onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })} className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">End Time</label>
                    <input type="datetime-local" value={eventData.endTime} onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })} className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">Prize Details</label>
                  <input type="text" value={eventData.prize} onChange={(e) => setEventData({ ...eventData, prize: e.target.value })} placeholder="e.g. 5000 Tk + Certificate" className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-2 uppercase tracking-wider">Target Level</label>
                  <select 
                    value={eventData.class} 
                    onChange={(e) => setEventData({ ...eventData, class: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37] font-bold"
                  >
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="SSC Candidate">SSC Candidate</option>
                    <option value="College Admission">College Admission</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <h4 className="font-bold text-[#7A4900] mb-4 flex items-center">
                    {editingQuestionIndex !== null ? <Edit className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    {editingQuestionIndex !== null ? 'Edit Question' : 'Add Question Separately'}
                  </h4>
                  <div className="space-y-4">
                    <textarea 
                      value={currentQuestion.text} 
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} 
                      placeholder="Question Text (Supports LaTeX)" 
                      className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                    />
                    <div className="grid grid-cols-1 gap-2">
                      {currentQuestion.options?.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            name="correctOpt" 
                            checked={currentQuestion.correctAnswer === i} 
                            onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: i })}
                          />
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...(currentQuestion.options || [])];
                              newOpts[i] = e.target.value;
                              setCurrentQuestion({ ...currentQuestion, options: newOpts });
                            }} 
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="flex-1 px-4 py-2 rounded-lg border outline-none text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        type="button" 
                        onClick={addOrUpdateQuestion}
                        className="flex-1 py-3 bg-[#7A4900] text-white rounded-xl font-bold text-sm hover:bg-black transition-all"
                      >
                        {editingQuestionIndex !== null ? 'Update Question' : 'Add Question to List'}
                      </button>
                      {editingQuestionIndex !== null && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingQuestionIndex(null);
                            setCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0 });
                          }}
                          className="px-4 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-[#7A4900] text-sm uppercase">Added Questions ({eventData.questions?.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {eventData.questions?.map((q, i) => (
                      <div key={i} className={`p-3 rounded-xl border text-xs flex justify-between items-start transition-all ${editingQuestionIndex === i ? 'bg-yellow-50 border-[#D4AF37]' : 'bg-white'}`}>
                        <div className="flex-1">
                          <span className="font-bold text-[#D4AF37] mr-1">{i + 1}.</span>
                          <MathRenderer content={q.text} className="text-[#545454] line-clamp-2 inline" engine={mathEngine} />
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button type="button" onClick={() => handleEditQuestion(i)} className="text-blue-400 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!eventData.questions || eventData.questions.length === 0) && (
                      <p className="text-center py-6 text-gray-400 text-sm">No questions added yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end space-x-4">
              <button type="button" onClick={resetForm} className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-10 py-3 bg-[#D4AF37] text-white rounded-xl font-bold shadow-lg shadow-yellow-100 hover:bg-[#B8860B] transition-all">
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((e) => (
          <div key={e.id} className="bg-white p-6 rounded-2xl shadow-sm border hover:border-[#D4AF37] transition-all group relative">
            <div className="absolute top-4 right-4 flex space-x-1">
              <button onClick={() => startEdit(e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit Event">
                <Edit className="w-5 h-5" />
              </button>
              {isFullAdmin && (
                <button onClick={() => onDelete(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Event">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                e.status === 'upcoming' ? 'bg-blue-50 text-blue-600' :
                e.status === 'ongoing' ? 'bg-green-50 text-green-600' :
                'bg-gray-50 text-gray-600'
              }`}>
                {e.status}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">{e.maxCandidates} Slots</span>
            </div>
            <h3 className="font-bold text-[#7A4900] text-lg mb-1">{e.title}</h3>
            <p className="text-[10px] font-bold text-[#D4AF37] mb-2 uppercase tracking-widest">{e.class || 'All Levels'}</p>
            <p className="text-sm text-[#545454] mb-4 line-clamp-2">{e.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-400 uppercase">Start</span>
                <span className="text-[#D4AF37]">{new Date(e.startTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-400 uppercase">Duration</span>
                <span className="text-[#7A4900]">{e.duration} Minutes</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-400 uppercase">Questions</span>
                <span className="text-[#7A4900]">{e.questions?.length || 0} Manual MCQs</span>
              </div>
              <div className="pt-4 flex space-x-2">
                <button 
                  onClick={() => setViewingResults(e.id)}
                  className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                >
                  View Performance
                </button>
                <button 
                  onClick={() => startEdit(e)}
                  className="flex-1 bg-orange-50 text-orange-600 py-3 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all"
                >
                  Modify Event
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {viewingResults && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
             >
               <div className="p-8 border-b flex justify-between items-center">
                 <div>
                   <h2 className="text-2xl font-bold text-[#7A4900]">Performance Report</h2>
                   <p className="text-sm text-[#545454]">{events.find(e => e.id === viewingResults)?.title}</p>
                 </div>
                 <button onClick={() => setViewingResults(null)} className="p-2 hover:bg-gray-100 rounded-full">
                   <X className="w-6 h-6 text-gray-400" />
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto p-8">
                 {loadingResults ? (
                   <div className="text-center py-10">Loading results...</div>
                 ) : eventResults.length === 0 ? (
                   <div className="text-center py-10 text-gray-400">No student performance recorded yet.</div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-xs font-bold">
                         <tr>
                           <th className="px-6 py-4">Student</th>
                           <th className="px-6 py-4">Contact</th>
                           <th className="px-6 py-4 text-center">Score</th>
                           <th className="px-6 py-4">Date</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y">
                         {eventResults.map((r) => {
                           const student = users.find(u => u.uid === r.uid);
                           return (
                             <tr key={r.id} className="hover:bg-gray-50">
                               <td className="px-6 py-4">
                                 <p className="font-bold text-[#7A4900]">{r.displayName}</p>
                                 <p className="text-[10px] text-gray-400">{r.school}</p>
                               </td>
                               <td className="px-6 py-4 text-xs">
                                 <p>{student?.email || 'N/A'}</p>
                                 <p className="text-gray-400">{student?.phone || 'N/A'}</p>
                               </td>
                               <td className="px-6 py-4 text-center">
                                 <span className="text-lg font-bold text-[#D4AF37]">{r.score}%</span>
                                 <div className="text-[10px] text-gray-400">{r.correctCount}/{r.totalQuestions} Correct</div>
                               </td>
                               <td className="px-6 py-4 text-[10px] text-gray-400">
                                 {new Date(r.createdAt).toLocaleString()}
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
