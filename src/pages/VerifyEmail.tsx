import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, signOut, reload, updateEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  Edit2, 
  Check, 
  ArrowRight, 
  UserCheck, 
  ShieldAlert, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface VerifyEmailProps {
  onVerified?: () => Promise<void>;
}

export default function VerifyEmail({ onVerified }: VerifyEmailProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmailState, setUpdatingEmailState] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  
  const navigate = useNavigate();

  const fetchStatus = async () => {
    if (!auth.currentUser) return;
    
    try {
      // 1. Check if the student's Firestore record has already been updated to active (e.g. by an admin)
      const studentDocRef = doc(db, 'students', auth.currentUser.uid);
      const studentSnap = await getDoc(studentDocRef);
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        if (studentData?.status === 'active') {
          setEmailVerified(true);
          return;
        }
      }

      // 2. Otherwise, check Firebase Auth email verification
      await auth.currentUser.reload();
      const isEmailVerified = auth.currentUser.emailVerified;
      setEmailVerified(isEmailVerified);

      if (isEmailVerified) {
        await updateDoc(studentDocRef, { status: 'active' });
      }
    } catch (err) {
      console.error("Failed to fetch/update verification status:", err);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    // Initial check
    fetchStatus();

    // Set up passwordless style auto-polling
    // This automatically verifies the student when they click the link in another tab/window
    const interval = setInterval(() => {
      if (!emailVerified) {
        fetchStatus();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [navigate, emailVerified]);

  // Monitor status to trigger onVerified and redirect once fully cleared
  useEffect(() => {
    if (emailVerified) {
      if (onVerified) {
        onVerified().then(() => {
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        });
      } else {
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    }
  }, [emailVerified, navigate, onVerified]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!auth.currentUser || cooldown > 0) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // Setup ActionCodeSettings so "Continue" link takes them back to this exact page
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      };
      try {
        await sendEmailVerification(auth.currentUser, actionCodeSettings);
      } catch (domainErr: any) {
        if (domainErr.code === 'auth/unauthorized-continue-uri') {
          console.warn("Domain not allowlisted for continue-uri. Falling back to default verification email.");
          await sendEmailVerification(auth.currentUser);
        } else {
          throw domainErr;
        }
      }
      setMessage('A secure verification link has been resent! Please check your inbox & spam folder.');
      setCooldown(60); // 60 seconds cooldown
    } catch (err: any) {
      console.error('Resend error:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a moment before trying again.');
        setCooldown(30);
      } else {
        setError(err.message || 'Failed to resend verification email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    setError('');
    setMessage('');
    try {
      await fetchStatus();
      
      const isEmailOk = auth.currentUser.emailVerified;

      if (isEmailOk) {
        setMessage('Identity verified successfully! Redirecting...');
      } else {
        setError("Your email verification is still pending. Please click the link inside the email we sent you.");
      }
    } catch (err: any) {
      console.error('Check error:', err);
      setError('Failed to query the live verification status.');
    } finally {
      setChecking(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newEmail || newEmail === auth.currentUser.email) return;
    
    setUpdatingEmailState(true);
    setEmailError('');
    setEmailMessage('');
    
    try {
      // 1. Update in Firebase Auth
      await updateEmail(auth.currentUser, newEmail);
      
      // 2. Update in Firestore students collection
      const studentDocRef = doc(db, 'students', auth.currentUser.uid);
      await updateDoc(studentDocRef, { email: newEmail });
      
      setEmailMessage('Email address updated successfully!');
      
      // 3. Send a new verification email to the corrected address
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      };
      try {
        await sendEmailVerification(auth.currentUser, actionCodeSettings);
      } catch (domainErr: any) {
        if (domainErr.code === 'auth/unauthorized-continue-uri') {
          console.warn("Domain not allowlisted for continue-uri. Falling back to default verification email.");
          await sendEmailVerification(auth.currentUser);
        } else {
          throw domainErr;
        }
      }
      setMessage(`Verification link sent to your updated address: ${newEmail}`);
      
      // Reset editing state
      setIsEditingEmail(false);
      setNewEmail('');
      setCooldown(60);
    } catch (err: any) {
      console.error('Email update error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setEmailError('Security notice: This action requires a recent login. Please log out and log back in to correct your email address.');
      } else {
        setEmailError(err.message || 'Failed to change registered email address.');
      }
    } finally {
      setUpdatingEmailState(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const fullyVerified = emailVerified;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-slate-900 p-6 sm:p-10 rounded-3xl shadow-2xl max-w-xl w-full text-center border border-slate-800 relative overflow-hidden"
      >
        {/* Top ambient glow decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-amber-500 via-[#D4AF37] to-indigo-500 rounded-full blur-sm opacity-60" />

        <div className="w-24 h-24 bg-slate-950 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-slate-800 shadow-inner group relative">
          {fullyVerified ? (
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </motion.div>
          ) : (
            <div className="bg-amber-500/10 p-4 rounded-full border border-amber-500/20 relative">
              <Mail className="w-12 h-12 text-[#D4AF37] animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-[#D4AF37]/30"
              />
            </div>
          )}
          {fullyVerified && (
            <div className="absolute -top-1 -right-1 bg-indigo-600 p-1.5 rounded-full text-white shadow-md animate-bounce">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
          {fullyVerified ? 'Account Verified!' : 'Student Identity Verification'}
        </h1>
        <p className="text-xs text-slate-400 font-medium px-4 mb-8">
          {fullyVerified 
            ? 'Your educational credential is fully activated. Redirecting you to your workspace...' 
            : 'To maintain platform integrity, please confirm ownership of your registered email address.'}
        </p>
        
        {/* Interactive Verification Progress Timeline */}
        <div className="space-y-4 mb-8 text-left">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start space-x-4 transition-all hover:border-slate-700">
            <div className="mt-1">
              {emailVerified ? (
                <div className="bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              ) : (
                <div className="bg-amber-500/10 p-1 rounded-lg border border-amber-500/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-amber-500/30 border-t-[#D4AF37] animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-200">Secure Email Verification Link</p>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${emailVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                  {emailVerified ? 'Completed' : 'Pending Link Click'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                {emailVerified ? (
                  <span className="text-emerald-400 font-bold">✓ Identity confirmed! Your student portal has been unlocked.</span>
                ) : (
                  <span>
                    We have sent a secure passwordless login & activation link to <strong className="text-[#D4AF37] font-bold">{auth.currentUser?.email}</strong>. 
                    Simply click the link inside that email to automatically activate your profile.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 text-xs font-bold text-left flex items-start space-x-2.5"
          >
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 text-xs font-bold text-left flex items-start space-x-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCheckVerification}
            disabled={checking || fullyVerified}
            className="w-full bg-[#D4AF37] text-slate-950 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#B8860B] shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {checking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{fullyVerified ? 'Identity Confirmed' : "Check Status & Force Refresh"}</span>
          </button>

          {!fullyVerified && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="w-full bg-slate-950 text-white border border-slate-800 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  {loading ? 'Resending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email Link'}
                </span>
              </button>

              <button
                onClick={() => {
                  setIsEditingEmail(!isEditingEmail);
                  setNewEmail(auth.currentUser?.email || '');
                  setEmailError('');
                  setEmailMessage('');
                }}
                className="w-full bg-slate-950 text-white border border-slate-800 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <span>Change Email / Fix Typo</span>
              </button>
            </div>
          )}

          {/* Expandable Email Update Typo-correction Block */}
          <AnimatePresence>
            {isEditingEmail && !fullyVerified && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleEmailUpdate} className="mt-4 p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Edit2 className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Correct Registered Email</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    Made a typing error during signup? Correct your address below and we will automatically transfer your records and dispatch a fresh verification link.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Correct Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      placeholder="student@example.com"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-[#D4AF37] outline-none text-xs rounded-xl font-bold text-slate-200 transition-all"
                    />
                  </div>

                  {emailError && (
                    <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 text-[10px] font-bold flex items-start space-x-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  {emailMessage && (
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-[10px] font-bold">
                      {emailMessage}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(false)}
                      className="px-3.5 py-2 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingEmailState || !newEmail || newEmail === auth.currentUser?.email}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] uppercase tracking-widest font-black transition-all flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                    >
                      {updatingEmailState ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Update & Dispatch Link</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {!fullyVerified && (
            <button
              onClick={handleLogout}
              className="w-full text-slate-500 font-bold hover:text-rose-500 text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 pt-4 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout and Register Another Account</span>
            </button>
          )}
        </div>

        {/* Helpful hints and tips footer */}
        {!fullyVerified && (
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-left">
            <div className="flex items-center space-x-2 mb-3">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Verification Help & Guidance</span>
            </div>
            <ul className="space-y-2 text-[10px] text-slate-500 font-medium leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="text-[#D4AF37] font-black mt-0.5">•</span>
                <span><strong>Gmail Users:</strong> If you don't see it, check the <strong>Updates</strong> or <strong>Promotions</strong> category tabs.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#D4AF37] font-black mt-0.5">•</span>
                <span><strong>Spam Folders:</strong> Sometimes emails land in Spam. Be sure to mark it as "Not Spam" to enable link clicking.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#D4AF37] font-black mt-0.5">•</span>
                <span><strong>Instant Sync:</strong> Once verified, this tab will activate immediately. You can keep this screen open while verifying in another window!</span>
              </li>
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
