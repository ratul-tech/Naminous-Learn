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
    <div className="space-y-12">
      <header className="relative overflow-hidden bg-slate-900 p-6 sm:p-10 md:p-16 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-800 text-center">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4 md:mb-6"
          >
            Elite Training Station
          </motion.div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6 font-serif leading-tight px-4">
            Practice Modules
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
            Sharpen your intellect with specialized modules tailored for excellence.
          </p>
        </div>
        
        <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 text-slate-800 opacity-[0.03] pointer-events-none" />
      </header>

      <AnimatePresence mode="wait">
        {step === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-800 space-y-12"
          >
            {/* Academic Level Selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Select Academic Level</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Class 9', 'Class 10', 'SSC Candidate', 'College Admission'].map(c => (
                  <button
                    key={c}
                    onClick={() => setConfig({ ...config, class: c })}
                    className={`px-6 py-4 rounded-2xl border-2 transition-all font-bold text-sm text-center ${
                      config.class === c 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-lg shadow-amber-500/10' 
                        : 'border-slate-800 text-slate-500 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Select Knowledge Area</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {subjects.map(s => (
                  <button
                    key={s}
                    onClick={() => setConfig({ ...config, subject: s })}
                    className={`px-6 py-4 rounded-2xl border-2 transition-all font-bold text-sm text-center ${
                      config.subject === s 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-lg shadow-amber-500/10' 
                        : 'border-slate-800 text-slate-500 bg-slate-950 hover:border-slate-700'
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
                className={`group cursor-pointer p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${
                  config.mode === 'Complete Board' 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-lg' 
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                }`}
              >
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-colors ${
                    config.mode === 'Complete Board' ? 'bg-[#D4AF37] text-slate-900' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <List className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold font-serif mb-2 transition-colors ${
                    config.mode === 'Complete Board' ? 'text-white' : 'text-slate-500'
                  }`}>
                    Comprehensive Pool
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed opacity-70">
                    A balanced mix of random questions from the entire board database.
                  </p>
                </div>
                {config.mode === 'Complete Board' && (
                  <div className="absolute top-6 right-6">
                    <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                )}
              </div>

              <div
                onClick={() => setConfig({ ...config, mode: 'Selected Board' })}
                className={`group cursor-pointer p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${
                  config.mode === 'Selected Board' 
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-lg' 
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                }`}
              >
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-colors ${
                    config.mode === 'Selected Board' ? 'bg-[#D4AF37] text-slate-900' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold font-serif mb-2 transition-colors ${
                    config.mode === 'Selected Board' ? 'text-white' : 'text-slate-500'
                  }`}>
                    Master Selection
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed opacity-70">
                    Hand-pick specific questions to target your weak points and refine mastery.
                  </p>
                </div>
                {config.mode === 'Selected Board' && (
                  <div className="absolute top-6 right-6">
                    <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Time Selection */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Duration (Minutes)</label>
                <div className="flex flex-wrap gap-2">
                  {times.map(t => (
                    <button
                      key={t}
                      onClick={() => setConfig({ ...config, time: t })}
                      className={`px-4 py-2 rounded-xl border-2 transition-all font-bold text-xs ${
                        config.time === t 
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-slate-900' 
                          : 'border-slate-800 text-slate-500 bg-slate-950 hover:border-slate-700'
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Quantity</label>
                  <div className="flex flex-wrap gap-2">
                    {[10, 20, 30, 50].map(c => (
                      <button
                        key={c}
                        onClick={() => setConfig({ ...config, count: c })}
                        className={`px-6 py-2 rounded-xl border-2 transition-all font-bold text-xs ${
                          config.count === c 
                            ? 'border-[#D4AF37] bg-[#D4AF37] text-slate-900' 
                            : 'border-slate-800 text-slate-500 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-slate-800 flex justify-center">
              {config.mode === 'Selected Board' ? (
                <button
                  onClick={() => setStep('selection')}
                  className="w-full md:w-auto min-w-[300px] bg-slate-800 text-white py-5 px-10 rounded-2xl font-bold text-lg hover:bg-slate-700 shadow-xl transition-all flex items-center justify-center space-x-3 group border border-slate-700"
                >
                  <span>Customize Question Selection</span>
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={handleStartExam}
                  className="w-full md:w-auto min-w-[300px] bg-[#D4AF37] text-slate-900 py-5 px-10 rounded-2xl font-bold text-lg hover:bg-amber-400 shadow-2xl shadow-amber-500/20 transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-4"
                >
                  <Play className="w-6 h-6" />
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
                <h2 className="text-2xl font-bold text-white font-serif">Select Questions</h2>
                <p className="text-slate-400">{filteredQuestions.length} questions available for {config.subject}</p>
              </div>
              <button onClick={() => setStep('config')} className="text-[#D4AF37] font-bold hover:text-amber-400 transition-colors">Back</button>
            </div>

            <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-800 custom-scrollbar">
                {filteredQuestions.map(q => (
                  <div 
                    key={q.id} 
                    onClick={() => {
                      setSelectedQuestionIds(prev => 
                        prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                      );
                    }}
                    className={`p-6 cursor-pointer transition-all flex items-start space-x-4 ${selectedQuestionIds.includes(q.id) ? 'bg-[#D4AF37]/10' : 'hover:bg-slate-800/50'}`}
                  >
                    <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedQuestionIds.includes(q.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-slate-700'}`}>
                      {selectedQuestionIds.includes(q.id) && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{q.board}</span>
                      </div>
                      <div className="font-bold text-slate-200">
                        <MathRenderer content={q.text} engine={profile?.mathEngine} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-slate-950 flex justify-between items-center border-t border-slate-800">
                <span className="font-bold text-[#D4AF37] uppercase tracking-widest text-[10px] bg-[#D4AF37]/10 px-4 py-2 rounded-full border border-[#D4AF37]/20">{selectedQuestionIds.length} Selected</span>
                <button
                  onClick={handleStartExam}
                  disabled={selectedQuestionIds.length === 0}
                  className="bg-[#D4AF37] text-slate-900 px-8 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10"
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
            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 flex justify-between items-center sticky top-4 z-10 backdrop-blur-md bg-slate-900/90">
              <div>
                <h2 className="text-xl font-bold text-white font-serif">{config.subject} Practice</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Question {examState.currentQuestionIndex + 1} of {filteredQuestions.length}</p>
              </div>
              <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-mono font-bold text-xl ${examState.timeLeft < 60 ? 'bg-rose-500/10 text-rose-400 animate-pulse border border-rose-500/20 shadow-lg' : 'bg-slate-950 text-[#D4AF37] border border-slate-800'}`}>
                <Clock className="w-6 h-6" />
                <span>{formatTime(examState.timeLeft)}</span>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-800">
              <div className="text-2xl font-bold text-white mb-8 leading-relaxed font-serif">
                <MathRenderer content={filteredQuestions[examState.currentQuestionIndex]?.text || ''} engine={profile?.mathEngine} />
              </div>

              <div className="space-y-4">
                {filteredQuestions[examState.currentQuestionIndex]?.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setExamState({ ...examState, answers: { ...examState.answers, [filteredQuestions[examState.currentQuestionIndex].id]: i } })}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center space-x-4 ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i ? 'bg-[#D4AF37] text-slate-900' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <MathRenderer content={option} className="font-medium" engine={profile?.mathEngine} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setExamState({ ...examState, currentQuestionIndex: Math.max(0, examState.currentQuestionIndex - 1) })}
                disabled={examState.currentQuestionIndex === 0}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-colors bg-slate-900 border border-slate-800 shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              {examState.currentQuestionIndex === filteredQuestions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={examState.submitting}
                  className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  <span>{examState.submitting ? 'Submitting...' : 'Finish Exam'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setExamState({ ...examState, currentQuestionIndex: Math.min(filteredQuestions.length - 1, examState.currentQuestionIndex + 1) })}
                  className="bg-[#D4AF37] text-slate-900 px-10 py-3 rounded-xl font-bold shadow-xl shadow-amber-500/10 hover:bg-amber-400 transition-all flex items-center space-x-2"
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
            <div className="bg-slate-900 p-12 rounded-[3rem] shadow-2xl text-center border border-slate-800">
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-lg">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-2 font-serif">Exam Completed!</h1>
              <p className="text-slate-400 mb-12">Here is how you performed in {config.subject}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 md:mb-12">
                <div className="p-4 sm:p-6 bg-slate-950 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-inner">
                  <p className="text-[10px] text-slate-600 uppercase font-bold mb-2 tracking-widest">Score</p>
                  <p className="text-2xl sm:text-4xl font-bold text-white">{examState.results.score}%</p>
                </div>
                <div className="p-4 sm:p-6 bg-emerald-500/5 rounded-2xl sm:rounded-3xl border border-emerald-500/10 shadow-inner">
                  <p className="text-[10px] text-emerald-500/50 uppercase font-bold mb-2 tracking-widest">Correct</p>
                  <p className="text-2xl sm:text-4xl font-bold text-emerald-400">{examState.results.correctCount}</p>
                </div>
                <div className="p-4 sm:p-6 bg-rose-500/5 rounded-2xl sm:rounded-3xl border border-rose-500/10 shadow-inner">
                  <p className="text-[10px] text-rose-500/50 uppercase font-bold mb-2 tracking-widest">Wrong</p>
                  <p className="text-2xl sm:text-4xl font-bold text-rose-400">{examState.results.wrongCount}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => {
                    setStep('config');
                    setSelectedQuestionIds([]);
                  }}
                  className="bg-[#D4AF37] text-slate-900 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-amber-400 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/10"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Try Another</span>
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-700 transition-all flex items-center justify-center space-x-2 border border-slate-700 shadow-xl"
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
              <h2 className="text-2xl font-bold text-white font-serif">Question Review</h2>
              <button onClick={() => setStep('results')} className="text-[#D4AF37] font-bold hover:text-amber-400 transition-colors">Back to Results</button>
            </div>
            
            {filteredQuestions.map((q, idx) => (
              <div key={q.id} className="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800">
                <div className="flex items-center space-x-3 mb-6">
                  <span className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-xs text-slate-500 shadow-inner">{idx + 1}</span>
                  <span className={`text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest border ${examState.answers[q.id] === q.correctAnswer ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {examState.answers[q.id] === q.correctAnswer ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div className="text-lg font-bold text-white mb-8 font-serif leading-relaxed">
                  <MathRenderer content={q.text} engine={profile?.mathEngine} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border-2 flex items-center space-x-3 transition-colors ${
                        i === q.correctAnswer 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100' 
                          : i === examState.answers[q.id]
                            ? 'border-rose-500 bg-rose-500/10 text-rose-100'
                            : 'border-slate-800 bg-slate-950 text-slate-500'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        i === q.correctAnswer ? 'bg-emerald-500 text-white shadow-lg' : i === examState.answers[q.id] ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-800 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <MathRenderer content={opt} engine={profile?.mathEngine} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setStep('results')}
              className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl font-bold hover:bg-slate-700 transition-all border border-slate-700 shadow-xl"
            >
              Back to Results
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
