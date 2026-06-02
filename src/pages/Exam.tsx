import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamEvent, Question, UserProfile, OperationType } from '../types';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Send, GraduationCap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { MathRenderer } from '../components/MathRenderer';
import { useExamSecurity } from '../hooks/useExamSecurity';

interface ExamProps {
  profile: UserProfile | null;
}

export default function Exam({ profile }: ExamProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<ExamEvent | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Use refs to secure real-time inputs against stale closure state captures
  const answersRef = useRef(answers);
  const submittingRef = useRef(submitting);
  const hasSubmittedRef = useRef(hasSubmitted);
  const questionsRef = useRef(questions);
  const eventRef = useRef(event);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);
  useEffect(() => { hasSubmittedRef.current = hasSubmitted; }, [hasSubmitted]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { eventRef.current = event; }, [event]);

  const isExamInProgress = examStarted && !hasSubmitted;
  useEffect(() => {
    if (typeof (window as any).setExamActiveState === 'function') {
      (window as any).setExamActiveState(isExamInProgress);
    }
    return () => {
      if (typeof (window as any).setExamActiveState === 'function') {
        (window as any).setExamActiveState(false);
      }
    };
  }, [isExamInProgress]);

  // Integrated proctoring security suite
  const {
    tabLossCount,
    showWarningModal,
    setShowWarningModal
  } = useExamSecurity({
    isActive: examStarted,
    hasSubmitted: hasSubmitted,
    onAutoSubmit: () => handleSubmit(true)
  });

  useEffect(() => {
    if (!id || !profile) return;

    const fetchData = async () => {
      try {
        // 1. Check Authorization (Payment)
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('uid', '==', profile.uid),
          where('eventId', '==', id),
          where('status', '==', 'approved')
        );
        const paymentSnap = await getDocs(paymentsQuery);
        if (paymentSnap.empty) {
          setError('You are not authorized to take this exam. Please ensure your payment is approved.');
          setLoading(false);
          return;
        }
        setIsAuthorized(true);

        // 2. Check if already submitted
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('uid', '==', profile.uid),
          where('eventId', '==', id),
          where('completed', '==', true)
        );
        const submissionSnap = await getDocs(submissionsQuery);
        if (!submissionSnap.empty) {
          setHasSubmitted(true);
          setLoading(false);
          return;
        }

        // 3. Fetch Event
        const eventDoc = await getDoc(doc(db, 'events', id));
        if (!eventDoc.exists()) {
          setError('Exam event not found.');
          setLoading(false);
          return;
        }
        
        const eventData = { id: eventDoc.id, ...eventDoc.data() } as ExamEvent;
        setEvent(eventData);

        // 4. Load questions directly from the event's internal questions array
        // This is synchronized with the Admin panel which saves full question objects into the event.
        if (eventData.questions && Array.isArray(eventData.questions) && eventData.questions.length > 0) {
          setQuestions(eventData.questions);
        } else {
          setError('Technical Error: No questions found within this exam event. Please contact administration.');
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching exam data:', err);
        setError('Failed to load exam. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, profile]);

  // Countdown and Timer logic
  useEffect(() => {
    if (!event || !profile || hasSubmitted) return;

    const eventStartTime = new Date(event.startTime).getTime();
    const eventEndTime = new Date(event.endTime).getTime();
    const localStorageKey = `exam_start_${profile.uid}_${event.id}`;

    const timer = setInterval(() => {
      const nowTime = new Date().getTime();

      if (nowTime < eventStartTime) {
        // Event has not started yet
        setCountdown(Math.floor((eventStartTime - nowTime) / 1000));
        setExamStarted(false);
      } else {
        // Event is currently running or user has previously started within range
        let savedStart = localStorage.getItem(localStorageKey);
        const isWithinEventPeriod = nowTime >= eventStartTime && nowTime <= eventEndTime;

        if (isWithinEventPeriod || savedStart) {
          if (!savedStart) {
            savedStart = new Date().toISOString();
            localStorage.setItem(localStorageKey, savedStart);
          }

          const candidateStart = new Date(savedStart).getTime();
          const candidateEnd = candidateStart + event.duration * 60 * 1000;

          if (nowTime < candidateEnd) {
            setExamStarted(true);
            setTimeLeft(Math.floor((candidateEnd - nowTime) / 1000));
          } else {
            setExamStarted(false);
            setTimeLeft(0);
            if (!submittingRef.current && !hasSubmittedRef.current) {
              handleSubmit();
            }
          }
        } else {
          // Beyond end timing window and no session captured
          setExamStarted(false);
          setTimeLeft(0);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event, profile, examStarted, hasSubmitted]);

  const handleSubmit = async (isAutoViolation = false) => {
    const currentEvent = eventRef.current;
    const currentProfile = profile;
    const currentSubmitting = submittingRef.current;
    const currentHasSubmitted = hasSubmittedRef.current;
    const currentQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;

    if (!currentEvent || !currentProfile || currentSubmitting || currentHasSubmitted) return;
    setSubmitting(true);
    submittingRef.current = true;

    try {
      let correctCount = 0;
      let wrongCount = 0;
      currentQuestions.forEach(q => {
        const userAns = currentAnswers[q.id];
        if (userAns !== undefined && userAns !== null) {
          if (userAns === q.correctAnswer) {
            correctCount++;
          } else {
            wrongCount++;
          }
        }
      });

      const solvedCount = correctCount + wrongCount;
      const rawScore = (correctCount * 1) + (wrongCount * -0.25);
      const finalScore = parseFloat(rawScore.toFixed(2));

      await addDoc(collection(db, 'submissions'), {
        uid: currentProfile.uid,
        eventId: currentEvent.id,
        answers: currentAnswers,
        score: finalScore,
        correctCount,
        wrongCount,
        solvedCount,
        totalQuestions: currentQuestions.length,
        completed: true,
        startedAt: currentEvent.startTime,
        submittedAt: new Date().toISOString(),
        ...(isAutoViolation ? { autoSubmitted: true, violationReason: 'Exceeded tab/window switching warnings' } : {})
      });

      // Save to results for dashboard
      await addDoc(collection(db, 'results'), {
        uid: currentProfile.uid,
        displayName: currentProfile.displayName,
        school: currentProfile.school || 'N/A',
        score: finalScore,
        correctCount,
        wrongCount,
        solvedCount,
        totalQuestions: currentQuestions.length,
        class: currentProfile.class || 'N/A',
        type: 'Event',
        eventId: currentEvent.id,
        createdAt: new Date().toISOString(),
        ...(isAutoViolation ? { autoSubmitted: true, violationReason: 'Exceeded tab/window switching warnings' } : {})
      });

      setHasSubmitted(true);
      hasSubmittedRef.current = true;
      if (isAutoViolation) {
        setError('Your exam has been automatically submitted because you left or switched tabs more than 3 times.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"
      />
      <p className="text-white font-bold font-serif animate-pulse tracking-widest text-[10px] uppercase">Initializing Secure Exam Environment...</p>
    </div>
  );

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white font-serif">{error}</h2>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-slate-950 px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
          Back to Events
        </button>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-white font-serif">Assessment Recorded</h2>
        <p className="text-slate-400 leading-relaxed">Your responses have been successfully transmitted. Results will be published following the verification phase.</p>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-slate-950 px-10 py-4 rounded-xl font-bold hover:bg-amber-400 transition-all">
          Return to Events Portal
        </button>
      </div>
    );
  }

  if (!examStarted && countdown > 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <div className="bg-slate-900 p-12 md:p-16 rounded-[3rem] shadow-2xl border-2 border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          
          <Clock className="w-20 h-20 text-[#D4AF37] mx-auto mb-8 animate-pulse" />
          <h1 className="text-4xl font-bold text-white mb-4 font-serif">Assessment Briefing</h1>
          <p className="text-slate-400 text-lg mb-12 italic">Synchronization in progress. Access granted in:</p>
          
          <div className="text-7xl font-mono font-bold text-white tracking-tighter">
            {formatTime(countdown)}
          </div>
          
          <div className="mt-16 p-8 bg-slate-950/50 rounded-[2rem] text-left border border-slate-800">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Standard Operating Procedures</h3>
            </div>
            <ul className="text-sm text-slate-500 space-y-3 font-medium">
              <li className="flex items-start space-x-3 text-rose-500/80">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span>Page reloads or tab switching may lead to immediate disqualification.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                <span>Final data transmission occurs automatically when chronometer reaches zero.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                <span>Only a single unique attempt is permitted per authorized candidate.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!examStarted && countdown <= 0 && timeLeft <= 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-slate-800 mx-auto" />
        <h2 className="text-2xl font-bold text-white font-serif">Session Inactive</h2>
        <p className="text-slate-400">The timeframe for this particular assessment has elapsed.</p>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-slate-950 px-8 py-3 rounded-xl font-bold">
          View All Events
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-10">
      {/* Official Header */}
      <div className="p-4 sm:p-6 border-b border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 sticky top-2 sm:top-1 z-50 bg-[#020617]/90 backdrop-blur-md">
        <div className="flex items-center space-x-4 sm:space-x-6 w-full md:w-auto">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#D4AF37] rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shrink-0">
            <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold text-white font-serif leading-tight truncate">{event?.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Official Assessment</span>
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto space-x-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
          <div className="text-left md:text-right">
            <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Status</p>
            <p className="text-[10px] sm:text-xs font-bold text-white">Answered: {Object.keys(answers).length} / {questions.length}</p>
          </div>

          <div className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl border font-mono font-bold text-[10px] sm:text-xs tracking-wider transition-colors shrink-0 ${tabLossCount > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-slate-950 border-slate-800 text-emerald-400'}`}>
            <Shield className="w-3.5 h-3.5" />
            <span>Saves: {Math.max(0, 3 - tabLossCount)} / 3</span>
          </div>

          <div className={`flex items-center space-x-2 sm:space-x-3 px-4 sm:px-8 py-2 sm:py-4 rounded-xl sm:rounded-2xl font-mono font-bold text-lg sm:text-2xl shadow-inner shrink-0 ${timeLeft < 300 ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-slate-950 text-white border border-slate-800'}`}>
            <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-[#D4AF37]" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-2">
        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-850">
          <motion.div 
            className="bg-gradient-to-r from-[#D4AF37] to-amber-600 h-full shadow-[0_0_10px_rgba(212,175,55,0.4)]"
            initial={{ width: 0 }}
            animate={{ width: `${(Object.keys(answers).length / (questions.length || 1)) * 100}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
      </div>

      {/* Main Questions List Layout - Normal sequential serial numbers, NO box pagination format */}
      <div className="space-y-2">
        {questions.map((currentQuestion, qIndex) => (
          <div
            key={currentQuestion.id}
            className="py-10 border-b border-dashed border-slate-900 last:border-0 space-y-6 text-left"
          >
            <div className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest text-slate-500">
              <span className="w-7 h-7 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center font-extrabold text-xs text-[#D4AF37] shadow-inner">
                {qIndex + 1}
              </span>
              {answers[currentQuestion.id] !== undefined ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  Answered
                </span>
              ) : (
                <span className="text-[10px] text-slate-550 font-medium bg-slate-950/40 px-2.5 py-0.5 rounded-full border border-slate-800/40">
                  Unanswered
                </span>
              )}
            </div>

            <div className="text-xl sm:text-2xl font-black text-white leading-relaxed tracking-tight font-serif">
              <MathRenderer content={currentQuestion?.text || ''} engine={profile?.mathEngine} />
            </div>
            {currentQuestion?.imageUrl && (
              <div className="my-4 max-w-full sm:max-w-md rounded-xl overflow-hidden border border-slate-850 bg-slate-950/40 p-2">
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="Question visual" 
                  className="w-full h-auto object-contain max-h-65 rounded-lg mx-auto" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {currentQuestion?.options.map((option, i) => {
                const isSelected = answers[currentQuestion.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers({ ...answers, [currentQuestion.id]: i })}
                    className={`w-full p-5 flex items-center space-x-4 text-left transition-all border-b duration-200 active:scale-[0.99] group ${
                      isSelected
                        ? 'text-[#D4AF37] bg-[#D4AF37]/5 border-b-2 border-[#D4AF37]'
                        : 'bg-transparent hover:bg-slate-900/30 text-slate-300 hover:text-white border-slate-900/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#D4AF37] text-slate-950 scale-105'
                        : 'bg-slate-900 text-slate-500 group-hover:text-slate-300 group-hover:bg-slate-800'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <MathRenderer content={option} className={`font-semibold text-sm leading-relaxed ${isSelected ? 'text-[#D4AF37]' : 'text-slate-310'}`} engine={profile?.mathEngine} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Footer */}
      <div className="mt-12 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-6 px-6 pb-20">
        <div className="text-center sm:text-left">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Assessment Progress</p>
          <p className="text-sm font-bold text-slate-300 mt-1 font-serif">
            Completed {Object.keys(answers).length} of {questions.length} Questions
          </p>
        </div>

        <button
          onClick={() => handleSubmit()}
          disabled={submitting}
          className="w-full sm:w-auto bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-bold text-xl shadow-2xl shadow-emerald-950/20 hover:bg-emerald-500 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 transform hover:-translate-y-1"
        >
          <Send className="w-6 h-6" />
          <span>{submitting ? 'Transmitting Answers...' : 'Complete Assessment'}</span>
        </button>
      </div>

      {/* Warning Alert Modal */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border-2 border-rose-500/30 p-8 sm:p-10 rounded-[2.5rem] max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500" />
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertCircle className="w-12 h-12 text-rose-500 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white font-serif">Security Warning!</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  You moved away from the exam tab/window or lost focus.
                </p>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Warning Status</p>
                <p className="text-xl font-bold text-white font-mono">
                  {tabLossCount} / 3 Warnings Used
                </p>
                <p className="text-rose-400 text-xs font-semibold animate-pulse mt-2">
                  {3 - tabLossCount === 0 
                    ? "CRITICAL: Any further tab switch will trigger IMMEDIATE automatic submission!" 
                    : `Saves remaining: ${3 - tabLossCount}`}
                </p>
              </div>

              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full bg-[#D4AF37] hover:bg-amber-400 text-slate-950 font-bold py-4 px-6 rounded-xl transition-all shadow-lg active:scale-95"
              >
                I Understand, Resume Exam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
