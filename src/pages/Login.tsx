import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole, UserProfile } from '../types';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { handleFirestoreError, getAuthErrorMessage } from '../lib/error-handler';
import { OperationType } from '../types';

export default function Login() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
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
        // Create student user client-side directly
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email link verification
        try {
          await sendEmailVerification(user);
        } catch (linkErr) {
          console.error("Failed to send initial email verification:", linkErr);
        }

        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || email,
          displayName: displayName || user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`,
          role: 'student',
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'students', user.uid), newProfile);
        
        try {
          await setDoc(doc(db, 'global_stats', 'counters'), { 
            studentsCount: increment(1) 
          }, { merge: true });
        } catch (counterErr) {
          console.error("Failed to update student counter in stats:", counterErr);
        }
        
        navigate('/verify-email');
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
              setError("Failed to recover your account data. Please contact an administrator.");
              await signOut(auth);
              setLoading(false);
              return;
            }
          } else {
            setError(`No account found in the ${selectedRole === 'admin' ? 'admin' : 'student'} records.`);
            await signOut(auth);
            setLoading(false);
            return;
          }
        }

        const profileData = userDoc.data() as UserProfile;

        if (profileData.role === 'admin' && profileData.status === 'pending') {
          setError("Your administrator account is pending approval. Please wait.");
          await signOut(auth);
          setLoading(false);
          return;
        }



        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('The email is already in use. If you remember your password, try logging in directly to automatically recover your profile.');
      } else {
        setError(getAuthErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      if (!studentDoc.exists()) {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`,
          role: 'student',
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'students', user.uid), newProfile);
        
        try {
          await setDoc(doc(db, 'global_stats', 'counters'), { 
            studentsCount: increment(1) 
          }, { merge: true });
        } catch (counterErr) {
          console.error("Failed to update student counter in stats:", counterErr);
        }
      }
      
      navigate('/verify-email');
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completion.');
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
            {authMode === 'login' ? 'Access your dashboard' : 'Join our learning community'}
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
                {authMode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                <span>{authMode === 'login' ? 'Login' : 'Create Account'}</span>
              </>
            )}
          </button>
        </form>

        {selectedRole === 'student' && (
          <div className="space-y-4">
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-slate-800/60"></div>
              <span className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Or</span>
              <div className="flex-grow border-t border-slate-800/60"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-slate-950 hover:bg-slate-900 border-2 border-slate-800 hover:border-slate-700 text-white transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-3 shadow-lg disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

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
              <p className="text-xs text-slate-500 font-medium italic">Admin accounts must be configured via the database by the system owner.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>

  );
}
