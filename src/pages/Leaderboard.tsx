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

  const subjects = ['All', ...ALL_SUBJECTS];
  const classes = ['All', 'Class 9', 'Class 10', 'SSC Candidate', 'College Admission'];
  const types = ['All', 'Practice', 'Event'];

  useEffect(() => {
    let q = query(
      collection(db, 'results'),
      orderBy('score', 'desc'),
      orderBy('createdAt', 'asc'),
      limit(20)
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
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setTopResults(results);
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
        <div className="space-y-16">
          {/* Podium */}
          <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-4 px-4">
            {/* 2nd Place */}
            {top3[1] && (
              <PodiumItem
                result={top3[1]}
                rank={2}
                height="h-32 md:h-48"
                color="bg-slate-800"
                medalColor="text-slate-400"
                delay={0.2}
              />
            )}
            {/* 1st Place */}
            {top3[0] && (
              <PodiumItem
                result={top3[0]}
                rank={1}
                height="h-44 md:h-64"
                color="bg-[#D4AF37]"
                medalColor="text-[#D4AF37]"
                delay={0}
              />
            )}
            {/* 3rd Place */}
            {top3[2] && (
              <PodiumItem
                result={top3[2]}
                rank={3}
                height="h-24 md:h-36"
                color="bg-orange-900/40"
                medalColor="text-orange-400"
                delay={0.4}
              />
            )}
          </div>

          {/* List View */}
          <div className="overflow-hidden">
            <div className="grid grid-cols-12 gap-2 sm:gap-4 py-4 font-black text-[#D4AF37] uppercase text-[9px] tracking-widest border-b border-slate-900">
              <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
              <div className="col-span-6 sm:col-span-7">Student Profile</div>
              <div className="col-span-4 sm:col-span-2 text-center sm:text-left">Points</div>
              <div className="hidden sm:block col-span-2 text-right">Details</div>
            </div>
            
            <div className="divide-y divide-slate-910">
              <AnimatePresence>
                {others.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-12 gap-2 sm:gap-4 py-6 sm:px-8 items-center border-b border-dashed border-slate-905 transition-all group"
                  >
                    <div className="col-span-2 sm:col-span-1 text-center font-extrabold text-xl sm:text-2xl text-slate-700 group-hover:text-[#D4AF37] transition-colors">
                      {index + 4}
                    </div>
                    <div className="col-span-6 sm:col-span-7 flex items-center space-x-2 sm:space-x-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-950 rounded-xl flex items-center justify-center text-slate-600 transition-all border border-slate-900 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-white text-sm sm:text-base tracking-tight uppercase">{result.displayName}</h4>
                        <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wide truncate">
                          <School className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{result.school}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-base sm:text-xl font-black text-white">{result.score}%</div>
                      <p className="text-[8px] uppercase font-black tracking-widest text-[#D4AF37]/80">{result.correctCount} Correct</p>
                    </div>
                    <div className="hidden sm:block col-span-2 text-right">
                      <div className="inline-block px-3 py-1 bg-slate-950 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-full group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-colors whitespace-nowrap border border-slate-900">
                        {result.type}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumItem({ result, rank, height, color, medalColor, delay }: { result: ExamResult, rank: number, height: string, color: string, medalColor: string, delay: number }) {
  const isFirst = rank === 1;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: 'spring' }}
      className={`flex flex-col items-center w-full md:w-56 ${isFirst ? 'z-10' : ''}`}
    >
      <div className="mb-6 text-center relative w-full">
        {isFirst && (
          <motion.div
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: delay + 0.5, repeat: Infinity, repeatType: 'reverse', duration: 2 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 text-[#D4AF37]"
          >
            <Trophy className="w-8 h-8 fill-current" />
          </motion.div>
        )}
        <div className="relative inline-block">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-950 flex items-center justify-center border-2 ${isFirst ? 'border-[#D4AF37]' : 'border-slate-850'} overflow-hidden shadow-inner`}
          >
             <User className="w-10 h-10 text-slate-600" />
          </motion.div>
          <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center ${medalColor} border border-slate-800`}>
            <Medal className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-extrabold text-white truncate w-40 mx-auto text-base uppercase tracking-tight">{result.displayName}</h3>
          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide truncate w-40 mx-auto opacity-70">{result.school}</p>
        </div>
      </div>
      
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`${height} w-full rounded-t-[1.5rem] flex flex-col items-center justify-center relative overflow-hidden`}
        style={{
          borderBottom: '2px solid #D4AF37',
          background: rank === 1 ? 'linear-gradient(to top, rgba(212, 175, 55, 0.15), transparent)' :
                     rank === 2 ? 'linear-gradient(to top, rgba(148, 163, 184, 0.08), transparent)' :
                     'linear-gradient(to top, rgba(251, 146, 60, 0.05), transparent)'
        }}
      >
        <span className={`text-6xl font-black mb-2 ${isFirst ? 'text-[#D4AF37]/25' : 'text-slate-700/20'}`}>{rank}</span>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isFirst ? 'bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/35' : 'bg-slate-950 text-slate-400 border border-slate-850'}`}>
          {result.score}%
        </div>
      </motion.div>
    </motion.div>
  );
}
