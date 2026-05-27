import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Question, OperationType } from '../types';
import { BookOpen, Clock, CheckCircle2, ChevronRight, ChevronLeft, Send, AlertCircle, List, Play, RotateCcw, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { getSubjectsForGroup } from '../constants';
import { MathRenderer } from '../components/MathRenderer';

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
    class: profile?.class || 'Class 9',
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

  const subjects = getSubjectsForGroup(profile?.group);
  const times = [5, 10, 15, 20, 30, 45, 60];

  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(config.subject)) {
      setConfig(prev => ({ ...prev, subject: subjects[0] }));
    }
  }, [subjects]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'questions'),
          where('class', '==', config.class)
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
  }, [config.class]);

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
      score: Math.round((score / (filteredQuestions.length || 1)) * 100),
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
          subject: config.subject,
          class: profile.class || 'N/A',
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

  if (loading) return <div className="text-center py-20 text-slate-500 font-bold tracking-widest animate-pulse uppercase">Loading practice modules...</div>;

  if (!profile?.class) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Profile Incomplete</h2>
        <p className="text-slate-400">Please complete your profile and select your Class to access practice exams.</p>
        <button onClick={() => window.location.href = '/profile'} className="bg-[#D4AF37] text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10">
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <header className="relative py-12 text-center group">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-0 py-1 text-[#D4AF37] text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] mb-4"
          >
            Elite Training Station
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 uppercase leading-none tracking-tight">
            Practice <span className="text-[#D4AF37]">Modules</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Sharpen your intellect with specialized modules tailored for academic excellence.
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Academic Level Selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-550 uppercase tracking-[0.25em] mb-6">Select Academic Level</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Class 9', 'Class 10', 'SSC Candidate', 'College Admission'].map(c => (
                  <button
                    key={c}
                    onClick={() => setConfig({ ...config, class: c })}
                    className={`px-6 py-4 rounded-xl border transition-all font-black text-xs text-center uppercase tracking-widest ${
                      config.class === c 
                        ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' 
                        : 'border-slate-900 text-slate-500 bg-transparent hover:border-slate-805 hover:text-slate-350'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-550 uppercase tracking-[0.25em] mb-6">Select Knowledge Area</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {subjects.map(s => (
                  <button
                    key={s}
                    onClick={() => setConfig({ ...config, subject: s })}
                    className={`px-6 py-4 rounded-xl border transition-all font-black text-xs text-center uppercase tracking-widest ${
                      config.subject === s 
                        ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' 
                        : 'border-slate-900 text-slate-500 bg-transparent hover:border-slate-805 hover:text-slate-350'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div
                onClick={() => setConfig({ ...config, mode: 'Complete Board' })}
                className={`group cursor-pointer py-8 border-b border-dashed transition-all relative ${
                  config.mode === 'Complete Board' 
                    ? 'border-[#D4AF37]/50' 
                    : 'border-slate-900/60'
                }`}
              >
                <div className="relative z-10 flex items-start space-x-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    config.mode === 'Complete Board' ? 'text-[#D4AF37]' : 'text-slate-600'
                  }`}>
                    <List className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black uppercase tracking-tight mb-1 transition-colors ${
                      config.mode === 'Complete Board' ? 'text-white' : 'text-slate-500'
                    }`}>
                      Comprehensive Pool
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                      A balanced mix of random questions from the entire board database.
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setConfig({ ...config, mode: 'Selected Board' })}
                className={`group cursor-pointer py-8 border-b border-dashed transition-all relative ${
                  config.mode === 'Selected Board' 
                    ? 'border-[#D4AF37]/50' 
                    : 'border-slate-900/60'
                }`}
              >
                <div className="relative z-10 flex items-start space-x-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    config.mode === 'Selected Board' ? 'text-[#D4AF37]' : 'text-slate-600'
                  }`}>
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black uppercase tracking-tight mb-1 transition-colors ${
                      config.mode === 'Selected Board' ? 'text-white' : 'text-slate-500'
                    }`}>
                      Master Selection
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                      Hand-pick specific questions to target your weak points and refine mastery.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Time Selection */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-550 uppercase tracking-[0.25em]">Duration (Minutes)</label>
                <div className="flex flex-wrap gap-2">
                  {times.map(t => (
                    <button
                      key={t}
                      onClick={() => setConfig({ ...config, time: t })}
                      className={`px-4 py-2 rounded-full border transition-all font-bold text-xs ${
                        config.time === t 
                          ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' 
                          : 'border-slate-900 text-slate-500 bg-transparent hover:border-slate-805'
                      }`}
                    >
                      {t}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              {config.mode === 'Complete Board' && (
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-550 uppercase tracking-[0.25em]">Quantity</label>
                  <div className="flex flex-wrap gap-2">
                    {[10, 20, 30, 50].map(c => (
                      <button
                        key={c}
                        onClick={() => setConfig({ ...config, count: c })}
                        className={`px-4 py-2 rounded-full border transition-all font-bold text-xs ${
                          config.count === c 
                            ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' 
                            : 'border-slate-900 text-slate-500 bg-transparent hover:border-slate-805'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-slate-900 flex justify-center">
              {config.mode === 'Selected Board' ? (
                <button
                  onClick={() => setStep('selection')}
                  className="w-full md:w-auto min-w-[300px] border border-[#D4AF37]/35 text-[#D4AF37] py-4 px-10 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#D4AF37]/5 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Customize Question Selection</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleStartExam}
                  className="w-full md:w-auto min-w-[300px] border border-[#D4AF37] text-[#D4AF37] py-4 px-10 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#D4AF37]/5 transition-all flex items-center justify-center space-x-2 animate-pulse"
                >
                  <Play className="w-4 h-4" />
                  <span>Begin Training Session</span>
                </button>
              )}
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
                <h2 className="text-xl font-black uppercase tracking-tight text-white mb-1">Select Questions</h2>
                <p className="text-xs text-slate-500">{filteredQuestions.length} Questions available for {config.subject}</p>
              </div>
              <button onClick={() => setStep('config')} className="text-[#D4AF37] font-black text-xs uppercase tracking-widest hover:text-amber-400">Back</button>
            </div>

            <div className="overflow-hidden border-b border-dashed border-slate-900 pb-6">
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-905 custom-scrollbar">
                {filteredQuestions.map(q => (
                  <div 
                    key={q.id} 
                    onClick={() => {
                      setSelectedQuestionIds(prev => 
                        prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                      );
                    }}
                    className={`py-5 cursor-pointer transition-all flex items-start space-x-4 border-b border-slate-900/40`}
                  >
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selectedQuestionIds.includes(q.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-slate-805'}`}>
                      {selectedQuestionIds.includes(q.id) && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60 border-b border-[#D4AF37]/20 pb-0.5">{q.board}</span>
                      </div>
                      <div className="font-semibold text-slate-200 text-sm">
                        <MathRenderer content={q.text} engine={profile?.mathEngine} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="py-6 flex justify-between items-center">
                <span className="font-extrabold text-[#D4AF37] uppercase tracking-widest text-[9px] border-b border-[#D4AF37]/30 pb-0.5">{selectedQuestionIds.length} Selected</span>
                <button
                  onClick={handleStartExam}
                  disabled={selectedQuestionIds.length === 0}
                  className="border border-[#D4AF37] text-[#D4AF37] px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#D4AF37]/5 disabled:opacity-40 transition-all hover:scale-[1.02]"
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
            <div className="flex justify-between items-center sticky top-4 z-10 py-4 border-b border-slate-900 bg-black/90 backdrop-blur-md mb-8">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">{config.subject} Practice</h2>
                <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">Question {examState.currentQuestionIndex + 1} of {filteredQuestions.length}</p>
              </div>
              <div className={`flex items-center space-x-2 font-mono font-extrabold text-lg ${examState.timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-[#D4AF37]'}`}>
                <Clock className="w-5 h-5" />
                <span>{formatTime(examState.timeLeft)}</span>
              </div>
            </div>

            <div className="space-y-8 pb-10">
              <div className="text-2xl sm:text-3xl font-black text-white leading-relaxed tracking-tight font-serif">
                <MathRenderer content={filteredQuestions[examState.currentQuestionIndex]?.text || ''} engine={profile?.mathEngine} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuestions[examState.currentQuestionIndex]?.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setExamState({ ...examState, answers: { ...examState.answers, [filteredQuestions[examState.currentQuestionIndex].id]: i } })}
                    className={`w-full p-5 rounded-xl border transition-all flex items-center space-x-4 ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i
                        ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                        : 'border-slate-850 bg-transparent hover:border-slate-650 hover:bg-slate-900/40 text-slate-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i ? 'bg-[#D4AF37] text-slate-950' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <MathRenderer content={option} className="font-semibold text-sm" engine={profile?.mathEngine} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-slate-900">
              <button
                onClick={() => setExamState({ ...examState, currentQuestionIndex: Math.max(0, examState.currentQuestionIndex - 1) })}
                disabled={examState.currentQuestionIndex === 0}
                className="flex items-center space-x-2 text-slate-500 hover:text-white disabled:opacity-30 transition-colors py-2 font-black text-xs uppercase tracking-widest"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {examState.currentQuestionIndex === filteredQuestions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={examState.submitting}
                  className="border border-emerald-500 text-emerald-450 px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-500/5 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{examState.submitting ? 'Submitting...' : 'Finish Exam'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setExamState({ ...examState, currentQuestionIndex: Math.min(filteredQuestions.length - 1, examState.currentQuestionIndex + 1) })}
                  className="border border-[#D4AF37] text-[#D4AF37] px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#D4AF37]/5 transition-all flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
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
            className="space-y-8 text-center"
          >
            <div>
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 uppercase tracking-tight">Exam Completed!</h1>
              <p className="text-slate-400 mb-12">Here is how you performed in {config.subject}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 border-y border-dashed border-slate-900 py-10">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-550 uppercase font-black tracking-widest">Score</p>
                  <p className="text-4xl sm:text-6xl font-black text-[#D4AF37]">{examState.results.score}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-550 uppercase font-black tracking-widest">Correct</p>
                  <p className="text-4xl sm:text-6xl font-black text-emerald-400">{examState.results.correctCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-550 uppercase font-black tracking-widest">Wrong</p>
                  <p className="text-4xl sm:text-6xl font-black text-rose-400">{examState.results.wrongCount}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => {
                    setStep('config');
                    setSelectedQuestionIds([]);
                  }}
                  className="border border-[#D4AF37] text-[#D4AF37] px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#D4AF37]/5 transition-all flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Another</span>
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="border border-slate-800 text-slate-350 px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900/40 transition-all flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
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
              <h2 className="text-xl font-black uppercase tracking-tight text-white">Question Review</h2>
              <button onClick={() => setStep('results')} className="text-[#D4AF37] font-black text-xs uppercase tracking-widest hover:text-amber-400">Back to Results</button>
            </div>
            
            {filteredQuestions.map((q, idx) => (
              <div key={q.id} className="py-8 border-b border-dashed border-slate-905">
                <div className="flex items-center space-x-3 mb-6">
                  <span className="w-7 h-7 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center font-bold text-xs text-slate-550 shadow-inner">{idx + 1}</span>
                  <span className={`text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest border ${examState.answers[q.id] === q.correctAnswer ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {examState.answers[q.id] === q.correctAnswer ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div className="text-xl font-black text-white mb-8 leading-relaxed font-serif">
                  <MathRenderer content={q.text} engine={profile?.mathEngine} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border flex items-center space-x-3 transition-colors ${
                        i === q.correctAnswer 
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-100' 
                          : i === examState.answers[q.id]
                            ? 'border-rose-500 bg-rose-500/5 text-rose-100'
                            : 'border-slate-850 bg-transparent text-slate-500'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        i === q.correctAnswer ? 'bg-emerald-500 text-slate-950' : i === examState.answers[q.id] ? 'bg-rose-505 bg-rose-500 text-slate-950' : 'bg-slate-900 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <MathRenderer content={opt} className="text-sm font-semibold" engine={profile?.mathEngine} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setStep('results')}
              className="w-full bg-slate-950 border border-slate-900 text-slate-550 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:text-white transition-all"
            >
              Back to Results
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
