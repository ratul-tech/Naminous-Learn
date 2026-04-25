import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Question, UserProfile, Payment, ExamEvent, Feedback } from '../types';
import { Plus, Trash2, CheckCircle2, XCircle, Users, User, BookOpen, CreditCard, Calendar, Settings, MessageSquare, AlertCircle, Shield, Edit, Save, X, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';
import { MathRenderer } from '../components/MathRenderer';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'events' | 'feedback' | 'admins'>('users');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [registrationTrend, setRegistrationTrend] = useState<{ date: string, count: number }[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    const unsubQuestions = onSnapshot(query(collection(db, 'questions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'students'), orderBy('createdAt', 'desc')), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
      setUsers(fetchedUsers);
      
      // Calculate 30-day registration trend
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const trend = last30Days.map(date => {
        const count = fetchedUsers.filter(u => u.createdAt?.startsWith(date)).length;
        return { 
          date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), 
          count 
        };
      });
      setRegistrationTrend(trend);
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

    setLoading(false);
    return () => {
      unsubQuestions();
      unsubUsers();
      unsubAdmins();
      unsubPayments();
      unsubEvents();
      unsubFeedback();
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
    const mainAdminEmail = 'shahriarislamratul065@gmail.com';
    const isMainAdmin = auth.currentUser?.email?.toLowerCase() === mainAdminEmail.toLowerCase();
    const targetAdmin = admins.find(a => a.uid === uid);
    
    if (uid === auth.currentUser?.uid) {
      setConfirmModal({
        show: true,
        title: 'Action Prohibited',
        message: 'You cannot delete your own administrator account while logged in.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    if (!isMainAdmin) {
      setConfirmModal({
        show: true,
        title: 'Access Denied',
        message: 'Only the main administrator can remove other administrator accounts.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    if (targetAdmin?.email.toLowerCase() === mainAdminEmail.toLowerCase()) {
      setConfirmModal({
        show: true,
        title: 'Action Prohibited',
        message: 'The main administrator account cannot be deleted.',
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#7A4900]">Admin Control Center</h1>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border overflow-x-auto max-w-full">
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Students" />
          <TabButton active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} icon={Shield} label="Admins" />
          <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={CreditCard} label="Payments" />
          <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={Calendar} label="Events" />
          <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} icon={MessageSquare} label="Feedback" />
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
      
      {/* Registration Trend Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#7A4900]">Registration Trend</h2>
            <p className="text-xs text-gray-400">New student registrations over the past 30 days</p>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={registrationTrend}>
              <defs>
                <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7A4900" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#7A4900" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval={4}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#7A4900' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                name="New Students"
                stroke="#7A4900" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRegistrations)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && <UserManager key="users" users={users} onDelete={handleDeleteStudent} />}
        {activeTab === 'admins' && <AdminManager key="admins" admins={admins} onDelete={handleDeleteAdmin} onActivate={handleActivateAdmin} />}
        {activeTab === 'payments' && <PaymentManager key="payments" payments={payments} onApprove={handleApprovePayment} onReject={handleRejectPayment} />}
        {activeTab === 'events' && <EventManager key="events" events={events} onDelete={handleDeleteEvent} />}
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-2xl font-bold text-[#7A4900]">{value}</h3>
          <p className="text-[10px] text-gray-400 font-medium">{description}</p>
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

function AdminManager({ admins, onDelete, onActivate }: { admins: UserProfile[], onDelete: (uid: string) => void, onActivate: (uid: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminType, setAdminType] = useState<'full' | 'question_holder'>('question_holder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      
      // Sign out from secondary app to clean up
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#7A4900]">Manage Admins ({admins.length})</h2>
        <button onClick={() => setShowAdd(true)} className="bg-[#7A4900] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-black transition-all">
          <Plus className="w-4 h-4" />
          <span>Add New Admin</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-[#7A4900]">
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="px-4 py-3 rounded-xl border outline-none" required />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="px-4 py-3 rounded-xl border outline-none" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" title="Minimum 6 characters" className="px-4 py-3 rounded-xl border outline-none" required minLength={6} />
              <select 
                value={adminType} 
                onChange={(e) => setAdminType(e.target.value as any)}
                className="px-4 py-3 rounded-xl border outline-none font-bold text-[#7A4900]"
              >
                <option value="full">Full Admin</option>
                <option value="question_holder">Question Holder</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <div className="flex justify-end space-x-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
              <button type="submit" disabled={loading} className="bg-[#7A4900] text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Admin Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Admin</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {admins.map((a) => (
              <tr key={a.uid} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <img src={a.photoURL || undefined} alt="" className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                    <span className="font-bold text-[#7A4900]">{a.displayName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                    a.adminType === 'full' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {a.adminType === 'full' ? 'Full Admin' : 'Question Holder'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[#545454]">{a.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                    a.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {a.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {a.status === 'pending' && (
                      <button 
                        onClick={() => onActivate(a.uid)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        title="Activate Admin"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={() => onDelete(a.uid)} className="p-2 text-red-400 hover:text-red-600 rounded-lg transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <h2 className="text-xl font-bold text-[#7A4900]">Student Management ({users.length})</h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Class/Group</th>
                <th className="px-6 py-4">Institution</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full border border-gray-100" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[#7A4900]">{u.displayName}</p>
                        <p className="text-xs text-[#545454]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{u.class}</p>
                    <p className="text-xs text-[#545454]">{u.group}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">{u.school}</td>
                  <td className="px-6 py-4 text-sm">{u.phone || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(u)} className="p-2 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-all">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => onDelete(u.uid)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-5 h-5" />
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
                    <input
                      type="text"
                      value={editData.class}
                      onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
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
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-xs font-bold">
          <tr>
            <th className="px-6 py-4">User ID</th>
            <th className="px-6 py-4">Method</th>
            <th className="px-6 py-4">Trx ID</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-mono">{p.uid.slice(0, 8)}...</td>
              <td className="px-6 py-4 font-bold">{p.method}</td>
              <td className="px-6 py-4 font-mono text-sm">{p.trxId}</td>
              <td className="px-6 py-4">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  p.status === 'approved' ? 'bg-green-100 text-green-600' :
                  p.status === 'rejected' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {p.status}
                </span>
              </td>
              <td className="px-6 py-4">
                {p.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button onClick={() => onApprove(p.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle2 className="w-5 h-5" /></button>
                    <button onClick={() => onReject(p.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle className="w-5 h-5" /></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </motion.div>
  );
}

function EventManager({ events, onDelete }: { events: ExamEvent[], onDelete: (id: string) => void }) {
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
        <button onClick={() => setShowForm(true)} className="bg-[#D4AF37] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-[#B8860B]">
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>
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
                          <MathRenderer content={q.text} className="text-[#545454] line-clamp-2 inline" />
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
            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => startEdit(e)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg">
                <Edit className="w-5 h-5" />
              </button>
              <button onClick={() => onDelete(e.id)} className="p-2 text-red-100 hover:text-red-600 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </button>
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
            <h3 className="font-bold text-[#7A4900] text-lg mb-2">{e.title}</h3>
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
