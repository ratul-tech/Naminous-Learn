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

  if (profile?.role === 'admin') {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-2 border-[#D4AF37]"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 mb-6 text-center sm:text-left">
        <div className="p-3 bg-[#D4AF37]/20 rounded-2xl">
          <Shield className="w-8 h-8 text-[#7A4900]" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#7A4900]">Welcome, {profile.displayName}</h1>
          <p className="text-[#545454]">
            Logged in as an <span className="font-bold text-[#D4AF37]">{profile.adminType === 'full' ? 'Administrator' : 'Question Holder'}</span>
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-10">
        <Link 
          to="/questions" 
          className="p-6 md:p-8 bg-[#D4AF37]/10 rounded-2xl md:rounded-3xl border-2 border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all group"
        >
          <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg md:text-xl font-bold text-[#7A4900] mb-2">Question Bank</h3>
          <p className="text-sm text-[#545454]">Access the separate question management page to add, search, and edit questions.</p>
        </Link>
        <Link 
          to="/admin" 
          className="p-6 md:p-8 bg-[#7A4900]/5 rounded-2xl md:rounded-3xl border-2 border-[#7A4900]/10 hover:border-[#7A4900] transition-all group"
        >
          <Shield className="w-8 h-8 md:w-10 md:h-10 text-[#7A4900] mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg md:text-xl font-bold text-[#7A4900] mb-2">Admin Panel</h3>
          <p className="text-sm text-[#545454]">
            Full system control: users, payments, events, and feedback management.
          </p>
        </Link>
      </div>
    </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 bg-[#D4AF37]/10 text-[#7A4900] rounded-full text-xs font-bold uppercase tracking-widest mb-6"
          >
            Student Dashboard
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#7A4900] mb-4">
            Welcome back, <span className="text-[#D4AF37]">{profile?.displayName}</span>!
          </h1>
          <p className="text-lg text-[#545454] max-w-xl leading-relaxed">
            Your academic journey is a marathon, not a sprint. Every practice session brings you closer to your goals.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link to="/practice" className="bg-[#D4AF37] text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-[#B8860B] shadow-lg shadow-yellow-100 transition-all flex items-center space-x-3 transform hover:-translate-y-1">
              <BookOpen className="w-5 h-5" />
              <span>Start Practice Session</span>
            </Link>
            <Link to="/events" className="bg-white text-[#7A4900] border-2 border-[#7A4900]/10 hover:border-[#7A4900] px-8 py-3.5 rounded-2xl font-bold transition-all flex items-center space-x-3 transform hover:-translate-y-1">
              <Calendar className="w-5 h-5" />
              <span>Browse Events</span>
            </Link>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-[#7A4900]/5 rounded-full blur-2xl" />
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <StatCard 
          icon={TrendingUp} 
          label="Total Exams" 
          value={stats.totalExams} 
          color="bg-blue-50 text-blue-600" 
          delay={0.1}
        />
        <StatCard 
          icon={Trophy} 
          label="Average Score" 
          value={`${stats.avgScore}%`} 
          color="bg-amber-50 text-amber-600" 
          delay={0.2}
        />
        <StatCard 
          icon={Clock} 
          label="Best Performance" 
          value={`${stats.bestScore}%`} 
          color="bg-emerald-50 text-emerald-600" 
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3 bg-white rounded-[2.5rem] shadow-sm p-8 border border-gray-100"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-[#7A4900] flex items-center space-x-3">
              <div className="w-1.5 h-6 bg-[#D4AF37] rounded-full" />
              <span>Recent Activity</span>
            </h2>
            <Link to="/leaderboard" className="text-sm font-bold text-[#D4AF37] hover:text-[#7A4900] transition-colors flex items-center space-x-2">
              <span>Leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentResults.length > 0 ? recentResults.map((result, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (idx * 0.1) }}
                key={result.id} 
                className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${result.type === 'Event' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#7A4900]">{result.type} Exam</h3>
                    <p className="text-xs text-[#545454] flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(result.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <span className="text-xl font-bold text-[#7A4900]">{result.score}%</span>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">{result.correctCount} Correct</p>
                  </div>
                  <div className="h-10 w-1 bg-gray-200 rounded-full" />
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-12 px-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-[#545454] font-medium">No practice history yet.</p>
                <Link to="/practice" className="text-[#D4AF37] font-bold text-sm hover:underline mt-2 inline-block">Start your first session →</Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Sidebar */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#7A4900] text-white rounded-[2.5rem] shadow-xl p-8 relative overflow-hidden group"
          >
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Mega Mock Test</h2>
              <p className="text-white/80 text-sm mb-8 leading-relaxed">
                Join our biggest mock test event yet. Challenge yourself against thousands of students and win Tk 5000+.
              </p>
              <Link to="/events" className="inline-flex items-center space-x-3 bg-white text-[#7A4900] px-6 py-3 rounded-xl font-bold hover:bg-[#D4AF37] hover:text-white transition-all transform hover:scale-105">
                <span>Join Event</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Background Decorative */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
            <Trophy className="absolute top-4 right-4 w-20 h-20 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-[2.5rem] shadow-sm p-8 border border-gray-100"
          >
            <h3 className="text-lg font-bold text-[#7A4900] mb-4">Quick Links</h3>
            <div className="space-y-3">
              {[
                { name: 'My Profile', path: '/profile', icon: UserIcon },
                { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
                { name: 'Feedback', path: '/feedback', icon: MessageSquare },
              ].map((link) => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className="flex items-center space-x-3 p-4 rounded-xl hover:bg-[#f5f5f0] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-colors">
                    <link.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-[#545454] group-hover:text-[#7A4900] transition-colors">{link.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, delay = 0 }: { icon: any, label: string, value: string | number, color: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-5 transition-all hover:shadow-md"
    >
      <div className={`p-4 rounded-2xl ${color} shadow-inner`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-[#7A4900] font-serif">{value}</p>
      </div>
    </motion.div>
  );
}
