import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Gender, Group } from '../types';
import { User, Phone, School, GraduationCap, Users, Save, CheckCircle2, Trash2, AlertTriangle, X, Settings, LogOut, Lock, ShieldCheck, Mail, Calendar, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

interface ProfileProps {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
}

export default function Profile({ profile, setProfile }: ProfileProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<'profile' | 'settings'>('profile');
  const [formData, setFormData] = useState({
    gender: profile?.gender || 'Male' as Gender,
    phone: profile?.phone || '',
    class: profile?.class || 'Class 9',
    school: profile?.school || '',
    group: profile?.group || 'Science' as Group,
    mathEngine: profile?.mathEngine || 'katex',
  });
  
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTimer, setDeleteTimer] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [admins, setAdmins] = useState<any[]>([]);

  useEffect(() => {
    if (view === 'settings') {
      const fetchAdmins = async () => {
        const q = query(collection(db, 'admins'));
        const snapshot = await getDocs(q);
        setAdmins(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      };
      fetchAdmins();
    }
  }, [view]);

  useEffect(() => {
    let timer: any;
    if (showDeleteConfirm && deleteTimer < 5) {
      timer = setInterval(() => {
        setDeleteTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showDeleteConfirm, deleteTimer]);

  const calculateCompletion = () => {
    const fields = [
      profile?.displayName,
      profile?.email,
      formData.gender,
      formData.phone,
      formData.class,
      formData.school,
      formData.group,
      profile?.photoURL
    ];
    const filledFields = fields.filter(f => f && f.toString().trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completion = calculateCompletion();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile || deleteTimer > 0) return;
    setDeleting(true);
    try {
      const batch = writeBatch(db);
      const uid = profile.uid;

      const collectionName = profile.role === 'admin' ? 'admins' : 'students';
      batch.delete(doc(db, collectionName, uid));

      const collectionsToDelete = ['results', 'payments', 'submissions', 'feedback'];
      for (const coll of collectionsToDelete) {
        const q = query(collection(db, coll), where('uid', '==', uid));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(d => batch.delete(d.ref));
      }

      await batch.commit();
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    setError('');
    try {
      // Re-authenticate user first (security requirement for password change)
      const credential = EmailAuthProvider.credential(profile.email, passwords.oldPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwords.newPassword);
      
      setMessage('Password updated successfully!');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Check your current password.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.phone.trim() || !formData.school.trim()) {
      setError('Please fill in all required fields (Phone and Institution).');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const collectionName = profile.role === 'admin' ? 'admins' : 'students';
      await updateDoc(doc(db, collectionName, profile.uid), formData);
      const updatedProfile = { ...profile, ...formData };
      setProfile(updatedProfile);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const collectionName = profile.role === 'admin' ? 'admins' : 'students';
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${profile.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const isPreviewMode = localStorage.getItem('admin_preview_mode') === 'true';
  const isAdmin = profile?.role === 'admin';

  return (
    <div className={`space-y-6 pb-20 pt-4 ${isAdmin && !isPreviewMode ? 'mt-8' : ''}`}>
      {isAdmin && !isPreviewMode && (
        <div className="max-w-2xl mx-auto px-1">
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-3 text-gray-500 hover:text-[#7A4900] transition-colors mb-2 group"
          >
            <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 group-hover:border-[#D4AF37]/30 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Control Center</span>
          </button>
        </div>
      )}
      {/* Dynamic Header */}
      <header className="relative overflow-hidden bg-white px-6 py-10 rounded-[2rem] shadow-sm border border-gray-100 text-center">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => {
                setView('profile');
                setShowDeleteConfirm(false);
              }}
              className={`p-2 rounded-xl transition-all ${view === 'profile' ? 'bg-transparent text-transparent pointer-events-none' : 'bg-gray-50 text-gray-400 hover:text-[#7A4900]'}`}
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-[#7A4900] font-serif">
              {view === 'profile' ? 'Academy ID' : 'System Settings'}
            </h1>
            <button 
              onClick={() => setView(view === 'profile' ? 'settings' : 'profile')}
              className={`p-2 rounded-xl transition-all ${view === 'settings' ? 'bg-[#7A4900] text-white shadow-lg' : 'bg-gray-50 text-[#7A4900] hover:bg-gray-100'}`}
            >
              <Settings className={`w-6 h-6 ${view === 'settings' ? 'animate-spin-slow' : ''}`} />
            </button>
          </div>

          <div className="relative inline-block mb-4">
            <motion.div
              layoutId="avatar"
              className="relative"
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover mx-auto" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center mx-auto">
                  <User className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white shadow-sm" />
            </motion.div>
          </div>
          
          <h2 className="text-2xl font-bold text-[#7A4900] mb-1">{profile?.displayName}</h2>
          <p className="text-sm font-medium text-gray-400 mb-4">{profile?.email}</p>
          
          <div className="flex justify-center space-x-2">
            <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#7A4900] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#D4AF37]/20">
              {profile?.role}
            </span>
            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
              Active
            </span>
          </div>
        </div>
        
        <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 text-gray-50 opacity-10 pointer-events-none" />
      </header>

      <AnimatePresence mode="wait">
        {view === 'profile' ? (
          <motion.div
            key="profile-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 text-center">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Academic Status</p>
                <p className="font-bold text-[#7A4900]">{profile?.class}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 text-center">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Verified Since</p>
                <p className="font-bold text-[#7A4900]">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {/* Profile Completion Card */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#7A4900] flex items-center space-x-2">
                  <Info className="w-4 h-4" />
                  <span>Profile Completion</span>
                </h3>
                <span className={`text-sm font-bold ${completion === 100 ? 'text-green-600' : 'text-[#D4AF37]'}`}>{completion}%</span>
              </div>
              <div className="h-2 bg-gray-50 rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${completion}%` }}
                  className={`h-full ${completion === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B]'}`}
                />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed italic">
                {completion === 100 
                  ? "Outstanding! Your profile is fully curated. You are ready for all academy events." 
                  : "Complete your profile details in settings to unlock exclusive features and identity badges."}
              </p>
            </div>

            {/* Account Information Card */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
              <h3 className="font-bold text-[#7A4900] border-b pb-4">Personal Credentials</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-50 rounded-lg"><Users className="w-4 h-4 text-gray-400" /></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Gender Identity</p>
                    <p className="text-sm font-bold text-[#7A4900]">{profile?.gender || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-50 rounded-lg"><Phone className="w-4 h-4 text-gray-400" /></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Contact Link</p>
                    <p className="text-sm font-bold text-[#7A4900]">{profile?.phone || 'No phone registered'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-50 rounded-lg"><School className="w-4 h-4 text-gray-400" /></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Current Institution</p>
                    <p className="text-sm font-bold text-[#7A4900]">{profile?.school || 'Academic institution not listed'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            {/* Action Card: Edit Details */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <Save className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-[#7A4900]">Update Details</h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Current Class</label>
                    <select
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
                    >
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="SSC Candidate">SSC Candidate</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Institution</label>
                    <input
                      type="text"
                      value={formData.school}
                      onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
                      placeholder="Enter school name"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#7A4900] text-white py-4 rounded-2xl font-bold hover:bg-[#5a3600] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{saving ? 'Syncing...' : 'Save Academic Details'}</span>
                </button>
              </form>
            </div>

            {/* Action Card: Security/Password */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <Lock className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-[#7A4900]">Security Shield</h3>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <input
                  type="password"
                  placeholder="Legacy (Old) Password"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
                  required
                />
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="password"
                    placeholder="Novel (New) Password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Verify New Password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full bg-white border-2 border-[#7A4900] text-[#7A4900] py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {updatingPassword ? <div className="w-5 h-5 border-2 border-[#7A4900] border-t-transparent rounded-full animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  <span>{updatingPassword ? 'Authenticating...' : 'Rotate Password'}</span>
                </button>
              </form>
            </div>

            {/* Admin Information Area */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="font-bold text-[#7A4900] mb-6 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span>Active Curators (Admins)</span>
              </h3>
              <div className="space-y-4">
                {admins.length > 0 ? admins.map((admin) => (
                  <div key={admin.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-2xl">
                    <img src={admin.photoURL || `https://ui-avatars.com/api/?name=${admin.displayName}`} className="w-10 h-10 rounded-xl" alt="" />
                    <div>
                      <p className="text-sm font-bold text-[#7A4900]">{admin.displayName}</p>
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-tighter">{admin.adminType || 'Super'} Curator</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400 italic">No other admins are listed.</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="space-y-3">
              <button 
                onClick={handleLogout}
                className="w-full bg-gray-100 text-[#7A4900] py-5 rounded-[2rem] font-bold hover:bg-gray-200 transition-all flex items-center justify-center space-x-3"
              >
                <LogOut className="w-6 h-6" />
                <span>Secure Log Out</span>
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteTimer(5);
                }}
                className="w-full text-red-400 font-bold py-4 hover:text-red-600 transition-all text-xs"
              >
                Remove Academic Record (Delete Account)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistence Messages */}
      <div className="fixed bottom-32 left-0 right-0 pointer-events-none px-6 z-[60]">
        <AnimatePresence>
          {message && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-green-500 text-white p-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm mx-auto">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold text-sm">{message}</span>
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm mx-auto">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-bold text-sm">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 text-center relative border-4 border-red-50"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Trash2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-[#7A4900] mb-4">Irreversible Action</h2>
              <p className="text-[#545454] text-sm leading-relaxed mb-10 opacity-70">
                You are about to purge your entire academic record. This includes all exam history, verified certificates, and performance metrics. This action is terminal.
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteTimer < 5}
                  className={`w-full py-5 rounded-[2rem] font-bold transition-all flex items-center justify-center space-x-3 shadow-xl ${
                    deleteTimer < 5 
                    ? 'bg-gray-100 text-gray-400 opacity-50' 
                    : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                  }`}
                >
                  {deleting ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-6 h-6" />
                      <span>{deleteTimer < 5 ? `Safety Protocol: Synchronizing (${deleteTimer}/5)` : 'Confirm Permanent Deletion'}</span>
                      {deleteTimer > 0 && <span className="text-sm opacity-50">{deleteTimer}s</span>}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 text-gray-400 font-bold hover:text-[#7A4900] transition-all"
                >
                  Retreat (Cancel)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
