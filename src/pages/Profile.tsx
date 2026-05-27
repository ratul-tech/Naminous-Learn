import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Gender, Group, MathEngine } from '../types';
import { 
  User, Phone, School, GraduationCap, Users, Save, CheckCircle2, 
  Trash2, AlertTriangle, X, Settings, LogOut, Lock, ShieldCheck, 
  Mail, Calendar, Trophy, BookOpen, KeyRound, Palette, Sparkles, Check, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

interface ProfileProps {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
}

const AVATAR_PRESETS = [
  { name: 'Scholar Felix', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { name: 'Scholar Aneka', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka' },
  { name: 'Scholar Caleb', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Caleb' },
  { name: 'Creative Lilou', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lilou' },
  { name: 'Science Buster', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster' },
  { name: 'Tech Jack', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack' },
  { name: 'Explorer Sophia', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia' },
  { name: 'Classic Gizmo', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo' }
];

type ProfileTab = 'edit' | 'security' | 'admins';

export default function Profile({ profile, setProfile }: ProfileProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>('edit');
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    gender: profile?.gender || 'Male' as Gender,
    phone: profile?.phone || '',
    class: profile?.class || 'Class 9',
    school: profile?.school || '',
    group: profile?.group || 'Science' as Group,
    mathEngine: profile?.mathEngine || 'katex',
    photoURL: profile?.photoURL || '',
    themePreference: profile?.themePreference || 'normal' as 'normal' | 'high-contrast'
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
  const [stats, setStats] = useState({
    totalExams: 0,
    avgScore: 0,
    bestScore: 0,
    loading: true
  });

  // Load state and update when profile changes initially
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        gender: profile.gender || 'Male',
        phone: profile.phone || '',
        class: profile.class || 'Class 9',
        school: profile.school || '',
        group: profile.group || 'Science',
        mathEngine: profile.mathEngine || 'katex',
        photoURL: profile.photoURL || '',
        themePreference: profile.themePreference || 'normal'
      });
    }
  }, [profile]);

  // Instantly preview high-contrast mode when changed in the dropdown
  useEffect(() => {
    if (formData.themePreference) {
      const isHighContrast = formData.themePreference === 'high-contrast';
      document.documentElement.classList.toggle('high-contrast', isHighContrast);
    }
  }, [formData.themePreference]);

  // Load admins list for view
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const q = query(collection(db, 'admins'));
        const snapshot = await getDocs(q);
        setAdmins(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('Could not fetch instructors roster:', e);
      }
    };
    fetchAdmins();
  }, []);

  // Fetch student personalized performance stats
  useEffect(() => {
    if (!profile) return;
    const fetchStats = async () => {
      try {
        const resultsRef = collection(db, 'results');
        const q = query(resultsRef, where('uid', '==', profile.uid));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => doc.data());
        
        if (results.length > 0) {
          const total = results.length;
          const sum = results.reduce((acc, curr) => acc + (curr.score || 0), 0);
          const best = Math.max(...results.map(r => r.score || 0));
          setStats({
            totalExams: total,
            avgScore: Math.round(sum / total),
            bestScore: best,
            loading: false
          });
        } else {
          setStats({ totalExams: 0, avgScore: 0, bestScore: 0, loading: false });
        }
      } catch (err) {
        console.warn("Could not load stats for profile card:", err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    fetchStats();
  }, [profile]);

  useEffect(() => {
    let timer: any;
    if (showDeleteConfirm) {
      timer = setInterval(() => {
        setDeleteTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showDeleteConfirm]);

  const calculateCompletion = () => {
    const fields = [
      formData.displayName,
      profile?.email,
      formData.gender,
      formData.phone,
      formData.class,
      formData.school,
      formData.group,
      formData.photoURL
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
      if (!idToken) return false;
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ uid })
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting account authentication:', error);
      return false;
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile || deleteTimer > 0) return;
    setDeleting(true);
    try {
      const uid = profile.uid;
      
      console.log('Initiating client-side Firestore record cleanup...');
      
      // Part 1: Clean up associated collections on client side where active user is authenticated.
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
          console.error(`Client failed to fetch/delete in ${colName}:`, colErr);
        }
      }
      
      // Part 2: Delete profile document
      if (profile.role === 'student') {
        batch.delete(doc(db, 'students', uid));
        opCount++;
        
        // Also decrement student count
        try {
          const countersRef = doc(db, 'global_stats', 'counters');
          batch.set(countersRef, {
            studentsCount: increment(-1)
          }, { merge: true });
          opCount++;
        } catch (statErr) {
          console.error('Failed to decrement student counter on client:', statErr);
        }
      } else if (profile.role === 'admin') {
        batch.delete(doc(db, 'admins', uid));
        opCount++;
      }
      
      if (opCount > 0) {
        await batch.commit();
        console.log('Client-side Firestore cleanup succeeded.');
      }
      
      // Call modern server-side endpoint with Admin SDK privileges to remove Auth user and handle any residual deletions
      const adminDeleteSuccess = await deleteAuthUser(uid);
      if (!adminDeleteSuccess) {
        console.warn('Backend user deletion service failed. Attempting client-side fallback auth deletion...');
        try {
          if (auth.currentUser) {
            await deleteUser(auth.currentUser);
            console.log('Client-side Auth user deletion succeeded.');
          } else {
            throw new Error('No current authenticated auth user available for fallback deletion.');
          }
        } catch (authClientErr: any) {
          console.error('Client-side Auth user deletion failed:', authClientErr);
          if (authClientErr.code === 'auth/requires-recent-login') {
            throw new Error('For security reasons, you must re-authenticate (log out and log back in) before deleting your account.');
          } else {
            throw new Error('Failed to delete account. Please try again.');
          }
        }
      }
      
      await signOut(auth);
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error.message || 'Failed to delete account. Please try again.');
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

    if (!formData.displayName.trim()) {
      setError('Please provide a default Full Name.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    if (!formData.phone.trim() || !formData.school.trim()) {
      setError('Please fill in your Contact Phone and Institution Name.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const collectionName = profile.role === 'admin' ? 'admins' : 'students';
      
      // Update Firebase Auth original profile if displayName or photoURL changed
      if (auth.currentUser) {
        if (formData.displayName !== profile.displayName || formData.photoURL !== profile.photoURL) {
          await updateProfile(auth.currentUser, {
            displayName: formData.displayName,
            photoURL: formData.photoURL
          });
        }
      }

      await updateDoc(doc(db, collectionName, profile.uid), formData);
      const updatedProfile = { ...profile, ...formData };
      setProfile(updatedProfile);
      setMessage('Profile settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const collectionName = profile.role === 'admin' ? 'admins' : 'students';
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${profile.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const selectPresetAvatar = (url: string) => {
    setFormData(prev => ({ ...prev, photoURL: url }));
  };

  const isPreviewMode = localStorage.getItem('admin_preview_mode') === 'true';
  const isAdmin = profile?.role === 'admin';

  return (
    <div className={`space-y-6 pb-24 pt-4 ${isAdmin && !isPreviewMode ? 'mt-6' : ''}`}>
      
      {/* Navigation Header */}
      {isAdmin && !isPreviewMode && (
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-3 text-slate-400 hover:text-[#D4AF37] transition-all group"
          >
            <div className="p-2 bg-slate-900 rounded-xl shadow-md border border-slate-800 group-hover:border-[#D4AF37]/40 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.15em] font-sans">Return to Admin Dashboard</span>
          </button>
        </div>
      )}

      {/* Responsive layout: Grid structure on desktop and tablet, vertical stacking on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto items-start">
        
        {/* Left Side: Summary Profile Card, Completion Meter & Switch Actions */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Main Visual Profile Card */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 to-[#4f46e5]/5 opacity-60 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Profile Avatar Frame with High Contrast Accents */}
              <div className="relative mb-5 group/avatar">
                <div className="p-1.5 bg-gradient-to-tr from-amber-500 via-[#D4AF37] to-indigo-500 rounded-full shadow-2xl transition-transform duration-500 group-hover:rotate-6">
                  <div className="bg-slate-950 rounded-full p-1">
                    {formData.photoURL ? (
                      <img 
                        src={formData.photoURL} 
                        alt="Profile" 
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-2 ring-slate-900" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-800 flex items-center justify-center ring-2 ring-slate-900">
                        <User className="w-12 h-12 text-slate-600" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Enabled Status Pulse Indicator */}
                <span className="absolute bottom-1 right-2 bg-emerald-500 w-5 h-5 rounded-full border-4 border-slate-950 shadow-md animate-pulse" />
              </div>

              {/* Identity Details */}
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">{profile?.displayName}</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 truncate max-w-full tracking-wide">{profile?.email}</p>
              
              {/* Student/Curator Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                <span className="px-3.5 py-1 bg-amber-500/10 text-[#D4AF37] rounded-full text-[9px] font-extrabold uppercase tracking-widest border border-amber-500/20">
                  {profile?.role === 'admin' ? 'Instructor' : 'Student'}
                </span>
                <span className="px-3.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[9px] font-extrabold uppercase tracking-widest border border-indigo-500/20">
                  Verified
                </span>
              </div>
            </div>
            
            {/* Minimal Background Icon */}
            <Users className="absolute -bottom-10 -right-10 w-40 h-40 text-white opacity-[0.015] pointer-events-none" />
          </div>

          {/* Profile Strength / Completion Meter */}
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                <span>Profile Strength</span>
              </h3>
              <span className={`text-sm font-black ${completion === 100 ? 'text-emerald-400' : 'text-[#D4AF37]'}`}>{completion}%</span>
            </div>
            <div className="h-2 bg-slate-950 rounded-full overflow-hidden mb-3 border border-slate-850 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                className={`h-full relative ${completion === 100 ? 'bg-gradient-to-r from-emerald-600 to-teal-500' : 'bg-gradient-to-r from-amber-600 to-[#D4AF37]'}`}
              >
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              </motion.div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              {completion === 100 
                ? "Your academic profile is 100% complete. Good job!" 
                : "Fill out your profile fields to complete your academy record."}
            </p>
          </div>

          {/* Tab Selection List - Desktop Sidebar Menu style */}
          <div className="hidden md:flex flex-col bg-slate-900 rounded-2xl p-2.5 border border-slate-800 space-y-1">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all text-left flex items-center space-x-3 ${
                activeTab === 'edit'
                  ? 'bg-amber-500/10 text-[#D4AF37] border-l-2 border-[#D4AF37]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4.5 h-4.5 text-inherit" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all text-left flex items-center space-x-3 ${
                activeTab === 'security'
                  ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Lock className="w-4.5 h-4.5 text-inherit" />
              <span>Password & Security</span>
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all text-left flex items-center space-x-3 ${
                activeTab === 'admins'
                  ? 'bg-purple-500/10 text-purple-400 border-l-2 border-purple-500'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4.5 h-4.5 text-inherit" />
              <span>Assigned Instructors</span>
            </button>
          </div>

        </div>

        {/* Right Side: Active Form or Details Block */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Tabs header for Mobile / Tablets */}
          <div className="flex md:hidden bg-slate-900 border border-slate-800 rounded-2xl p-1 overflow-x-auto no-scrollbar space-x-1">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-center transition-all ${
                activeTab === 'edit'
                  ? 'bg-[#D4AF37] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Edit Info
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-center transition-all ${
                activeTab === 'security'
                  ? 'bg-[#D4AF37] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-center transition-all ${
                activeTab === 'admins'
                  ? 'bg-[#D4AF37] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Instructors
            </button>
          </div>

          <AnimatePresence mode="wait">
            
            {/* Tab 1: Edit Details (Including Avatar and Personal info) */}
            {activeTab === 'edit' && (
              <motion.div
                key="edit-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-8"
              >
                <div className="flex items-center space-x-3.5 border-b border-slate-800/80 pb-5">
                  <div className="p-2.5 bg-amber-500/10 text-[#D4AF37] rounded-xl border border-amber-500/20">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Profile Settings</h3>
                    <p className="text-[10px] text-slate-505 uppercase font-bold tracking-wider">Keep your personal details up to date</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Part A: Customizable Student Avatars */}
                  <div className="space-y-3.5">
                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 flex items-center space-x-2">
                      <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Choose Your Avatar</span>
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      {AVATAR_PRESETS.map((preset) => {
                        const isSelected = formData.photoURL === preset.url;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => selectPresetAvatar(preset.url)}
                            title={preset.name}
                            className={`relative rounded-xl overflow-hidden p-1 bg-slate-900 border-2 transition-all hover:scale-105 hover:border-amber-500/40 active:scale-95 ${
                              isSelected ? 'border-[#D4AF37] ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10' : 'border-slate-800/50'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-auto object-contain rounded-lg" referrerPolicy="no-referrer" />
                            {isSelected && (
                              <div className="absolute top-0 right-0 bg-[#D4AF37] text-slate-950 rounded-bl-lg p-0.5 shadow-sm">
                                <Check className="w-2.5 h-2.5 font-bold" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {/* Custom URL Field */}
                    <div className="space-y-1.5 mt-2">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Or enter any custom Image URL:</p>
                      <input 
                        type="url"
                        value={formData.photoURL}
                        onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-xs text-slate-300 outline-none transition-all placeholder:text-slate-600"
                        placeholder="https://example.com/avatar.png"
                      />
                    </div>
                  </div>

                  {/* Part B: Personal Info Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="text"
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm shadow-inner"
                          placeholder="Your real name"
                          required
                        />
                      </div>
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm shadow-inner"
                          placeholder="Contact phone number"
                        />
                      </div>
                    </div>

                    {/* School / College */}
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">School / College / Institution</label>
                      <div className="relative">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="text"
                          value={formData.school}
                          onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm shadow-inner"
                          placeholder="Your educational institution"
                        />
                      </div>
                    </div>

                    {/* Class Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Class / Grade</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                        <select
                          value={formData.class}
                          onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm cursor-pointer"
                        >
                          <option value="Class 9">Class 9</option>
                          <option value="Class 10">Class 10</option>
                          <option value="SSC Candidate">SSC Candidate</option>
                        </select>
                      </div>
                    </div>

                    {/* Academic Group Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Academic Group</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                        <select
                          value={formData.group}
                          onChange={(e) => setFormData({ ...formData, group: e.target.value as Group })}
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm cursor-pointer"
                        >
                          <option value="Science">Science Group</option>
                          <option value="Commerce">Commerce Group</option>
                          <option value="Arts">General Arts Group</option>
                        </select>
                      </div>
                    </div>

                    {/* Gender Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                        className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Accessibility Theme Preference */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 flex items-center space-x-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Accessibility Theme</span>
                      </label>
                      <select
                        value={formData.themePreference}
                        onChange={(e) => {
                          const val = e.target.value as 'normal' | 'high-contrast';
                          setFormData({ ...formData, themePreference: val });
                        }}
                        className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-[#D4AF37] text-white outline-none transition-all font-bold text-sm cursor-pointer"
                      >
                        <option value="normal">Normal Mode (Default Dark Slate)</option>
                        <option value="high-contrast">High Contrast Mode (Pure Stark Accent)</option>
                      </select>
                    </div>

                  </div>

                  {/* Submission element */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-[#D4AF37] text-slate-950 py-4 sm:py-4.5 rounded-xl font-extrabold text-xs uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95 shadow-md shadow-amber-500/10"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{saving ? 'Saving changes...' : 'Save Profile Details'}</span>
                    </button>
                  </div>

                </form>
              </motion.div>
            )}

            {/* Tab 2: Security & Password Update */}
            {activeTab === 'security' && (
              <motion.div
                key="security-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-8"
              >
                <div className="flex items-center space-x-3.5 border-b border-slate-800/80 pb-5">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Security Settings</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Configure your login passwords securely</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={passwords.oldPassword}
                      onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none transition-all font-bold text-sm shadow-inner"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">New Password</label>
                      <input
                        type="password"
                        placeholder="Choose new password"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none transition-all font-bold text-sm shadow-inner"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Re-type new password"
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white outline-none transition-all font-bold text-sm shadow-inner"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={updatingPassword}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-extrabold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-600/10"
                    >
                      {updatingPassword ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>{updatingPassword ? 'Authenticating...' : 'Update Password'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Tab 3: Administrators Team */}
            {activeTab === 'admins' && (
              <motion.div
                key="admins-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6"
              >
                <div className="flex items-center space-x-3.5 border-b border-slate-800/80 pb-5">
                  <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Assigned Instructors</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Academy program authors & course instructors</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {admins.length > 0 ? (
                    admins.map((admin) => (
                      <div key={admin.id} className="flex items-center space-x-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-purple-500/20 transition-all group">
                        <img 
                          src={admin.photoURL || `https://ui-avatars.com/api/?name=${admin.displayName}`} 
                          className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-800 group-hover:ring-purple-500/35 transition-all" 
                          alt="" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-100 truncate">{admin.displayName || 'Administrator'}</p>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {admin.adminType || 'Lead'} Instructor
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="sm:col-span-2 text-center py-8">
                      <p className="text-slate-500 italic text-sm">No administrators identified yet.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Action Row: Logout Session and unregister buttons */}
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-4">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Account Operations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={handleLogout}
                className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-slate-850 active:scale-[0.98]"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Logout Session</span>
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteTimer(5);
                }}
                className="w-full bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 hover:text-rose-450 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-rose-500/10 active:scale-[0.98]"
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Floating Status Notification Alerts */}
      <div className="fixed bottom-24 left-0 right-0 pointer-events-none px-6 z-[60]">
        <AnimatePresence>
          {message && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-emerald-600 text-white p-4.5 rounded-xl shadow-xl flex items-center space-x-3.5 max-w-md mx-auto border border-emerald-500/20 pointer-events-auto">
              <div className="p-2 bg-white/20 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
              <span className="font-bold text-xs uppercase tracking-wide">{message}</span>
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-rose-600 text-white p-4.5 rounded-xl shadow-xl flex items-center space-x-3.5 max-w-md mx-auto border border-rose-500/20 pointer-events-auto">
              <div className="p-2 bg-white/20 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
              <span className="font-bold text-xs uppercase tracking-wide">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern High-Contrast Deletion Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative border border-slate-800"
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-lg">
                <Trash2 className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Delete Your Account</h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-8">
                This will dissolve your entire academy dashboard history. Your <span className="text-white font-bold">completed exams</span>, <span className="text-white font-bold">scoreboards</span>, and settings cannot be recovered.
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteTimer > 0}
                  className={`w-full py-3.5 sm:py-4 rounded-xl font-extrabold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                    deleteTimer > 0 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95 shadow-lg shadow-rose-900/10'
                  }`}
                >
                  {deleting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{deleteTimer > 0 ? `Please Wait (${deleteTimer}s)` : 'Confirm Delete'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-2.5 text-slate-500 hover:text-white transition-all text-xs uppercase tracking-widest font-bold"
                >
                  Cancel & Return
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
