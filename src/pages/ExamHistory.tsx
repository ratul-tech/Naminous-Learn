import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ExamResult, Question } from '../types';
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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MathRenderer } from '../components/MathRenderer';

interface ExamHistoryProps {
  profile: UserProfile | null;
}

export default function ExamHistory({ profile }: ExamHistoryProps) {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'event' | 'practice'>('all');

  // Review Modal State
  const [reviewingResult, setReviewingResult] = useState<ExamResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, number>>({});
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Fetch results
  useEffect(() => {
    if (!profile) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const resultsRef = collection(db, 'results');
        const q = query(
          resultsRef,
          where('uid', '==', profile.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedResults = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ExamResult));
        setResults(fetchedResults);
      } catch (err: any) {
        console.error("Error fetching exam history:", err);
        setError("Unable to retrieve exam history. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate high-level stats
  const totalExams = results.length;
  const avgScore = totalExams > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / totalExams) 
    : 0;
  const bestScore = totalExams > 0 
    ? Math.max(...results.map(r => r.score)) 
    : 0;
  
  const liveEventsCount = results.filter(r => r.type === 'Event').length;
  const practiceCount = results.filter(r => r.type === 'Practice').length;

  // Filter and search results
  const filteredResults = results.filter(r => {
    const matchesTab = activeTab === 'all' || r.type.toLowerCase() === activeTab;
    
    // Check if subject/class or custom titles match
    const titleText = r.type === 'Event' 
      ? 'Official Live Assessment' 
      : `${r.subject || 'General'} Practice`;
    
    const matchesSearch = searchTerm === '' || 
      titleText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.subject && r.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.class && r.class.toLowerCase().includes(searchTerm.toLowerCase()));
      
    return matchesTab && matchesSearch;
  });

  // Handle Review Answer trigger
  const handleReview = async (result: ExamResult) => {
    setReviewingResult(result);
    setReviewQuestions([]);
    setReviewAnswers({});
    setReviewError(null);

    // If it's Practice and we've successfully saved questions/answers inline
    const practiceWithData = result as any;
    if (result.type === 'Practice' && practiceWithData.questions && practiceWithData.answers) {
      setReviewQuestions(practiceWithData.questions);
      setReviewAnswers(practiceWithData.answers);
      return;
    }

    if (result.type === 'Practice') {
      // Legacy practice results without inline stores
      setReviewError("Detailed question breakdowns are only stored for newly taken Topic Practice exams. Your score of " + result.score + "% is verified.");
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
                  {avgScore}%
                </span>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 mt-1">Average Score</p>
              </div>
              <div className="h-10 w-px bg-slate-800 mx-2" />
              <div className="text-right">
                <span className="text-4xl sm:text-5xl font-black text-emerald-400 font-sans tracking-tight">
                  {bestScore}%
                </span>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 mt-1">Best Yield</p>
              </div>
            </div>
          </div>
          
          <div className="w-full h-[2px] bg-slate-900 overflow-hidden relative">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${avgScore}%` }}
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
          <p className="text-3xl font-black text-emerald-450 text-[#D4AF37] tracking-tight">{avgScore >= 80 ? 'Master' : avgScore >= 60 ? 'Scholar' : 'Initiate'}</p>
          <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Derived standing</p>
        </div>
      </div>

      {/* Main Control Panel and History table */}
      <section className="bg-slate-900/30 border border-slate-805/85 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Custom Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'all' 
                  ? 'bg-[#D4AF37] text-slate-950 shadow-lg shadow-amber-500/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              All Runs
            </button>
            <button
              onClick={() => setActiveTab('event')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'event' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Event Exams
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'practice' 
                  ? 'bg-purple-500 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Practice
            </button>
          </div>

          {/* Search Box */}
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
        </div>

        {/* Results Container */}
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-4" />
            <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Sychronizing evaluation list...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 space-y-3">
            <XCircle className="w-12 h-12 mx-auto" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[600px] px-6 sm:px-0">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="pb-4 pl-6">Title & Category</th>
                  <th className="pb-4">Score</th>
                  <th className="pb-4">Correct Responses</th>
                  <th className="pb-4">Evaluated Date</th>
                  <th className="pb-4 text-right pr-6">Solutions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {filteredResults.map((result) => {
                  const isEvent = result.type === 'Event';
                  const title = isEvent 
                    ? `Official Live Exam` 
                    : `${result.subject || 'General'} Practice`;
                  
                  return (
                    <tr key={result.id} className="group hover:bg-white/[0.015] transition-colors">
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
                          <span className="text-base font-black text-white">{result.score}%</span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            result.score >= 80 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : result.score >= 50 
                                ? 'bg-amber-500/10 text-[#D4AF37] border border-amber-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {result.score >= 80 ? 'Elite' : result.score >= 50 ? 'Pass' : 'Deficit'}
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
                      <td className="py-5 text-right pr-6">
                        <button
                          onClick={() => handleReview(result)}
                          className="inline-flex items-center space-x-1 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-[#D4AF37]/50 text-[#D4AF37] hover:text-white transition-all text-xs font-bold rounded-xl"
                        >
                          <span>Detailed Review</span>
                          <ChevronRight className="w-4.5 h-4.5" />
                        </button>
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

      {/* Answer Review Modal Box (Pristine Visuals mirroring Admin review view) */}
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
              <div className="p-6 sm:p-8 border-b border-slate-805 flex justify-between items-center bg-slate-950/20">
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
                      <p className="text-slate-405 text-sm leading-relaxed font-semibold text-slate-400">
                        {reviewError}
                      </p>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={() => setReviewingResult(null)}
                        className="px-6 py-2.5 bg-slate-950 text-xs font-extrabold uppercase tracking-wide text-slate-300 rounded-xl hover:text-white border border-slate-800 transition-colors"
                      >
                        Acknowledge and Close
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
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Score Achieved</p>
                        <p className="text-3xl font-black text-[#D4AF37] tracking-tight">{reviewingResult.score}%</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Verified standing</p>
                      </div>
                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 shadow-inner">
                        <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-1.5">Accuracy Yield</p>
                        <p className="text-2xl font-bold text-white tracking-tight">
                          {reviewingResult.correctCount} / {reviewingResult.totalQuestions}
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">No. of correct responses</p>
                      </div>
                      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 shadow-inner">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date Submitted</p>
                        <p className="text-base font-bold text-slate-350 tracking-tight mt-1">
                          {new Date(reviewingResult.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Local Timestamp proof</p>
                      </div>
                    </div>

                    {/* Question breakdown map */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-white uppercase tracking-widest text-xs">Question Dissection</h3>
                        <div className="h-px flex-1 bg-slate-800/50 mx-4" />
                      </div>

                      {reviewQuestions.map((q: Question, idx: number) => {
                        const userAnswer = reviewAnswers[q.id];
                        const isCorrect = userAnswer === q.correctAnswer;
                        const hasSelected = userAnswer !== undefined;

                        return (
                          <div 
                            key={q.id || idx} 
                            className={`p-6 sm:p-8 rounded-[2.5rem] border bg-slate-954 bg-slate-950/20 transition-all ${
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
                                          ? 'bg-rose-500/5 border-rose-500/30 text-rose-400 font-medium' 
                                          : 'bg-slate-950/60 border-slate-850 hover:bg-slate-900/50 text-slate-400'
                                    }`}
                                  >
                                    {/* String Code Label Tile */}
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                                      isCorrectOpt 
                                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/25' 
                                        : isUserSelectedOpt 
                                          ? 'bg-rose-500 text-white shadow-md shadow-rose-950/25' 
                                          : 'bg-slate-900 text-slate-500 border border-slate-800'
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
                                      <span className="ml-auto text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-rose-500/60">Your Choice</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-950/40 border-t border-slate-805 flex justify-end">
                <button
                  onClick={() => setReviewingResult(null)}
                  className="px-8 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider"
                >
                  Close Dissection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
