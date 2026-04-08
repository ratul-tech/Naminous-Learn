import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Question, ExamResult } from '../types';
import { Timer, CheckCircle2, XCircle, AlertCircle, ArrowRight, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamProps {
  profile: UserProfile | null;
}

export default function Exam({ profile }: ExamProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state || { category: 'Board', board: 'Dhaka', count: 20 };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ExamResult | null>(null);

  const getDuration = (count: number) => {
    if (count <= 20) return 16 * 60;
    if (count <= 30) return 25 * 60;
    if (count <= 50) return 40 * 60;
    if (count <= 75) return 60 * 60;
    return 75 * 60;
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const qRef = collection(db, 'questions');
        let q;
        if (config.category === 'Board') {
          q = query(qRef, where('category', '==', 'Board'), where('board', '==', config.board), limit(config.count));
        } else {
          q = query(qRef, where('category', '==', 'College Admission'), where('college', '==', config.college), limit(config.count));
        }
        
        const snapshot = await getDocs(q);
        let fetchedQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Question));

        // Fallback for demo if no questions in DB
        if (fetchedQuestions.length === 0) {
          fetchedQuestions = Array.from({ length: config.count }).map((_, i) => ({
            id: `demo-${i}`,
            text: `Sample Question ${i + 1}: What is the capital of Bangladesh?`,
            options: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'],
            correctAnswer: 0,
            category: config.category,
            createdAt: new Date().toISOString()
          }));
        }
        
        setQuestions(fetchedQuestions);
        setTimeLeft(getDuration(config.count));
      } catch (error) {
        console.error("Error fetching questions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [config]);

  const finishExam = useCallback(async () => {
    if (examFinished) return;
    setExamFinished(true);

    let correct = 0;
    let wrong = 0;
    
    questions.forEach((q, index) => {
      if (answers[index] !== undefined) {
        if (answers[index] === q.correctAnswer) {
          correct++;
        } else {
          wrong++;
        }
      }
    });

    const score = (correct * 1) - (wrong * 0.25);
    const percentage = Math.max(0, Math.round((score / questions.length) * 100));

    const newResult: Omit<ExamResult, 'id'> = {
      uid: profile?.uid || '',
      displayName: profile?.displayName || 'Anonymous',
      school: profile?.school || 'Unknown Institution',
      score: percentage,
      correctCount: correct,
      wrongCount: wrong,
      totalQuestions: questions.length,
      type: 'Practice',
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, 'results'), newResult);
      setResult({ id: docRef.id, ...newResult });
    } catch (error) {
      console.error("Error saving result:", error);
    }
  }, [answers, questions, profile, examFinished]);

  useEffect(() => {
    if (examStarted && !examFinished && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted, examFinished, timeLeft, finishExam]);

  const handleAnswer = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
    
    // Auto-transition after a short delay
    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 300);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="text-center py-20">Loading questions...</div>;

  if (!examStarted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10"
        >
          <AlertCircle className="w-16 h-16 text-[#D4AF37] mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[#7A4900] mb-4">Ready to Start?</h1>
          <div className="space-y-4 mb-8 text-left bg-[#f5f5f0] p-6 rounded-2xl">
            <p className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Total Questions: <strong>{questions.length}</strong></span>
            </p>
            <p className="flex items-center space-x-2">
              <Timer className="w-5 h-5 text-blue-500" />
              <span>Time Limit: <strong>{formatTime(timeLeft)}</strong></span>
            </p>
            <p className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-[#D4AF37]" />
              <span>Scoring: <strong>+1 Correct, -0.25 Wrong</strong></span>
            </p>
          </div>
          <button
            onClick={() => setExamStarted(true)}
            className="w-full bg-[#D4AF37] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#B8860B] shadow-lg transition-all"
          >
            Start Exam
          </button>
        </motion.div>
      </div>
    );
  }

  if (examFinished) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-10 text-center"
        >
          <Trophy className="w-20 h-20 text-[#D4AF37] mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-[#7A4900] mb-2">Exam Completed!</h1>
          <p className="text-[#545454] mb-8">Here is your performance breakdown</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 p-6 rounded-2xl">
              <p className="text-sm text-green-600 font-bold uppercase tracking-wider">Correct</p>
              <p className="text-3xl font-bold text-green-700">{result?.correctCount}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl">
              <p className="text-sm text-red-600 font-bold uppercase tracking-wider">Wrong</p>
              <p className="text-3xl font-bold text-red-700">{result?.wrongCount}</p>
            </div>
          </div>

          <div className="bg-[#f5f5f0] p-8 rounded-2xl mb-8">
            <p className="text-lg text-[#545454] mb-2">Final Score</p>
            <p className="text-6xl font-bold text-[#7A4900]">{result?.score}%</p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-white border-2 border-[#D4AF37] text-[#D4AF37] py-4 rounded-xl font-bold hover:bg-[#D4AF37] hover:text-white transition-all"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/practice')}
              className="flex-1 bg-[#D4AF37] text-white py-4 rounded-xl font-bold hover:bg-[#B8860B] shadow-lg transition-all"
            >
              Try Another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8 sticky top-20 bg-[#f5f5f0] py-4 z-10">
        <div className="flex items-center space-x-4">
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-[#D4AF37] flex items-center space-x-2">
            <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-[#D4AF37]'}`} />
            <span className={`font-mono font-bold text-xl ${timeLeft < 60 ? 'text-red-500' : 'text-[#7A4900]'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="text-sm font-bold text-[#545454]">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>
        <button
          onClick={finishExam}
          className="bg-red-50 text-red-600 px-6 py-2 rounded-full font-bold hover:bg-red-100 transition-colors"
        >
          Finish Exam
        </button>
      </div>

      <div className="w-full bg-gray-200 h-2 rounded-full mb-12 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          className="bg-[#D4AF37] h-full"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-[#7A4900] mb-12 leading-tight">
            {currentQuestion.text}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={`group flex items-center justify-between p-6 rounded-2xl border-2 transition-all text-left ${
                  answers[currentIndex] === idx
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]'
                    : 'border-gray-100 hover:border-[#D4AF37]/50 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
                    answers[currentIndex] === idx
                      ? 'bg-[#D4AF37] text-white border-[#D4AF37]'
                      : 'bg-gray-50 text-[#545454] border-gray-100 group-hover:border-[#D4AF37]/50'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-lg font-medium">{option}</span>
                </div>
                {answers[currentIndex] === idx && <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mt-12">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="flex items-center space-x-2 text-[#545454] disabled:opacity-30 font-bold"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
              <span>Previous</span>
            </button>
            <button
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="flex items-center space-x-2 text-[#D4AF37] disabled:opacity-30 font-bold"
            >
              <span>Next</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
