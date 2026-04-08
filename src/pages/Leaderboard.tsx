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
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`flex flex-col items-center w-full md:w-48 ${rank === 1 ? 'z-10' : ''}`}
    >
      <div className="mb-4 text-center">
        <div className="relative inline-block">
          <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white overflow-hidden">
             <User className="w-8 h-8 text-gray-400" />
          </div>
          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center ${medalColor}`}>
            <Medal className="w-5 h-5" />
          </div>
        </div>
        <h3 className="mt-4 font-bold text-[#7A4900] truncate w-40">{result.displayName}</h3>
        <p className="text-xs text-[#545454] truncate w-40">{result.school}</p>
      </div>
      <div className={`${height} w-full ${color} rounded-t-3xl flex flex-col items-center justify-center shadow-sm`}>
        <span className="text-4xl font-black text-[#7A4900] opacity-20 mb-2">{rank}</span>
        <span className="text-2xl font-bold text-[#D4AF37]">{result.score}%</span>
      </div>
    </motion.div>
  );
}
