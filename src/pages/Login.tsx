import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole, UserProfile } from '../types';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName || user.email?.split('@')[0] || 'User',
          photoURL: `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`,
          role: role,
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'users', user.uid), newProfile);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please login instead.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#7A4900]">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-[#545454] mt-2">
            {isRegistering ? 'Join Naminous Learn today' : 'Login to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#D4AF37] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Account Type</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-3 rounded-xl border-2 transition-all font-bold ${role === 'student' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100 text-gray-400'}`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-3 rounded-xl border-2 transition-all font-bold ${role === 'admin' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100 text-gray-400'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#D4AF37] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#D4AF37] outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4AF37] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#B8860B] shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                <span>{isRegistering ? 'Create Account' : 'Login'}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[#D4AF37] font-bold hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
