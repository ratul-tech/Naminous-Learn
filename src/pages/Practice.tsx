import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Question, OperationType } from '../types';
import { BookOpen, Clock, CheckCircle2, ChevronRight, ChevronLeft, Send, AlertCircle, List, Play, RotateCcw, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';

interface PracticeProps {
  profile: UserProfile | null;
}

type Step = 'config' | 'selection' | 'exam' | 'results' | 'review';
type Mode = 'Complete Board' | 'Selected Board';

export default function Practice({ profile }: PracticeProps) {
  const [step, setStep] = useState<Step>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [config, setConfig] = useState({
    subject: 'Physics',
    mode: 'Complete Board' as Mode,
    time: 20, // minutes
    count: 10,
  });

  const [examState, setExamState] = useState({
    currentQuestionIndex: 0,
    answers: {} as Record<string, number>,
    timeLeft: 0,
    examStarted: false,
    submitting: false,
    results: null as any,
  });

  const subjects = ['Physics', 'Chemistry', 'Biology', 'Higher Math', 'General Math', 'English', 'ICT', 'BGS'];
  const times = [5, 10, 15, 20, 30, 45, 60];

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!profile?.class) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'questions'),
          where('class', '==', profile.class)
        );
        const snapshot = await getDocs(q);
        const allQ = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        setQuestions(allQ);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'questions');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [profile]);

  useEffect(() => {
    const filtered = questions.filter(q => q.subject === config.subject);
    setFilteredQuestions(filtered);
  }, [questions, config.subject]);

  const handleStartExam = () => {
    let examQuestions = [];
    if (config.mode === 'Complete Board') {
      examQuestions = [...filteredQuestions].sort(() => 0.5 - Math.random()).slice(0, config.count);
    } else {
      examQuestions = filteredQuestions.filter(q => selectedQuestionIds.includes(q.id));
    }

    if (examQuestions.length === 0) {
      alert('No questions available for the selected criteria.');
      return;
    }

    setFilteredQuestions(examQuestions);
    setExamState({
      ...examState,
      currentQuestionIndex: 0,
      answers: {},
      timeLeft: config.time * 60,
      examStarted: true,
      results: null,
    });
    setStep('exam');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'exam' && examState.timeLeft > 0 && !examState.submitting) {
      timer = setInterval(() => {
        setExamState(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(timer);
            handleSubmit();
            return { ...prev, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, examState.timeLeft, examState.submitting]);

  const handleSubmit = async () => {
    if (examState.submitting) return;
    setExamState(prev => ({ ...prev, submitting: true }));

    let score = 0;
    filteredQuestions.forEach(q => {
      if (examState.answers[q.id] === q.correctAnswer) {
        score++;
      }
    });

    const results = {
      score: Math.round((score / filteredQuestions.length) * 100),
      correctCount: score,
      wrongCount: filteredQuestions.length - score,
      totalQuestions: filteredQuestions.length,
      answers: examState.answers,
    };

    try {
      if (profile) {
        await addDoc(collection(db, 'results'), {
          uid: profile.uid,
          displayName: profile.displayName,
          school: profile.school || 'N/A',
          score: results.score,
          correctCount: results.correctCount,
          wrongCount: results.wrongCount,
          totalQuestions: results.totalQuestions,
          type: 'Practice',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'results');
    }

    setExamState(prev => ({ ...prev, submitting: false, results }));
    setStep('results');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="text-center py-20">Loading practice modules...</div>;

  if (!profile?.class) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
        <h2 className="text-2xl font-bold text-[#7A4900]">Profile Incomplete</h2>
        <p className="text-[#545454]">Please complete your profile and select your Class to access practice exams.</p>
        <button onClick={() => window.location.href = '/profile'} className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold">
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <AnimatePresence mode="wait">
        {step === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#7A4900]">Practice Exam Setup</h1>
              <p className="text-[#545454]">Customize your practice session for {profile.class}</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-8">
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-bold text-[#7A4900] mb-4 uppercase tracking-wider">Select Subject</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {subjects.map(s => (
                    <button
                      key={s}
                      onClick={() => setConfig({ ...config, subject: s })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm ${config.subject === s ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-50 text-gray-400 hover:border-gray-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-bold text-[#7A4900] mb-4 uppercase tracking-wider">Exam Mode</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setConfig({ ...config, mode: 'Complete Board' })}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${config.mode === 'Complete Board' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-gray-50'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <List className={`w-6 h-6 ${config.mode === 'Complete Board' ? 'text-[#D4AF37]' : 'text-gray-300'}`} />
                      <h3 className={`font-bold ${config.mode === 'Complete Board' ? 'text-[#7A4900]' : 'text-gray-400'}`}>Complete Board Questions</h3>
                    </div>
                    <p className="text-xs text-[#545454]">Random questions from all available board questions for this subject.</p>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, mode: 'Selected Board' })}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${config.mode === 'Selected Board' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-gray-50'}`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle2 className={`w-6 h-6 ${config.mode === 'Selected Board' ? 'text-[#D4AF37]' : 'text-gray-300'}`} />
                      <h3 className={`font-bold ${config.mode === 'Selected Board' ? 'text-[#7A4900]' : 'text-gray-400'}`}>Selected Board Questions</h3>
                    </div>
                    <p className="text-xs text-[#545454]">Manually pick which questions you want to practice from the pool.</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-bold text-[#7A4900] mb-4 uppercase tracking-wider">Time Limit (Minutes)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {times.map(t => (
                      <button
                        key={t}
                        onClick={() => setConfig({ ...config, time: t })}
                        className={`py-2 rounded-lg border-2 transition-all font-bold text-xs ${config.time === t ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-50 text-gray-400'}`}
                      >
                        {t}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Count (only for Complete Board) */}
                {config.mode === 'Complete Board' && (
                  <div>
                    <label className="block text-sm font-bold text-[#7A4900] mb-4 uppercase tracking-wider">Question Count</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 20, 30, 50].map(c => (
                        <button
                          key={c}
                          onClick={() => setConfig({ ...config, count: c })}
                          className={`py-2 rounded-lg border-2 transition-all font-bold text-xs ${config.count === c ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-50 text-gray-400'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6">
                {config.mode === 'Selected Board' ? (
                  <button
                    onClick={() => setStep('selection')}
                    className="w-full bg-[#7A4900] text-white py-4 rounded-2xl font-bold text-lg hover:bg-black shadow-lg transition-all flex items-center justify-center space-x-3"
                  >
                    <span>Select Questions</span>
                    <ChevronRight className="w-6 h-6" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartExam}
                    className="w-full bg-[#D4AF37] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#B8860B] shadow-lg transition-all flex items-center justify-center space-x-3"
                  >
                    <Play className="w-6 h-6" />
                    <span>Start Practice Exam</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-[#7A4900]">Select Questions</h2>
                <p className="text-[#545454]">{filteredQuestions.length} questions available for {config.subject}</p>
              </div>
              <button onClick={() => setStep('config')} className="text-[#D4AF37] font-bold">Back</button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
              <div className="max-h-[60vh] overflow-y-auto divide-y">
                {filteredQuestions.map(q => (
                  <div 
                    key={q.id} 
                    onClick={() => {
                      setSelectedQuestionIds(prev => 
                        prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                      );
                    }}
                    className={`p-6 cursor-pointer transition-all flex items-start space-x-4 ${selectedQuestionIds.includes(q.id) ? 'bg-[#D4AF37]/5' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${selectedQuestionIds.includes(q.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-200'}`}>
                      {selectedQuestionIds.includes(q.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-600 rounded">{q.board}</span>
                      </div>
                      <p className="font-bold text-[#7A4900]">{q.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-50 flex justify-between items-center">
                <span className="font-bold text-[#7A4900]">{selectedQuestionIds.length} questions selected</span>
                <button
                  onClick={handleStartExam}
                  disabled={selectedQuestionIds.length === 0}
                  className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  Start Exam
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'exam' && (
          <motion.div
            key="exam"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center sticky top-4 z-10">
              <div>
                <h2 className="text-xl font-bold text-[#7A4900]">{config.subject} Practice</h2>
                <p className="text-xs text-gray-400 font-bold">Question {examState.currentQuestionIndex + 1} of {filteredQuestions.length}</p>
              </div>
              <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-mono font-bold text-xl ${examState.timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-50 text-[#7A4900]'}`}>
                <Clock className="w-6 h-6" />
                <span>{formatTime(examState.timeLeft)}</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-[#7A4900] mb-8 leading-relaxed">
                {filteredQuestions[examState.currentQuestionIndex]?.text}
              </h2>

              <div className="space-y-4">
                {filteredQuestions[examState.currentQuestionIndex]?.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setExamState({ ...examState, answers: { ...examState.answers, [filteredQuestions[examState.currentQuestionIndex].id]: i } })}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center space-x-4 ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-[#7A4900]'
                        : 'border-gray-50 hover:border-gray-200 text-[#545454]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i ? 'bg-[#D4AF37] text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="font-medium">{option}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setExamState({ ...examState, currentQuestionIndex: Math.max(0, examState.currentQuestionIndex - 1) })}
                disabled={examState.currentQuestionIndex === 0}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-[#7A4900] disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              {examState.currentQuestionIndex === filteredQuestions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={examState.submitting}
                  className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  <span>{examState.submitting ? 'Submitting...' : 'Finish Exam'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setExamState({ ...examState, currentQuestionIndex: Math.min(filteredQuestions.length - 1, examState.currentQuestionIndex + 1) })}
                  className="bg-[#7A4900] text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'results' && examState.results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="bg-white p-12 rounded-[3rem] shadow-xl text-center border border-gray-100">
              <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h1 className="text-4xl font-bold text-[#7A4900] mb-2">Exam Completed!</h1>
              <p className="text-[#545454] mb-12">Here is how you performed in {config.subject}</p>

              <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="p-6 bg-gray-50 rounded-3xl">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Score</p>
                  <p className="text-3xl font-bold text-[#7A4900]">{examState.results.score}%</p>
                </div>
                <div className="p-6 bg-green-50 rounded-3xl">
                  <p className="text-xs text-green-400 uppercase font-bold mb-1">Correct</p>
                  <p className="text-3xl font-bold text-green-600">{examState.results.correctCount}</p>
                </div>
                <div className="p-6 bg-red-50 rounded-3xl">
                  <p className="text-xs text-red-400 uppercase font-bold mb-1">Wrong</p>
                  <p className="text-3xl font-bold text-red-600">{examState.results.wrongCount}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => {
                    setStep('config');
                    setSelectedQuestionIds([]);
                  }}
                  className="bg-[#D4AF37] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-[#B8860B] transition-all flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Try Another</span>
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="bg-[#7A4900] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-black transition-all flex items-center justify-center space-x-2"
                >
                  <Eye className="w-5 h-5" />
                  <span>Review Answers</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'review' && examState.results && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-[#7A4900]">Question Review</h2>
              <button onClick={() => setStep('results')} className="text-[#D4AF37] font-bold">Back to Results</button>
            </div>
            
            {filteredQuestions.map((q, idx) => (
              <div key={q.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-500">{idx + 1}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${examState.answers[q.id] === q.correctAnswer ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {examState.answers[q.id] === q.correctAnswer ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#7A4900] mb-6">{q.text}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border-2 flex items-center space-x-3 ${
                        i === q.correctAnswer 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : i === examState.answers[q.id]
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-50 text-gray-400'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        i === q.correctAnswer ? 'bg-green-500 text-white' : i === examState.answers[q.id] ? 'bg-red-500 text-white' : 'bg-gray-100'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setStep('results')}
              className="w-full bg-gray-100 text-[#545454] py-4 rounded-2xl font-bold hover:bg-gray-200"
            >
              Back to Results
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
