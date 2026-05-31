import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ExamResult } from '../types';
import { Trophy, BookOpen, Calendar, ArrowRight, TrendingUp, Clock, Shield, User as UserIcon, MessageSquare, Award } from 'lucide-react';
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
    accuracyRate: 0,
  });

  useEffect(() => {
    if (!profile) return;

    const fetchStats = async () => {
      const resultsRef = collection(db, 'results');
      // Simple stats and list from all results for this user
      const allQ = query(resultsRef, where('uid', '==', profile.uid));
      const allSnapshot = await getDocs(allQ);
      const allResults = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      
      // Sort client-side by createdAt desc
      const sortedResults = [...allResults].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setRecentResults(sortedResults.slice(0, 5));
      
      if (allResults.length > 0) {
        const total = allResults.length;
        const sum = allResults.reduce((acc, curr) => acc + curr.score, 0);
        const best = Math.max(...allResults.map(r => r.score));
        
        const totalCorrect = allResults.reduce((acc, curr) => acc + (curr.correctCount || 0), 0);
        const totalQs = allResults.reduce((acc, curr) => acc + (curr.totalQuestions || 0), 0);
        const accuracyRate = totalQs > 0 ? (totalCorrect / totalQs) * 100 : 0;

        setStats({
          totalExams: total,
          avgScore: Number((sum / total).toFixed(2)),
          bestScore: Number(best.toFixed(2)),
          accuracyRate: Number(accuracyRate.toFixed(2)),
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
          <StatCard icon={TrendingUp} label="Platform Average" value={stats.avgScore} color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={BookOpen} label="Total Evaluations" value={stats.totalExams} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard icon={Trophy} label="Elite Mastery" value={stats.bestScore} color="bg-amber-500/10 text-amber-400" />
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
    <div className="space-y-16 pb-20 pt-4">
      <header className="py-6 overflow-hidden relative group">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-block px-0 py-1 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-4"
          >
            Performance Overview
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl sm:text-6xl font-black text-white mb-2 leading-none tracking-tight font-sans">
                Academic <span className="text-[#D4AF37]">Progress</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                Your average stands at <span className="font-extrabold text-[#D4AF37]">{stats.avgScore.toFixed(2)}</span>. Keep pushing forward to rise within the elite academic circle.
              </p>
            </div>
            {/* Elegant Floating Metric Display with Radial Shadow Glow */}
            <div className="flex items-center space-x-4 shrink-0">
              <span className="text-7xl sm:text-8xl font-black text-[#D4AF37] font-sans tracking-tighter drop-shadow-[0_0_35px_rgba(212,175,55,0.45)]">
                {stats.avgScore.toFixed(2)}
              </span>
              <div className="flex flex-col text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">
                <span>Academy</span>
                <span>Average</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
            <span>Accuracy Rate (Accuracy)</span>
            <span className="text-[#D4AF37]">{stats.accuracyRate.toFixed(2)}%</span>
          </div>
          <div className="w-full h-[2px] bg-slate-905 overflow-hidden relative">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${stats.accuracyRate}%` }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="h-full bg-gradient-to-r from-amber-600 via-[#D4AF37] to-amber-300 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.8)]" 
             />
          </div>
        </div>
      </header>

      {/* Shortcuts without box layouts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 py-6 border-y border-dashed border-[#1e293b]/50">
        <StudentAppShortcut icon={BookOpen} label="Practice" color="" path="/practice" />
        <StudentAppShortcut icon={Calendar} label="Live Exams" color="" path="/events" />
        <StudentAppShortcut icon={Award} label="Live Results" color="" path="/live-results" />
        <StudentAppShortcut icon={Trophy} label="Hall of Fame" color="" path="/leaderboard" />
        <StudentAppShortcut icon={MessageSquare} label="Your Voice" color="" path="/feedback" />
      </div>

      <section className="space-y-8">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-3.5">
            <h3 className="text-2xl font-bold text-white tracking-tight uppercase">Recent Activity</h3>
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-[#D4AF37]/30 pb-1">Last 5 Sessions</span>
        </div>

        <div className="space-y-2">
          {recentResults.length > 0 ? (
            <div className="divide-y divide-slate-900 border-t border-slate-900">
              {recentResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="py-6 flex items-center justify-between group hover:pl-2 transition-all duration-300 cursor-default"
                >
                  <div className="flex items-center space-x-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    <div>
                      <h4 className="font-bold text-white group-hover:text-[#D4AF37] transition-colors text-base uppercase tracking-wide">{result.type} Exam</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Completed: {new Date(result.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-2xl sm:text-3xl font-black text-white leading-none">{Number(result.score).toFixed(2)}</p>
                      <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mt-1">{result.correctCount} Correct Responses</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="pt-6 flex justify-end">
                <Link
                  to="/history"
                  className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#D4AF37] hover:text-[#ffdf64] transition-colors border border-[#D4AF37]/25 hover:border-[#D4AF37]/50 px-5 py-3 rounded-2xl bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 shadow-sm"
                >
                  <span>View Complete Exam History</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </Link>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center flex flex-col items-center justify-center space-y-6"
            >
               <BookOpen className="w-12 h-12 text-slate-700 opacity-40 animate-pulse" />
               <div>
                 <h4 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Awaiting Your First Challenge</h4>
                 <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">Your academic journey begins with your first response. Select a practice module or live event to start building your record.</p>
               </div>
               <Link to="/events" className="text-xs uppercase tracking-widest text-[#D4AF37] font-black border-b border-[#D4AF37]/30 pb-0.5 hover:text-white hover:border-white transition-all">
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
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="flex flex-col items-center justify-center space-y-3 cursor-pointer text-center py-6 group relative"
      >
        <div className={`p-4 rounded-full bg-slate-900/10 text-white transition-all duration-300 group-hover:scale-110 group-hover:text-[#D4AF37] relative z-10`}>
          <Icon className="w-8 h-8" />
        </div>
        <span className="text-xs font-black text-slate-400 group-hover:text-[#D4AF37] uppercase tracking-widest transition-colors relative z-10">{label}</span>
        {/* Underline animations on hover style */}
        <span className="absolute bottom-1 w-0 h-[2px] bg-[#D4AF37] group-hover:w-1/2 transition-all duration-300 rounded-full" />
      </motion.div>
    </Link>
  );
}

// Re-using common component for Admin
function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <motion.div
      whileHover={{ y: -5, borderColor: "rgba(99, 102, 241, 0.4)" }}
      className="bg-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-800 flex flex-col items-center text-center space-y-3 sm:flex-row sm:items-center sm:text-left sm:space-x-5 sm:space-y-0 transition-all"
    >
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${color} shrink-0 border border-current opacity-90 shadow-lg`}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
      </div>
      <div className="min-w-0 w-full sm:w-auto">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 truncate">{label}</p>
        <p className="text-xl sm:text-3xl font-bold text-white font-serif truncate">{value}</p>
      </div>
    </motion.div>
  );
}
