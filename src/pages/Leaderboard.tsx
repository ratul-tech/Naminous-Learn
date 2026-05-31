import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamResult } from '../types';
import { ALL_SUBJECTS } from '../constants';
import { Trophy, Medal, School, User, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Leaderboard() {
  const [topResults, setTopResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: 'All',
    class: 'All',
    type: 'All'
  });

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

  if (loading) return <div className="text-center py-20">Loading leaderboard...</div>;

  const top3 = topResults.slice(0, 3);
  const others = topResults.slice(3);

  return (
    <div className="space-y-12">
      <header className="px-1 py-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 uppercase leading-none tracking-tight">Hall of <span className="text-[#D4AF37]">Fame</span></h1>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Celebrating the top academic minds across our platform</p>
      </header>

      {/* Filters Overlay */}
      <div className="sticky top-24 z-30 flex justify-center pb-4 border-b border-slate-905">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-1 flex flex-wrap gap-2 items-center"
        >
          <div className="px-3 py-2 flex items-center space-x-2 text-[#D4AF37] font-black text-[10px] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          
          <div className="flex gap-2">
            {[
              { id: 'subject', options: subjects, label: 'All Subjects' },
              { id: 'class', options: classes, label: 'All Classes' },
              { id: 'type', options: types, label: 'All Types' }
            ].map((f) => (
              <div key={f.id} className="relative group">
                <select 
                  value={(filters as any)[f.id]}
                  onChange={(e) => setFilters({ ...filters, [f.id]: e.target.value })}
                  className="appearance-none bg-slate-950 hover:bg-slate-905 border border-slate-900 rounded-xl px-4 py-2 pr-10 text-xs font-bold text-slate-300 transition-colors outline-none cursor-pointer"
                >
                  {f.options.map(o => <option key={o} value={o}>{o === 'All' ? f.label : o}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            ))}
          </div>
        </motion.div>
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
      ) : topResults.length === 0 ? (
        <div className="text-center py-32 border-b border-dashed border-slate-900">
           <Trophy className="w-16 h-16 text-slate-800 mx-auto mb-6 opacity-30" />
           <h3 className="text-xl font-black text-white uppercase mb-2">No Rankings Data</h3>
           <p className="text-slate-500 font-medium text-xs">Try adjusting your filters or participate in an exam to appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
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
                {topResults.map((result, index) => {
                  const rankNum = index + 1;
                  const rankWord = getRankWord(rankNum);
                  
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.4) }}
                      className="grid grid-cols-12 gap-2 sm:gap-4 py-6 items-center border-b border-dashed border-slate-905 transition-all group"
                    >
                      {/* Rank text directly - e.g., First, Second, Third, etc. */}
                      <div className="col-span-3 sm:col-span-2 text-left pl-2 font-black text-xs uppercase tracking-wider font-mono">
                        <span className={`${
                          rankNum === 1 ? 'text-[#D4AF37]' :
                          rankNum === 2 ? 'text-slate-450 text-slate-400' :
                          rankNum === 3 ? 'text-orange-500' : 'text-slate-600'
                        }`}>
                          {rankWord}
                        </span>
                      </div>
                      
                      <div className="col-span-6 sm:col-span-6 flex items-center space-x-2 sm:space-x-4 min-w-0">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-white text-sm sm:text-base tracking-tight uppercase group-hover:text-[#D4AF37] transition-colors">{result.displayName}</h4>
                          <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wide truncate mt-0.5">
                            <School className="w-2.5 h-2.5 shrink-0" />
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
