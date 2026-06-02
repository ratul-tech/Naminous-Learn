import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Question, OperationType } from '../types';
import { BookOpen, Clock, CheckCircle2, ChevronRight, ChevronLeft, Send, AlertCircle, List, Play, RotateCcw, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { getSubjectsForGroup, SUBJECTS_BY_GROUP } from '../constants';

function getTimerForQuestionCount(count: number): number {
  if (count <= 20) return 16;
  if (count <= 30) return 25;
  if (count <= 50) return 40;
  if (count <= 75) return 60;
  return 80;
}
import { MathRenderer } from '../components/MathRenderer';
import { useLocation } from 'react-router-dom';
import { calculateQuizScoreBengali, toBengaliNumber } from '../lib/scoreCalculator';

interface PracticeProps {
  profile: UserProfile | null;
}

type Step = 'config' | 'selection' | 'exam' | 'results' | 'review';
type Mode = 'Complete Board' | 'Selected Board';

export default function Practice({ profile }: PracticeProps) {
  const location = useLocation();
  const [step, setStep] = useState<Step>('config');

  useEffect(() => {
    if (typeof (window as any).setExamActiveState === 'function') {
      (window as any).setExamActiveState(step === 'exam');
    }
    return () => {
      if (typeof (window as any).setExamActiveState === 'function') {
        (window as any).setExamActiveState(false);
      }
    };
  }, [step]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [config, setConfig] = useState(() => {
    const locState = location.state as any;
    return {
      subject: locState?.subject || 'Physics',
      class: locState?.class || profile?.class || 'SSC Candidate',
      mode: locState?.mode || ('Complete Board' as Mode),
      time: locState?.time || 16, // minutes
      count: locState?.count || 20,
    };
  });

  const [examState, setExamState] = useState({
    currentQuestionIndex: 0,
    answers: {} as Record<string, number>,
    timeLeft: 0,
    examStarted: false,
    submitting: false,
    results: null as any,
  });

  const isCollegeCategory = config.class === 'College Admission';
  const subjects = isCollegeCategory 
    ? ['Notre Dame College', 'Holy Cross College', 'Saint Joseph College']
        .concat(getSubjectsForGroup(profile?.group))
        .concat(['Mixed'])
    : (getSubjectsForGroup(profile?.group).includes('Mixed') 
        ? getSubjectsForGroup(profile?.group) 
        : getSubjectsForGroup(profile?.group).concat(['Mixed']));
  const times = [5, 10, 15, 20, 30, 45, 60];

  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(config.subject)) {
      setConfig(prev => ({ ...prev, subject: subjects[0] }));
    }
  }, [subjects, config.subject]);

  // Support retake / autoStart from location state
  useEffect(() => {
    if (!loading && filteredQuestions.length > 0 && location.state?.autoStart && !examState.examStarted) {
      const locState = location.state as any;
      
      let examQuestions = [];
      if (locState.mode === 'Complete Board') {
        const size = locState.count || 20;
        examQuestions = [...filteredQuestions].sort(() => 0.5 - Math.random()).slice(0, size);
      } else if (locState.mode === 'Selected Board' && locState.selectedQuestionIds) {
        examQuestions = filteredQuestions.filter(q => locState.selectedQuestionIds.includes(q.id));
      } else {
        const size = locState.count || 20;
        examQuestions = [...filteredQuestions].sort(() => 0.5 - Math.random()).slice(0, size);
      }

      if (examQuestions.length > 0) {
        setFilteredQuestions(examQuestions);
        const calculatedTime = getTimerForQuestionCount(examQuestions.length);
        setExamState({
          currentQuestionIndex: 0,
          answers: {},
          timeLeft: calculatedTime * 60,
          examStarted: true,
          submitting: false,
          results: null,
        });
        setStep('exam');
      }
    }
  }, [loading, filteredQuestions, location.state, examState.examStarted]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        let q;
        if (config.class === 'College Admission') {
          q = query(
            collection(db, 'questions'),
            where('category', '==', 'College Admission')
          );
        } else {
          q = query(
            collection(db, 'questions'),
            where('class', '==', config.class)
          );
        }
        const snapshot = await getDocs(q);
        const allQ = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Question));
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
    if (config.class === 'College Admission') {
      const selectedCol = config.subject;
      if (selectedCol === 'Notre Dame College' || selectedCol === 'Holy Cross College' || selectedCol === 'Saint Joseph College') {
        const filtered = questions.filter(q => {
          if (!q.college) return false;
          const qc = q.college.trim().toLowerCase();
          
          if (selectedCol === 'Notre Dame College') {
            return qc === 'ndc' || qc.includes('notre dame') || qc.includes('nd');
          } else if (selectedCol === 'Holy Cross College') {
            return qc === 'hcc' || qc.includes('holy cross') || qc.includes('hc');
          } else if (selectedCol === 'Saint Joseph College') {
            return qc === 'stjc' || qc === 'st joseph' || qc === 'saint joseph' || qc === 'sjc' || qc.includes('st. joseph') || qc.includes('joseph');
          }
          return false;
        });
        setFilteredQuestions(filtered);
      } else if (selectedCol === 'Mixed') {
        setFilteredQuestions(questions);
      } else {
        const filtered = questions.filter(q => q.subject === selectedCol);
        setFilteredQuestions(filtered);
      }
    } else {
      if (config.subject === 'Mixed') {
        const activeGroup = profile?.group || 'Science';
        const allowedSubjects = SUBJECTS_BY_GROUP[activeGroup] || [];
        const filtered = questions.filter(q => q.subject && allowedSubjects.includes(q.subject));
        setFilteredQuestions(filtered);
      } else {
        const filtered = questions.filter(q => q.subject === config.subject);
        setFilteredQuestions(filtered);
      }
    }
  }, [questions, config.subject, config.class, profile?.group]);

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

    const finalCount = examQuestions.length;
    const finalTime = getTimerForQuestionCount(finalCount);

    setFilteredQuestions(examQuestions);
    setExamState({
      ...examState,
      currentQuestionIndex: 0,
      answers: {},
      timeLeft: finalTime * 60,
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

    let correctCount = 0;
    let wrongCount = 0;
    
    filteredQuestions.forEach(q => {
      const userAns = examState.answers[q.id];
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

    const results = {
      score: finalScore,
      correctCount,
      wrongCount,
      solvedCount,
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
          solvedCount: results.solvedCount,
          totalQuestions: results.totalQuestions,
          subject: config.subject,
          class: profile.class || 'N/A',
          type: 'Practice',
          answers: results.answers,
          questions: filteredQuestions,
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
              <div className="grid grid-cols-2 gap-4 max-w-xl">
                {['SSC Candidate', 'College Admission'].map(c => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Time Selection */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-550 uppercase tracking-[0.25em]">Duration (Minutes)</label>
                <div className="px-5 py-3.5 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 flex items-center space-x-3 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                  <Clock className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                  <span className="text-white text-xs font-black uppercase tracking-wider">
                    {getTimerForQuestionCount(config.count)} minutes (allocated automatically)
                  </span>
                </div>
              </div>

              {/* Question Count */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-550 uppercase tracking-[0.25em]">Quantity</label>
                <div className="flex flex-wrap gap-2">
                  {[20, 30, 50, 75, 100].map(c => (
                    <button
                      key={c}
                      onClick={() => setConfig({ ...config, count: c, time: getTimerForQuestionCount(c) })}
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
            </div>

            <div className="pt-8 border-t border-slate-900 flex justify-center">
              <button
                onClick={handleStartExam}
                className="w-full md:w-auto min-w-[300px] border border-[#D4AF37] text-[#D4AF37] py-4 px-10 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#D4AF37]/5 transition-all flex items-center justify-center space-x-2 animate-pulse"
              >
                <Play className="w-4 h-4" />
                <span>Begin Training Session</span>
              </button>
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
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60 border-b border-[#D4AF37]/20 pb-0.5">
                          {q.category === 'Board' ? q.board : q.college}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-200 text-sm">
                        <MathRenderer content={q.text} engine={profile?.mathEngine} />
                      </div>
                      {q.imageUrl && (
                        <div className="mt-3 max-w-xs rounded-lg overflow-hidden border border-slate-800 bg-slate-950/20 p-1">
                          <img 
                            src={q.imageUrl} 
                            alt="Question detail visual" 
                            className="w-full h-auto object-contain max-h-36 rounded" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
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
              {filteredQuestions[examState.currentQuestionIndex]?.imageUrl && (
                <div className="my-4 max-w-full sm:max-w-md rounded-xl overflow-hidden border border-slate-850 bg-slate-950/40 p-2 mx-auto sm:mx-0">
                  <img 
                    src={filteredQuestions[examState.currentQuestionIndex].imageUrl} 
                    alt="Question visual helper" 
                    className="w-full h-auto object-contain max-h-60 rounded-lg mx-auto" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredQuestions[examState.currentQuestionIndex]?.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setExamState({ ...examState, answers: { ...examState.answers, [filteredQuestions[examState.currentQuestionIndex].id]: i } })}
                    className={`w-full p-5 flex items-center space-x-4 text-left transition-all border-b duration-200 active:scale-[0.99] group ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i
                        ? 'text-[#D4AF37] bg-[#D4AF37]/5 border-b-2 border-[#D4AF37]'
                        : 'bg-transparent hover:bg-slate-900/30 text-slate-300 hover:text-white border-slate-900/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                      examState.answers[filteredQuestions[examState.currentQuestionIndex].id] === i
                        ? 'bg-[#D4AF37] text-slate-950 scale-105'
                        : 'bg-slate-900 text-slate-500 group-hover:text-slate-300 group-hover:bg-slate-800'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <MathRenderer content={option} className="font-semibold text-sm leading-relaxed" engine={profile?.mathEngine} />
                    </div>
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
            className="space-y-8 text-center max-w-3xl mx-auto"
          >
            <div>
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 uppercase tracking-tight">Exam Completed!</h1>
              <p className="text-slate-400 mb-10">Here is how you performed in {config.subject}</p>

              {/* Comprehensive Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12 border-b border-slate-900 pb-8">
                <div className="py-4 text-center border-b md:border-b-0 md:border-r border-slate-900/40">
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-2">Total Questions</p>
                  <p className="text-3xl sm:text-4xl font-black text-white">{examState.results.totalQuestions}</p>
                </div>
                <div className="py-4 text-center border-b md:border-b-0 md:border-r border-slate-900/40">
                  <p className="text-[9px] text-indigo-400 uppercase font-black tracking-widest mb-2">Solved (Attempted)</p>
                  <p className="text-3xl sm:text-4xl font-black text-indigo-300">{examState.results.solvedCount ?? (examState.results.correctCount + examState.results.wrongCount)}</p>
                </div>
                <div className="py-4 text-center border-b md:border-b-0 md:border-r border-slate-900/40">
                  <p className="text-[9px] text-emerald-400 uppercase font-black tracking-widest mb-2">Correct (+1.0)</p>
                  <p className="text-3xl sm:text-4xl font-black text-emerald-400">+{examState.results.correctCount}</p>
                </div>
                <div className="py-4 text-center border-b md:border-b-0 md:border-r border-slate-900/40">
                  <p className="text-[9px] text-rose-400 uppercase font-black tracking-widest mb-2">Incorrect (-0.25)</p>
                  <p className="text-3xl sm:text-4xl font-black text-rose-400">-{examState.results.wrongCount}</p>
                </div>
                <div className="py-4 text-center col-span-2 md:col-span-1">
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-2">Unsolved (Skipped)</p>
                  <p className="text-3xl sm:text-4xl font-black text-slate-400">
                    {examState.results.totalQuestions - (examState.results.solvedCount ?? (examState.results.correctCount + examState.results.wrongCount))}
                  </p>
                </div>
              </div>

              {/* Big Score Panel */}
              <div className="py-10 sm:py-16 mb-12 text-center relative border-b border-slate-900">
                <p className="text-xs text-[#D4AF37] uppercase font-black tracking-widest mb-4">Final Penalty-adjusted Score</p>
                <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-8">
                  <p className="text-6xl sm:text-8xl font-black text-[#D4AF37] tracking-tighter">
                    {examState.results.score.toFixed(2)}
                  </p>
                  <div className="text-center sm:text-left sm:border-l border-slate-900 sm:pl-8 mt-4 sm:mt-0 space-y-1">
                    <p className="text-xs text-slate-450 font-black uppercase tracking-wider">Out of {examState.results.totalQuestions}.00 max marks</p>
                    <p className="text-[10px] text-slate-550 font-bold uppercase">Formula: ({examState.results.correctCount} × 1) - ({examState.results.wrongCount} × 0.25)</p>
                  </div>
                </div>
              </div>

              {/* Bengali Score Translation Card */}
              <div className="py-8 mb-12 border-b border-dashed border-slate-900/40 max-w-lg mx-auto text-center">
                <p className="text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-[0.2em] mb-3">বাংলায় ফলাফল বিবরণী</p>
                <pre className="text-emerald-450 text-lg sm:text-xl font-black font-sans leading-relaxed whitespace-pre-wrap">
                  {calculateQuizScoreBengali({
                    marksPerRight: 1,
                    negativeMarksPerWrong: 0.25,
                    totalQuestions: examState.results.totalQuestions,
                    correctAnswers: examState.results.correctCount,
                    wrongAnswers: examState.results.wrongCount
                  })}
                </pre>
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
                {q.imageUrl && (
                  <div className="my-4 max-w-full sm:max-w-md rounded-xl overflow-hidden border border-slate-850 bg-slate-950/40 p-2">
                    <img 
                      src={q.imageUrl} 
                      alt="Question detailed reference" 
                      className="w-full h-auto object-contain max-h-52 rounded-lg" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
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
