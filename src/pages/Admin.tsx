import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc, where, increment } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Question, UserProfile, Payment, ExamEvent, Feedback, MathEngine } from '../types';
import { Plus, Trash2, CheckCircle2, XCircle, Users, User, BookOpen, CreditCard, Calendar, Settings, MessageSquare, AlertCircle, Shield, Edit, Save, X, FileText, LayoutDashboard, Database, Activity, LogOut, ChevronRight, Download, ArrowLeft, Eye, UserCircle, PlusCircle, Filter, Trophy, Clock, AlertTriangle, ExternalLink, ShieldPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType, Resource } from '../types';
import { MathRenderer } from '../components/MathRenderer';

interface AdminProps {
  profile: UserProfile | null;
}

type AdminTab = 'menu' | 'dashboard' | 'users' | 'payments' | 'events' | 'questions' | 'feedback' | 'admins' | 'submissions' | 'resources' | 'profile';

export default function Admin({ profile }: AdminProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const isFullAdmin = profile?.role === 'admin';
  
  useEffect(() => {
    if (activeTab === 'profile') {
      navigate('/profile');
    }
  }, [activeTab, navigate]);

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
    const unsubResources = onSnapshot(query(collection(db, 'resources'), orderBy('createdAt', 'desc')), (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
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
      unsubResources();
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

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `resources/${id}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-slate-950">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-400">Booting System Console...</p>
      </div>
    </div>
  );

  const handlePreview = () => {
    // We'll use a local storage flag or a state in App.tsx that StudentShell respects
    localStorage.setItem('admin_preview_mode', 'true');
    window.location.href = '/dashboard';
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'users', label: 'Students', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', fullAdminOnly: true },
    { id: 'admins', label: 'Team', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10', fullAdminOnly: true },
    { id: 'questions', label: 'Question Bank', icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'payments', label: 'Billing', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10', fullAdminOnly: true },
    { id: 'events', label: 'Exams', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'submissions', label: 'Analytics', icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: 'feedback', label: 'Support', icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { id: 'resources', label: 'Library', icon: FileText, color: 'text-slate-400', bg: 'bg-slate-400/10' },
    { id: 'profile', label: 'Settings', icon: UserCircle, color: 'text-slate-400', bg: 'bg-white/5' },
  ];

  return (
    <div className="min-h-screen -mx-4 -mt-8 bg-[#0f172a] text-slate-200">
      {activeTab === 'menu' ? (
        <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto">
          <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Admin Control Center</h1>
              </div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-[0.2em] ml-1">Management Suite v3.0 • Enterprise Edition</p>
            </div>
            
            <button 
              onClick={handlePreview}
              className="group flex items-center space-x-3 bg-slate-900 hover:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all shadow-xl"
            >
              <Eye className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold tracking-wide text-slate-300">Preview Student View</span>
            </button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {navItems.map((item) => {
              if (item.fullAdminOnly && !isFullAdmin) return null;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className="group relative flex flex-col items-start p-8 bg-slate-900 border border-slate-800 rounded-3xl hover:border-indigo-500/40 hover:bg-slate-800/80 transition-all text-left shadow-lg overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all" />
                  
                  <div className={`p-4 rounded-2xl ${item.bg} ${item.color} mb-6 group-hover:scale-105 transition-transform`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{item.label}</h3>
                  <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">System parameters, data flow benchmarks, and security protocols managed here.</p>
                  
                  <div className="mt-6 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                    <span>Manage Module</span>
                    <ChevronRight className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-slate-900/50 rounded-3xl border border-slate-800 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img src={profile?.photoURL} alt="" className="w-12 h-12 rounded-2xl border-2 border-slate-800 shadow-sm" referrerPolicy="no-referrer" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <p className="font-bold text-slate-100">{profile?.displayName}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-slate-500 lowercase">{profile?.email}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isFullAdmin ? 'text-indigo-400' : 'text-amber-400'}`}>
                    {isFullAdmin ? 'Super Admin' : 'Question Holder'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => auth.signOut()} 
              className="flex items-center space-x-2 text-slate-400 hover:text-rose-500 font-bold uppercase text-[10px] tracking-[0.15em] px-6 py-2.5 rounded-xl hover:bg-rose-500/5 border border-slate-800 hover:border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Terminate Session</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen">
          <header className="px-6 py-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-50 sticky top-0">
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => setActiveTab('menu')}
                className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/40 transition-all shadow-inner"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {navItems.find(i => i.id === activeTab)?.label}
                  </h2>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Terminal</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {activeTab !== 'profile' && (
                <button 
                  onClick={handlePreview}
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-400 transition-all shadow-sm"
                >
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Preview Mode</span>
                </button>
              )}
              <div className="h-6 w-px bg-slate-800 mx-2" />
              <img src={profile?.photoURL} alt="" className="w-8 h-8 rounded-lg border border-slate-800" referrerPolicy="no-referrer" />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scroll-smooth bg-slate-950">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="pb-24 max-w-7xl mx-auto"
              >
                {activeTab === 'dashboard' && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                      <ModernStatCard label="Total Students" value={users.length} icon={Users} trend="+12% this month" />
                      <ModernStatCard label="Live Exams" value={events.filter(e => e.status === 'ongoing').length} icon={Activity} trend="Operational" highlight />
                      <ModernStatCard label="Question Index" value={questions.length} icon={Database} trend="Verified" />
                      <ModernStatCard label="System Security" value="Nominal" icon={Shield} trend="Active" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                      <section className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Calendar className="w-32 h-32" />
                        </div>
                        <div className="flex justify-between items-center mb-10 relative">
                          <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Deployment Pipeline</h3>
                            <p className="text-xs text-slate-500 font-medium">Upcoming Exams & Events</p>
                          </div>
                          <button onClick={() => setActiveTab('events')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
                            <span>Manage Fleet</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-3 relative">
                          {events.slice(0, 4).map(e => (
                            <div key={e.id} className="group flex items-center justify-between p-4 bg-slate-950/50 hover:bg-slate-950 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer">
                              <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-xl ${e.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-800/50 text-slate-400'}`}>
                                  <Calendar className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-200 truncate">{e.title}</p>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{new Date(e.startTime).toLocaleDateString()}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className="text-[10px] text-indigo-500/80 font-bold uppercase">{e.class}</span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            </div>
                          ))}
                          {events.length === 0 && <p className="text-center py-10 text-slate-600 uppercase text-[10px] font-bold tracking-widest bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">No scheduled deployments</p>}
                        </div>
                      </section>

                      <section className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-8 opacity-10">
                          <MessageSquare className="w-32 h-32" />
                        </div>
                        <div className="flex justify-between items-center mb-10 relative">
                          <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Signal Relay</h3>
                            <p className="text-xs text-slate-500 font-medium">Recent Student Communications</p>
                          </div>
                          <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1 rounded-full">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Real-time</span>
                          </div>
                        </div>
                        <div className="space-y-3 max-h-[380px] overflow-y-auto no-scrollbar relative">
                          {feedback.map(f => (
                            <div key={f.id} className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${f.type === 'Issue' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>{f.type}</span>
                                <span className="text-[9px] font-mono text-slate-600 font-bold">{new Date(f.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"{f.message}"</p>
                              <div className="mt-4 flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center">
                                  <UserCircle className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">{f.displayName}</span>
                              </div>
                            </div>
                          ))}
                          {feedback.length === 0 && <p className="text-center py-12 text-slate-600 uppercase text-[10px] font-bold tracking-widest bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">No signals detected</p>}
                        </div>
                      </section>
                    </div>
                  </div>
                )}
                
                {activeTab === 'users' && <UserManager key="users" users={users} onDelete={handleDeleteStudent} />}
                {activeTab === 'admins' && <AdminManager key="admins" admins={admins} onDelete={handleDeleteAdmin} onActivate={handleActivateAdmin} currentProfile={profile} />}
                {activeTab === 'questions' && <QuestionManager key="questions" questions={questions} onDelete={handleDeleteQuestion} isFullAdmin={isFullAdmin} mathEngine={profile?.mathEngine} />}
                {activeTab === 'payments' && <PaymentManager key="payments" payments={payments} onApprove={handleApprovePayment} onReject={handleRejectPayment} />}
                {activeTab === 'events' && <EventManager key="events" events={events} onDelete={handleDeleteEvent} isFullAdmin={isFullAdmin} mathEngine={profile?.mathEngine} />}
                {activeTab === 'submissions' && <SubmissionManager key="submissions" submissions={submissions} events={events} users={users} mathEngine={profile?.mathEngine} />}
                {activeTab === 'feedback' && <FeedbackManager key="feedback" feedback={feedback} />}
                {activeTab === 'resources' && <ResourceManager key="resources" resources={resources} onDelete={handleDeleteResource} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#141414] border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
              <div className="flex items-center space-x-4 text-red-500 mb-6">
                <div className="p-3 rounded-2xl bg-red-500/10"><AlertCircle className="w-8 h-8" /></div>
                <h2 className="text-2xl font-black uppercase italic">{confirmModal.title}</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-10">{confirmModal.message}</p>
              <div className="flex space-x-4">
                {confirmModal.title !== 'Action Prohibited' && (
                  <button onClick={() => setConfirmModal(null)} className="flex-1 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all">Cancel Control</button>
                )}
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    confirmModal.title === 'Action Prohibited' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                      : 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'
                  }`}
                >
                  {confirmModal.title === 'Action Prohibited' ? 'Acknowledged' : 'Execute Task'}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Intelligence Yield</h2>
          <p className="text-xs text-slate-500 font-medium">Verify incoming datasets and student throughput</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Filter className="w-4 h-4" />
            </div>
            <select 
              value={filterEvent} 
              onChange={(e) => setFilterEvent(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs uppercase tracking-widest text-slate-300 appearance-none shadow-inner"
            >
              <option value="all">Unfiltered Streams</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px] lg:min-w-[800px]">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-slate-800">
              <tr>
                <th className="px-8 py-5">Origin (Student)</th>
                <th className="px-6 py-5">Source Protocol</th>
                <th className="px-6 py-5">Yield Metric</th>
                <th className="px-8 py-5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {filteredSubmissions.map((s) => {
                const user = users.find(u => u.uid === s.uid);
                const event = events.find(e => e.id === s.eventId);
                return (
                  <tr key={s.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 font-mono text-[10px] text-slate-500">
                           {user?.displayName?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{user?.displayName || 'Unknown proxy'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{event?.title || 'External Event'}</p>
                        <p className="text-[10px] text-slate-600 mt-1 font-mono">{new Date(s.submittedAt).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-black text-indigo-400">{s.score}</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Yield / Points</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedSubmission(s)}
                        className="px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                      >
                        Launch Review
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-24 text-slate-600 uppercase text-[10px] font-bold tracking-[0.2em] bg-slate-950/20">No intelligence streams detected</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 rounded-[3rem] shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-800 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] px-2 py-1 bg-indigo-500/10 rounded-lg">Operational Entry</span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">ID: {selectedSubmission.id.slice(0, 12)}...</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {users.find(u => u.uid === selectedSubmission.uid)?.displayName || 'Entity'}'s Performance
                  </h2>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">{events.find(e => e.id === selectedSubmission.eventId)?.title}</p>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform"><Trophy className="w-12 h-12 text-indigo-400" /></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Final Yield Core</p>
                    <p className="text-4xl font-black text-indigo-400 tracking-tighter">{selectedSubmission.score}</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase mt-2 tracking-widest">Cap: {events.find(e => e.id === selectedSubmission.eventId)?.questions?.length || '0'}</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform"><Clock className="w-12 h-12 text-emerald-400" /></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Uplink Timestamp</p>
                    <p className="text-xl font-bold text-white tracking-tight">
                      {new Date(selectedSubmission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase mt-2 tracking-widest">{new Date(selectedSubmission.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform"><Activity className="w-12 h-12 text-amber-400" /></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Success Ratio</p>
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter">
                      {Math.round((selectedSubmission.score / (events.find(e => e.id === selectedSubmission.eventId)?.questions?.length || 1)) * 100)}%
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase mt-2 tracking-widest">Verified Efficiency</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white uppercase tracking-widest text-xs">Question Dissection</h3>
                    <div className="h-px flex-1 bg-slate-800/50 mx-6" />
                  </div>
                  
                  {events.find(e => e.id === selectedSubmission.eventId)?.questions?.map((q: Question, idx: number) => {
                    const userAnswer = selectedSubmission.answers[q.id];
                    const isCorrect = userAnswer === q.correctAnswer;
                    
                    return (
                      <div key={idx} className={`p-8 rounded-[2rem] border-2 bg-slate-950/30 transition-all ${isCorrect ? 'border-emerald-500/10' : 'border-rose-500/10'}`}>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center space-x-4 min-w-0">
                            <span className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-slate-400 text-sm shrink-0">{idx + 1}</span>
                            <div className="min-w-0">
                              <MathRenderer content={q.text} className="font-bold text-white text-lg tracking-tight" engine={mathEngine} />
                            </div>
                          </div>
                          <div className={`flex items-center px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shrink-0 ml-4 ${isCorrect ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-500 bg-rose-500/10 border border-rose-500/20'}`}>
                            {isCorrect ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            {isCorrect ? 'Positive Match' : 'System Deficit'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {q.options.map((opt, i) => (
                            <div 
                              key={i} 
                              className={`p-5 rounded-2xl border transition-all text-sm flex items-center space-x-4 group/opt ${
                                i === q.correctAnswer 
                                  ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400 font-bold' 
                                  : i === userAnswer 
                                    ? 'bg-rose-500/5 border-rose-500/30 text-rose-400 font-medium' 
                                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                              }`}
                            >
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ${
                                i === q.correctAnswer ? 'bg-emerald-500 text-slate-900' : i === userAnswer ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <MathRenderer content={opt} engine={mathEngine} />
                              </div>
                              {i === q.correctAnswer && <span className="ml-auto text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Master</span>}
                              {i === userAnswer && i !== q.correctAnswer && <span className="ml-auto text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Input</span>}
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

function NavItem({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-800/40 hover:text-white'}`}
    >
      <div className="flex items-center space-x-3">
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
        <span className={`text-[11px] font-black uppercase tracking-tight ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
      </div>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-inner" />}
    </button>
  );
}

function ModernStatCard({ label, value, icon: Icon, trend, highlight }: { label: string, value: string | number, icon: any, trend: string, highlight?: boolean }) {
  return (
    <div className={`p-8 rounded-3xl border transition-all relative overflow-hidden group shadow-lg ${highlight ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-20 h-20" />
      </div>
      <div className="flex justify-between items-start mb-8 relative">
        <div className={`p-3.5 rounded-2xl shadow-sm ${highlight ? 'bg-white/20 text-white' : 'bg-slate-800 text-indigo-400'}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${highlight ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400'}`}>{trend}</span>
      </div>
      <div className="relative">
        <p className={`text-xs font-bold uppercase tracking-[0.15em] mb-2 ${highlight ? 'text-indigo-100' : 'text-slate-500'}`}>{label}</p>
        <h3 className="text-4xl font-bold tracking-tight">{value}</h3>
      </div>
    </div>
  );
}

function FeedbackManager({ feedback }: { feedback: Feedback[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Signal Analysis</h2>
          <p className="text-xs text-slate-500 font-medium">Intercepted user feedback and system issue reports</p>
        </div>
        <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Receiver: Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {feedback.map((f) => (
          <div key={f.id} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 hover:border-indigo-500/30 transition-all group relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
              {f.type === 'Issue' ? <AlertTriangle className="w-32 h-32 text-rose-500" /> : <MessageSquare className="w-32 h-32 text-indigo-400" />}
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${f.type === 'Issue' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                  {f.type === 'Issue' ? <AlertCircle className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight">{f.displayName}</h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{f.email}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${f.type === 'Issue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                {f.type}
              </span>
            </div>

            <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800/50 mb-6 relative">
              <p className="text-slate-300 text-sm leading-relaxed relative z-10 italic">"{f.message}"</p>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-800/50">
               <div className="flex items-center space-x-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Metadata Verified</p>
               </div>
               <span className="text-[10px] text-slate-600 font-mono tracking-widest">
                 {new Date(f.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
               </span>
            </div>
          </div>
        ))}
        {feedback.length === 0 && (
          <div className="lg:col-span-2 text-center py-32 bg-slate-950/30 rounded-[3rem] border-2 border-dashed border-slate-800">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-800">
               <MessageSquare className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-600 uppercase text-[10px] font-bold tracking-[0.2em]">Zero Signal Detected in current frequency</p>
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
      {pendingAdmins.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
            <AlertCircle className="w-6 h-6 text-rose-500 animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Security Alerts: Pending Access ({pendingAdmins.length})</h2>
              <p className="text-xs text-rose-500/70 font-medium uppercase tracking-widest">Unauthorized credentials awaiting verification</p>
            </div>
          </div>
          <div className="bg-slate-900 rounded-3xl border border-rose-500/20 overflow-hidden shadow-xl">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-[#1e1b1b] text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-rose-500/10">
                  <tr>
                    <th className="px-8 py-5">Candidate</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-500/5 text-sm">
                  {pendingAdmins.map((a) => (
                    <tr key={a.uid} className="hover:bg-rose-500/5 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-4">
                          <img src={a.photoURL} alt="" className="w-10 h-10 rounded-xl border border-slate-700" />
                          <div>
                            <p className="font-bold text-slate-200">{a.displayName}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-rose-500/20 text-rose-500 px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase">Awaiting Clear</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button onClick={() => onActivate(a.uid)} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"><CheckCircle2 className="w-5 h-5" /></button>
                          <button onClick={() => onDelete(a.uid)} className="bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white p-2.5 rounded-xl transition-all border border-slate-700 hover:border-transparent"><XCircle className="w-5 h-5" /></button>
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

      <div className="space-y-6">
        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Administrative Team</h2>
            <p className="text-xs text-slate-500 font-medium">Manage permissions and team structural integrity</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center space-x-2 shadow-lg shadow-indigo-500/20 transition-all">
            <Plus className="w-4 h-4" />
            <span>Provision User</span>
          </button>
        </div>

        {showAdd && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 p-8 rounded-[2rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Shield className="w-32 h-32 text-indigo-500" />
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-6 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Profile Legal Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-medium text-slate-200" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">System Liaison Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@nexus.com" className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-medium text-slate-200" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Authorization Credential</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-mono text-slate-200" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Privilege Tier</label>
                  <select 
                    value={adminType} 
                    onChange={(e) => setAdminType(e.target.value as any)}
                    className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-400 appearance-none cursor-pointer"
                  >
                    <option value="full">Nexus Superintendent (Full)</option>
                    <option value="question_holder">Data Custodian (Questions)</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-rose-500 text-xs font-bold bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">{error}</p>}
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">Discard</button>
                <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                  {loading ? 'Processing...' : 'Engage Creation Protocol'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-slate-400">Team Member</th>
                  <th className="px-8 py-5">Privileges</th>
                  <th className="px-8 py-5">System ID</th>
                  <th className="px-8 py-5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {activeAdmins.map((a) => (
                  <tr key={a.uid} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <img src={a.photoURL || undefined} alt="" className="w-12 h-12 rounded-xl border-2 border-slate-800 group-hover:border-indigo-500/40 transition-colors shadow-sm" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-bold text-slate-100">{a.displayName}</p>
                          <p className="text-xs text-slate-500 font-medium">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={a.adminType}
                        onChange={(e) => handleUpdateRole(a.uid, e.target.value as any)}
                        className={`text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider outline-none border transition-all cursor-pointer ${
                          a.adminType === 'full' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <option value="full">Superintendent</option>
                        <option value="question_holder">Custodian</option>
                      </select>
                    </td>
                    <td className="px-8 py-6">
                       <code className="text-[10px] font-mono text-slate-600 bg-slate-950 px-2 py-1 rounded-md">{a.uid.slice(0, 12)}...</code>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => onDelete(a.uid)} className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all border border-transparent hover:border-rose-500/20">
                        <Trash2 className="w-5 h-5" />
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
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Question Archive</h2>
          <p className="text-xs text-slate-500 font-medium">Central data repository for all exam materials</p>
        </div>
        <button 
          onClick={() => navigate('/questions')} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center space-x-2 transition-all shadow-lg"
        >
          <Edit className="w-4 h-4" />
          <span>Launch Management</span>
        </button>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px] sm:min-w-[600px] lg:min-w-[800px]">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-slate-800">
              <tr>
                <th className="px-8 py-5">Intel Core</th>
                <th className="hidden sm:table-cell px-8 py-5">Classification</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {questions.slice(0, 10).map((q) => (
                <tr key={q.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="min-w-0 max-w-[200px] sm:max-w-md">
                      <MathRenderer content={q.text} className="text-slate-200 font-medium line-clamp-1 truncate" engine={mathEngine} />
                      <div className="sm:hidden mt-2 flex flex-wrap gap-2">
                        <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-800 rounded uppercase text-slate-400 tracking-widest">{q.category}</span>
                        <span className="text-[8px] font-bold px-2 py-0.5 bg-indigo-500/10 rounded text-indigo-400 uppercase tracking-widest">{q.subject}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-8 py-5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-bold px-2.5 py-1 bg-slate-800 rounded-lg uppercase text-slate-400 tracking-tighter">{q.category}</span>
                      <span className="text-[9px] font-bold px-2.5 py-1 bg-indigo-500/10 rounded-lg uppercase text-indigo-400 tracking-tighter">{q.subject}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => navigate('/questions', { state: { editQuestion: q } })}
                        className="p-2.5 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/30"
                        title="Modify Intel"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {isFullAdmin && (
                        <button 
                          onClick={() => onDelete(q.id)}
                          className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                          title="Purge Record"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-32 text-slate-600 uppercase text-[10px] font-bold tracking-[0.2em] bg-slate-950/20">No question data floating in archive</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {questions.length > 10 && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/30 text-center">
            <button onClick={() => navigate('/questions')} className="text-indigo-400 font-bold text-xs uppercase tracking-widest hover:text-indigo-300 transition-colors">
              Access Entire Repository ({questions.length} Units)
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
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Student Management</h2>
          <p className="text-xs text-slate-500 font-medium">Configure pupil profiles and access levels</p>
        </div>
        <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-indigo-400">{users.length} Active Records</span>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[700px] lg:min-w-[800px]">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-5">Profile</th>
                <th className="px-6 py-5">Academic Info</th>
                <th className="px-6 py-5">Institution</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      {u.photoURL ? (
                        <div className="relative">
                          <img src={u.photoURL} alt="" className="w-10 h-10 rounded-xl border-2 border-slate-800 group-hover:border-indigo-500/50 transition-colors shrink-0" referrerPolicy="no-referrer" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{u.displayName}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-indigo-400 text-xs">{u.class}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">{u.group}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-slate-400 font-medium truncate max-w-[200px]" title={u.school}>{u.school}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-slate-300 font-mono text-xs">{u.phone || '— Unspecified —'}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleEdit(u)} 
                        className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/20" 
                        title="Configure Profile"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onDelete(u.uid)} 
                        className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20" 
                        title="Revoke Access"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-32 text-slate-600 uppercase text-[10px] font-bold tracking-[0.2em] bg-slate-950/20">No user parameters identified</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Professional Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-xl w-full border border-slate-800 overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Configure Record</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ref: {editingUser.uid.slice(0, 12)}...</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Display Name</label>
                  <input
                    type="text"
                    value={editData.displayName}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200 font-medium transition-all"
                    placeholder="Enter full legal name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Academic Tier</label>
                    <select
                      value={editData.class}
                      onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                      className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200 font-bold transition-all appearance-none cursor-pointer"
                    >
                      <option value="Class 9 text-slate-400">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="SSC Candidate">SSC Candidate</option>
                      <option value="College Admission">College Admission</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Curriculum Group</label>
                    <input
                      type="text"
                      value={editData.group}
                      onChange={(e) => setEditData({ ...editData, group: e.target.value as any })}
                      className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200 font-medium transition-all"
                      placeholder="Science, Commerce..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Educational Institution</label>
                  <input
                    type="text"
                    value={editData.school}
                    onChange={(e) => setEditData({ ...editData, school: e.target.value })}
                    className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200 font-medium transition-all"
                    placeholder="Search for institution..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Secure Comms Uplink (Phone)</label>
                  <input
                    type="text"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200 font-mono transition-all"
                    placeholder="+880..."
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-400 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all"
                  >
                    Abort Changes
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                  >
                    {saving ? (
                      <Activity className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{saving ? 'Processing...' : 'Commit Protocol'}</span>
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Operations</h2>
          <p className="text-xs text-slate-500 font-medium">Verify transaction integrity and revenue flow</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">System Clear</span>
           </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[700px] lg:min-w-[900px]">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-slate-800">
              <tr>
                <th className="px-8 py-5">Origin / User</th>
                <th className="px-6 py-5">Fiscal Data</th>
                <th className="px-6 py-5">Clearance Status</th>
                <th className="px-8 py-5 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">ID: {p.uid.slice(0, 8)}...</p>
                        <p className="text-[10px] font-mono text-slate-600 mt-0.5 tracking-tighter">TRX: {p.trxId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 transition-all group-hover:pl-8">
                    <p className="text-lg font-black text-emerald-400 leading-none group-hover:scale-110 origin-left transition-transform">{p.method}</p>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      p.status === 'approved' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : p.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {p.status === 'pending' && (
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => onApprove(p.id)} 
                          className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20" 
                          title="Authorize Flow"
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => onReject(p.id)} 
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20" 
                          title="Deny Clearance"
                        >
                          <XCircle className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-32 text-slate-600 uppercase text-[10px] font-bold tracking-[0.2em] bg-slate-950/20">No fiscal records detected</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Timeline Management</h2>
          <p className="text-xs text-slate-500 font-medium">Coordinate upcoming milestones and exam protocols</p>
        </div>
        {isFullAdmin && (
          <button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center space-x-2 transition-all shadow-lg active:scale-95">
            <Plus className="w-4 h-4" />
            <span>Provision Event</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-5xl w-full border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{editingEvent ? 'Regulate Event Parameters' : 'Initialize New Entry'}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Operational Lifecycle Configuration</p>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <form id="event-form" onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Event Identification</label>
                       <input type="text" value={eventData.title} onChange={(e) => setEventData({ ...eventData, title: e.target.value })} placeholder="Title of Protocol" className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-slate-200" required />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Supplementary Intelligence (Description)</label>
                       <textarea value={eventData.description} onChange={(e) => setEventData({ ...eventData, description: e.target.value })} placeholder="Details and operational rules..." className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none h-32 text-slate-300 font-medium resize-none transition-all" required />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Fee (৳)</label>
                        <input type="number" value={eventData.entryFee} onChange={(e) => setEventData({ ...eventData, entryFee: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-emerald-400 font-bold transition-all" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Duration (Min)</label>
                        <input type="number" value={eventData.duration} onChange={(e) => setEventData({ ...eventData, duration: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-indigo-400 font-bold transition-all" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Uplink (Start)</label>
                        <input type="datetime-local" value={eventData.startTime} onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 font-mono text-xs transition-all" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Downlink (End)</label>
                        <input type="datetime-local" value={eventData.endTime} onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 font-mono text-xs transition-all" required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform">
                        {editingQuestionIndex !== null ? <Edit className="w-16 h-16 text-indigo-500" /> : <PlusCircle className="w-16 h-16 text-indigo-500" />}
                      </div>
                      <h4 className="font-bold text-indigo-400 mb-6 flex items-center text-xs uppercase tracking-widest">
                        {editingQuestionIndex !== null ? <Edit className="w-4 h-4 mr-2" /> : <ShieldPlus className="w-4 h-4 mr-2" />}
                        {editingQuestionIndex !== null ? 'Modify Payload' : 'Inject Intelligence'}
                      </h4>
                      <div className="space-y-4">
                        <textarea 
                          value={currentQuestion.text} 
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} 
                          placeholder="Cipher / Question Input" 
                          className="w-full bg-slate-900 px-5 py-3 rounded-2xl border border-slate-800 outline-none text-slate-200 font-medium text-sm focus:border-indigo-500 h-24 resize-none transition-all"
                        />
                        <div className="grid grid-cols-1 gap-3">
                          {currentQuestion.options?.map((opt, i) => (
                            <div key={i} className="flex items-center space-x-3 group/opt">
                              <div className="relative">
                                <input 
                                  type="radio" 
                                  name="correctOpt" 
                                  checked={currentQuestion.correctAnswer === i} 
                                  onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: i })}
                                  className="peer absolute opacity-0 w-full h-full cursor-pointer z-10"
                                />
                                <div className="w-5 h-5 rounded-full border-2 border-slate-700 peer-checked:border-indigo-500 peer-checked:bg-indigo-500 transition-all flex items-center justify-center">
                                   <div className="w-1.5 h-1.5 bg-slate-900 rounded-full scale-0 peer-checked:scale-100 transition-transform" />
                                </div>
                              </div>
                              <input 
                                type="text" 
                                value={opt} 
                                onChange={(e) => {
                                  const newOpts = [...(currentQuestion.options || [])];
                                  newOpts[i] = e.target.value;
                                  setCurrentQuestion({ ...currentQuestion, options: newOpts });
                                }} 
                                placeholder={`Branch ${String.fromCharCode(65 + i)}`}
                                className="flex-1 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 outline-none text-xs text-slate-300 focus:border-indigo-500/50 transition-all"
                              />
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button" 
                          onClick={addOrUpdateQuestion}
                          className="w-full mt-4 py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                        >
                          {editingQuestionIndex !== null ? 'Sync Payload' : 'Merge into Registry'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Payload Registry ({eventData.questions?.length || 0})</p>
                       <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                         {eventData.questions?.map((q, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/30 rounded-xl border border-slate-800 hover:border-slate-600 transition-all group">
                             <p className="text-xs text-slate-400 truncate flex-1 pr-4">{idx + 1}. {q.text}</p>
                             <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button type="button" onClick={() => handleEditQuestion(idx)} className="p-1.5 text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                               <button type="button" onClick={() => removeQuestion(idx)} className="p-1.5 text-rose-500 hover:bg-slate-800 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-800 bg-slate-950/20 flex gap-4">
                 <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-950 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-800">Abort Operation</button>
                 <button form="event-form" type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]">Deploy Synchronized Event</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingResults && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Performance Analytics</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Cross-sectional Evaluation Grid</p>
                    </div>
                    <button onClick={() => setViewingResults(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-0">
                    {loadingResults ? (
                      <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Aggregating Records...</p>
                      </div>
                    ) : eventResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-50">
                        <AlertCircle className="w-16 h-16 text-slate-700" />
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">No Intelligence Data Collected</p>
                      </div>
                    ) : (
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-950 text-slate-500 uppercase text-[9px] font-bold tracking-[0.2em] border-b border-slate-800 z-10">
                            <tr>
                              <th className="px-8 py-4">Identity</th>
                              <th className="px-6 py-4 text-center">Score Metric</th>
                              <th className="px-6 py-4">Date</th>
                              <th className="px-8 py-4 text-right">Clearance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-sm">
                            {eventResults.map((res, i) => {
                              const student = users.find(u => u.uid === res.uid);
                              return (
                                <tr key={res.id} className="hover:bg-slate-800/20 transition-colors">
                                  <td className="px-8 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-600">{i+1}</div>
                                        <div>
                                          <p className="font-bold text-slate-100">{res.displayName || 'Unknown Proxy'}</p>
                                          <p className="text-[10px] text-slate-500">{student?.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-center">
                                    <div className="inline-flex flex-col items-center">
                                        <span className="text-lg font-black text-indigo-400">{res.score}%</span>
                                        <span className="text-[10px] text-slate-600 font-bold uppercase mt-1">{res.correctCount}/{res.totalQuestions} Correct</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <p className="text-[10px] font-mono text-slate-400 tracking-tighter uppercase">{new Date(res.createdAt).toLocaleDateString()}</p>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                    <div className="inline-flex px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">Archived</div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((e) => (
          <div key={e.id} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 hover:border-indigo-500/30 transition-all group relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                <Trophy className="w-32 h-32" />
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                  e.status === 'upcoming' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  e.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' :
                  'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {e.status}
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">{e.maxCandidates} Capacity</span>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(e)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/20" title="Regulate Config">
                  <Edit className="w-5 h-5" />
                </button>
                {isFullAdmin && (
                  <button onClick={() => onDelete(e.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20" title="Purge Record">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <h3 className="font-bold text-white text-xl mb-1 tracking-tight group-hover:text-indigo-400 transition-colors">{e.title}</h3>
            <p className="text-[10px] font-bold text-indigo-500 mb-4 uppercase tracking-widest">{e.class || 'Universal Protocol'}</p>
            <p className="text-sm text-slate-400 mb-6 line-clamp-2 leading-relaxed">{e.description}</p>
            
            <div className="space-y-3 pt-6 border-t border-slate-800/50">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">Execution Time</span>
                <span className="text-slate-200">{new Date(e.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">Temporal Length</span>
                <span className="text-indigo-400">{e.duration} Units (Min)</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-500">Payload Density</span>
                <span className="text-emerald-400">{e.questions?.length || 0} Intelligence Units</span>
              </div>
              
              <div className="pt-6 flex gap-3">
                <button 
                  onClick={() => setViewingResults(e.id)}
                  className="flex-1 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-[0.98]"
                >
                  Analyze Yield
                </button>
                <button 
                  onClick={() => startEdit(e)}
                  className="flex-1 bg-slate-950 text-slate-500 border border-slate-800 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  Regulate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ResourceManager({ resources, onDelete }: { resources: Resource[], onDelete: (id: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ title: '', url: '', category: 'Physics', size: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'resources'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setFormData({ title: '', url: '', category: 'Physics', size: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resources');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Active Asset Registry</h2>
          <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-[0.1em]">Total PDF Nodes: {resources.length}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95">
          <Plus className="w-4 h-4" />
          <span>Ingest New Asset</span>
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 10 }} 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full border border-slate-800 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Provision External Asset</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Resource Drive Configuration</p>
                </div>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Asset Designation</label>
                    <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Physics Ch1 Drive" className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-slate-200" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cloud Link (URL)</label>
                    <input type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://drive.google.com/..." className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-slate-200" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Classification Target</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-slate-200 appearance-none">
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Payload Size</label>
                    <input type="text" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} placeholder="e.g. 1.2 MB" className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-slate-200" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 bg-slate-950 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-800">Abort</button>
                  <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]">
                    {saving ? 'Transmitting...' : 'Link Asset Node'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(r => (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 hover:border-indigo-500/30 transition-all group overflow-hidden relative shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
              <FileText className="w-32 h-32" />
            </div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-4 rounded-2xl transition-all ${r.category === 'Physics' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'} group-hover:bg-indigo-600 group-hover:text-white`}>
                 <FileText className="w-6 h-6" />
              </div>
              <button 
                onClick={() => onDelete(r.id)} 
                className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 opacity-0 group-hover:opacity-100"
                title="Decommission Asset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="relative z-10">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 italic">{r.category}</p>
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 tracking-tight group-hover:text-indigo-400 transition-colors">{r.title}</h3>
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                 <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">{r.size || '?? KB'}</span>
                 <span className="w-1 h-1 rounded-full bg-slate-800" />
                 <span>ACTIVE NODE</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-between relative z-10">
               <a 
                 href={r.url} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="flex items-center space-x-2 text-indigo-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest group/link"
               >
                 <span>Access Drive</span>
                 <ExternalLink className="w-3 h-3 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
               </a>
               <span className="text-[9px] font-mono text-slate-600 uppercase">Ver. 1.0</span>
            </div>
          </div>
        ))}
        {resources.length === 0 && (
          <div className="lg:col-span-3 text-center py-24 bg-slate-950/30 rounded-[3rem] border-2 border-dashed border-slate-800">
            <Database className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-600 font-bold uppercase text-[10px] tracking-[0.2em]">Zero asset nodes registered in frequency</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
