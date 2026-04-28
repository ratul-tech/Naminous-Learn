import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole, UserProfile } from '../types';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

export default function Login() {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'request'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'admin') {
      setSelectedRole('admin');
      setAuthMode('login');
    } else if (roleParam === 'student') {
      setSelectedRole('student');
      setAuthMode('login');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (authMode === 'register' && selectedRole === 'student') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);
        
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName || user.email?.split('@')[0] || 'User',
          photoURL: `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`,
          role: 'student',
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'students', user.uid), newProfile);
        await setDoc(doc(db, 'global_stats', 'counters'), { 
          studentsCount: increment(1) 
        }, { merge: true });
        
        navigate('/verify-email');
      } else if (authMode === 'request' && selectedRole === 'admin') {
        // Admin Request Access
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const adminRequest: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName || user.email?.split('@')[0] || 'Admin Candidate',
          photoURL: `https://ui-avatars.com/api/?name=${displayName || 'Admin'}&background=random`,
          role: 'admin',
          adminType: 'question_holder',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'admins', user.uid), adminRequest);
        setMessage("Request sent! An administrator will review your account soon. You cannot log in until approved.");
        await signOut(auth);
        setAuthMode('login');
      } else {
        // Login Flow
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const collectionName = selectedRole === 'admin' ? 'admins' : 'students';
        let userDoc = await getDoc(doc(db, collectionName, user.uid));

        if (!userDoc.exists()) {
          setError(`Account not found in ${selectedRole} records.`);
          await signOut(auth);
          setLoading(false);
          return;
        }

        const profileData = userDoc.data() as UserProfile;

        if (profileData.role === 'admin' && profileData.status === 'pending') {
          setError("Your administrator account is pending activation. Please wait for a master administrator to approve your request.");
          await signOut(auth);
          setLoading(false);
          return;
        }

        if (!user.emailVerified && profileData.role !== 'admin') {
          navigate('/verify-email');
          setLoading(false);
          return;
        }

        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please login instead.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-gray-100"
      >
        <div className="text-center mb-10">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-lg transition-colors ${selectedRole === 'admin' ? 'bg-[#7A4900] text-white' : 'bg-[#D4AF37] text-white'}`}>
            {selectedRole === 'admin' ? <ShieldCheck className="w-10 h-10" /> : <UserIcon className="w-10 h-10" />}
          </div>
          <h1 className="text-4xl font-bold text-[#7A4900] font-serif">
            {selectedRole === 'admin' ? 'Admin Portal' : 'Student Portal'}
          </h1>
          <p className="text-[#545454] mt-3 font-medium opacity-70">
            {authMode === 'login' ? 'Access your dashboard' : 
             authMode === 'register' ? 'Join our learning community' : 
             'Request administrative privileges'}
          </p>
        </div>

        <div className="flex bg-[#f5f5f0] p-1 rounded-2xl mb-8">
          <button
            onClick={() => { setSelectedRole('student'); setAuthMode('login'); setError(''); setMessage(''); }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedRole === 'student' ? 'bg-white text-[#D4AF37] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Student Account
          </button>
          <button
            onClick={() => { setSelectedRole('admin'); setAuthMode('login'); setError(''); setMessage(''); }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedRole === 'admin' ? 'bg-white text-[#7A4900] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Admin Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {(authMode !== 'login') && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="block text-sm font-bold text-[#7A4900] mb-2 px-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#D4AF37] outline-none transition-all font-medium"
                  required
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-bold text-[#7A4900] mb-2 px-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#D4AF37] outline-none transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#7A4900] mb-2 px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#D4AF37] outline-none transition-all font-medium"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-2 text-red-500 bg-red-50 p-4 rounded-2xl border border-red-100 text-sm font-bold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {message && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-600 bg-green-50 p-4 rounded-2xl border border-green-100 text-sm font-bold text-center">
              {message}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-3 disabled:opacity-50 text-white ${selectedRole === 'admin' ? 'bg-[#7A4900] hover:bg-black shadow-amber-900/20' : 'bg-[#D4AF37] hover:bg-[#B8860B] shadow-amber-200'}`}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {authMode === 'login' ? <LogIn className="w-6 h-6" /> : authMode === 'register' ? <UserPlus className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                <span>{authMode === 'login' ? 'Login' : authMode === 'register' ? 'Create Account' : 'Request Access'}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center space-y-4">
          {selectedRole === 'student' ? (
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}
              className="text-[#D4AF37] font-bold hover:underline py-2"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
          ) : (
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => { setAuthMode(authMode === 'login' ? 'request' : 'login'); setError(''); setMessage(''); }}
                className="text-[#7A4900] font-bold hover:underline py-2"
              >
                {authMode === 'login' ? "Apply for Admin Access" : "Back to Admin Login"}
              </button>
              {authMode === 'login' && (
                <p className="text-xs text-gray-400 font-medium italic">Admin accounts must be approved by the system owner.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
