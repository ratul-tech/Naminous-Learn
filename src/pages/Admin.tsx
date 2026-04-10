import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Question, UserProfile, Payment, ExamEvent, Feedback } from '../types';
import { Plus, Trash2, CheckCircle2, XCircle, Users, User, BookOpen, CreditCard, Calendar, Settings, MessageSquare, AlertCircle, Shield, Edit, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'questions' | 'users' | 'payments' | 'events' | 'feedback' | 'admins'>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
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
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#7A4900]">Admin Control Center</h1>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border overflow-x-auto max-w-full">
          <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} icon={BookOpen} label="Questions" />
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Students" />
          <TabButton active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} icon={Shield} label="Admins" />
          <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={CreditCard} label="Payments" />
          <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={Calendar} label="Events" />
          <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} icon={MessageSquare} label="Feedback" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'questions' && <QuestionManager key="questions" questions={questions} onDelete={handleDeleteQuestion} />}
        {activeTab === 'users' && <UserManager key="users" users={users} onDelete={handleDeleteStudent} />}
        {activeTab === 'admins' && <AdminManager key="admins" admins={admins} onDelete={handleDeleteAdmin} />}
        {activeTab === 'payments' && <PaymentManager key="payments" payments={payments} onApprove={handleApprovePayment} onReject={handleRejectPayment} />}
        {activeTab === 'events' && <EventManager key="events" events={events} />}
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

