import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamResult, UserProfile } from '../types';
import { ALL_SUBJECTS } from '../constants';
import { Trophy, Medal, School, User, Filter, ChevronDown, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeaderboardProps {
  profile?: UserProfile | null;
}

export default function Leaderboard({ profile }: LeaderboardProps) {
  const [topResults, setTopResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: 'All',
    class: 'All',
    type: 'All'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const subjects = ['All', ...ALL_SUBJECTS, 'Mixed'];
  const classes = ['All', 'SSC Candidate', 'College Admission'];
  const types = ['All', 'Practice', 'Event'];

  useEffect(() => {
    let q = query(
      collection(db, 'results')
    );

    if (filters.subject !== 'All') {
      q = query(q, where('subject', '==', filters.subject));
    }
    if (filters.class !== 'All') {
      q = query(q, where('class', '==', filters.class));
    }
    if (filters.type !== 'All') {
      q = query(q, where('type', '==', filters.type));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      
      const studentMap: Record<string, any> = {};
      
      rawResults.forEach(r => {
        if (!r.uid) return;
        if (!studentMap[r.uid]) {
          studentMap[r.uid] = {
            id: r.uid,
            uid: r.uid,
            displayName: r.displayName || 'Anonymous',
            school: r.school || 'N/A',
            score: 0,
            correctCount: 0,
            wrongCount: 0,
            totalQuestions: 0,
            type: r.type,
            examsCount: 0,
            createdAt: r.createdAt || new Date().toISOString()
          };
        }
        
        const m = studentMap[r.uid];
        m.score += Number(r.score || 0);
        m.correctCount += Number(r.correctCount || 0);
        m.wrongCount += Number(r.wrongCount || 0);
        m.totalQuestions += Number(r.totalQuestions || 0);
        m.examsCount += 1;
        
        if (r.createdAt && r.createdAt > m.createdAt) {
          m.displayName = r.displayName || m.displayName;
          m.school = r.school || m.school;
          m.createdAt = r.createdAt;
          m.type = r.type;
        }
      });
      
      const processed = Object.values(studentMap).map(s => {
        const accuracyRate = s.totalQuestions > 0 ? (s.correctCount / s.totalQuestions) * 100 : 0;
        return {
          ...s,
          accuracyRate: Number(accuracyRate.toFixed(2))
        };
      });
      
      processed.sort((a, b) => b.score - a.score || b.accuracyRate - a.accuracyRate);
      
      setTopResults(processed as any);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filters]);

  const filteredResults = topResults.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.displayName && r.displayName.toLowerCase().includes(term)) ||
      (r.school && r.school.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-12">
      <header className="px-1 py-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 uppercase leading-none tracking-tight">
          Hall of <span className="text-[#D4AF37]">Fame</span>
        </h1>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
          Celebrating the top academic minds across our platform
        </p>
      </header>

      {/* Redesigned Search & Filters Command Center */}
      <div className="sticky top-20 sm:top-24 z-30 pb-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 rounded-3xl">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          
          {/* Text Search Input */}
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name or institution..."
              className="w-full bg-slate-950 border border-slate-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/10 transition-all rounded-2xl pl-11 pr-10 py-3 text-sm font-medium text-slate-200 placeholder-slate-600 outline-none shadow-inner"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector Dropdowns */}
          <div className="w-full md:w-1/2 flex flex-wrap sm:flex-nowrap gap-3 justify-end">
            {[
              { id: 'subject', options: subjects, label: 'All Subjects' },
              { id: 'class', options: classes, label: 'All Classes' },
              { id: 'type', options: types, label: 'All Types' }
            ].map((f) => (
              <div key={f.id} className="relative w-full sm:w-auto min-w-[125px]">
                <select 
                  value={(filters as any)[f.id]}
                  onChange={(e) => setFilters({ ...filters, [f.id]: e.target.value })}
                  className="w-full appearance-none bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-2xl px-4 py-3 pr-10 text-xs font-bold text-slate-300 transition-all outline-none cursor-pointer shadow-md focus:border-[#D4AF37]/50"
                >
                  {f.options.map(o => <option key={o} value={o}>{o === 'All' ? f.label : o}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-slate-300 transition-colors" />
              </div>
            ))}
          </div>

        </div>
      </div>

      {loading ? (
        <div className="text-center py-32 flex flex-col items-center space-y-6">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"
          />
          <p className="text-[10px] font-black uppercase text-slate-550 tracking-widest">Calculating rankings...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="text-center py-32 border-b border-dashed border-slate-900">
           <Trophy className="w-16 h-16 text-slate-800 mx-auto mb-6 opacity-30" />
           <h3 className="text-xl font-black text-white uppercase mb-2">No Rankings Data</h3>
           <p className="text-slate-500 font-medium text-xs">Try adjusting your filters or search term to appear here.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* List View */}
          <div className="overflow-hidden">
            <div className="grid grid-cols-12 gap-2 sm:gap-4 py-4 font-black text-[#D4AF37] uppercase text-[9px] tracking-widest border-b border-slate-900 balance-sans">
              <div className="col-span-3 sm:col-span-2 text-left pl-2">Rank</div>
              <div className="col-span-6 sm:col-span-6">Student Profile</div>
              <div className="col-span-3 sm:col-span-2 text-right sm:text-left">Points</div>
              <div className="hidden sm:block col-span-2 text-right">Details</div>
            </div>
            
            <div className="divide-y divide-slate-910">
              <AnimatePresence>
                {filteredResults.map((result, index) => {
                  const rankNum = index + 1;
                  const rankWord = getRankWord(rankNum);
                  const isCurrentUser = profile && (result.uid === profile.uid || result.id === profile.uid);
                  
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.4) }}
                      className={`grid grid-cols-12 gap-2 sm:gap-4 py-6 items-center border-b border-dashed border-slate-905 transition-all group px-4 rounded-3xl ${
                        isCurrentUser 
                          ? 'bg-gradient-to-r from-[#D4AF37]/10 via-indigo-550/5 to-transparent border-l-4 border-l-[#D4AF37] shadow-[inset_0_0_20px_rgba(212,175,55,0.03)]' 
                          : 'hover:bg-slate-900/10'
                      }`}
                    >
                      {/* Rank text directly - e.g., First, Second, Third, etc. */}
                      <div className="col-span-3 sm:col-span-2 text-left pl-2 font-black text-xs uppercase tracking-wider font-mono">
                        <span className={`${
                          rankNum === 1 ? 'text-[#D4AF37]' :
                          rankNum === 2 ? 'text-slate-400' :
                          rankNum === 3 ? 'text-orange-500' : 'text-slate-600'
                        } ${isCurrentUser ? 'font-black scale-105' : ''}`}>
                          {rankWord}
                        </span>
                      </div>
                      
                      <div className="col-span-6 sm:col-span-6 flex items-center space-x-2 sm:space-x-4 min-w-0">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-white text-sm sm:text-base tracking-tight uppercase group-hover:text-[#D4AF37] transition-colors flex flex-wrap items-center gap-2">
                            <span>{result.displayName}</span>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 bg-[#D4AF37] text-slate-950 text-[9px] font-black rounded uppercase tracking-wider shadow-sm animate-pulse">
                                YOU
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] text-slate-550 font-semibold uppercase tracking-wide truncate mt-0.5">
                            <School className="w-2.5 h-2.5 shrink-0 text-slate-600" />
                            <span className="truncate">{result.school}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-3 sm:col-span-2 text-right sm:text-left">
                        <div className="text-base sm:text-xl font-black text-white">{Number(result.score).toFixed(2)}</div>
                        <p className="text-[8px] uppercase font-black tracking-widest text-[#D4AF37]/80">{result.correctCount} Correct</p>
                        {(result as any).accuracyRate !== undefined && (
                          <p className="text-[9px] uppercase font-bold text-emerald-400 mt-1 sm:mt-0.5">
                            {(result as any).accuracyRate.toFixed(2)}% Accuracy
                          </p>
                        )}
                      </div>
                      
                      <div className="hidden sm:block col-span-2 text-right">
                        <div className="inline-block px-3 py-1 bg-slate-950 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-full group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-colors whitespace-nowrap border border-slate-900">
                          {result.type}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Translate ranks to text sequences as requested (First, Second, Third, etc.)
function getRankWord(rankNum: number): string {
  const dictionary: Record<number, string> = {
    1: 'First',
    2: 'Second',
    3: 'Third',
    4: 'Fourth',
    5: 'Fifth',
    6: 'Sixth',
    7: 'Seventh',
    8: 'Eighth',
    9: 'Ninth',
    10: 'Tenth',
    11: 'Eleventh',
    12: 'Twelfth',
    13: 'Thirteenth',
    14: 'Fourteenth',
    15: 'Fifteenth',
    16: 'Sixteenth',
    17: 'Seventeenth',
    18: 'Eighteenth',
    19: 'Nineteenth',
    20: 'Twentieth'
  };
  return dictionary[rankNum] || `${rankNum}th`;
}
