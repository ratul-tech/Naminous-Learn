import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, signOut, reload } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Mail, Send, CheckCircle2, AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
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
  const [adminApproved, setAdminApproved] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    if (!auth.currentUser) return;
    
    // Check Firebase Auth email verification
    await auth.currentUser.reload();
    const isEmailVerified = auth.currentUser.emailVerified;
    setEmailVerified(isEmailVerified);

    // Check Firestore student profile status
    try {
      const studentDoc = await getDoc(doc(db, 'students', auth.currentUser.uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data() as UserProfile;
        setProfile(data);
        setAdminApproved(data.status === 'active');
      } else {
        // If they are an admin, they are automatically approved
        const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
        if (adminDoc.exists()) {
          setAdminApproved(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile status:", err);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    fetchStatus();
  }, [navigate]);

  // Monitor status to trigger onVerified and redirect once fully cleared
  useEffect(() => {
    if (emailVerified && adminApproved) {
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
  }, [emailVerified, adminApproved, navigate, onVerified]);

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
      await sendEmailVerification(auth.currentUser);
      setMessage('Verification link resent! Please check your inbox and spam folder.');
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
      const studentDoc = await getDoc(doc(db, 'students', auth.currentUser.uid));
      const freshProfile = studentDoc.exists() ? (studentDoc.data() as UserProfile) : null;
      const isAdminOk = freshProfile ? freshProfile.status === 'active' : true;

      if (isEmailOk && isAdminOk) {
        setMessage('Verification completed successfully! Redirecting...');
      } else if (!isEmailOk && !isAdminOk) {
        setError("Both email verification and admin approval are still pending.");
      } else if (!isEmailOk) {
        setError("Your email verification is still pending. Please click the link in your email.");
      } else {
        setMessage("Email verification is successful! Now awaiting administrator approval.");
      }
    } catch (err: any) {
      console.error('Check error:', err);
      setError('Failed to check verification status.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const fullyVerified = emailVerified && adminApproved;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-800"
      >
        <div className="w-20 h-20 bg-amber-500/10 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
          {fullyVerified ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          ) : (
            <Mail className="w-10 h-10 animate-pulse text-[#D4AF37]" />
          )}
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          {fullyVerified ? 'Account Activated!' : 'Verification Required'}
        </h1>
        <p className="text-xs text-slate-500 font-medium px-4 mb-6">
          Complete the security checkpoints below to unlock access
        </p>
        
        <div className="space-y-4 mb-8 text-left">
          {/* Checkpoint 1: Email Link Verification */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start space-x-3.5">
            <div className="mt-1">
              {emailVerified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200">Checkpoint 1: Email Link</p>
              <div className="text-[10px] text-slate-500 font-medium mt-1">
                {emailVerified ? (
                  <span className="text-emerald-400 font-bold">✓ Verified Link Clicked</span>
                ) : (
                  <span>Resent link to <strong className="text-[#D4AF37] font-bold">{auth.currentUser?.email}</strong>. Check inbox/spam folder.</span>
                )}
              </div>
            </div>
          </div>

          {/* Checkpoint 2: Admin Security Verification */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start space-x-3.5">
            <div className="mt-1">
              {adminApproved ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200">Checkpoint 2: Admin Approval & Link</p>
              <div className="text-[10px] text-slate-400 mt-1">
                {adminApproved ? (
                  <span className="text-emerald-400 font-bold">✓ Approved & Verified by Curator</span>
                ) : (
                  <span className="text-amber-500 font-medium font-mono text-[9px] uppercase tracking-wider block bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 w-fit">Awaiting Administrative Review</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 text-xs font-bold">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 text-xs font-bold flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCheckVerification}
            disabled={checking || fullyVerified}
            className="w-full bg-[#D4AF37] text-slate-950 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#B8860B] shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {checking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{fullyVerified ? 'All Checked' : "Check Status & Refresh"}</span>
          </button>

          {!fullyVerified && (
            <>
              {!emailVerified && (
                <button
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="w-full bg-slate-950 text-white border-2 border-slate-800 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#D4AF37]" />
                  <span>
                    {loading ? 'Sending...' : cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend Verification Link'}
                  </span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-slate-500 font-bold hover:text-rose-500 text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 pt-4 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout and try another email</span>
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
