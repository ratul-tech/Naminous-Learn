import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Gender, Group } from '../types';
import { User, Phone, School, GraduationCap, Users, Save, CheckCircle2, Trash2, AlertTriangle, X, Settings, LogOut, Lock, ShieldCheck, Mail, Calendar, Info, ArrowLeft } from 'lucide-react';
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
    if (showDeleteConfirm && deleteTimer > 0) {
      timer = setInterval(() => {
        setDeleteTimer((prev) => prev - 1);
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

  const deleteAuthUser = async (uid: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
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
      }
      return true;
    } catch (error) {
      console.error('Error in deleteAuthUser:', error);
      return false;
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile || deleteTimer > 0) return;
    setDeleting(true);
    try {
      const uid = profile.uid;
      // Backend handles everything now
      await deleteAuthUser(uid);
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
    <div className={`space-y-8 pb-24 pt-6 ${isAdmin && !isPreviewMode ? 'mt-8' : ''}`}>
      {isAdmin && !isPreviewMode && (
        <div className="max-w-2xl mx-auto px-4">
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-4 group"
          >
            <div className="p-2.5 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 group-hover:border-[#D4AF37]/40 transition-all active:scale-95">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Return to Control Center</span>
          </button>
        </div>
      )}

      {/* Dynamic Header */}
      <header className="relative overflow-hidden bg-slate-900 px-8 py-14 rounded-[3rem] shadow-2xl border border-slate-800 text-center group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-10">
            <button 
              onClick={() => {
                setView('profile');
                setShowDeleteConfirm(false);
              }}
              className={`p-3 rounded-2xl transition-all ${view === 'profile' ? 'bg-transparent text-transparent pointer-events-none opacity-0' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
            >
              <X className="w-7 h-7" />
            </button>
            <h1 className="text-3xl font-bold text-white font-serif tracking-tight">
              {view === 'profile' ? 'Academy ID' : 'System Settings'}
            </h1>
            <button 
              onClick={() => setView(view === 'profile' ? 'settings' : 'profile')}
              className={`p-3 rounded-2xl transition-all relative ${view === 'settings' ? 'bg-[#D4AF37] text-slate-950 shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
            >
              <Settings className={`w-7 h-7 ${view === 'settings' ? 'animate-spin-slow' : ''}`} />
              {completion < 100 && view === 'profile' && <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 animate-pulse" />}
            </button>
          </div>

          <div className="relative inline-block mb-6">
            <motion.div
              layoutId="avatar"
              className="relative p-1 bg-gradient-to-tr from-amber-500 via-[#D4AF37] to-amber-200 rounded-full shadow-2xl"
            >
              <div className="bg-slate-900 rounded-full p-1">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-32 h-32 rounded-full object-cover mx-auto ring-4 ring-slate-900" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center mx-auto ring-4 ring-slate-900">
                    <User className="w-16 h-16 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-slate-900 shadow-lg animate-pulse" />
            </motion.div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2 font-serif tracking-tight">{profile?.displayName}</h2>
          <p className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-widest">{profile?.email}</p>
          
          <div className="flex justify-center space-x-3">
            <span className="px-5 py-2 bg-amber-500/10 text-[#D4AF37] rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/20 shadow-lg">
              {profile?.role}
            </span>
            <span className="px-5 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-lg">
              Authorized
            </span>
          </div>
        </div>
        
        <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 text-white opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-[2000ms]" />
      </header>

      <AnimatePresence mode="wait">
        {view === 'profile' ? (
          <motion.div
            key="profile-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-800 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-lg">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Academic Status</p>
                  <p className="text-xl font-bold text-white font-serif">{profile?.class}</p>
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-800 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-lg">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Enrolled Since</p>
                  <p className="text-xl font-bold text-white font-serif">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Profile Completion Card */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                <Info className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white font-serif flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Integrity Meter</span>
                  </h3>
                  <span className={`text-xl font-black ${completion === 100 ? 'text-emerald-400' : 'text-[#D4AF37] font-serif'}`}>{completion}%</span>
                </div>
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden mb-6 border border-slate-800 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    className={`h-full relative ${completion === 100 ? 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-amber-600 to-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]'}`}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </motion.div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {completion === 100 
                    ? "Exceptional! Your academic identity is fully verified and synchronized across the mainframe." 
                    : "Finalize your institutional details to achieve full verification and unlock priority access tickets."}
                </p>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-800 space-y-8">
              <h3 className="text-xl font-bold text-white font-serif border-b border-slate-800 pb-6 flex items-center justify-between">
                <span>Personal Dossier</span>
                <Users className="w-6 h-6 text-slate-700" />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-start space-x-4 group/item">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 group-hover/item:border-amber-500/50 transition-colors"><Users className="w-5 h-5 text-slate-500" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gender</p>
                    <p className="text-base font-bold text-white">{profile?.gender || 'Unspecified'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 group/item">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 group-hover/item:border-emerald-500/50 transition-colors"><Phone className="w-5 h-5 text-slate-500" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Encrypted Link</p>
                    <p className="text-base font-bold text-white">{profile?.phone || 'No active link'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 group/item">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 group-hover/item:border-blue-500/50 transition-colors"><School className="w-5 h-5 text-slate-500" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Home Institution</p>
                    <p className="text-base font-bold text-white line-clamp-1">{profile?.school || 'Private Enrolment'}</p>
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
            className="space-y-8"
          >
            {/* Action Card: Edit Details */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-800">
              <div className="flex items-center space-x-4 mb-10">
                <div className="w-12 h-12 bg-amber-500/10 text-[#D4AF37] rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-lg">
                  <Save className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-serif">Credential Update</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adjust your academic identity</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Academic Tier</label>
                    <select
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-950 border-2 border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm shadow-inner cursor-pointer"
                    >
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="SSC Candidate">SSC Candidate</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Communication Link</label>
                    <div className="relative">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-16 pr-6 py-5 rounded-[1.5rem] bg-slate-950 border-2 border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm shadow-inner"
                        placeholder="Enter primary mobile"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Institution Name</label>
                    <div className="relative">
                      <School className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input
                        type="text"
                        value={formData.school}
                        onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                        className="w-full pl-16 pr-6 py-5 rounded-[1.5rem] bg-slate-950 border-2 border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm shadow-inner"
                        placeholder="Verified institution name"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#D4AF37] text-slate-950 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-amber-400 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 shadow-[0_10px_20px_rgba(212,175,55,0.2)] active:scale-95 group/btn"
                >
                  {saving ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5 group-hover/btn:scale-125 transition-transform" />}
                  <span>{saving ? 'Synchronizing...' : 'Commit Data Changes'}</span>
                </button>
              </form>
            </div>

            {/* Action Card: Security/Password */}
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-800">
              <div className="flex items-center space-x-4 mb-10">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-lg">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-serif">Security Protocol</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rotate your authentication keys</p>
                </div>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <input
                  type="password"
                  placeholder="Legacy (Existing) Password"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                  className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-950 border-2 border-slate-800 focus:border-emerald-500 text-white outline-none transition-all font-bold text-sm shadow-inner"
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input
                    type="password"
                    placeholder="Novel Strategy (New Password)"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-950 border-2 border-slate-800 focus:border-emerald-500 text-white outline-none transition-all font-bold text-sm shadow-inner"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Verify New Strategy"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-950 border-2 border-slate-800 focus:border-emerald-500 text-white outline-none transition-all font-bold text-sm shadow-inner"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full bg-slate-950 border-2 border-emerald-500/50 text-emerald-400 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center space-x-3 disabled:opacity-50 active:scale-95 group/btn"
                >
                  {updatingPassword ? <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <ShieldCheck className="w-5 h-5 group-hover/btn:scale-125 transition-transform" />}
                  <span>{updatingPassword ? 'Authenticating...' : 'Re-secure Identity'}</span>
                </button>
              </form>
            </div>

            {/* Admin Information Area */}
            {isAdmin && (
              <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-800">
                <h3 className="text-xl font-bold text-white font-serif mb-8 flex items-center space-x-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg"><ShieldCheck className="w-6 h-6 text-purple-400" /></div>
                  <span>Mainframe Curators</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {admins.length > 0 ? admins.map((admin) => (
                    <div key={admin.id} className="flex items-center space-x-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 group hover:border-purple-500/30 transition-all">
                      <img 
                        src={admin.photoURL || `https://ui-avatars.com/api/?name=${admin.displayName}`} 
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-800 group-hover:ring-purple-500/50 transition-all" 
                        alt="" 
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-sm font-bold text-white line-clamp-1">{admin.displayName}</p>
                        <div className="flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          <p className="text-[9px] font-black text-purple-500 uppercase tracking-tighter">{admin.adminType || 'Super'} Curator</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 italic py-4">No other curators identified.</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-4 pt-6">
              <button 
                onClick={handleLogout}
                className="w-full bg-slate-800 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-slate-700 transition-all flex items-center justify-center space-x-4 border border-slate-700 shadow-xl active:scale-[0.98]"
              >
                <LogOut className="w-6 h-6 mb-0.5" />
                <span>Deactivate Session</span>
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteTimer(5);
                }}
                className="w-full text-rose-500 font-bold py-4 hover:text-rose-400 transition-all text-[10px] uppercase tracking-[0.3em] font-black opacity-60 hover:opacity-100"
              >
                Purge Academic History (Unregister)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistence Messages */}
      <div className="fixed bottom-32 left-0 right-0 pointer-events-none px-6 z-[60]">
        <AnimatePresence>
          {message && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-emerald-600 text-white p-5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center space-x-4 max-w-md mx-auto border border-emerald-500/30">
              <div className="p-2 bg-white/20 rounded-lg"><CheckCircle2 className="w-6 h-6" /></div>
              <span className="font-bold text-sm uppercase tracking-wide">{message}</span>
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-rose-600 text-white p-5 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center space-x-4 max-w-md mx-auto border border-rose-500/30">
              <div className="p-2 bg-white/20 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
              <span className="font-bold text-sm uppercase tracking-wide">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 100 }}
              className="bg-slate-900 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] max-w-lg w-full p-12 text-center relative border border-slate-800"
            >
              <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-rose-500/20 shadow-2xl rotate-45 transform">
                <Trash2 className="w-12 h-12 -rotate-45" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-6 font-serif">Terminal Protocol</h2>
              <p className="text-slate-400 text-base leading-relaxed mb-12 font-medium">
                You are about to initiate total data erasure. This includes all <span className="text-white font-bold">exam history</span>, <span className="text-white font-bold">unlocked credentials</span>, and <span className="text-white font-bold">identity badges</span>. This action is definitive and non-reversible.
              </p>

              <div className="space-y-6">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteTimer > 0}
                  className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] transition-all flex items-center justify-center space-x-4 shadow-2xl ${
                    deleteTimer > 0 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
                    : 'bg-rose-600 text-white hover:bg-rose-500 active:scale-95 shadow-red-900/40'
                  }`}
                >
                  {deleting ? (
                    <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-7 h-7" />
                      <span>{deleteTimer > 0 ? `Authorizing (${deleteTimer}s)` : 'Confirm Erasure'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 text-slate-500 font-bold hover:text-white transition-all text-sm uppercase tracking-widest"
                >
                  Terminate Protocol (Cancel)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

  );
}
