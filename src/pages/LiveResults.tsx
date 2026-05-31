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
  const completedEvents = events.filter(e => !e.isDraft && isEventCompleted(e));

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
    <div className="space-y-12 max-w-6xl mx-auto px-1 sm:px-4" id="live-exam-results-container">
      {/* Page Header */}
      {!selectedEvent ? (
        <div className="py-6 border-b border-dashed border-slate-900 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/80 font-mono">Completed Contests</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-white mb-2 leading-none tracking-tight font-sans">
              Live Exam <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-500">Results</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl font-semibold">
              Automatic metrics, highest & lowest marks scoreboard, and full ranks list of live examination sessions once ended.
            </p>
          </div>
          <div className="pt-2 flex items-center space-x-2 text-xs font-black uppercase text-slate-500 tracking-wider">
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
            <span>Live Exams Played:</span>
            <span className="text-white font-mono text-sm">{completedEvents.length}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setSelectedEvent(null);
            setSearchQuery('');
            setExpandedStudentId(null);
          }}
          className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#D4AF37] transition-all group py-2"
          id="back-to-results-btn"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Live Exams list</span>
        </button>
      )}

      {loading ? (
        <div className="text-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Connecting to results database...</p>
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
              className="divide-y divide-slate-900 border-t border-slate-900"
              id="live-exam-boxes-grid"
            >
              {completedEvents.length === 0 ? (
                <div className="py-24 text-center border-b border-dashed border-slate-900 space-y-4">
                  <div className="w-12 h-12 bg-slate-950/60 rounded-full flex items-center justify-center mx-auto text-slate-700">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-white text-base uppercase">No Completed Live Exams Yet</h3>
                    <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
                      Whenever an active Live Exam ends, its rankings list and details will instantly display right here.
                    </p>
                  </div>
                </div>
              ) : (
                completedEvents.map((event) => {
                  const stats = getEventStats(event.id);
                  return (
                    <motion.div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="py-10 flex flex-col md:flex-row justify-between md:items-start gap-6 cursor-pointer group transition-all"
                      id={`exam-box-${event.id}`}
                    >
                      {/* Left: Info items */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 font-mono">
                            {event.class || 'All Scholars'}
                          </span>
                          <span className="text-[10px] text-slate-650 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-650" />
                            <span>{event.duration} mins</span>
                          </span>
                        </div>
                        <h3 className="font-extrabold text-white text-xl sm:text-2xl group-hover:text-[#D4AF37] transition-colors font-serif leading-tight">
                          {event.title}
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xl font-semibold leading-relaxed">
                          {event.description || 'No description provided for this session.'}
                        </p>

                        {/* Flat metric texts: inline bullet format with no bounding boxes */}
                        <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-black uppercase tracking-wider font-mono">
                          <span>Highest Mark: <span className="text-emerald-450 text-emerald-400">{stats.highest !== null ? stats.highest.toFixed(2).replace(/\.00$/, '') : 'N/A'}</span></span>
                          <span className="text-slate-800">•</span>
                          <span>Lowest Mark: <span className="text-rose-450 text-rose-405 text-rose-450">{stats.lowest !== null ? stats.lowest.toFixed(2).replace(/\.00$/, '') : 'N/A'}</span></span>
                          <span className="text-slate-800">•</span>
                          <span className="flex items-center gap-1 text-slate-600"><User className="w-3.5 h-3.5" /> {stats.count} {stats.count === 1 ? 'Submission' : 'Submissions'}</span>
                        </div>
                      </div>

                      {/* Right: navigation button */}
                      <div className="md:pt-4 self-start md:self-center">
                        <span className="inline-flex items-center space-x-1.5 text-xs font-black uppercase tracking-widest text-[#D4AF37] group-hover:translate-x-1.5 transition-transform">
                          <span>View rankings list</span>
                          <ChevronRight className="w-4 h-4" />
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
              className="space-y-8"
              id="detailed-results-view"
            >
              {/* Event detail overview */}
              <div className="pb-10 border-b border-dashed border-slate-900 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/90 font-mono">
                    Completed Contest Results
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-white font-serif">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-400 font-semibold sm:max-w-xl leading-relaxed">{selectedEvent.description}</p>
                </div>

                {/* Grid layout for stats with NO background boxes */}
                <div className="grid grid-cols-3 gap-8 text-left min-w-[260px]">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">Highest</p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-emerald-450 font-mono text-emerald-400 mt-1">
                      {getEventStats(selectedEvent.id).highest !== null ? getEventStats(selectedEvent.id).highest?.toFixed(2).replace(/\.00$/, '') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">Lowest</p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-rose-455 font-mono text-rose-450 mt-1">
                      {getEventStats(selectedEvent.id).lowest !== null ? getEventStats(selectedEvent.id).lowest?.toFixed(2).replace(/\.00$/, '') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">Scholars</p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-mono mt-1">
                      {getEventStats(selectedEvent.id).count}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Search Tool: simple underline with zero boxes */}
              <div className="relative">
                <Search className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  placeholder="Search students by name or institution name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-900 hover:border-slate-800 focus:border-[#D4AF37] outline-none transition-all py-3 pl-8 pr-4 text-xs font-semibold text-white placeholder:text-slate-650"
                  id="results-search-input"
                />
              </div>

              {/* Leaderboard/Results list: boxless responsive list */}
              <div id="results-table-card">
                {filteredResults.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <p className="text-slate-500 text-xs sm:text-sm font-semibold">
                      {searchQuery ? `No matching participants found for "${searchQuery}"` : 'No submissions found for this contest yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs text-slate-350">
                      <thead>
                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-900 select-none">
                          <th className="py-4 pl-2 text-left w-24">Rank</th>
                          <th className="py-4">Student Profile</th>
                          <th className="py-4">Institution / School</th>
                          <th className="py-4 text-right pr-2 w-32">Points Obtained</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-sans">
                        {filteredResults.map((res) => {
                          const isOwnResult = profile?.uid === res.uid;
                          const isExpanded = expandedStudentId === res.id;
                          const isTopRank = res.position <= 3;

                          return (
                            <>
                              <tr
                                key={res.id}
                                onClick={() => setExpandedStudentId(isExpanded ? null : res.id)}
                                className={`group cursor-pointer transition-colors ${
                                  isOwnResult 
                                    ? 'bg-[#D4AF37]/5' 
                                    : 'hover:bg-white/[0.012]'
                                }`}
                                id={`row-student-${res.id}`}
                              >
                                {/* Position column: flat layout, no badges */}
                                <td className="py-5 pl-2 text-left font-mono select-none">
                                  <span className={`font-black text-sm uppercase ${
                                    res.position === 1 ? 'text-[#D4AF37]' :
                                    res.position === 2 ? 'text-slate-400' :
                                    res.position === 3 ? 'text-orange-500' : 'text-slate-600'
                                  }`}>
                                    {res.position === 1 ? 'First' :
                                     res.position === 2 ? 'Second' :
                                     res.position === 3 ? 'Third' :
                                     `${res.position}th`}
                                  </span>
                                </td>

                                {/* Name column */}
                                <td className="py-5 font-bold">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-white group-hover:text-[#D4AF37] transition-colors">
                                      {res.displayName}
                                    </span>
                                    {isOwnResult && (
                                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded border border-[#D4AF37]/20">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* School column */}
                                <td className="py-5">
                                  <div className="flex items-center space-x-1.5 text-slate-500 font-semibold truncate max-w-[240px]">
                                    <School className="w-3 h-3 text-slate-650 shrink-0" />
                                    <span className="truncate">{res.school || 'N/A'}</span>
                                  </div>
                                </td>

                                {/* Marks obtained column */}
                                <td className="py-5 pr-2 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <span className="font-mono font-black text-white text-sm">
                                      {res.score.toFixed(2).replace(/\.00$/, '')}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-[#D4AF37]' : ''}`} />
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Row showing full details: flat, indented inline metadata */}
                              {isExpanded && (
                                <tr key={`expanded-${res.id}`}>
                                  <td colSpan={4} className="p-0 border-none">
                                    <div className="pt-2 pb-6 pl-4 pr-2 font-mono flex flex-wrap gap-x-8 gap-y-3 justify-start text-[10px] uppercase font-black tracking-wider text-slate-500 border-b border-dashed border-slate-900">
                                      <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450 text-emerald-400" />
                                        <span>Correct Inquiries: <span className="text-white">{res.correctCount} / {res.totalQuestions}</span></span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <XCircle className="w-3.5 h-3.5 text-rose-455 text-rose-400" />
                                        <span>Incorrect Attempts: <span className="text-white">{res.wrongCount}</span></span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Award className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Accuracy Rate: <span className="text-white">{res.totalQuestions > 0 ? `${Math.round((res.correctCount / res.totalQuestions) * 100)}%` : 'N/A'}</span></span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
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
