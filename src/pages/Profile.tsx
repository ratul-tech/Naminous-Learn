import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Gender, Group } from '../types';
import { User, Phone, School, GraduationCap, Users, Save, CheckCircle2, Trash2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

interface ProfileProps {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
}

export default function Profile({ profile, setProfile }: ProfileProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    gender: profile?.gender || 'Male' as Gender,
    phone: profile?.phone || '',
    class: profile?.class || 'Class 9',
    school: profile?.school || '',
    group: profile?.group || 'Science' as Group,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const handleDeleteAccount = async () => {
    if (!profile) return;
    setDeleting(true);
    try {
      const batch = writeBatch(db);
      const uid = profile.uid;

      // 1. Delete student/admin document
      const collectionName = profile.role === 'admin' ? 'admins' : 'students';
      batch.delete(doc(db, collectionName, uid));

      // 2. Delete related data
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Validation
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

  return (
    <div className="space-y-12 pb-12">
      <header className="relative overflow-hidden bg-white p-10 md:p-16 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 bg-[#D4AF37]/10 text-[#7A4900] rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-[#D4AF37]/20"
          >
            Academic Identity
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#7A4900] font-serif mb-6">
            Scholar Profile
          </h1>
          <p className="text-lg text-[#545454] max-w-2xl mx-auto leading-relaxed">
            Manage your academic credentials and personal milestones on the <span className="text-[#D4AF37] font-semibold italic">Elite Board</span>.
          </p>
        </div>
        
        <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 text-gray-50 opacity-20 pointer-events-none" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Profile Summary Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
            <div className="h-32 bg-gradient-to-r from-[#7A4900] to-[#D4AF37]" />
            <div className="px-6 pb-8 -mt-16 text-center">
              <div className="relative inline-block mb-4">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#7A4900] mb-1">{profile?.displayName}</h2>
              <p className="text-sm text-[#545454] mb-4 font-medium">{profile?.email}</p>
              <div className="inline-flex items-center px-4 py-1 rounded-full bg-[#D4AF37]/10 text-[#7A4900] text-xs font-bold uppercase tracking-wider">
                {profile?.role} Account
              </div>

              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-gray-400">Profile Completion</span>
                  <span className={completion === 100 ? 'text-green-600' : 'text-[#D4AF37]'}>{completion}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    className={`h-full ${completion === 100 ? 'bg-green-500' : 'bg-[#D4AF37]'}`}
                  />
                </div>
                {completion < 100 && (
                  <p className="text-[10px] text-[#545454] italic">Complete your profile to unlock all features!</p>
                )}
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase font-bold">Joined</p>
                  <p className="text-sm font-bold text-[#7A4900]">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase font-bold">Status</p>
                  <p className="text-sm font-bold text-green-600">Active</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Edit Form Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 md:p-10 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#7A4900] flex items-center space-x-2 ml-1">
                    <Users className="w-4 h-4" />
                    <span>Gender</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white outline-none transition-all font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#7A4900] flex items-center space-x-2 ml-1">
                    <Phone className="w-4 h-4" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white outline-none transition-all font-medium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#7A4900] flex items-center space-x-2 ml-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>Current Class</span>
                  </label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white outline-none transition-all font-medium"
                  >
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="SSC Candidate">SSC Candidate</option>
                    <option value="College Admission">College Admission</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#7A4900] flex items-center space-x-2 ml-1">
                    <User className="w-4 h-4" />
                    <span>Study Group</span>
                  </label>
                  <select
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value as Group })}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white outline-none transition-all font-medium"
                  >
                    <option value="Science">Science</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts">Arts</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-[#7A4900] flex items-center space-x-2 ml-1">
                    <School className="w-4 h-4" />
                    <span>Institution Name</span>
                  </label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="Enter your school or college name"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] focus:bg-white outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  <Save className="w-6 h-6" />
                  <span>{saving ? 'Updating...' : 'Update Profile'}</span>
                </button>
                
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center space-x-2 text-green-600 font-bold bg-green-50 px-6 py-3 rounded-xl border border-green-100"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{message}</span>
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center space-x-2 text-red-600 font-bold bg-red-50 px-6 py-3 rounded-xl border border-red-100"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
                  <p className="text-sm text-[#545454]">Permanently delete your account and all your data</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-2 text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-[#7A4900] mb-2">Are you absolutely sure?</h2>
                <p className="text-[#545454] mb-8">
                  This action cannot be undone. This will permanently delete your account and remove your data from our servers, including your exam history and results.
                </p>

                <div className="flex flex-col space-y-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {deleting ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        <span>Yes, Delete My Account</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="w-full bg-gray-100 text-[#545454] py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
