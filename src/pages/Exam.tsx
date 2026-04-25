import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamEvent, Question, UserProfile, Submission, Payment } from '../types';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';
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

        // 4. Fetch Questions
        if (eventData.questions && eventData.questions.length > 0) {
          const qPromises = eventData.questions.map(qid => getDoc(doc(db, 'questions', qid)));
          const qSnaps = await Promise.all(qPromises);
          const fetchedQuestions = qSnaps
            .filter(s => s.exists())
            .map(s => ({ id: s.id, ...s.data() } as Question));
          setQuestions(fetchedQuestions);
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

  if (loading) return <div className="text-center py-20">Preparing your exam environment...</div>;

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-[#7A4900]">{error}</h2>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold">
          Back to Events
        </button>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-[#7A4900]">Exam Submitted Successfully</h2>
        <p className="text-[#545454]">You have already completed this exam. Results will be published soon.</p>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold">
          Back to Events
        </button>
      </div>
    );
  }

  if (!examStarted && countdown > 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl border-2 border-[#D4AF37]">
          <Clock className="w-20 h-20 text-[#D4AF37] mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-bold text-[#7A4900] mb-2">Waiting Room</h1>
          <p className="text-[#545454] mb-8">The exam will start in:</p>
          <div className="text-6xl font-mono font-bold text-[#7A4900]">
            {formatTime(countdown)}
          </div>
          <div className="mt-12 p-6 bg-yellow-50 rounded-2xl text-left border border-yellow-100">
            <h3 className="font-bold text-yellow-800 mb-2">Exam Rules:</h3>
            <ul className="text-sm text-yellow-700 space-y-2 list-disc pl-5">
              <li>Do not refresh the page once the exam starts.</li>
              <li>The exam will auto-submit when the timer hits zero.</li>
              <li>Only one attempt is allowed.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!examStarted && countdown <= 0 && timeLeft <= 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto" />
        <h2 className="text-2xl font-bold text-[#7A4900]">Exam Session Ended</h2>
        <p className="text-[#545454]">This exam session is no longer active.</p>
        <button onClick={() => navigate('/events')} className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold">
          Back to Events
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-8 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-4 z-10">
        <div>
          <h1 className="text-xl font-bold text-[#7A4900]">{event?.title}</h1>
          <p className="text-xs text-gray-400 uppercase font-bold">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-mono font-bold text-xl ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-50 text-[#7A4900]'}`}>
          <Clock className="w-6 h-6" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-2 rounded-full mb-8 overflow-hidden">
        <motion.div 
          className="bg-[#D4AF37] h-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQuestionIndex + 1) / (questions.length || 1)) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 mb-8"
        >
          <div className="text-2xl font-bold text-[#7A4900] mb-8 leading-relaxed">
            <MathRenderer content={currentQuestion?.text || ''} />
          </div>

          <div className="space-y-4">
            {currentQuestion?.options.map((option, i) => (
              <button
                key={i}
                onClick={() => setAnswers({ ...answers, [currentQuestion.id]: i })}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center space-x-4 ${
                  answers[currentQuestion.id] === i
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-[#7A4900]'
                    : 'border-gray-50 hover:border-gray-200 text-[#545454]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  answers[currentQuestion.id] === i ? 'bg-[#D4AF37] text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <MathRenderer content={option} className="font-medium" />
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-[#7A4900] disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            <span>{submitting ? 'Submitting...' : 'Finish Exam'}</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="bg-[#7A4900] text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center space-x-2"
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
