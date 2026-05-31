import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc, where, increment, writeBatch, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Question, UserProfile, Payment, ExamEvent, Feedback, MathEngine } from '../types';
import { Plus, Trash2, CheckCircle2, XCircle, Users, User, BookOpen, CreditCard, Calendar, Settings, MessageSquare, AlertCircle, Shield, Edit, Save, X, FileText, LayoutDashboard, Database, Activity, LogOut, ChevronRight, Download, ArrowLeft, Eye, UserCircle, PlusCircle, Filter, Trophy, Clock, AlertTriangle, ExternalLink, ShieldPlus, Search, Loader2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType, Resource } from '../types';
import { MathRenderer } from '../components/MathRenderer';
import { ALL_SUBJECTS } from '../constants';

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
  const [countdown, setCountdown] = useState(0);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isFullAdmin = profile?.role === 'admin';
  
  useEffect(() => {
    let timer: any;
    if (confirmModal && confirmModal.show) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [confirmModal?.show]);
  
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
    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const fetchedAdmins = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
      fetchedAdmins.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setAdmins(fetchedAdmins);
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

  const deleteAuthUser = async (uid: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        console.warn('Cannot delete: No ID token found');
        return false;
      }
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ uid })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Auth deletion error:', errorData.error);
        // We continue even if auth deletion fails (might be already deleted)
      }
      return true;
    } catch (error) {
      console.error('Error in deleteAuthUser:', error);
      return false;
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setCountdown(5);
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
    setCountdown(5);
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
    setCountdown(5);
    setConfirmModal({
      show: true,
      title: 'Delete Student',
      message: 'Are you sure you want to delete this student record? This action will permanently remove all associated user and exam data.',
      onConfirm: async () => {
        try {
          setDeletingUserId(uid);
          console.log(`Admin client-side initiating secure server-side deletion for student: ${uid}...`);
          
          // 1. Call modern server-side endpoint with Admin SDK privileges to remove Auth user and handle all associated database deletions first (bypassing Firestore local rules)
          const adminDeleteSuccess = await deleteAuthUser(uid);
          
          if (!adminDeleteSuccess) {
            console.warn('Backend user deletion service failed. Attempting client-side fallback account deletion...');
            
            // 2. Client-side fallback cleanup of associated collections
            const collectionsToClean = ['results', 'payments', 'submissions', 'feedback'];
            const batch = writeBatch(db);
            let opCount = 0;
            
            for (const colName of collectionsToClean) {
              try {
                const q = query(collection(db, colName), where('uid', '==', uid));
                const snapshot = await getDocs(q);
                snapshot.forEach((docSnap) => {
                  batch.delete(docSnap.ref);
                  opCount++;
                });
              } catch (colErr) {
                console.error(`Admin Client failed to delete collections for student ${uid}:`, colErr);
              }
            }
            
            // Delete student profile document
            batch.delete(doc(db, 'students', uid));
            opCount++;
            
            // Decrement global student counter
            try {
              const countersRef = doc(db, 'global_stats', 'counters');
              batch.set(countersRef, {
                studentsCount: increment(-1)
              }, { merge: true });
              opCount++;
            } catch (statErr) {
              console.error('Admin Client failed to update studentsCount state:', statErr);
            }
            
            if (opCount > 0) {
              await batch.commit();
              console.log('Admin Client-side fallback Firestore cleanup completed.');
            }
          } else {
            console.log('Backend user deletion successfully deleted Firestore records & Auth record.');
          }
          
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `students/${uid}`);
        } finally {
          setDeletingUserId(null);
        }
      }
    });
  };

  const handleDeleteAdmin = async (uid: string) => {
    if (uid === auth.currentUser?.uid) {
      setCountdown(0);
      setConfirmModal({
        show: true,
        title: 'Action Prohibited',
        message: 'You cannot delete your own administrator account while logged in.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    setCountdown(5);
    setConfirmModal({
      show: true,
      title: 'Delete Admin',
      message: 'Are you sure you want to remove this administrator? They will be permanently removed from the system and lose all access.',
      onConfirm: async () => {
        try {
          console.log(`Admin client-side initiating secure server-side deletion for admin: ${uid}...`);
          
          // 1. Call modern server-side endpoint with Admin SDK privileges to handle deletion first
          const adminDeleteSuccess = await deleteAuthUser(uid);
          
          if (!adminDeleteSuccess) {
            console.warn('Backend user deletion service failed. Attempting client-side fallback admin deletion...');
            
            // 2. Clean up associated collections on client side
            const collectionsToClean = ['results', 'payments', 'submissions', 'feedback'];
            const batch = writeBatch(db);
            let opCount = 0;
            
            for (const colName of collectionsToClean) {
              try {
                const q = query(collection(db, colName), where('uid', '==', uid));
                const snapshot = await getDocs(q);
                snapshot.forEach((docSnap) => {
                  batch.delete(docSnap.ref);
                  opCount++;
                });
              } catch (colErr) {
                console.error(`Admin Client failed to delete collections for admin ${uid}:`, colErr);
              }
            }
            
            // Delete admin profile document
            batch.delete(doc(db, 'admins', uid));
            opCount++;
            
            if (opCount > 0) {
              await batch.commit();
              console.log('Admin Client-side fallback profile deletions complete.');
            }
          } else {
            console.log('Backend user deletion successfully deleted Admin Firestore record & Auth record.');
          }
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `admins/${uid}`);
        }
      }
    });
  };

  const handleDeleteResource = async (id: string) => {
    setCountdown(5);
    setConfirmModal({
      show: true,
      title: 'Decommission Resource',
      message: 'Are you sure you want to decommission this asset node? It will be removed from the library permanently.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'resources', id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `resources/${id}`);
        }
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-slate-950">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-400">Booting System Console...</p>
      </div>
    </div>
  );


  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'users', label: 'Students', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'admins', label: 'Team', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'questions', label: 'Question Bank', icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'payments', label: 'Billing', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10', fullAdminOnly: true },
    { id: 'events', label: 'Exams', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'submissions', label: 'Analytics', icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: 'feedback', label: 'Support', icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { id: 'resources', label: 'Library', icon: FileText, color: 'text-slate-400', bg: 'bg-slate-400/10' },
    { id: 'profile', label: 'Settings', icon: UserCircle, color: 'text-slate-400', bg: 'bg-white/5' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header element at standard level */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-800 pb-6 mb-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">Admin Control Center</h1>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Management Suite v3.0 • Enterprise Edition</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab !== 'menu' && (
            <button 
              onClick={() => setActiveTab('menu')}
              className="flex items-center space-x-2 bg-slate-900 shadow-md hover:bg-slate-800 px-4 py-2 border border-slate-800 hover:border-slate-700 text-xs font-bold tracking-wide text-slate-355 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Menu</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'menu' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {navItems.map((item) => {
              if (item.fullAdminOnly && !isFullAdmin) return null;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className="group relative flex flex-col items-start p-6 bg-slate-900/80 border border-slate-800/80 rounded-2xl hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all text-left shadow-lg overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-all" />
                  
                  <div className={`p-3 rounded-xl ${item.bg} ${item.color} mb-4 group-hover:scale-105 transition-transform`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{item.label}</h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">System parameters, database operations, and security logs managed here.</p>
                  
                  <div className="mt-5 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-[#D4AF37] transition-colors">
                    <span>Manage Module</span>
                    <ChevronRight className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-6 shadow-md shadow-slate-950/10">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-10 h-10 rounded-xl border border-slate-800 shadow-sm animate-none" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border border-slate-950 rounded-full animate-none" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{profile?.displayName}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-slate-500 lowercase font-medium">{profile?.email}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-800" />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isFullAdmin ? 'text-indigo-400' : 'text-amber-400'}`}>
                    {isFullAdmin ? 'Super' : 'Staff'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => auth.signOut()} 
              className="flex items-center space-x-2 text-slate-400 hover:text-rose-500 font-bold uppercase text-[10px] tracking-widest px-5 py-2.5 rounded-xl hover:bg-rose-500/5 border border-slate-800 hover:border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Terminate Session</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Horizontally scrolling pill-navigation sub-tabs - beautiful & perfectly responsive */}
          <div className="border-b border-slate-800 pb-1 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-16 bg-[#020617]/95 backdrop-blur-md z-30 shrink-0">
            <div className="flex space-x-2 min-w-max py-1.5 font-sans">
              {navItems.map((item) => {
                if (item.fullAdminOnly && !isFullAdmin) return null;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as AdminTab)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/40 text-slate-400 hover:text-white border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <div className="w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="space-y-6 max-w-7xl mx-auto"
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
                
                {activeTab === 'users' && <UserManager key="users" users={users} onDelete={handleDeleteStudent} deletingUserId={deletingUserId} />}
                {activeTab === 'admins' && <AdminManager key="admins" admins={admins} onDelete={handleDeleteAdmin} onActivate={handleActivateAdmin} currentProfile={profile} />}
                {activeTab === 'questions' && <QuestionManager key="questions" questions={questions} onDelete={handleDeleteQuestion} isFullAdmin={isFullAdmin} mathEngine={profile?.mathEngine} />}
                {activeTab === 'payments' && <PaymentManager key="payments" payments={payments} onApprove={handleApprovePayment} onReject={handleRejectPayment} />}
                {activeTab === 'events' && <EventManager key="events" events={events} questions={questions} onDelete={handleDeleteEvent} isFullAdmin={isFullAdmin} mathEngine={profile?.mathEngine} />}
                {activeTab === 'submissions' && <SubmissionManager key="submissions" submissions={submissions} events={events} users={users} mathEngine={profile?.mathEngine} />}
                {activeTab === 'feedback' && <FeedbackManager key="feedback" feedback={feedback} />}
                {activeTab === 'resources' && <ResourceManager key="resources" resources={resources} onDelete={handleDeleteResource} />}
              </motion.div>
            </AnimatePresence>
          </div>
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
                  disabled={confirmModal.title !== 'Action Prohibited' && countdown > 0}
                  className={`flex-1 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    confirmModal.title === 'Action Prohibited' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                      : countdown > 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-rose-600 text-white shadow-lg shadow-rose-900/20 active:scale-95'
                  }`}
                >
                  {confirmModal.title === 'Action Prohibited' 
                    ? 'Acknowledged' 
                    : countdown > 0 
                      ? `Authorizing (${countdown}s)` 
                      : 'Execute Task'}
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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSubmissions = submissions.filter(s => {
    const user = users.find(u => u.uid === s.uid);
    const matchesEvent = filterEvent === 'all' || s.eventId === filterEvent;
    const matchesSearch = !searchTerm || 
      user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEvent && matchesSearch;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Intelligence Yield</h2>
          <p className="text-xs text-slate-500 font-medium">Verify incoming datasets and student throughput</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
            />
          </div>
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
                      {((selectedSubmission.score / (events.find(e => e.id === selectedSubmission.eventId)?.questions?.length || 1)) * 100).toFixed(2)}%
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
                              {q.imageUrl && (
                                <div className="my-3 max-w-full sm:max-w-md rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 p-1">
                                  <img 
                                    src={q.imageUrl} 
                                    alt="Question context" 
                                    className="w-full h-auto object-contain max-h-52 rounded-lg" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredFeedback = feedback.filter(f => {
    const matchesSearch = !searchTerm || 
      f.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || f.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Signal Analysis</h2>
          <p className="text-xs text-slate-500 font-medium">Intercepted user feedback and system issue reports</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Feedback..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
            />
          </div>
          <div className="relative w-full sm:w-48 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Filter className="w-4 h-4" />
            </div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs uppercase tracking-widest text-slate-300 appearance-none shadow-inner"
            >
              <option value="all">All Signals</option>
              <option value="Feedback">Feedback</option>
              <option value="Issue">Issues</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFeedback.map((f) => (
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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAdmins = admins.filter(a => 
    a.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingAdmins = filteredAdmins.filter(a => a.status === 'pending');
  const activeAdmins = filteredAdmins.filter(a => a.status !== 'pending');

  const handleUpdateRole = async (uid: string, newType: 'full' | 'question_holder') => {
    try {
      await updateDoc(doc(db, 'admins', uid), { adminType: newType });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admins/${uid}`);
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Administrative Team</h2>
            <p className="text-xs text-slate-500 font-medium">Manage permissions and team structural integrity</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Admin..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
              />
            </div>
          </div>
        </div>

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
                       <code className="text-[10px] font-mono text-[#D4AF37] bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800/50 select-all font-bold tracking-tight hover:border-indigo-500/30 transition-all" title="Double-click to select and copy complete Admin UID">{a.uid}</code>
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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuestions = questions.filter(q => 
    q.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Question Archive</h2>
          <p className="text-xs text-slate-500 font-medium">Central data repository for all exam materials</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Question Content..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
            />
          </div>
          <button 
            onClick={() => navigate('/questions', { state: { openAdd: true } })} 
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95 shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Question</span>
          </button>
          <button 
            onClick={() => navigate('/questions')} 
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-lg"
          >
            <Edit className="w-4 h-4" />
            <span>Launch Management</span>
          </button>
        </div>
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
              {filteredQuestions.slice(0, 10).map((q) => (
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

function UserManager({ users, onDelete, deletingUserId }: { users: UserProfile[], onDelete: (uid: string) => void, deletingUserId: string | null }) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active'>('all');

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'pending') {
      return u.status === 'pending';
    }
    if (statusFilter === 'active') {
      return u.status === 'active' || !u.status;
    }
    return true;
  });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Student Management</h2>
          <p className="text-xs text-slate-500 font-medium">Configure pupil profiles and access levels</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Active
            </button>
          </div>

          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
            />
          </div>
          <div className="px-4 py-3 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
            <span className="text-xs font-bold text-indigo-400">{filteredUsers.length} Match{filteredUsers.length !== 1 ? 'es' : ''}</span>
          </div>
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
                <th className="px-6 py-5">Status</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      {u.photoURL ? (
                        <div className="relative">
                          <img src={u.photoURL} alt="" className="w-10 h-10 rounded-xl border-2 border-slate-800 group-hover:border-indigo-500/50 transition-colors shrink-0" referrerPolicy="no-referrer" />
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-slate-900 rounded-full ${(!u.status || u.status === 'active') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{u.displayName}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{u.email}</p>
                        <p className="text-[9px] text-[#D4AF37] font-mono mt-1.5 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/80 w-fit select-all hover:bg-slate-950 hover:border-indigo-500/40 transition-all font-bold tracking-tight" title="Double-click to select and copy Firestore User ID">UID: {u.uid}</p>
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
                  <td className="px-6 py-5">
                    {(!u.status || u.status === 'active') ? (
                      <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-xl text-[10px] font-bold tracking-widest uppercase border border-emerald-500/20">Active</span>
                    ) : (
                      <div className="flex flex-col items-start space-y-2">
                        <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-xl text-[10px] font-bold tracking-widest uppercase border border-amber-500/10">Pending Approval</span>
                        <button
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'students', u.uid), { status: 'active' });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, `students/${u.uid}`);
                            }
                          }}
                          className="text-[9px] bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/30 text-white font-extrabold px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    )}
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
                        disabled={deletingUserId === u.uid}
                        className={`p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 ${deletingUserId === u.uid ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        title={deletingUserId === u.uid ? "Deleting..." : "Revoke Access"}
                      >
                        {deletingUserId === u.uid ? (
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = payments.filter(p => 
    p.trxId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.method?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Operations</h2>
          <p className="text-xs text-slate-500 font-medium">Verify transaction integrity and revenue flow</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search TRX ID or UID..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
            />
          </div>
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
              {filteredPayments.map((p) => (
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

function EventManager({ events, questions = [], onDelete, isFullAdmin, mathEngine }: { events: ExamEvent[], questions?: Question[], onDelete: (id: string) => void, isFullAdmin: boolean, mathEngine?: MathEngine }) {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExamEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subTab, setSubTab] = useState<'published' | 'drafts'>('published');
  
  // Question configuration tabs & states
  const [questionTab, setQuestionTab] = useState<'db' | 'manual'>('db');
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbSubjectFilter, setDbSubjectFilter] = useState('All');
  const [dbClassFilter, setDbClassFilter] = useState('All');

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
    class: 'SSC Candidate',
    isDraft: false,
  });

  const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
  const uniqueClasses = Array.from(new Set(questions.map(q => q.class).filter(Boolean)));

  const filteredDbQuestions = questions.filter(q => {
    const qText = q.text || '';
    const qSubject = q.subject || '';
    const qClass = q.class || '';
    const matchesSearch = qText.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
      q.options?.some(o => o.toLowerCase().includes(dbSearchQuery.toLowerCase()));
    
    const matchesSubject = dbSubjectFilter === 'All' || qSubject === dbSubjectFilter;
    const matchesClass = dbClassFilter === 'All' || qClass === dbClassFilter;
    return matchesSearch && matchesSubject && matchesClass;
  });

  const isQuestionInEvent = (q: Question) => {
    return eventData.questions?.some(eq => eq.id === q.id || eq.text === q.text) || false;
  };

  const handleToggleDbQuestion = (q: Question) => {
    const isAdded = isQuestionInEvent(q);
    if (isAdded) {
      // Remove it
      setEventData(prev => ({
        ...prev,
        questions: (prev.questions || []).filter(eq => eq.id !== q.id && eq.text !== q.text)
      }));
    } else {
      // Add it
      setEventData(prev => ({
        ...prev,
        questions: [...(prev.questions || []), q]
      }));
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.class?.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (subTab === 'drafts') {
      return matchesSearch && e.isDraft === true;
    } else {
      return matchesSearch && e.isDraft !== true;
    }
  });

  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    imageUrl: '',
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

  const handleSaveData = async (isDraft: boolean) => {
    if (!eventData.title) {
      alert('Please fill in the Event Title.');
      return;
    }
    if (!eventData.questions || eventData.questions.length === 0) {
      alert('Please add at least one question for the event.');
      return;
    }

    try {
      const dataToSave = {
        ...eventData,
        isDraft,
        status: eventData.status || 'upcoming',
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), dataToSave);
      } else {
        await addDoc(collection(db, 'events'), {
          ...dataToSave,
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

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const draftStatus = eventData.isDraft !== undefined ? eventData.isDraft : false;
    await handleSaveData(draftStatus);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setEditingQuestionIndex(null);
    setQuestionTab('db');
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
      class: 'SSC Candidate',
      isDraft: false,
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
      imageUrl: '',
    });
  };

  const handleEditQuestion = (index: number) => {
    const q = eventData.questions![index];
    setCurrentQuestion({
      text: q.text,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      imageUrl: q.imageUrl || '',
    });
    setEditingQuestionIndex(index);
    setQuestionTab('manual'); // Auto switch to manual tab for editing
  };

  const removeQuestion = (index: number) => {
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
      setCurrentQuestion({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        imageUrl: '',
      });
    }
    setEventData(prev => ({
      ...prev,
      questions: (prev.questions || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Category Tabs: Published vs Drafts */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Timeline Management</h2>
          
          <div className="flex space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 max-w-sm">
            <button
              onClick={() => setSubTab('published')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                subTab === 'published'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Published ({events.filter(e => e.isDraft !== true).length})
            </button>
            <button
              onClick={() => setSubTab('drafts')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                subTab === 'drafts'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 font-extrabold shadow-md'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Drafts ({events.filter(e => e.isDraft === true).length})
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-48 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Filter className="w-4 h-4" />
            </div>
            <select 
              value={eventData.class} 
              onChange={(e) => setEventData({ ...eventData, class: e.target.value })}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs uppercase tracking-widest text-slate-300 appearance-none shadow-inner"
            >
              <option value="SSC Candidate">SSC Candidate</option>
              <option value="College Admission">College Admission</option>
            </select>
          </div>
          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Event..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
            />
          </div>
          {isFullAdmin && (
            <button onClick={() => setShowForm(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              <span>Provision Event</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-6xl w-full border border-slate-800 overflow-hidden max-h-[95vh] flex flex-col">
              <div className="px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{editingEvent ? 'Regulate Event Parameters' : 'Initialize New Entry'}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Operational Lifecycle Configuration</p>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <form id="event-form" onSubmit={handleSaveEvent} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Event details */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Event Identification</label>
                       <input type="text" value={eventData.title || ''} onChange={(e) => setEventData({ ...eventData, title: e.target.value })} placeholder="Title of Protocol" className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-slate-200" required />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Supplementary Intelligence (Description)</label>
                       <textarea value={eventData.description || ''} onChange={(e) => setEventData({ ...eventData, description: e.target.value })} placeholder="Details and operational rules..." className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none h-28 text-slate-300 font-medium resize-none transition-all" required />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Fee (BDT)</label>
                        <input type="number" value={eventData.entryFee || 0} onChange={(e) => setEventData({ ...eventData, entryFee: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-emerald-400 font-bold transition-all" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Duration (Min)</label>
                        <input type="number" value={eventData.duration || 0} onChange={(e) => setEventData({ ...eventData, duration: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-indigo-400 font-bold transition-all" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Uplink (Start)</label>
                        <input type="datetime-local" value={eventData.startTime || ''} onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 font-mono text-xs transition-all" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Downlink (End)</label>
                        <input type="datetime-local" value={eventData.endTime || ''} onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 font-mono text-xs transition-all" required />
                      </div>
                    </div>
                    
                    {/* Event Level Settings: Class Target */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Grade Target</label>
                        <select 
                          value={eventData.class || 'SSC Candidate'} 
                          onChange={(e) => setEventData({ ...eventData, class: e.target.value })}
                          className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-slate-300 font-bold text-xs"
                        >
                          <option value="SSC Candidate">SSC Candidate</option>
                          <option value="College Admission">College Admission</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Capacity Cap</label>
                        <input type="number" value={eventData.maxCandidates || 100} onChange={(e) => setEventData({ ...eventData, maxCandidates: parseInt(e.target.value) || 100 })} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none text-slate-300 font-bold" required />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Intelligent Questions adding flow */}
                  <div className="space-y-6">
                    <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 relative overflow-hidden group">
                      
                      {/* Sub Tabs for Database retrieve vs Manual Question Creation */}
                      <div className="flex border-b border-slate-800 mb-6 bg-slate-950 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setQuestionTab('db')}
                          className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-2 ${
                            questionTab === 'db'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>Fetch from DB</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestionTab('manual')}
                          className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-2 ${
                            questionTab === 'manual'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Add Manually</span>
                        </button>
                      </div>

                      {questionTab === 'db' ? (
                        /* DB retrieves questions lists */
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* DB Search */}
                            <div className="relative col-span-1 sm:col-span-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                              <input 
                                type="text"
                                value={dbSearchQuery}
                                onChange={(e) => setDbSearchQuery(e.target.value)}
                                placeholder="Search databank..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 text-xs text-slate-300"
                              />
                            </div>

                            {/* Subject filter */}
                            <select
                              value={dbSubjectFilter}
                              onChange={(e) => setDbSubjectFilter(e.target.value)}
                              className="bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                            >
                              <option value="All">All Subjects</option>
                              {uniqueSubjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>

                            {/* Class/Level filter */}
                            <select
                              value={dbClassFilter}
                              onChange={(e) => setDbClassFilter(e.target.value)}
                              className="bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                            >
                              <option value="All">All Grades</option>
                              {uniqueClasses.map(cl => (
                                <option key={cl} value={cl}>{cl}</option>
                              ))}
                            </select>
                          </div>

                          {/* List of DB questions */}
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar border-t border-slate-850 pt-2">
                            {filteredDbQuestions.length === 0 ? (
                              <p className="text-center py-10 text-xs text-slate-600 font-bold uppercase tracking-wider">No matching databank questions</p>
                            ) : (
                              filteredDbQuestions.map((q) => {
                                const added = isQuestionInEvent(q);
                                return (
                                  <div key={q.id} className="p-3.5 bg-slate-900 rounded-xl border border-slate-850 hover:border-slate-830 transition-all flex items-start justify-between gap-4">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        {q.subject && (
                                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/15">{q.subject}</span>
                                        )}
                                        {q.class && (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">{q.class}</span>
                                        )}
                                        {q.category && (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-[#D4AF37] rounded">{q.category}</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-300 font-medium pr-2">
                                        <MathRenderer content={q.text} engine={mathEngine} />
                                      </div>
                                    </div>
                                    
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDbQuestion(q)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 ${
                                        added
                                          ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20'
                                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                                      }`}
                                    >
                                      {added ? 'Remove' : 'Add to Event'}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Manual input creation fields */
                        <div className="space-y-4">
                          <textarea 
                            value={currentQuestion.text} 
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} 
                            placeholder="Cipher / Question Input" 
                            className="w-full bg-slate-900 px-5 py-3 rounded-2xl border border-slate-800 outline-none text-slate-200 font-medium text-sm focus:border-indigo-500 h-24 resize-y transition-all"
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
                                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                  className="flex-1 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 outline-none text-xs text-slate-300 focus:border-indigo-500/50 transition-all"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Payload Image URL (Optional)</label>
                            <input 
                              type="url" 
                              value={currentQuestion.imageUrl || ''} 
                              onChange={(e) => setCurrentQuestion({ ...currentQuestion, imageUrl: e.target.value })} 
                              placeholder="https://example.com/image.png"
                              className="w-full bg-slate-900 px-5 py-3 rounded-2xl border border-slate-800 outline-none text-slate-300 font-medium text-xs focus:border-indigo-500 transition-all"
                            />
                          </div>

                          <button 
                            type="button" 
                            onClick={addOrUpdateQuestion}
                            className="w-full mt-2 py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                          >
                            {editingQuestionIndex !== null ? 'Sync Payload' : 'Merge into Registry'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Integrated questions list inside this event */}
                    <div className="space-y-3">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center bg-slate-950 px-3 py-2 rounded-xl">
                         <span>Payload Registry ({eventData.questions?.length || 0})</span>
                         <span className="font-mono text-[9px] text-[#D4AF37] lowercase">built indices</span>
                       </p>
                       <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
                         {eventData.questions?.map((q, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/30 rounded-xl border border-slate-800 hover:border-slate-600 transition-all group">
                             <p className="text-xs text-slate-400 truncate flex-1 pr-4 flex items-center gap-1">
                               <span>{idx + 1}.</span> <MathRenderer content={q.text} engine={mathEngine} className="inline-block" />
                             </p>
                             <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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

              {/* Action Toolbar on Drafts & Deploy Options */}
              <div className="p-6 border-t border-slate-800 bg-slate-950/20 flex flex-wrap gap-4">
                 <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-950 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-800">
                   Abort
                 </button>
                 <button 
                   type="button" 
                   onClick={() => handleSaveData(true)}
                   className="flex-1 py-4 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-500 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                 >
                   Save as Draft
                 </button>
                 <button 
                   type="button" 
                   onClick={() => handleSaveData(false)}
                   className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]"
                 >
                   Deploy & Publish Event
                 </button>
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
                                        <span className="text-lg font-black text-indigo-400">{Number(res.score).toFixed(2)}</span>
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
        {filteredEvents.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-950/20 border border-slate-800 border-dashed rounded-[2rem]">
            <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">No events found in this section</p>
          </div>
        ) : (
          filteredEvents.map((e) => (
            <div key={e.id} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 hover:border-indigo-500/30 transition-all group relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                  <Trophy className="w-32 h-32" />
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                    e.isDraft ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    e.status === 'upcoming' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    e.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' :
                    'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    {e.isDraft ? 'Draft' : e.status}
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

              <h3 className="font-bold text-white text-xl mb-1 tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{e.title}</h3>
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
                  {e.isDraft ? (
                    isFullAdmin && (
                      <button 
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to publish the event "${e.title}" to all students?`)) {
                            await updateDoc(doc(db, 'events', e.id), { isDraft: false });
                          }
                        }}
                        className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-[10px] hover:bg-emerald-500 transition-all active:scale-[0.98] uppercase tracking-widest"
                      >
                        Publish Event
                      </button>
                    )
                  ) : (
                    <button 
                      onClick={() => startEdit(e)}
                      className="flex-1 bg-slate-950 text-slate-500 border border-slate-800 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-slate-800 transition-all active:scale-[0.98]"
                    >
                      Regulate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function ResourceManager({ resources, onDelete }: { resources: Resource[], onDelete: (id: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ title: '', url: '', category: ALL_SUBJECTS[0] || 'Physics', size: '' });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'resources'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setFormData({ title: '', url: '', category: ALL_SUBJECTS[0] || 'Physics', size: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resources');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Active Asset Registry</h2>
          <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-[0.1em]">Total PDF Nodes: {filteredResources.length}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-64 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Library..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-xs text-slate-300 shadow-inner"
            />
          </div>
          <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95">
            <Plus className="w-4 h-4" />
            <span>Ingest New Asset</span>
          </button>
        </div>
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Classification Target (Subject)</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none transition-all font-bold text-slate-200 appearance-none">
                      {ALL_SUBJECTS.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
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
        {filteredResources.map(r => (
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
                className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800 hover:border-rose-500/20 shadow-sm"
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
