import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ExamResult, Question, OperationType, ExamEvent } from '../types';
import { 
  Trophy, 
  BookOpen, 
  Calendar, 
  ArrowRight, 
  TrendingUp, 
  Clock, 
  Search, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Activity, 
  RefreshCw,
  FileQuestion,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Flame,
  ThumbsUp,
  BrainCircuit,
  BarChart2,
  Sparkles,
  RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MathRenderer } from '../components/MathRenderer';
import { handleFirestoreError } from '../lib/error-handler';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface ExamHistoryProps {
  profile: UserProfile | null;
}

export default function ExamHistory({ profile }: ExamHistoryProps) {
  const navigate = useNavigate();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, ExamEvent>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'event' | 'practice' | 'analytics'>('all');

  // Review Modal State
  const [reviewingResult, setReviewingResult] = useState<ExamResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, number>>({});
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [modalFilter, setModalFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  // Share Feedback Alert State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch results
  const fetchHistory = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const resultsRef = collection(db, 'results');
      const q = query(
        resultsRef,
        where('uid', '==', profile.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetchedResults = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExamResult));
      
      // Sort client-side by createdAt desc
      fetchedResults.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      
      // Fetch events map to check scheduled end times
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      const evMap: Record<string, ExamEvent> = {};
      eventsSnapshot.docs.forEach(doc => {
        evMap[doc.id] = { id: doc.id, ...doc.data() } as ExamEvent;
      });

      setResults(fetchedResults);
      setEventsMap(evMap);
    } catch (err: any) {
      console.error("Error fetching exam history:", err);
      setError("Unable to retrieve exam history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter out any results of Live Exams that are still currently ongoing or haven't ended yet
  const visibleResults = useMemo(() => {
    const now = new Date();
    return results.filter(r => {
      if (r.type !== 'Event') return true; // Practice is shown immediately
      if (!r.eventId) return false;
      const event = eventsMap[r.eventId];
      if (!event) {
        // If event is missing, only show if 24 hours have passed for privacy
        if (r.createdAt) {
          const resultTime = new Date(r.createdAt).getTime();
          return (now.getTime() - resultTime) > 24 * 60 * 60 * 1000;
        }
        return false;
      }
      const startTime = new Date(event.startTime);
      const endTime = event.endTime ? new Date(event.endTime) : new Date(startTime.getTime() + event.duration * 60000);
      return now > endTime;
    });
  }, [results, eventsMap]);

  // Calculate high-level stats
  const totalExams = visibleResults.length;
  const avgScore = totalExams > 0 
    ? (visibleResults.reduce((acc, curr) => acc + curr.score, 0) / totalExams) 
    : 0;
  const bestScore = totalExams > 0 
    ? Math.max(...visibleResults.map(r => r.score)) 
    : 0;
  
  const totalCorrect = visibleResults.reduce((acc, curr) => acc + (curr.correctCount || 0), 0);
  const totalQuestions = visibleResults.reduce((acc, curr) => acc + (curr.totalQuestions || 0), 0);
  const accuracyRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  
  const liveEventsCount = visibleResults.filter(r => r.type === 'Event').length;
  const practiceCount = visibleResults.filter(r => r.type === 'Practice').length;

  // Filter and search results
  const filteredResults = visibleResults.filter(r => {
    // If activeTab is 'analytics', it has its own dashboard view, but we list matching runs if they switch back
    const isMatchedType = activeTab === 'all' || activeTab === 'analytics' || r.type.toLowerCase() === activeTab;
    
    const titleText = r.type === 'Event' 
      ? 'Official Live Assessment' 
      : `${r.subject || 'General'} Practice`;
    
    const matchesSearch = searchTerm === '' || 
      titleText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.subject && r.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.class && r.class.toLowerCase().includes(searchTerm.toLowerCase()));
      
    return isMatchedType && matchesSearch;
  });

  // Calculate subject benchmarks & strengths for Analytics Tab
  const subjectAnalytics = useMemo(() => {
    const stats: Record<string, { totalScore: number; count: number; correct: number; totalQ: number }> = {};
    
    visibleResults.forEach(r => {
      const subjectName = r.subject || (r.type === 'Event' ? 'Live Events' : 'General');
      if (!stats[subjectName]) {
        stats[subjectName] = { totalScore: 0, count: 0, correct: 0, totalQ: 0 };
      }
      stats[subjectName].totalScore += r.score;
      stats[subjectName].count += 1;
      stats[subjectName].correct += r.correctCount || 0;
      stats[subjectName].totalQ += r.totalQuestions || 0;
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      avgScore: Math.round(data.totalScore / data.count),
      count: data.count,
      accuracy: data.totalQ > 0 ? Math.round((data.correct / data.totalQ) * 100) : 0,
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [visibleResults]);

  // Timeline analysis Data for Recharts
  const timelineData = useMemo(() => {
    return [...visibleResults]
      .reverse() // Oldest first for chronological order
      .map((r, idx) => ({
        index: idx + 1,
        date: new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: r.score,
        name: r.type === 'Event' ? 'Live Exam' : `${r.subject || 'Practice'}`
      }));
  }, [visibleResults]);

  // Handle Review Answer trigger
  const handleReview = async (result: ExamResult) => {
    setReviewingResult(result);
    setReviewQuestions([]);
    setReviewAnswers({});
    setReviewError(null);
    setModalFilter('all'); // Reset filter to all when opening review

    // If it's Practice and we've successfully saved questions/answers inline
    const practiceWithData = result as any;
    if (result.type === 'Practice' && practiceWithData.questions && practiceWithData.answers) {
      setReviewQuestions(practiceWithData.questions);
      setReviewAnswers(practiceWithData.answers);
      return;
    }

    if (result.type === 'Practice') {
      // Practice results without inline stores
      setReviewError("Detailed question breakdowns are only stored for newly taken Topic Practice exams. Your score of " + Number(result.score).toFixed(2) + " is verified.");
      return;
    }

    // If it's a Live Event: Fetch from Submissions & Events Collections
    if (result.type === 'Event' && result.eventId) {
      setReviewLoading(true);
      try {
        // 1. Fetch Event Questions
        const eventDoc = await getDoc(doc(db, 'events', result.eventId));
        if (!eventDoc.exists()) {
          throw new Error("Event details could not be found or have been archived.");
        }
        const eventData = eventDoc.data();
        const eventQuestions = eventData.questions || [];

        // 2. Fetch Submission details to match selections
        const submissionsRef = collection(db, 'submissions');
        const qSub = query(
          submissionsRef,
          where('uid', '==', profile.uid),
          where('eventId', '==', result.eventId)
        );
        const subSnapshot = await getDocs(qSub);
        
        let answersData: Record<string, number> = {};
        if (!subSnapshot.empty) {
          answersData = subSnapshot.docs[0].data().answers || {};
        }

        setReviewQuestions(eventQuestions);
        setReviewAnswers(answersData);

        if (eventQuestions.length === 0) {
          setReviewError("This assessment does not contain any questions for review.");
        }
      } catch (err: any) {
        console.error("Error fetching review data:", err);
        setReviewError(err?.message || "Failed to retrieve the answer breakdown.");
      } finally {
        setReviewLoading(false);
      }
    } else {
      setReviewError("Unable to locate parent event reference.");
    }
  };

  // Safe deletion of practice results
  const handleDeleteResult = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this practice run from your performance logs? This action is permanent.")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'results', id));
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'results');
    } finally {
      setDeletingId(null);
    }
  };

  // Re-run Practice Config Redirection
  const handleRetakePractice = (result: ExamResult) => {
    navigate('/practice', {
      state: {
        subject: result.subject || 'Physics',
        class: result.class || profile?.class || 'SSC Candidate',
        mode: 'Complete Board',
        count: result.totalQuestions || 10,
        autoStart: true
      }
    });
  };

  // Copy Summary Score to Clipboard
  const handleCopyClipboard = (res: ExamResult) => {
    const title = res.type === 'Event' ? 'Official Live assessment' : `${res.subject || 'General'} Practice`;
    const msg = `📚 I completed the "${title}" on Bangla Academy!\n🎯 Score: ${Number(res.score).toFixed(2)}\n✅ Correct Answers: ${res.correctCount}/${res.totalQuestions}\n📅 Date: ${new Date(res.createdAt).toLocaleDateString()}\nKeep pushing boundaries!`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(res.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Filter questions for the active modal breakdown
  const filteredModalQuestions = useMemo(() => {
    return reviewQuestions.filter(q => {
      const userAnswer = reviewAnswers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      const isAnswered = userAnswer !== undefined;

      if (modalFilter === 'correct') return isCorrect;
      if (modalFilter === 'incorrect') return isAnswered && !isCorrect;
      if (modalFilter === 'unanswered') return !isAnswered;
      return true; // all
    });
  }, [reviewQuestions, reviewAnswers, modalFilter]);

  return (
    <div className="space-y-12 pb-24 pt-4">
      {/* Official Header */}
      <header className="py-6 overflow-hidden relative">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-block text-amber-500 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-4"
          >
            Security Records
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl sm:text-6xl font-black text-white mb-2 leading-none tracking-tight font-sans">
                Exam <span className="text-[#D4AF37]">History</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                Review your past scores, evaluate correct options, and check explanations to elevate your academic stand.
              </p>
            </div>
            
            {/* Academy Standing Stats Summary */}
            <div className="flex items-center space-x-4 shrink-0 bg-slate-900/40 border border-slate-800/80 px-6 py-4 rounded-3xl backdrop-blur-md">
              <div className="text-right">
                <span className="text-4xl sm:text-5xl font-black text-[#D4AF37] font-sans tracking-tight">
                  {avgScore.toFixed(2)}
                </span>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 mt-1">Average Score</p>
              </div>
              <div className="h-10 w-px bg-slate-800 mx-2" />
              <div className="text-right">
                <span className="text-4xl sm:text-5xl font-black text-emerald-400 font-sans tracking-tight">
                  {bestScore.toFixed(2)}
                </span>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 mt-1">Best Yield</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
            <span>Overall Accuracy Rate</span>
            <span className="text-[#D4AF37]">{accuracyRate.toFixed(2)}%</span>
          </div>
          <div className="w-full h-[2px] bg-slate-900 overflow-hidden relative font-sans">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${accuracyRate}%` }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="h-full bg-gradient-to-r from-amber-600 via-[#D4AF37] to-amber-300 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
             />
          </div>
        </div>
      </header>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-all duration-350"><Trophy className="w-12 h-12 text-[#D4AF37]" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Undertook</p>
          <p className="text-3xl font-black text-white tracking-tight">{totalExams}</p>
          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Evaluations Logged</p>
        </div>
        <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-all duration-350"><Calendar className="w-12 h-12 text-blue-400" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Live Events</p>
          <p className="text-3xl font-black text-blue-400 tracking-tight">{liveEventsCount}</p>
          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Competitive Audits</p>
        </div>
        <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-all duration-350"><BookOpen className="w-12 h-12 text-purple-400" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Practice runs</p>
          <p className="text-3xl font-black text-purple-400 tracking-tight">{practiceCount}</p>
          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Subject Mastery</p>
        </div>
        <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-all duration-350"><Activity className="w-12 h-12 text-[#D4AF37]" /></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Efficiency Rating</p>
          <p className="text-3xl font-black text-emerald-400 tracking-tight">{avgScore >= 80 ? 'Master' : avgScore >= 60 ? 'Scholar' : 'Initiate'}</p>
          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Derived standing</p>
        </div>
      </div>

      {/* Main Control Panel and History table / Analytics */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Custom Tabs including Analytics */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'all' 
                  ? 'bg-[#D4AF37] text-slate-950 shadow-lg shadow-amber-500/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              All Runs
            </button>
            <button
              onClick={() => setActiveTab('event')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'event' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Event Exams
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'practice' 
                  ? 'bg-purple-500 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Practice
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1 ${
                activeTab === 'analytics' 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Insights & Chart</span>
            </button>
          </div>

          {/* Search Box */}
          {activeTab !== 'analytics' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by subject or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 text-xs text-white py-2.5 pl-10 pr-4 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          )}
        </div>

        {/* Results / Analytics Container */}
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-4" />
            <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Synchronizing evaluation list...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 space-y-3">
            <XCircle className="w-12 h-12 mx-auto" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        ) : activeTab === 'analytics' ? (
          // Analytics View
          <div className="space-y-12">
            {totalExams === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-slate-700 opacity-50" />
                <p className="font-bold">No data compiled yet</p>
                <p className="text-xs">Take practice modules or event examinations first to unlock performance insights.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Charts (Left and Center) */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Performance Trend */}
                  <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                        Chronological Progress Trend
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500">All assessments</span>
                    </div>
                    <div className="h-64 sm:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '16px' }}
                            itemStyle={{ color: '#D4AF37' }}
                            labelStyle={{ color: 'white', fontWeight: 'bold' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            name="Points" 
                            stroke="#D4AF37" 
                            strokeWidth={3} 
                            activeDot={{ r: 8 }}
                            dot={{ fill: '#0f172a', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Subject Comparison */}
                  <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        Benchmarks By Subject
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500">Average points per category</span>
                    </div>
                    <div className="h-60 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '16px' }}
                            itemStyle={{ color: '#10b981' }}
                            labelStyle={{ color: 'white', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="avgScore" name="Avg Points" radius={[8, 8, 0, 0]}>
                            {subjectAnalytics.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.avgScore >= 85 ? '#10b981' : entry.avgScore >= 65 ? '#D4AF37' : '#ec4899'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Cognitive Insights Board (Right sidebar) */}
                <div className="space-y-6">
                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Sparkles className="w-12 h-12 text-[#D4AF37]" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-[#D4AF37] tracking-widest mb-4 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4" />
                      Logical Analytics
                    </h4>
                    
                    <div className="space-y-5 text-sm text-slate-300 leading-relaxed font-semibold">
                      <p>
                        Based on your accumulated records of <span className="text-[#D4AF37] font-bold">{totalExams} evaluations</span>, current performance charts indicate a highly functional standing.
                      </p>

                      <div className="h-px bg-[#D4AF37]/20 my-2" />

                      {/* Best Subject insight */}
                      {subjectAnalytics.length > 0 && (
                        <div className="flex items-start gap-3 mt-3">
                          <ThumbsUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Strongest Focus Area</p>
                            <p className="text-[#D4AF37] font-black text-base">{subjectAnalytics[0].name}</p>
                            <p className="text-slate-400 text-xs mt-0.5 font-medium">Yielding an exceptional {Number(subjectAnalytics[0].avgScore).toFixed(2)} average score over {subjectAnalytics[0].count} assessment(s).</p>
                          </div>
                        </div>
                      )}

                      {/* Weaker Subject insight */}
                      {subjectAnalytics.length > 1 && (
                        <div className="flex items-start gap-3 mt-4">
                          <Flame className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Target Improvement Area</p>
                            <p className="text-rose-400 font-bold text-sm">
                              {subjectAnalytics[subjectAnalytics.length - 1].name} (avg: {Number(subjectAnalytics[subjectAnalytics.length - 1].avgScore).toFixed(2)})
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5 font-medium">Dedicate extra topic practices to bridge performance deficits in this module.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary performance cards inside Analytics panel */}
                  <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-3xl space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Consistency Benchmarks</p>
                    
                    <div className="flex justify-between items-center bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900">
                      <div>
                        <p className="text-xs text-white font-bold">Total Practice Sessions</p>
                        <p className="text-[10px] text-slate-500 font-bold">Ongoing Subject Drills</p>
                      </div>
                      <span className="text-purple-400 font-black text-xl">{practiceCount}</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900">
                      <div>
                        <p className="text-xs text-white font-bold">Competitive Assesses</p>
                        <p className="text-[10px] text-slate-500 font-bold">Official Rated Contests</p>
                      </div>
                      <span className="text-blue-400 font-black text-xl">{liveEventsCount}</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900">
                      <div>
                        <p className="text-xs text-white font-bold">Average Yield Score</p>
                        <p className="text-[10px] text-slate-500 font-bold">Performance Mean</p>
                      </div>
                      <span className="text-[#D4AF37] font-black text-xl">{avgScore.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : filteredResults.length > 0 ? (
          // History Results List
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[600px] px-6 sm:px-0">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="pb-4 pl-6">Title & Category</th>
                  <th className="pb-4">Score</th>
                  <th className="pb-4">Correct Responses</th>
                  <th className="pb-4">Evaluated Date</th>
                  <th className="pb-4 text-right pr-6">Solutions & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {filteredResults.map((result) => {
                  const isEvent = result.type === 'Event';
                  const title = isEvent 
                    ? `Official Live Exam` 
                    : `${result.subject || 'General'} Practice`;
                  const percentage = result.totalQuestions > 0 ? (result.score / result.totalQuestions) * 100 : 0;
                  
                  return (
                    <tr key={result.id} className="group hover:bg-white/[0.012] transition-colors">
                      <td className="py-5 pl-6">
                        <div className="flex items-center space-x-3.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${isEvent ? 'bg-blue-400' : 'bg-[#D4AF37]'}`} />
                          <div>
                            <p className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors">{title}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                              Class {result.class || 'N/A'} • {isEvent ? 'Competitive Event' : 'Subject Mastery'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-black text-white">{Number(result.score).toFixed(2)}</span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            percentage >= 80 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : percentage >= 50 
                                ? 'bg-amber-500/10 text-[#D4AF37] border border-amber-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {percentage >= 80 ? 'Elite' : percentage >= 50 ? 'Pass' : 'Deficit'}
                          </span>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="text-xs">
                          <span className="font-bold text-white">{result.correctCount}</span> / <span className="text-slate-500">{result.totalQuestions}</span>
                        </div>
                      </td>
                      <td className="py-5 text-xs text-slate-400">
                        {new Date(result.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-5 text-right pr-6 space-x-2">
                        {/* Copy Summary Action */}
                        <button
                          onClick={() => handleCopyClipboard(result)}
                          title="Copy summary report to clipboard"
                          className="inline-flex items-center justify-center w-9 h-9 bg-slate-900 border border-slate-800 hover:border-[#D4AF37]/50 text-slate-400 hover:text-[#D4AF37] transition-all rounded-xl"
                        >
                          {copiedId === result.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Retry Practice (Only for Practice Runs) */}
                        {!isEvent && (
                          <button
                            onClick={() => handleRetakePractice(result)}
                            title="Retake this practice session with same configuration"
                            className="inline-flex items-center justify-center w-9 h-9 bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-400 hover:text-purple-400 transition-all rounded-xl"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Detailed Review trigger */}
                        <button
                          onClick={() => handleReview(result)}
                          className="inline-flex items-center space-x-1 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-[#D4AF37]/50 text-[#D4AF37] hover:text-white transition-all text-xs font-bold rounded-xl"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete practice result (Only for Practice Runs) */}
                        {!isEvent && (
                          <button
                            onClick={() => handleDeleteResult(result.id)}
                            disabled={deletingId === result.id}
                            title="Remove from history log"
                            className="inline-flex items-center justify-center w-9 h-9 bg-slate-950/40 border border-slate-900 hover:bg-rose-950/20 hover:border-rose-500/40 text-slate-650 hover:text-rose-400 transition-all rounded-xl disabled:opacity-40 disabled:pointer-events-none"
                          >
                            {deletingId === result.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
            <FileQuestion className="w-12 h-12 text-slate-700 opacity-40 animate-pulse" />
            <div>
              <p className="font-bold text-white uppercase tracking-wider">No matching assessments</p>
              <p className="text-slate-500 text-xs mt-1">Try resetting your filter tabs or refining your search parameters.</p>
            </div>
          </div>
        )}
      </section>

      {/* Answer Review Modal Box (Pristine Visuals with logical filter tabs) */}
      <AnimatePresence>
        {reviewingResult && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/92 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[88vh] flex flex-col border border-slate-800 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-lg ${
                      reviewingResult.type === 'Event' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      Official {reviewingResult.type} Audit
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">ID: {reviewingResult.id.slice(0, 10)}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Assessment Breakdown
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {reviewingResult.type === 'Event' ? 'Competitive Event Submission Analysis' : `${reviewingResult.subject || 'Practice'} Topical Review`}
                  </p>
                </div>
                <button 
                  onClick={() => setReviewingResult(null)} 
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-750"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Filter Sub-tabs for Question Selection */}
              {!reviewLoading && !reviewError && (
                <div className="px-6 sm:px-8 py-3 bg-slate-950/40 border-b border-slate-850 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mr-2 shrink-0">Filter Questions:</span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => setModalFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        modalFilter === 'all'
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-450 text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({reviewQuestions.length})
                    </button>
                    <button
                      onClick={() => setModalFilter('correct')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        modalFilter === 'correct'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-extrabold'
                          : 'text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Correct
                    </button>
                    <button
                      onClick={() => setModalFilter('incorrect')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        modalFilter === 'incorrect'
                          ? 'bg-[#ef4444]/13 text-rose-450 text-rose-400 border border-rose-500/20 font-extrabold'
                          : 'text-slate-400 hover:text-rose-450'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Incorrect
                    </button>
                    <button
                      onClick={() => setModalFilter('unanswered')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        modalFilter === 'unanswered'
                          ? 'bg-slate-950 text-slate-400 border border-slate-800'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileQuestion className="w-3.5 h-3.5" />
                      Unanswered
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Body Scroll Container */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 no-scrollbar">
                
                {/* Loader State */}
                {reviewLoading && (
                  <div className="py-28 text-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-[#D4AF37] animate-spin mx-auto" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving locked submissions...</p>
                  </div>
                )}

                {/* Error / Locked Warning (For old practices) */}
                {reviewError && (
                  <div className="py-20 text-center max-w-md mx-auto space-y-5">
                    <Award className="w-16 h-16 text-[#D4AF37]/40 mx-auto" />
                    <div className="space-y-2">
                      <p className="font-bold text-white uppercase tracking-wider text-base">Verified Result</p>
                      <p className="text-slate-450 text-sm leading-relaxed font-semibold text-slate-400">
                        {reviewError}
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-3">
                      <button 
                        onClick={() => {
                          setReviewingResult(null);
                          handleRetakePractice(reviewingResult);
                        }}
                        className="px-5 py-2.5 bg-purple-500 text-xs font-extrabold uppercase tracking-wide text-white rounded-xl hover:bg-purple-600 transition-all font-sans shadow-lg shadow-purple-500/10"
                      >
                        Retake Practice
                      </button>
                      <button 
                        onClick={() => setReviewingResult(null)}
                        className="px-5 py-2.5 bg-slate-950 text-xs font-extrabold uppercase tracking-wide text-slate-300 rounded-xl hover:text-white border border-slate-800 transition-colors"
                      >
                        Back to List
                      </button>
                    </div>
                  </div>
                )}

                {/* Detailed Analysis Output */}
                {!reviewLoading && !reviewError && (
                  <>
                    {/* Performance Banner Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 shadow-inner">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Score Achieved</p>
                        <p className="text-3xl font-black text-[#D4AF37] tracking-tight">{Number(reviewingResult.score).toFixed(2)}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">Verified standing</p>
                      </div>
                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 shadow-inner">
                        <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-1.5">Accuracy Yield</p>
                        <p className="text-2xl font-bold text-white tracking-tight">
                          {reviewingResult.correctCount} / {reviewingResult.totalQuestions}
                        </p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">No. of correct responses</p>
                      </div>
                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 shadow-inner">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date Submitted</p>
                        <p className="text-base font-bold text-slate-350 tracking-tight mt-1">
                          {new Date(reviewingResult.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">Local Timestamp proof</p>
                      </div>
                    </div>

                    {/* Question breakdown map */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-white uppercase tracking-widest text-xs">Question Dissection</h3>
                        <div className="h-px flex-1 bg-slate-800/50 mx-4" />
                        <span className="text-xs text-slate-450 text-slate-400 font-bold">Showing {filteredModalQuestions.length} of {reviewQuestions.length}</span>
                      </div>

                      {filteredModalQuestions.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-750 opacity-40" />
                          <p className="font-bold uppercase tracking-wider text-sm">No matching questions</p>
                          <p className="text-xs text-slate-400 mt-1">No items conform with the absolute tab requirements.</p>
                        </div>
                      ) : (
                        filteredModalQuestions.map((q: Question, idx: number) => {
                          const userAnswer = reviewAnswers[q.id];
                          const isCorrect = userAnswer === q.correctAnswer;
                          const hasSelected = userAnswer !== undefined;

                          return (
                            <div 
                              key={q.id || idx} 
                              className={`p-6 sm:p-8 rounded-[2.5rem] border bg-slate-950/20 transition-all ${
                                isCorrect 
                                  ? 'border-emerald-500/15 hover:border-emerald-500/25' 
                                  : hasSelected 
                                    ? 'border-rose-500/15 hover:border-rose-500/25' 
                                    : 'border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {/* Question Title Bar */}
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-900/50">
                                <div className="flex items-center space-x-3">
                                  <span className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center font-bold text-[#D4AF37] text-xs">
                                    {idx + 1}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {q.category} • {q.subject || reviewingResult.subject || 'Assessment'}
                                  </span>
                                </div>
                                
                                {/* Accuracy Tag */}
                                <div className={`self-start sm:self-auto flex items-center px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                  isCorrect 
                                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                                    : hasSelected 
                                      ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' 
                                      : 'text-slate-500 bg-slate-950 border border-slate-800'
                                }`}>
                                  {isCorrect ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                      <span>Match Approved</span>
                                    </>
                                  ) : hasSelected ? (
                                    <>
                                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                      <span>System Deficit</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileQuestion className="w-3.5 h-3.5 mr-1.5" />
                                      <span>Unanswered</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Question Text */}
                              <div className="text-base sm:text-lg font-bold text-white mb-6 leading-relaxed text-left">
                                <MathRenderer content={q.text} engine={profile?.mathEngine} />
                              </div>
                              {q.imageUrl && (
                                <div className="my-4 max-w-full sm:max-w-md rounded-xl overflow-hidden border border-slate-800 bg-slate-950/40 p-2">
                                  <img 
                                    src={q.imageUrl} 
                                    alt="Question representation" 
                                    className="w-full h-auto object-contain max-h-52 rounded-lg" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                              {/* Option selections */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt, i) => {
                                  const isCorrectOpt = i === q.correctAnswer;
                                  const isUserSelectedOpt = i === userAnswer;

                                  return (
                                    <div 
                                      key={i} 
                                      className={`p-4 sm:p-5 rounded-2xl border transition-all text-xs sm:text-sm flex items-center space-x-4 relative overflow-hidden ${
                                        isCorrectOpt 
                                          ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400 font-bold' 
                                          : isUserSelectedOpt 
                                            ? 'bg-rose-500/5 border-rose-500/30 text-rose-450 text-rose-400 font-medium' 
                                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/50 text-slate-400'
                                      }`}
                                    >
                                      {/* String Code Label Tile */}
                                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                                        isCorrectOpt 
                                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/25' 
                                          : isUserSelectedOpt 
                                            ? 'bg-rose-500 text-white shadow-md shadow-rose-950/25' 
                                            : 'bg-slate-900 text-slate-500 border border-slate-850'
                                      }`}>
                                        {String.fromCharCode(65 + i)}
                                      </span>

                                      {/* Text Content */}
                                      <div className="min-w-0 flex-1">
                                        <MathRenderer content={opt} engine={profile?.mathEngine} />
                                      </div>

                                      {/* Accolades */}
                                      {isCorrectOpt && (
                                        <span className="ml-auto text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500/60">Correct</span>
                                      )}
                                      {isUserSelectedOpt && !isCorrectOpt && (
                                        <span className="ml-auto text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-rose-450 text-rose-500/60">Your Choice</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-950/40 border-t border-slate-800 flex justify-between items-center">
                {reviewingResult && reviewingResult.type === 'Practice' && (
                  <button
                    onClick={() => {
                      setReviewingResult(null);
                      handleRetakePractice(reviewingResult);
                    }}
                    className="px-6 py-3.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <RotateCw className="w-4 h-4" />
                    Retake Practice
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    onClick={() => setReviewingResult(null)}
                    className="px-8 py-3.5 bg-slate-805 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider shadow"
                  >
                    Close Dissection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
