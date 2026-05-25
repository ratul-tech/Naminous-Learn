import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, signOut, reload } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Send, CheckCircle2, AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface VerifyEmailProps {
  onVerified?: () => Promise<void>;
}

export default function VerifyEmail({ onVerified }: VerifyEmailProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // If not logged in, go to login
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    // If already verified, go to profile
    if (auth.currentUser.emailVerified) {
      if (onVerified) {
        onVerified().then(() => navigate('/profile'));
      } else {
        navigate('/profile');
      }
    }
  }, [navigate, onVerified]);

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
        setCooldown(30); // Force a shorter cooldown if they hit the limit
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
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        setVerified(true);
        setMessage('Email verified successfully! Redirecting to your profile...');
        
        // Sync with App state before navigating
        if (onVerified) {
          await onVerified();
        }
        
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } else {
        setError("Email not verified yet. Please click the link in your email and try again.");
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

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-800"
      >
        <div className="w-20 h-20 bg-amber-500/10 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
          {verified ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          ) : (
            <Mail className="w-10 h-10" />
          )}
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          {verified ? 'Email Verified!' : 'Verify Your Email'}
        </h1>
        
        <div className="space-y-4 text-slate-400 mb-8">
          {verified ? (
            <p className="text-lg font-medium text-emerald-400">
              Great! Your account is now fully activated.
            </p>
          ) : (
            <>
              <p>
                We've sent a verification link to:
                <br />
                <span className="font-bold text-[#D4AF37]">{auth.currentUser?.email}</span>
              </p>
              <p className="text-sm bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-500">
                Please check your <strong>Inbox</strong> or <strong>Spam</strong> folder. Click the link in that email to verify your account.
              </p>
            </>
          )}
        </div>

        {message && (
          <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 text-sm font-medium">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 text-sm font-medium flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCheckVerification}
            disabled={checking || verified}
            className="w-full bg-[#D4AF37] text-slate-950 py-4 rounded-xl font-bold text-lg hover:bg-[#B8860B] shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {checking ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            <span>{verified ? 'Verified' : "I've Verified My Email"}</span>
          </button>

          {!verified && (
            <>
              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="w-full bg-slate-950 text-white border-2 border-slate-800 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  {loading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Link'}
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-slate-500 font-bold hover:text-rose-500 transition-all flex items-center justify-center space-x-2 pt-4"
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
