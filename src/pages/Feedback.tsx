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
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-[#7A4900] p-8 text-white">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 bg-white/10 rounded-2xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Feedback</h1>
              <p className="text-white/70">Help us improve Numinous Learn</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-[#7A4900] mb-2">Thank You!</h2>
              <p className="text-[#545454]">Your feedback has been submitted successfully. We appreciate your input.</p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-8 text-[#D4AF37] font-bold hover:underline"
              >
                Submit another feedback
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#545454] mb-4">What would you like to do?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setType('Suggestion')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
                      type === 'Suggestion'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-[#7A4900]'
                        : 'border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    <MessageSquare className="w-6 h-6" />
                    <span className="font-bold">Suggestion</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('Issue')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
                      type === 'Issue'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-[#7A4900]'
                        : 'border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-bold">Report Issue</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#545454] mb-2">Your Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={type === 'Suggestion' ? "Tell us how we can make Numinous Learn better..." : "Describe the issue you encountered..."}
                  className="w-full px-4 py-3 rounded-2xl border focus:ring-2 focus:ring-[#D4AF37] outline-none min-h-[200px]"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full bg-[#D4AF37] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#B8860B] shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
