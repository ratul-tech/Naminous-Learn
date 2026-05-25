import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ExamResult } from '../types';
import { Trophy, BookOpen, Calendar, ArrowRight, TrendingUp, Clock, Shield, User as UserIcon, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  profile: UserProfile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const [recentResults, setRecentResults] = useState<ExamResult[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    avgScore: 0,
    bestScore: 0,
  });

  useEffect(() => {
    if (!profile) return;

    const fetchStats = async () => {
      const resultsRef = collection(db, 'results');
      const q = query(
        resultsRef,
        where('uid', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setRecentResults(results);

      // Simple stats from all results
      const allQ = query(resultsRef, where('uid', '==', profile.uid));
      const allSnapshot = await getDocs(allQ);
      const allResults = allSnapshot.docs.map(doc => doc.data() as ExamResult);
      
      if (allResults.length > 0) {
        const total = allResults.length;
        const sum = allResults.reduce((acc, curr) => acc + curr.score, 0);
        const best = Math.max(...allResults.map(r => r.score));
        setStats({
          totalExams: total,
          avgScore: Math.round(sum / total),
          bestScore: best,
        });
      }
    };

    fetchStats();
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- ADMIN DASHBOARD CONTENT ---
  if (profile.role === 'admin') {
    return (
      <div className="space-y-6 sm:space-y-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-serif">System Snapshot</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Real-time engagement metrics</p>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-xl border border-slate-800">
             <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Services Active</span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard icon={TrendingUp} label="Platform Average" value={`${stats.avgScore}%`} color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={BookOpen} label="Total Evaluations" value={stats.totalExams} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard icon={Trophy} label="Elite Mastery" value={`${stats.bestScore}%`} color="bg-amber-500/10 text-amber-400" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 min-h-[250px] sm:min-h-[350px]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800 shadow-inner">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-slate-800" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Usage Analytics</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm px-4 leading-relaxed font-medium">Detailed performance heatmaps and usage graphs will synchronize as system traffic scales during peak evaluation cycles.</p>
          </div>
          <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-white">Critical Actions</h3>
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            </div>
            <div className="space-y-3">
              <Link to="/admin" className="block p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-indigo-500/20 group shadow-lg">
                <p className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform">Review Pending Admins</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Security Verification Required</p>
              </Link>
              <Link to="/questions" className="block p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-amber-500/20 group shadow-lg">
                <p className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform">Audit Question Bank</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Content Integrity Check</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STUDENT DASHBOARD CONTENT ---
  return (
    <div className="space-y-8 sm:space-y-12 pb-20">
      <header className="bg-slate-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl border border-slate-800 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-block px-4 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-6 border border-amber-500/20"
          >
            Performance Overview
          </motion.div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 font-serif">Academic Progress</h1>
          <p className="text-slate-400 text-sm sm:text-lg leading-relaxed mb-8 max-w-xl">
            Your academy average is <span className="font-bold text-[#D4AF37] text-xl">{stats.avgScore}%</span>. 
            Maintain this momentum to reach the elite rankings.
          </p>
          
          <div className="w-full h-3 sm:h-4 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-slate-800 p-0.5">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${stats.avgScore}%` }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="h-full bg-gradient-to-r from-amber-600 via-[#D4AF37] to-amber-200 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.3)]" 
             />
          </div>
        </div>

        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Trophy className="w-32 h-32 sm:w-64 sm:h-64 rotate-12" />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StudentAppShortcut icon={BookOpen} label="Practice" color="bg-amber-500/10 text-amber-500 border-amber-500/20" path="/practice" />
        <StudentAppShortcut icon={Calendar} label="Live Exams" color="bg-purple-500/10 text-purple-400 border-purple-500/20" path="/events" />
        <StudentAppShortcut icon={Trophy} label="Hall of Fame" color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" path="/leaderboard" />
        <StudentAppShortcut icon={MessageSquare} label="Your Voice" color="bg-rose-500/10 text-rose-400 border-rose-500/20" path="/feedback" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            <h3 className="text-xl font-bold text-white font-serif tracking-tight">Recent Activity</h3>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.2em] bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full">Last 5 Sessions</span>
        </div>

        <div className="space-y-4">
          {recentResults.length > 0 ? (
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
              <div className="divide-y divide-slate-800">
                {recentResults.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 sm:p-8 flex items-center justify-between group hover:bg-slate-950 transition-all cursor-default"
                  >
                    <div className="flex items-center space-x-6">
                      <div className={`p-4 rounded-2xl ${
                        result.type === 'Event' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-amber-500 transition-colors text-lg">{result.type} Exam</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <p className="text-xs text-slate-500 font-medium">Completed: {new Date(result.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="text-right">
                        <div className="flex items-end space-x-1">
                          <p className="text-2xl sm:text-3xl font-bold text-white font-serif leading-none">{result.score}%</p>
                        </div>
                        <p className="text-[10px] font-bold uppercase text-amber-500/80 tracking-widest mt-1">{result.correctCount} Correct Responses</p>
                      </div>
                      <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-800">
                        <ArrowRight className="w-5 h-5 text-amber-500" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-900 p-16 sm:p-24 rounded-[3.5rem] text-center border-2 border-dashed border-slate-800 shadow-inner flex flex-col items-center justify-center space-y-6"
            >
               <div className="w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center text-slate-800 border border-slate-800 shadow-2xl relative">
                 <BookOpen className="w-10 h-10" />
                 <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500/10 rounded-full border border-amber-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                 </div>
               </div>
               <div>
                 <h4 className="text-xl font-bold text-white mb-2 font-serif">Awaiting Your First Challenge</h4>
                 <p className="text-slate-500 max-w-sm mx-auto font-medium">Your academic journey begins with your first response. Select a practice module or live event to start building your record.</p>
               </div>
               <Link to="/events" className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold transition-all border border-slate-800 text-sm">
                 Browse Live Events
               </Link>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

function StudentAppShortcut({ icon: Icon, label, color, path }: { icon: any, label: string, color: string, path: string }) {
  return (
    <Link to={path}>
      <motion.div
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
        className="bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-slate-800 flex flex-col items-center justify-center space-y-3 cursor-pointer text-center h-44 hover:border-indigo-500/30 transition-all sm:h-48 group shadow-indigo-500/5"
      >
        <div className={`p-4 rounded-2xl ${color} shadow-lg border transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]`}>
          <Icon className="w-8 h-8" />
        </div>
        <span className="text-xs font-black text-slate-300 group-hover:text-white uppercase tracking-tighter transition-colors">{label}</span>
      </motion.div>
    </Link>
  );
}

// Re-using common component for Admin
function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <motion.div
      whileHover={{ y: -5, borderColor: "rgba(99, 102, 241, 0.4)" }}
      className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-800 flex items-center space-x-3 sm:space-x-5 transition-all"
    >
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${color} shrink-0 border border-current opacity-90 shadow-lg`}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 truncate">{label}</p>
        <p className="text-xl sm:text-3xl font-bold text-white font-serif truncate">{value}</p>
      </div>
    </motion.div>
  );
}
