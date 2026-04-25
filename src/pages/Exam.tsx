import React, { useState, useEffect } from 'react';
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

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

        // 4. Use questions from event
        if (eventData.questions && eventData.questions.length > 0) {
          setQuestions(eventData.questions as Question[]);
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
        if (examStarted && !submitting) {
          handleSubmit();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event, examStarted, hasSubmitted, submitting]);

  const handleSubmit = async () => {
    if (!event || !profile || submitting) return;
    setSubmitting(true);

    try {
      let score = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correctAnswer) {
          score++;
        }
      });

      await addDoc(collection(db, 'submissions'), {
        uid: profile.uid,
        eventId: event.id,
        answers,
        score,
        completed: true,
        startedAt: event.startTime,
        submittedAt: new Date().toISOString(),
      });

      // Save to results for dashboard
      await addDoc(collection(db, 'results'), {
        uid: profile.uid,
        displayName: profile.displayName,
        school: profile.school || 'N/A',
        score: Math.round((score / (questions.length || 1)) * 100),
        correctCount: score,
        wrongCount: questions.length - score,
        totalQuestions: questions.length,
        class: profile.class || 'N/A',
        type: 'Event',
        eventId: event.id,
        createdAt: new Date().toISOString(),
      });

      setHasSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
    } finally {
      setSubmitting(false);
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
      <p className="text-[#7A4900] font-bold font-serif animate-pulse">Initializing Secure Exam Environment...</p>
    </div>
  );

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-[#7A4900] font-serif">{error}</h2>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
          Back to Events
        </button>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-[#7A4900] font-serif">Assessment Recorded</h2>
        <p className="text-[#545454] leading-relaxed">Your responses have been successfully transmitted. Results will be published following the verification phase.</p>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-white px-10 py-4 rounded-xl font-bold hover:bg-[#7A4900] transition-all">
          Return to Events Portal
        </button>
      </div>
    );
  }

  if (!examStarted && countdown > 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <div className="bg-white p-12 md:p-16 rounded-[3rem] shadow-2xl border-2 border-[#D4AF37]/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          
          <Clock className="w-20 h-20 text-[#D4AF37] mx-auto mb-8 animate-pulse" />
          <h1 className="text-4xl font-bold text-[#7A4900] mb-4 font-serif">Assessment Briefing</h1>
          <p className="text-[#545454] text-lg mb-12">Synchronization in progress. Access granted in:</p>
          
          <div className="text-7xl font-mono font-bold text-[#7A4900] tracking-tighter">
            {formatTime(countdown)}
          </div>
          
          <div className="mt-16 p-8 bg-amber-50/50 rounded-[2rem] text-left border border-amber-100/50">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-5 h-5 text-[#7A4900]" />
              <h3 className="font-bold text-[#7A4900] uppercase tracking-wider text-xs">Standard Operating Procedures</h3>
            </div>
            <ul className="text-sm text-[#7A4900]/70 space-y-3 font-medium">
              <li className="flex items-start space-x-3 text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span>Page reloads or tab switching may lead to immediate disqualification.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7A4900] mt-1.5 shrink-0" />
                <span>Final data transmission occurs automatically when chronometer reaches zero.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7A4900] mt-1.5 shrink-0" />
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
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto" />
        <h2 className="text-2xl font-bold text-[#7A4900] font-serif">Session Inactive</h2>
        <p className="text-[#545454]">The timeframe for this particular assessment has elapsed.</p>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold">
          View All Events
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-10">
      {/* Official Header */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-4 z-50 backdrop-blur-md bg-white/95">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-[#7A4900] rounded-2xl flex items-center justify-center text-white shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#7A4900] font-serif leading-tight">{event?.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Official Assessment</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
            <p className="text-xs font-bold text-[#7A4900]">Item {currentQuestionIndex + 1} / {questions.length}</p>
          </div>
          <div className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-mono font-bold text-2xl shadow-inner ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse border border-red-100' : 'bg-gray-50 text-[#7A4900] border border-gray-100'}`}>
            <Clock className="w-6 h-6 text-[#D4AF37]" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-2">
        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden shadow-inner border border-gray-50">
          <motion.div 
            className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] h-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / (questions.length || 1)) * 100}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
      </div>

      {/* Main Question Interface */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -10 }}
          className="bg-white p-10 md:p-16 rounded-[3.5rem] shadow-2xl border border-gray-50 relative overflow-hidden"
        >
          <div className="absolute top-10 right-10 opacity-[0.03] select-none pointer-events-none">
            <Shield className="w-64 h-64" />
          </div>

          <div className="relative z-10">
            <div className="inline-block px-4 py-1 bg-gray-50 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-10 border border-gray-100">
              Exam Item #{currentQuestionIndex + 1}
            </div>
            
            <div className="text-2xl md:text-3xl font-bold text-[#7A4900] mb-12 font-serif leading-relaxed">
              <MathRenderer content={currentQuestion?.text || ''} />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {currentQuestion?.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [currentQuestion.id]: i })}
                  className={`group w-full p-6 p-y-8 rounded-[2rem] border-2 text-left transition-all flex items-center space-x-6 relative overflow-hidden ${
                    answers[currentQuestion.id] === i
                      ? 'border-[#7A4900] bg-[#7A4900]/5 shadow-lg shadow-[#7A4900]/5'
                      : 'border-gray-50 hover:border-[#D4AF37] bg-gray-50 hover:bg-white text-[#545454]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 transition-all ${
                    answers[currentQuestion.id] === i 
                      ? 'bg-[#7A4900] text-white shadow-md shadow-[#7A4900]/30' 
                      : 'bg-white text-gray-400 group-hover:text-[#D4AF37] border border-gray-100'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <MathRenderer content={option} className="font-bold text-xl" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 px-6 pb-20">
        <button
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="flex items-center space-x-3 px-8 py-4 rounded-2xl font-bold text-[#7A4900] hover:bg-white transition-all disabled:opacity-20 border border-transparent hover:border-gray-100 shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
          <span>Previous Task</span>
        </button>

        <div className="flex items-center space-x-3 px-6 py-2 bg-[#f5f5f0] rounded-full">
          {questions.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentQuestionIndex ? 'bg-[#7A4900] w-6' : 
                answers[questions[i].id] !== undefined ? 'bg-[#D4AF37]' : 'bg-gray-300'
              }`} 
            />
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-bold text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 transform hover:-translate-y-1"
          >
            <Send className="w-6 h-6" />
            <span>{submitting ? 'Transmitting...' : 'Complete Assessment'}</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="w-full sm:w-auto bg-[#7A4900] text-white px-12 py-5 rounded-[2rem] font-bold text-xl shadow-2xl shadow-[#7A4900]/20 hover:bg-black transition-all flex items-center justify-center space-x-3 transform hover:-translate-y-1 group"
          >
            <span>Next Challenge</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
}
