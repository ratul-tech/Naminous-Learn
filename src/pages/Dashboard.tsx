import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ExamResult } from '../types';
import { Trophy, BookOpen, Calendar, ArrowRight, TrendingUp, Clock, Shield } from 'lucide-react';
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
          className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-[#D4AF37]"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-[#D4AF37]/20 rounded-2xl">
              <Shield className="w-8 h-8 text-[#7A4900]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#7A4900]">Welcome, {profile.displayName}</h1>
              <p className="text-[#545454]">
                Logged in as a <span className="font-bold text-[#D4AF37]">{profile.adminType === 'full' ? 'Full Administrator' : 'Question Holder'}</span>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <Link 
              to="/questions" 
              className="p-8 bg-[#D4AF37]/10 rounded-3xl border-2 border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all group"
            >
              <BookOpen className="w-10 h-10 text-[#D4AF37] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-[#7A4900] mb-2">Question Bank</h3>
              <p className="text-sm text-[#545454]">Access the separate question management page to add, search, and edit questions.</p>
            </Link>
            {profile.adminType === 'full' && (
              <Link 
                to="/admin" 
                className="p-8 bg-[#7A4900]/5 rounded-3xl border-2 border-[#7A4900]/10 hover:border-[#7A4900] transition-all group"
              >
                <Shield className="w-10 h-10 text-[#7A4900] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-[#7A4900] mb-2">Admin Panel</h3>
                <p className="text-sm text-[#545454]">Full system control: users, payments, events, and feedback management.</p>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#7A4900]">Welcome back, {profile?.displayName}!</h1>
          <p className="text-[#545454]">Ready for some practice today?</p>
        </div>
        <div className="flex space-x-4">
          <Link to="/practice" className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-bold hover:bg-[#B8860B] transition-all flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Start Practice</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={TrendingUp} label="Total Exams" value={stats.totalExams} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Trophy} label="Average Score" value={`${stats.avgScore}%`} color="bg-yellow-50 text-yellow-600" />
        <StatCard icon={Clock} label="Best Score" value={`${stats.bestScore}%`} color="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#7A4900]">Recent Activity</h2>
            <Link to="/leaderboard" className="text-sm text-[#D4AF37] hover:underline flex items-center space-x-1">
              <span>View Leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentResults.length > 0 ? recentResults.map((result) => (
              <div key={result.id} className="flex items-center justify-between p-4 bg-[#f5f5f0] rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${result.type === 'Event' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">{result.type} Exam</h3>
                    <p className="text-xs text-[#545454]">{new Date(result.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#7A4900]">{result.score}%</span>
                  <p className="text-xs text-[#545454]">{result.correctCount} Correct</p>
                </div>
              </div>
            )) : (
              <p className="text-center text-[#545454] py-8">No exams taken yet. Start your first practice!</p>
            )}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#7A4900]">Upcoming Events</h2>
            <Link to="/events" className="text-sm text-[#D4AF37] hover:underline flex items-center space-x-1">
              <span>View All Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed border-[#D4AF37] rounded-xl text-center">
              <Calendar className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
              <h3 className="font-bold text-[#7A4900]">Mega Mock Test 2026</h3>
              <p className="text-sm text-[#545454] mb-4">Win exciting prizes and test your skills!</p>
              <Link to="/events" className="inline-block bg-[#D4AF37] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#B8860B]">
                Register Now
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-2xl shadow-sm flex items-center space-x-4"
    >
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-[#545454]">{label}</p>
        <p className="text-2xl font-bold text-[#7A4900]">{value}</p>
      </div>
    </motion.div>
  );
}
