import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole, UserProfile, AdminType } from '../types';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [adminType, setAdminType] = useState<AdminType>('question_holder');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'admin') {
      setSelectedRole('admin');
    } else if (roleParam === 'student') {
      setSelectedRole('student');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isRegistering) {
        const defaultAdmins = ['shahriarislam275@gmail.com', 'shahriarislamratul065@gmail.com'];
        const isDefaultAdmin = defaultAdmins.includes(email.toLowerCase());

        if (selectedRole === 'admin' && !isDefaultAdmin) {
          setError("Only authorized administrators can register as Admin. Please register as a Student or contact the system owner.");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send verification email
        await sendEmailVerification(user);
        
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName || user.email?.split('@')[0] || 'User',
          photoURL: `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random`,
          role: selectedRole,
          adminType: selectedRole === 'admin' ? adminType : undefined,
          status: selectedRole === 'admin' ? (isDefaultAdmin ? 'active' : 'pending') : undefined,
          createdAt: new Date().toISOString(),
        };
        
        // Save to correct collection
        const collectionName = selectedRole === 'admin' ? 'admins' : 'students';
        try {
          await setDoc(doc(db, collectionName, user.uid), newProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `${collectionName}/${user.uid}`);
        }
        
        if (selectedRole === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/verify-email');
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check role in corresponding collection
        const collectionName = selectedRole === 'admin' ? 'admins' : 'students';
        let userDoc = await getDoc(doc(db, collectionName, user.uid));

        // Special handling for default admins
        const defaultAdmins = ['shahriarislam275@gmail.com', 'shahriarislamratul065@gmail.com'];
        const isDefaultAdmin = defaultAdmins.includes(user.email?.toLowerCase() || '');

        if (selectedRole === 'admin' && !userDoc.exists() && isDefaultAdmin) {
          const newAdmin: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=Admin&background=random`,
            role: 'admin',
            adminType: 'full',
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'admins', user.uid), newAdmin);
          userDoc = await getDoc(doc(db, 'admins', user.uid));
        }

        if (!userDoc.exists()) {
          setError(`Account not found in ${selectedRole} records. Please ensure you selected the correct account type.`);
          await signOut(auth);
          setLoading(false);
          return;
        }

        const profileData = userDoc.data() as UserProfile;

        if (profileData.role === 'admin' && profileData.status === 'pending') {
          setError("Your administrator account is pending activation. Please contact a master administrator to activate your account.");
          await signOut(auth);
          setLoading(false);
          return;
        }

        // Check verification for non-admins
        if (!user.emailVerified && profileData.role !== 'admin') {
          navigate('/verify-email');
          setLoading(false);
          return;
        }

        if (profileData.role !== selectedRole) {
          setError(`Unauthorized access. Your account is not registered as an ${selectedRole}.`);
          await signOut(auth);
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
        const defaultAdmins = ['shahriarislam275@gmail.com', 'shahriarislamratul065@gmail.com'];
        if (defaultAdmins.includes(email.toLowerCase())) {
          setError("Admin account not found. Please register first using the 'Register' link below.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
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
            {isRegistering ? 'Join Naminous today' : 'Login to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>I am a</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`py-3 rounded-xl border-2 transition-all font-bold ${selectedRole === 'student' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100 text-gray-400'}`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`py-3 rounded-xl border-2 transition-all font-bold ${selectedRole === 'admin' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100 text-gray-400'}`}
              >
                Admin
              </button>
            </div>
          </div>

          {selectedRole === 'admin' && isRegistering && (
            <div>
              <label className="block text-sm font-medium text-[#545454] mb-2 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Type</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAdminType('full')}
                  className={`py-3 rounded-xl border-2 transition-all font-bold text-xs ${adminType === 'full' ? 'border-[#7A4900] bg-[#7A4900]/10 text-[#7A4900]' : 'border-gray-100 text-gray-400'}`}
                >
                  Full Admin
                </button>
                <button
                  type="button"
                  onClick={() => setAdminType('question_holder')}
                  className={`py-3 rounded-xl border-2 transition-all font-bold text-xs ${adminType === 'question_holder' ? 'border-[#7A4900] bg-[#7A4900]/10 text-[#7A4900]' : 'border-gray-100 text-gray-400'}`}
                >
                  Question Holder
                </button>
              </div>
            </div>
          )}

          {isRegistering && (
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
            <div className="flex items-start space-x-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="text-green-600 text-sm font-medium bg-green-50 p-3 rounded-lg border border-green-100">
              {message}
            </div>
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
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setMessage('');
            }}
            className="text-[#D4AF37] font-bold hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
