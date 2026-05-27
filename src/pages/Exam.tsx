import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamEvent, Question, UserProfile, OperationType } from '../types';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Send, GraduationCap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { MathRenderer } from '../components/MathRenderer';

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
  const [tabLossCount, setTabLossCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const lastAwayTimestamp = useRef<number>(0);

  // Use refs to secure real-time inputs against stale closure state captures
  const answersRef = useRef(answers);
  const submittingRef = useRef(submitting);
  const hasSubmittedRef = useRef(hasSubmitted);
  const tabLossCountRef = useRef(tabLossCount);
  const questionsRef = useRef(questions);
  const eventRef = useRef(event);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);
  useEffect(() => { hasSubmittedRef.current = hasSubmitted; }, [hasSubmitted]);
  useEffect(() => { tabLossCountRef.current = tabLossCount; }, [tabLossCount]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { eventRef.current = event; }, [event]);

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
    if (!event || hasSubmitted) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(event.startTime).getTime();
      const endTime = event.endTime ? new Date(event.endTime).getTime() : startTime + event.duration * 60 * 1000;

      if (now < startTime) {
        setCountdown(Math.floor((startTime - now) / 1000));
        setExamStarted(false);
      } else if (now >= startTime && now < endTime) {
        setExamStarted(true);
        setTimeLeft(Math.floor((endTime - now) / 1000));
      } else {
        setExamStarted(false);
        setTimeLeft(0);
        // Auto-submit if exam was ongoing
        if (examStarted && !submittingRef.current) {
          handleSubmit();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event, examStarted, hasSubmitted]);

  // Prevent closing/reloading the tab by mistake
  useEffect(() => {
    if (!examStarted || hasSubmitted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your exam progress may be automatically submitted or lost!';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examStarted, hasSubmitted]);

  // Tab switching protection & active security detection logic (using stable refs)
  useEffect(() => {
    if (!examStarted || hasSubmittedRef.current) return;

    const handleAway = () => {
      if (hasSubmittedRef.current || submittingRef.current) return;

      const now = Date.now();
      // Debounce events firing inside the same moment to avoid multiple warning increments
      if (now - lastAwayTimestamp.current < 2000) return;
      lastAwayTimestamp.current = now;

      setTabLossCount((prev) => {
        const newCount = prev + 1;
        if (newCount > 3) {
          // Invoke automatic submission with violation parameter set to true
          handleSubmit(true);
          return newCount;
        } else {
          setShowWarningModal(true);
          return newCount;
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('Live Exam Security: Tab switch detected (page hidden).');
        handleAway();
      }
    };

    const handleBlur = () => {
      console.log('Live Exam Security: Window focus loss detected (window blur).');
      handleAway();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [examStarted]);

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
      let score = 0;
      currentQuestions.forEach(q => {
        if (currentAnswers[q.id] === q.correctAnswer) {
          score++;
        }
      });

      await addDoc(collection(db, 'submissions'), {
        uid: currentProfile.uid,
        eventId: currentEvent.id,
        answers: currentAnswers,
        score,
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
        score: Math.round((score / (currentQuestions.length || 1)) * 100),
        correctCount: score,
        wrongCount: currentQuestions.length - score,
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
      <div className="bg-slate-900/95 p-4 sm:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 sticky top-2 sm:top-4 z-50 backdrop-blur-md">
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
      <div className="space-y-6 sm:space-y-10">
        {questions.map((currentQuestion, qIndex) => (
          <div
            key={currentQuestion.id}
            className="p-6 sm:p-10 border border-slate-805/80 bg-slate-900/40 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl space-y-6 text-left transition-all hover:bg-slate-900/60"
          >
            <div className="flex items-center justify-between">
              <span className="inline-block px-3 py-1 bg-slate-950 text-[#D4AF37] rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-slate-800">
                Question {qIndex + 1}
              </span>
              {answers[currentQuestion.id] !== undefined ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Answered
                </span>
              ) : (
                <span className="text-xs text-slate-500 font-medium bg-slate-950/40 px-3 py-1 rounded-full border border-slate-800/40">
                  Unanswered
                </span>
              )}
            </div>

            <div className="text-base sm:text-lg md:text-xl font-semibold text-white leading-relaxed">
              <MathRenderer content={currentQuestion?.text || ''} engine={profile?.mathEngine} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion?.options.map((option, i) => {
                const isSelected = answers[currentQuestion.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers({ ...answers, [currentQuestion.id]: i })}
                    className={`group w-full p-4  rounded-xl sm:rounded-2xl border text-left transition-all flex items-center space-x-3.5 relative overflow-hidden ${
                      isSelected
                        ? 'border-[#D4AF37] bg-amber-500/5 shadow-md shadow-amber-900/15'
                        : 'border-slate-800/60 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-[#D4AF37] text-slate-950 shadow-md shadow-amber-950/30' 
                        : 'bg-slate-900 text-slate-500 group-hover:text-[#D4AF37] border border-slate-800'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <MathRenderer content={option} className={`font-medium text-xs sm:text-base ${isSelected ? 'text-white' : 'text-slate-300'}`} engine={profile?.mathEngine} />
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
