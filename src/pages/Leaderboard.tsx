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
  const classes = ['All', 'Class 11', 'Class 12', 'Admission'];
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
      <header className="relative overflow-hidden bg-white p-10 md:p-16 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-amber-100"
          >
            Hall of Fame
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold text-[#7A4900] mb-6 font-serif">
            Student Rankings
          </h1>
          <p className="text-lg text-[#545454] max-w-2xl mx-auto leading-relaxed">
            Celebrating the top minds across our global platform. Excellence is noticed, awarded, and remembered.
          </p>
        </div>
        
        {/* Background Decorative */}
        <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 text-gray-50 opacity-20 pointer-events-none" />
      </header>

      {/* Filters Overlay */}
      <div className="sticky top-24 z-30 flex justify-center">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white flex flex-wrap gap-2 items-center"
        >
          <div className="px-3 py-2 flex items-center space-x-2 text-[#7A4900] font-bold text-xs uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter By:</span>
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
                  className="appearance-none bg-gray-50 hover:bg-gray-100 border-none rounded-xl px-4 py-2 pr-10 text-xs font-bold text-[#7A4900] transition-colors outline-none cursor-pointer"
                >
                  {f.options.map(o => <option key={o} value={o}>{o === 'All' ? f.label : o}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {loading ? (
        <div className="text-center py-32 flex flex-col items-center space-y-6 bg-white rounded-[3rem] border border-gray-100">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full"
          />
          <p className="text-xl font-bold text-[#7A4900] font-serif">Calculating rankings...</p>
        </div>
      ) : topResults.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border-2 border-dashed border-gray-100">
           <Trophy className="w-20 h-20 text-gray-100 mx-auto mb-6" />
           <h3 className="text-2xl font-bold text-[#7A4900] font-serif mb-2">No Rankings Data</h3>
           <p className="text-[#545454]">Try adjusting your filters or participate in an exam to appear here!</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Podium */}
          <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-0 px-4">
            {/* 2nd Place */}
            {top3[1] && (
              <PodiumItem
                result={top3[1]}
                rank={2}
                height="h-56"
                color="bg-gray-100"
                medalColor="text-gray-400"
                delay={0.2}
              />
            )}
            {/* 1st Place */}
            {top3[0] && (
              <PodiumItem
                result={top3[0]}
                rank={1}
                height="h-80"
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
                height="h-44"
                color="bg-orange-100"
                medalColor="text-orange-400"
                delay={0.4}
              />
            )}
          </div>

          {/* List View */}
          <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-8 bg-[#f5f5f0]/50 font-bold text-[#7A4900] uppercase text-[10px] tracking-[0.2em] border-b">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-6 md:col-span-7">Student Profile</div>
              <div className="col-span-3 md:col-span-2">Points</div>
              <div className="col-span-2 text-right">Details</div>
            </div>
            
            <div className="divide-y divide-gray-50">
              <AnimatePresence>
                {others.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-12 gap-4 p-8 items-center hover:bg-gray-50 transition-all group"
                  >
                    <div className="col-span-1 text-center font-serif text-2xl font-bold text-gray-300 group-hover:text-[#D4AF37] transition-colors">
                      {index + 4}
                    </div>
                    <div className="col-span-6 md:col-span-7 flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all border border-transparent group-hover:border-amber-100">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#7A4900] group-hover:translate-x-1 transition-transform">{result.displayName}</h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <School className="w-3 h-3" />
                          <span>{result.school}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <div className="text-xl font-bold text-[#7A4900] font-serif">{result.score}%</div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">{result.correctCount} Correct</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="inline-block px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-400 rounded-full group-hover:bg-[#7A4900]/5 group-hover:text-[#7A4900] transition-colors">
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
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: 'spring' }}
      className={`flex flex-col items-center w-full md:w-56 ${isFirst ? 'z-10 -mt-8' : ''}`}
    >
      <div className="mb-6 text-center relative">
        {isFirst && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: delay + 0.5, repeat: Infinity, repeatType: 'reverse', duration: 2 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 text-[#D4AF37]"
          >
            <Trophy className="w-10 h-10 fill-current" />
          </motion.div>
        )}
        <div className="relative inline-block">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-white shadow-2xl flex items-center justify-center border-4 ${isFirst ? 'border-[#D4AF37]' : 'border-white'} overflow-hidden`}
          >
             <User className="w-10 h-10 text-gray-300" />
          </motion.div>
          <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center ${medalColor} border-2 border-white`}>
            <Medal className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-bold text-[#7A4900] truncate w-40 mx-auto text-lg">{result.displayName}</h3>
          <p className="text-xs text-[#545454] font-medium truncate w-40 mx-auto opacity-70">{result.school}</p>
        </div>
      </div>
      
      <motion.div 
        whileHover={{ y: -5 }}
        className={`${height} w-full rounded-t-[2.5rem] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden ${
          rank === 1 ? 'bg-gradient-to-b from-[#D4AF37] to-[#B8860B]' :
          rank === 2 ? 'bg-gradient-to-b from-gray-200 to-gray-400' :
          'bg-gradient-to-b from-orange-200 to-orange-400'
        }`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <span className={`text-6xl font-black mb-2 ${isFirst ? 'text-white/30' : 'text-black/10'}`}>{rank}</span>
        <div className={`px-4 py-1 rounded-full text-sm font-bold shadow-sm ${isFirst ? 'bg-white text-[#7A4900]' : 'bg-black/10 text-white'}`}>
          {result.score}%
        </div>
      </motion.div>
    </motion.div>
  );
}
