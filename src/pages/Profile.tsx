import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Gender, Group } from '../types';
import { User, Phone, School, GraduationCap, Users, Save } from 'lucide-react';
import { motion } from 'motion/react';
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
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="flex items-center space-x-4 mb-8">
          <img src={profile?.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-4 border-[#D4AF37]" referrerPolicy="no-referrer" />
          <div>
            <h2 className="text-2xl font-bold text-[#7A4900]">{profile?.displayName}</h2>
            <p className="text-[#545454]">{profile?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Gender</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#D4AF37] outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>Phone Number</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                <GraduationCap className="w-4 h-4" />
                <span>Class</span>
              </label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#D4AF37] outline-none"
              >
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="SSC Candidate">SSC Candidate</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
                <option value="HSC Candidate">HSC Candidate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                <School className="w-4 h-4" />
                <span>School/College Name</span>
              </label>
              <input
                type="text"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                placeholder="Enter institution name"
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#D4AF37] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Group</span>
              </label>
              <select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value as Group })}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#D4AF37] outline-none"
              >
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#D4AF37] text-white px-8 py-3 rounded-full font-bold hover:bg-[#B8860B] transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
            {message && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-sm font-medium ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}
              >
                {message}
              </motion.span>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
