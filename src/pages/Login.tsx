import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole, UserProfile } from '../types';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { handleFirestoreError, getAuthErrorMessage } from '../lib/error-handler';
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
      setHasPreselectedRole(true);
    } else if (roleParam === 'student') {
      setSelectedRole('student');
      setAuthMode('login');
      setHasPreselectedRole(true);
    }
  }, [searchParams]);

  const [hasPreselectedRole, setHasPreselectedRole] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (authMode === 'register' && selectedRole === 'student') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            displayName,
            role: 'student',
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'নিবন্ধন ব্যর্থ হয়েছে।');
        }

        // Successfully created server-side in Auth and Firestore.
        // Sign the student in client-side to establish full session state.
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);
        
        navigate('/verify-email');
      } else if (authMode === 'request' && selectedRole === 'admin') {
        // Admin Request Access - completely via server-safe Admin SDK processes
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            displayName,
            role: 'admin',
            adminType: 'question_holder',
            status: 'pending',
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'অ্যাডমিন অ্যাকাউন্ট আবেদন ব্যর্থ হয়েছে।');
        }

        setMessage("আবেদন পাঠানো হয়েছে! একজন অ্যাডমিনিস্ট্রেটর শীঘ্রই আপনার অ্যাকাউন্টটি পর্যালোচনা করবেন। অনুমোদনের আগে আপনি লগইন করতে পারবেন না।");
        setAuthMode('login');
      } else {
        // Login Flow
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const collectionName = selectedRole === 'admin' ? 'admins' : 'students';
        let userDoc = await getDoc(doc(db, collectionName, user.uid));

        if (!userDoc.exists()) {
          if (selectedRole === 'student') {
            // Self-healing: user exists in Auth but their Firestore profile is missing/orphaned
            console.log(`Self-healing missing student profile for UID: ${user.uid}`);
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || email,
              displayName: displayName || user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`,
              role: 'student',
              createdAt: new Date().toISOString(),
            };
            
            try {
              // Re-create the student profile instantly
              await setDoc(doc(db, 'students', user.uid), newProfile);
              await setDoc(doc(db, 'global_stats', 'counters'), { 
                studentsCount: increment(1) 
              }, { merge: true });
              
              userDoc = await getDoc(doc(db, 'students', user.uid));
            } catch (healErr) {
              console.error("Self-healing student profile failed:", healErr);
              setError("আপনার অ্যাকাউন্ট ডাটা পুনরুদ্ধার করার চেষ্টা ব্যর্থ হয়েছে। দয়া করে এডমিনকে নিশ্চিত করুন।");
              await signOut(auth);
              setLoading(false);
              return;
            }
          } else {
            setError(`${selectedRole === 'admin' ? 'অ্যাডমিন' : 'শিক্ষার্থী'} রেকর্ডে কোনো অ্যাকাউন্ট পাওয়া যায়নি।`);
            await signOut(auth);
            setLoading(false);
            return;
          }
        }

        const profileData = userDoc.data() as UserProfile;

        if (profileData.role === 'admin' && profileData.status === 'pending') {
          setError("আপনার অ্যাডমিনিস্ট্রেটর অ্যাকাউন্টটি অনুমোদনের অপেক্ষায় রয়েছে। দয়া করে অপেক্ষা করুন।");
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
        setError('ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে। যদি আপনার পাসওয়ার্ড মনে থাকে তবে সরাসরি "লগইন" করার চেষ্টা করুন, অ্যাকাউন্ট প্রোফাইল স্বয়ংক্রিয়ভাবে পুনরুদ্ধার করা হবে।');
      } else {
        setError(getAuthErrorMessage(err.code));
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
        className="bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-slate-800"
      >
        <div className="text-center mb-8 md:mb-10">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-lg transition-colors ${selectedRole === 'admin' ? 'bg-[#7A4900] text-white' : 'bg-[#D4AF37] text-slate-950'}`}>
            {selectedRole === 'admin' ? <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" /> : <UserIcon className="w-8 h-8 sm:w-10 sm:h-10" />}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-serif">
            {selectedRole === 'admin' ? 'Admin Portal' : 'Student Portal'}
          </h1>
          <p className="text-slate-400 mt-3 font-medium opacity-70">
            {authMode === 'login' ? 'Access your dashboard' : 
             authMode === 'register' ? 'Join our learning community' : 
             'Request administrative privileges'}
          </p>
        </div>

        {!hasPreselectedRole && (
          <div className="flex bg-slate-950 p-1 rounded-2xl mb-8 border border-slate-800">
            <button
              onClick={() => { setSelectedRole('student'); setAuthMode('login'); setError(''); setMessage(''); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedRole === 'student' ? 'bg-slate-800 text-[#D4AF37] shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Student Account
            </button>
            <button
              onClick={() => { setSelectedRole('admin'); setAuthMode('login'); setError(''); setMessage(''); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedRole === 'admin' ? 'bg-slate-800 text-[#D4AF37] shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Admin Account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {(authMode !== 'login') && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="block text-sm font-bold text-slate-400 mb-2 px-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-800 bg-slate-950 focus:border-[#D4AF37] text-white outline-none transition-all font-medium placeholder-slate-700"
                  required
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2 px-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-800 bg-slate-950 focus:border-[#D4AF37] text-white outline-none transition-all font-medium placeholder-slate-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2 px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-800 bg-slate-950 focus:border-[#D4AF37] text-white outline-none transition-all font-medium placeholder-slate-700"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-2 text-rose-500 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 text-sm font-bold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {message && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-sm font-bold text-center">
              {message}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-3 disabled:opacity-50 text-white ${selectedRole === 'admin' ? 'bg-[#7A4900] hover:bg-black shadow-amber-900/20' : 'bg-[#D4AF37] text-slate-950 hover:bg-[#B8860B] shadow-amber-200'}`}
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
                className="text-[#D4AF37] font-bold hover:underline py-2"
              >
                {authMode === 'login' ? "Apply for Admin Access" : "Back to Admin Login"}
              </button>
              {authMode === 'login' && (
                <p className="text-xs text-slate-500 font-medium italic">Admin accounts must be approved by the system owner.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>

  );
}
