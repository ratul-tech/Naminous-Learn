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
        <div className="w-12 h-12 border-4 border-[#7A4900] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- ADMIN DASHBOARD CONTENT ---
  if (profile.role === 'admin') {
    return (
      <div className="space-y-6 sm:space-y-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#7A4900] font-serif">System Snapshot</h1>
            <p className="text-xs sm:text-sm text-[#545454] font-medium opacity-70">Real-time engagement metrics</p>
          </div>
          <div className="flex items-center space-x-2 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm border">
             <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Services Active</span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard icon={TrendingUp} label="Platform Average" value={`${stats.avgScore}%`} color="bg-blue-50 text-blue-600" />
          <StatCard icon={BookOpen} label="Total Evaluations" value={stats.totalExams} color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Trophy} label="Elite Mastery" value={`${stats.bestScore}%`} color="bg-amber-50 text-amber-600" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4 min-h-[250px] sm:min-h-[350px]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-gray-200" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#7A4900]">Usage Analytics</h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm px-4">Detailed performance heatmaps and usage graphs will synchronize as system traffic scales.</p>
          </div>
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-[#7A4900]">Critical Actions</h3>
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-200" />
            </div>
            <div className="space-y-3">
              <Link to="/admin" className="block p-4 bg-[#7A4900]/5 hover:bg-[#7A4900]/10 rounded-2xl transition-all border border-transparent hover:border-[#7A4900]/20 group">
                <p className="text-sm font-bold text-[#7A4900] group-hover:translate-x-1 transition-transform">Review Pending Admins</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Security Verification Required</p>
              </Link>
              <Link to="/questions" className="block p-4 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 rounded-2xl transition-all border border-transparent hover:border-[#D4AF37]/20 group">
                <p className="text-sm font-bold text-[#7A4900] group-hover:translate-x-1 transition-transform">Audit Question Bank</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Content Integrity Check</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STUDENT DASHBOARD CONTENT ---
  return (
    <div className="space-y-10">
      <header className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-[#D4AF37] overflow-hidden relative group">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-[#7A4900] mb-3 font-serif">Academic Progress</h1>
          <p className="text-[#545454] text-xs leading-relaxed mb-6">Your academy average is <span className="font-bold text-[#D4AF37]">{stats.avgScore}%</span>. Aim for consistent excellence!</p>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-[#D4AF37] rounded-full transition-all duration-1000" style={{ width: `${stats.avgScore}%` }} />
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy className="w-32 h-32 rotate-12" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <StudentAppShortcut icon={BookOpen} label="Practice" color="bg-amber-100 text-amber-700" path="/practice" />
        <StudentAppShortcut icon={Calendar} label="Live Exams" color="bg-purple-100 text-purple-700" path="/events" />
        <StudentAppShortcut icon={Trophy} label="Rankings" color="bg-blue-100 text-blue-700" path="/leaderboard" />
        <StudentAppShortcut icon={MessageSquare} label="Feedback" color="bg-rose-100 text-rose-700" path="/feedback" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-lg font-black text-[#7A4900] uppercase tracking-tighter">Recent Performance</h3>
          <span className="text-[10px] font-black text-[#D4AF37] uppercase">Last 5 Sessions</span>
        </div>
        <div className="space-y-4">
          {recentResults.length > 0 ? recentResults.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all active:scale-95"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl ${result.type === 'Event' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-[#7A4900]'}`}>
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[#7A4900] text-sm">{result.type} Exam</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(result.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-[#7A4900]">{result.score}%</p>
                  <p className="text-[8px] font-black uppercase text-[#D4AF37]">{result.correctCount} Right</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[#7A4900] transition-colors" />
              </div>
            </motion.div>
          )) : (
            <div className="bg-white p-10 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <BookOpen className="w-8 h-8 text-gray-200" />
               </div>
               <p className="text-sm font-bold text-gray-400">Ready to start? Select a module above.</p>
            </div>
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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 cursor-pointer text-center h-44 hover:shadow-md transition-all sm:h-48"
      >
        <div className={`p-4 rounded-2xl ${color} shadow-sm group-hover:scale-110 transition-transform`}>
          <Icon className="w-8 h-8" />
        </div>
        <span className="text-xs font-black text-[#7A4900] uppercase tracking-tighter">{label}</span>
      </motion.div>
    </Link>
  );
}

// Re-using common component for Admin
function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-3 sm:space-x-5"
    >
      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${color} shrink-0`}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400 mb-1 truncate">{label}</p>
        <p className="text-xl sm:text-3xl font-bold text-[#7A4900] font-serif truncate">{value}</p>
      </div>
    </motion.div>
  );
}