function QuestionManager({ questions, onDelete }: { questions: Question[], onDelete: (id: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'Board' as any,
    board: 'Dhaka',
    college: 'NDC',
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'questions'), {
        ...newQ,
        createdAt: new Date().toISOString(),
      });
      setShowAdd(false);
      setNewQ({ text: '', options: ['', '', '', ''], correctAnswer: 0, category: 'Board', board: 'Dhaka', college: 'NDC' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questions');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#7A4900]">Manage Questions ({questions.length})</h2>
        <button onClick={() => setShowAdd(true)} className="bg-[#D4AF37] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-[#B8860B]">
          <Plus className="w-4 h-4" />
          <span>Add Question</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-[#D4AF37]">
          <form onSubmit={handleAdd} className="space-y-4">
            <input
              type="text"
              value={newQ.text}
              onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
              placeholder="Question Text"
              className="w-full px-4 py-2 rounded-lg border outline-none"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              {newQ.options.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const opts = [...newQ.options];
                    opts[i] = e.target.value;
                    setNewQ({ ...newQ, options: opts });
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="w-full px-4 py-2 rounded-lg border outline-none"
                  required
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <select
                value={newQ.correctAnswer}
                onChange={(e) => setNewQ({ ...newQ, correctAnswer: parseInt(e.target.value) })}
                className="px-4 py-2 rounded-lg border outline-none"
              >
                {newQ.options.map((_, i) => <option key={i} value={i}>Correct: {String.fromCharCode(65 + i)}</option>)}
              </select>
              <select
                value={newQ.category}
                onChange={(e) => setNewQ({ ...newQ, category: e.target.value as any })}
                className="px-4 py-2 rounded-lg border outline-none"
              >
                <option value="Board">Board</option>
                <option value="College Admission">College Admission</option>
              </select>
              {newQ.category === 'Board' ? (
                <input
                  type="text"
                  value={newQ.board}
                  onChange={(e) => setNewQ({ ...newQ, board: e.target.value })}
                  placeholder="Board Name"
                  className="px-4 py-2 rounded-lg border outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={newQ.college}
                  onChange={(e) => setNewQ({ ...newQ, college: e.target.value })}
                  placeholder="College Name"
                  className="px-4 py-2 rounded-lg border outline-none"
                />
              )}
            </div>
            <div className="flex justify-end space-x-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
              <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded-lg font-bold">Save Question</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y">
          {questions.map((q) => (
            <div key={q.id} className="p-6 flex justify-between items-start hover:bg-gray-50 transition-colors">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-gray-100 rounded text-gray-600">{q.category}</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-blue-50 rounded text-blue-600">{q.board || q.college}</span>
                </div>
                <h3 className="font-bold text-[#7A4900] mb-2">{q.text}</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {q.options.map((opt, i) => (
                    <p key={i} className={`text-sm ${i === q.correctAnswer ? 'text-green-600 font-bold' : 'text-[#545454]'}`}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </p>
                  ))}
                </div>
              </div>
              <button onClick={() => onDelete(q.id)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
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

function AdminManager({ admins, onDelete }: { admins: UserProfile[], onDelete: (uid: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use a secondary app instance to create user without signing out current admin
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="px-4 py-2 rounded-lg border outline-none" required />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="px-4 py-2 rounded-lg border outline-none" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" title="Minimum 6 characters" className="px-4 py-2 rounded-lg border outline-none" required minLength={6} />
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
        <table className="w-full text-left">
          <thead className="bg-[#f5f5f0] text-[#7A4900] uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Admin</th>
              <th className="px-6 py-4">Email</th>
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
                <td className="px-6 py-4 text-sm text-[#545454]">{a.email}</td>
                <td className="px-6 py-4 text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <button onClick={() => onDelete(a.uid)} className="p-2 text-red-400 hover:text-red-600 rounded-lg transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-left">
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
    </motion.div>
  );
}

function EventManager({ events }: { events: ExamEvent[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newE, setNewE] = useState({
    title: '',
    description: '',
    entryFee: 100,
    startTime: '',
    duration: 60,
    maxCandidates: 100,
    prize: '',
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'events'), {
        ...newE,
        status: 'upcoming',
        createdAt: new Date().toISOString(),
      });
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#7A4900]">Manage Events ({events.length})</h2>
        <button onClick={() => setShowAdd(true)} className="bg-[#D4AF37] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-[#B8860B]">
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-[#D4AF37]">
          <form onSubmit={handleAdd} className="space-y-4">
            <input type="text" value={newE.title} onChange={(e) => setNewE({ ...newE, title: e.target.value })} placeholder="Event Title" className="w-full px-4 py-2 rounded-lg border outline-none" required />
            <textarea value={newE.description} onChange={(e) => setNewE({ ...newE, description: e.target.value })} placeholder="Description" className="w-full px-4 py-2 rounded-lg border outline-none" required />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input type="number" value={newE.entryFee} onChange={(e) => setNewE({ ...newE, entryFee: parseInt(e.target.value) })} placeholder="Entry Fee" className="px-4 py-2 rounded-lg border outline-none" required />
              <input type="datetime-local" value={newE.startTime} onChange={(e) => setNewE({ ...newE, startTime: e.target.value })} className="px-4 py-2 rounded-lg border outline-none" required />
              <input type="number" value={newE.duration} onChange={(e) => setNewE({ ...newE, duration: parseInt(e.target.value) })} placeholder="Duration (min)" className="px-4 py-2 rounded-lg border outline-none" required />
              <input type="text" value={newE.prize} onChange={(e) => setNewE({ ...newE, prize: e.target.value })} placeholder="Prize Details" className="px-4 py-2 rounded-lg border outline-none" required />
            </div>
            <div className="flex justify-end space-x-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
              <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded-lg font-bold">Create Event</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((e) => (
          <div key={e.id} className="bg-white p-6 rounded-2xl shadow-sm border hover:border-[#D4AF37] transition-all">
            <h3 className="font-bold text-[#7A4900] text-lg mb-2">{e.title}</h3>
            <p className="text-sm text-[#545454] mb-4 line-clamp-2">{e.description}</p>
            <div className="flex justify-between items-center text-xs font-bold text-[#D4AF37]">
              <span>{new Date(e.startTime).toLocaleString()}</span>
              <span>Tk {e.entryFee}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
