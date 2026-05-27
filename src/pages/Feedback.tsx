import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Feedback } from '../types';
import { MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

interface FeedbackProps {
  profile: UserProfile | null;
}

export default function FeedbackForm({ profile }: FeedbackProps) {
  const [type, setType] = useState<'Suggestion' | 'Issue'>('Suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSubmitting(true);
    setError('');
    try {
      const feedback: Omit<Feedback, 'id'> = {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        type,
        message,
        createdAt: new Date().toISOString(),
      };
      
      // Save to Firestore
      await addDoc(collection(db, 'feedback'), feedback);

      setSuccess(true);
      setMessage('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setError('Failed to submit feedback. Please try again later.');
      handleFirestoreError(err, OperationType.CREATE, 'feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-12 pb-10">
      <header className="px-1 py-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 uppercase leading-none tracking-tight">Feedback & <span className="text-[#D4AF37]">Support</span></h1>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Share your thoughts and shape our academic platform</p>
      </header>

      <div className="space-y-6">
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 border border-dashed border-slate-905 rounded-3xl"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Thank You!</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto">Your feedback has been successfully preserved in our system. We read and value every submission.</p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-8 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/5 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer animate-none"
            >
              Submit another feedback
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 py-2">
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">What would you like to do?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setType('Suggestion')}
                  className={`p-5 rounded-2xl border transition-all flex flex-col items-center space-y-2 select-none cursor-pointer ${
                    type === 'Suggestion'
                      ? 'border-[#D4AF37] bg-slate-950 text-[#D4AF37] shadow-xl'
                      : 'border-slate-900 bg-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-widest">Suggestion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('Issue')}
                  className={`p-5 rounded-2xl border transition-all flex flex-col items-center space-y-2 select-none cursor-pointer ${
                    type === 'Issue'
                      ? 'border-[#D4AF37] bg-slate-950 text-[#D4AF37] shadow-xl'
                      : 'border-slate-900 bg-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-widest">Report Issue</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Your Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === 'Suggestion' ? "Tell us how we can make Numinous Learn better..." : "Describe the issue you encountered..."}
                className="w-full px-4 py-4 rounded-2xl border border-slate-900 bg-slate-950 focus:border-[#D4AF37]/50 text-white outline-none min-h-[160px] placeholder-slate-700 font-semibold text-sm transition-all focus:ring-1 focus:ring-[#D4AF37]/10"
                required
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-rose-500 text-xs font-bold bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full bg-[#D4AF37] hover:bg-[#B8860B] active:scale-95 text-slate-950 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 disabled:opacity-30 cursor-pointer shadow-md shadow-amber-950/20"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
