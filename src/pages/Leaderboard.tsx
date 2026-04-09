import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamResult } from '../types';
import { Trophy, Medal, School, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Leaderboard() {
  const [topResults, setTopResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'results'),
      orderBy('score', 'desc'),
      orderBy('createdAt', 'asc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setTopResults(results);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="text-center py-20">Loading leaderboard...</div>;

  const top3 = topResults.slice(0, 3);
  const others = topResults.slice(3);

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#7A4900] mb-2">Global Leaderboard</h1>
        <p className="text-[#545454]">Top performers across all practice modules</p>
      </div>

      {/* Podium */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-0 mt-20 mb-12">
        {/* 2nd Place */}
        {top3[1] && (
          <PodiumItem
            result={top3[1]}
            rank={2}
            height="h-48"
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
            height="h-64"
            color="bg-[#D4AF37]/10 border-2 border-[#D4AF37]"
            medalColor="text-[#D4AF37]"
            delay={0}
          />
        )}
        {/* 3rd Place */}
        {top3[2] && (
          <PodiumItem
            result={top3[2]}
            rank={3}
            height="h-40"
            color="bg-orange-50"
            medalColor="text-orange-400"
            delay={0.4}
          />
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-6 bg-[#f5f5f0] font-bold text-[#7A4900] uppercase text-xs tracking-wider">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-6">Student</div>
          <div className="col-span-3">Institution</div>
          <div className="col-span-2 text-right">Score</div>
        </div>
        <div className="divide-y">
          <AnimatePresence>
            {others.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-gray-50 transition-colors"
              >
                <div className="col-span-1 text-center font-bold text-[#545454]">
                  {index + 4}
                </div>
                <div className="col-span-6 flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="font-bold text-[#7A4900]">{result.displayName}</span>
                </div>
                <div className="col-span-3 text-sm text-[#545454] truncate">
                  <div className="flex items-center space-x-1">
                    <School className="w-3 h-3" />
                    <span>{result.school}</span>
                  </div>
                </div>
                <div className="col-span-2 text-right font-bold text-[#D4AF37] text-lg">
                  {result.score}%
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
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
