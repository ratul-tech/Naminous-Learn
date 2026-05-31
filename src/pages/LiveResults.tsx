import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamEvent, ExamResult, UserProfile } from '../types';
import { Trophy, Medal, ArrowLeft, Search, School, User, Calendar, Clock, Award, ChevronRight, ChevronDown, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveResultsProps {
  profile: UserProfile | null;
}

export default function LiveResults({ profile }: LiveResultsProps) {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ExamEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Real-time listener for events
    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), orderBy('startTime', 'desc')),
      (snapshot) => {
        const fetchedEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ExamEvent));
        setEvents(fetchedEvents);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching events for results:', err);
        setLoading(false);
      }
    );

    // Real-time listener for event results
    const unsubResults = onSnapshot(
      query(collection(db, 'results'), where('type', '==', 'Event')),
      (snapshot) => {
        const fetchedResults = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ExamResult));
        setResults(fetchedResults);
      },
      (err) => {
        console.error('Error fetching event results:', err);
      }
    );

    return () => {
      unsubEvents();
      unsubResults();
    };
  }, []);

  // Helper to determine if an event is completed
  const isEventCompleted = (event: ExamEvent) => {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : new Date(startTime.getTime() + event.duration * 60000);
    return now > endTime;
  };

  // Get completed events
  const completedEvents = events.filter(isEventCompleted);

  // Stats computation for an event
  const getEventStats = (eventId: string) => {
    const eventResults = results.filter(r => r.eventId === eventId);
    if (eventResults.length === 0) {
      return {
        highest: null,
        lowest: null,
        count: 0
      };
    }

    const scores = eventResults.map(r => r.score);
    return {
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      count: eventResults.length
    };
  };

  // Detailed view ranking computation
  const getRankedResults = (eventId: string) => {
    const eventResults = results.filter(r => r.eventId === eventId);
    
    // Sort in descending order of score
    const sorted = [...eventResults].sort((a, b) => b.score - a.score);
    
    // Assign position with correct handling of duplicate scores/ties
    let currentRank = 1;
    return sorted.map((res, index, arr) => {
      if (index > 0 && res.score < arr[index - 1].score) {
        currentRank = index + 1;
      }
      return {
        ...res,
        position: currentRank
      };
    });
  };

  // Filtered results for the chosen event based on student name and school search
  const activeEventResults = selectedEvent ? getRankedResults(selectedEvent.id) : [];
  const filteredResults = activeEventResults.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesName = r.displayName && r.displayName.toLowerCase().includes(q);
    const matchesSchool = r.school && r.school.toLowerCase().includes(q);
    return matchesName || matchesSchool;
  });

  return (
    <div className="space-y-8" id="live-exam-results-container">
      {/* Page Header */}
      {!selectedEvent ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[80px]" />
          <div className="space-y-2 relative z-10">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/80 font-mono">Completed Contests</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Live Exam <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-500">Results</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
              Automatic metrics, highest & lowest marks scoreboard, and full ranks list of live examination sessions once ended.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 scale-95 md:scale-100 shrink-0 select-none">
            <Trophy className="w-5 h-5 text-[#D4AF37]" />
            <div className="text-left font-sans">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Live Exams Played</p>
              <p className="text-base font-black text-white">{completedEvents.length}</p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setSelectedEvent(null);
            setSearchQuery('');
            setExpandedStudentId(null);
          }}
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-[#D4AF37] transition-all group bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-800/80 hover:border-[#D4AF37]/30 shadow-md"
          id="back-to-results-btn"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Live Exams list</span>
        </button>
      )}

      {loading ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Connecting to results database...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {!selectedEvent ? (
            /* Master List view */
            <motion.div
              key="master-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              id="live-exam-boxes-grid"
            >
              {completedEvents.length === 0 ? (
                <div className="col-span-full p-12 text-center rounded-3xl bg-slate-950/40 border border-slate-900 border-dashed space-y-4">
                  <div className="w-16 h-16 bg-slate-900/60 rounded-full flex items-center justify-center mx-auto text-slate-700">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base">No Completed Live Exams Yet</h3>
                    <p className="text-slate-500 text-xs max-w-sm mx-auto">
                      Whenever an active Live Exam ends, its card along with performance stats and student positions will instantly display right here.
                    </p>
                  </div>
                </div>
              ) : (
                completedEvents.map((event) => {
                  const stats = getEventStats(event.id);
                  return (
                    <motion.div
                      key={event.id}
                      whileHover={{ y: -4, borderColor: '#D4AF37' }}
                      onClick={() => setSelectedEvent(event)}
                      className="group cursor-pointer p-6 rounded-2xl bg-slate-900/40 border-2 border-slate-900/60 transition-all shadow-xl hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between space-y-6 relative overflow-hidden"
                      id={`exam-box-${event.id}`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                      
                      {/* Top Meta info */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/15">
                            {event.class || 'All Scholars'}
                          </span>
                          <span className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold">
                            <Clock className="w-3 h-3 text-slate-600" />
                            <span>{event.duration} mins</span>
                          </span>
                        </div>
                        <h3 className="font-extrabold text-[#F8FAFC] text-lg leading-snug group-hover:text-[#D4AF37] transition-all">
                          {event.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2">
                          {event.description || 'No description provided for this session.'}
                        </p>
                      </div>

                      {/* Stat display rows: Highest and Lowest Marks obtained */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-850 space-y-3.5 shadow-inner">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Highest Mark Obtained:</span>
                          <span className="font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 shadow-sm text-[13px]">
                            {stats.highest !== null ? stats.highest.toFixed(2).replace(/\.00$/, '') : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Lowest Mark Obtained:</span>
                          <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 shadow-sm text-[13px]">
                            {stats.lowest !== null ? stats.lowest.toFixed(2).replace(/\.00$/, '') : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom action bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                        <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-semibold">
                          <User className="w-4 h-4 text-slate-500" />
                          <span>{stats.count} {stats.count === 1 ? 'Submission' : 'Submissions'}</span>
                        </div>
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-[#D4AF37] group-hover:translate-x-1 transition-transform">
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            /* Details score tables */
            <motion.div
              key="detail-results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="detailed-results-view"
            >
              {/* Event detail overview */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/30 border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/90 bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20 font-mono">
                    Completed Contest Results
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-400 sm:max-w-xl">{selectedEvent.description}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center min-w-[90px]">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Highest Score</p>
                    <p className="text-sm sm:text-base font-black text-emerald-400 mt-1">
                      {getEventStats(selectedEvent.id).highest !== null ? getEventStats(selectedEvent.id).highest?.toFixed(2).replace(/\.00$/, '') : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center min-w-[90px]">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Lowest Score</p>
                    <p className="text-sm sm:text-base font-black text-rose-400 mt-1">
                      {getEventStats(selectedEvent.id).lowest !== null ? getEventStats(selectedEvent.id).lowest?.toFixed(2).replace(/\.00$/, '') : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center min-w-[90px] col-span-2 sm:col-span-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total Scholars</p>
                    <p className="text-sm sm:text-base font-black text-indigo-400 mt-1">
                      {getEventStats(selectedEvent.id).count}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Search Tool */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search students by name or institution/school name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all text-sm text-white placeholder:text-slate-600 shadow-inner font-semibold"
                  id="results-search-input"
                />
              </div>

              {/* Leaderboard/Results list */}
              <div className="bg-slate-900/20 border border-slate-850 rounded-2xl overflow-hidden shadow-xl" id="results-table-card">
                {filteredResults.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 bg-slate-900/60 rounded-full flex items-center justify-center mx-auto text-slate-600">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm">
                      {searchQuery ? `No matching participants found for "${searchQuery}"` : 'No submissions found for this contest yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-slate-300">
                      <thead>
                        <tr className="bg-slate-950/60 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-850 select-none">
                          <th className="py-4 px-6 text-center w-20">Position</th>
                          <th className="py-4 px-6">Name</th>
                          <th className="py-4 px-6">School / Institution</th>
                          <th className="py-4 px-6 text-right w-36">Number Obtained</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60 font-sans">
                        {filteredResults.map((res) => {
                          const isOwnResult = profile?.uid === res.uid;
                          const isExpanded = expandedStudentId === res.id;
                          const isTopRank = res.position <= 3;

                          return (
                            <>
                              <tr
                                key={res.id}
                                onClick={() => setExpandedStudentId(isExpanded ? null : res.id)}
                                className={`group cursor-pointer transition-colors duration-200 ${
                                  isOwnResult 
                                    ? 'bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10' 
                                    : 'hover:bg-slate-900/40'
                                }`}
                                id={`row-student-${res.id}`}
                              >
                                {/* Position column */}
                                <td className="py-4 px-6 text-center select-none">
                                  {isTopRank ? (
                                    <div className="flex items-center justify-center">
                                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border shadow-md relative ${
                                        res.position === 1 
                                          ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' 
                                          : res.position === 2
                                          ? 'bg-slate-300/10 border-slate-300/30 text-slate-300'
                                          : 'bg-amber-700/10 border-amber-700/30 text-amber-600'
                                      }`}>
                                        {res.position}
                                        {res.position === 1 && (
                                          <div className="absolute -top-1 right-0 text-[8px] animate-bounce">👑</div>
                                        )}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-bold text-slate-400 text-xs">{res.position}</span>
                                  )}
                                </td>

                                {/* Name column */}
                                <td className="py-4 px-6 font-semibold">
                                  <div className="flex items-center space-x-2.5">
                                    <span className="text-white group-hover:text-[#D4AF37] transition-all">
                                      {res.displayName}
                                    </span>
                                    {isOwnResult && (
                                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded-md border border-[#D4AF37]/40">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* School column */}
                                <td className="py-4 px-6">
                                  <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                                    <School className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="truncate max-w-[200px] sm:max-w-xs">{res.school || 'N/A'}</span>
                                  </div>
                                </td>

                                {/* Marks obtained column */}
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <span className="font-mono font-extrabold text-white text-base">
                                      {res.score.toFixed(2).replace(/\.00$/, '')}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-[#D4AF37]' : ''}`} />
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Row showing full quiz details */}
                              <tr key={`expanded-${res.id}`}>
                                <td colSpan={4} className="p-0 border-none bg-slate-900/10">
                                  <div className={`overflow-hidden transition-all duration-300 ${
                                    isExpanded ? 'max-h-96 border-b border-slate-850 p-6' : 'max-h-0'
                                  }`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                                      <div className="flex items-center space-x-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-850">
                                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                          <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Correct Inquiries</p>
                                          <p className="text-base font-black text-white">{res.correctCount} / {res.totalQuestions}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-850">
                                        <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
                                          <XCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Incorrect Attempts</p>
                                          <p className="text-base font-black text-white">{res.wrongCount}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-850">
                                        <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                          <Award className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Contest Accuracy</p>
                                          <p className="text-base font-black text-white">
                                            {res.totalQuestions > 0 
                                              ? `${Math.round((res.correctCount / res.totalQuestions) * 100)}%` 
                                              : 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
