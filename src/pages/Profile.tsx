import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Gender, Group } from '../types';
import { User, Phone, School, GraduationCap, Users, Save, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

interface ProfileProps {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
}

export default function Profile({ profile, setProfile }: ProfileProps) {
  const [formData, setFormData] = useState({
    gender: profile?.gender || 'Male' as Gender,
    phone: profile?.phone || '',
    class: profile?.class || 'Class 9',
    school: profile?.school || '',
    group: profile?.group || 'Science' as Group,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
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
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#7A4900]">My Profile</h1>
        <p className="text-[#545454]">Manage your personal information and academic details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                    <option value="HSC Candidate">HSC Candidate</option>
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
                </AnimatePresence>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
