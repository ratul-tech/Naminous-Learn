import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';
import { LogIn, LogOut, LayoutDashboard, User as UserIcon, BookOpen, Trophy, Calendar, Settings, Menu, X, MessageSquare, Shield, Facebook, Youtube, TrendingUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Practice from './pages/Practice';
import Exam from './pages/Exam';
import Leaderboard from './pages/Leaderboard';
import Events from './pages/Events';
import Admin from './pages/Admin';
import Questions from './pages/Questions';
import Login from './pages/Login';
import FeedbackForm from './pages/Feedback';
import VerifyEmail from './pages/VerifyEmail';

const LOGO_URL = "https://i.postimg.cc/0241N65R/received-982626700958526.jpg";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ? { ...firebaseUser } : null);
      if (firebaseUser && firebaseUser.emailVerified) {
        const defaultAdmins = ['shahriarislam275@gmail.com', 'shahriarislamratul065@gmail.com'];
        const isDefaultAdmin = defaultAdmins.includes(firebaseUser.email?.toLowerCase() || '');

        let userDoc;
        
        if (isDefaultAdmin) {
          // Check admins first for default admins
          userDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          if (!userDoc.exists()) {
            userDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
          }
        } else {
          // Try students collection first for everyone else
          userDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
          if (!userDoc.exists()) {
            userDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          }
        }

        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          if (isDefaultAdmin && (data.role !== 'admin' || data.adminType !== 'full')) {
            // Force full admin privileges for default admins regardless of DB state
            setProfile({ ...data, role: 'admin', adminType: 'full' });
          } else {
            setProfile(data);
          }
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#7A4900] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#f5f5f0] text-[#545454] font-sans flex flex-col">
        <Navbar user={user} profile={profile} onLogout={handleLogout} />
        
        <main className="container mx-auto px-4 py-8 flex-grow">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/admin/login" element={<Navigate to="/login?role=admin" replace />} />
            <Route path="/verify-email" element={user ? <VerifyEmail onVerified={refreshUser} /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <Dashboard profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <Profile profile={profile} setProfile={setProfile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/practice" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <Practice profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/exam/:id" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <Exam profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/events" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <Events profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/feedback" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <FeedbackForm profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/questions" element={profile?.role === 'admin' ? <Questions profile={profile} /> : <Navigate to="/dashboard" />} />
            <Route path="/admin" element={profile?.role === 'admin' ? (profile.adminType === 'full' ? <Admin /> : <Navigate to="/questions" />) : <Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer user={user} />
      </div>
    </Router>
  );
}

function Navbar({ user, profile, onLogout }: { user: User | null, profile: UserProfile | null, onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Practice', path: '/practice', icon: BookOpen },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Events', path: '/events', icon: Calendar },
    { name: 'Feedback', path: '/feedback', icon: MessageSquare },
  ];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3">
              <img src={LOGO_URL} alt="Numinous Learn" className="h-12 w-12 rounded-xl shadow-md object-cover" referrerPolicy="no-referrer" />
              <span className="text-2xl font-bold text-[#7A4900]">Numinous Learn</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user && user.emailVerified && (
              <div className="hidden sm:flex items-center space-x-4 mr-4 pr-4 border-r border-gray-100">
                <Link to="/profile" className="flex items-center space-x-2">
                  <img src={profile?.photoURL || undefined} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#D4AF37]" referrerPolicy="no-referrer" />
                  <span className="text-sm font-bold text-[#7A4900]">{profile?.displayName}</span>
                </Link>
              </div>
            )}
            
            <button 
              onClick={() => setIsOpen(true)} 
              className="p-3 rounded-xl text-[#7A4900] hover:bg-[#D4AF37]/10 transition-all flex items-center space-x-2 border-2 border-transparent hover:border-[#D4AF37]/30"
            >
              <Menu className="w-6 h-6" />
              <span className="font-bold hidden sm:block">Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b">
                <div className="flex items-center space-x-3">
                  <img src={LOGO_URL} alt="Logo" className="h-8 w-8 rounded-lg" referrerPolicy="no-referrer" />
                  <span className="font-bold text-[#7A4900]">Navigation</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-2">
                {user ? (
                  <>
                    {user.emailVerified && (
                      <div className="mb-8 p-4 bg-[#f5f5f0] rounded-2xl flex items-center space-x-4">
                        <img src={profile?.photoURL || undefined} alt="Profile" className="h-12 w-12 rounded-full border-2 border-[#D4AF37]" referrerPolicy="no-referrer" />
                        <div className="overflow-hidden">
                          <p className="font-bold text-[#7A4900] truncate">{profile?.displayName}</p>
                          <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {user.emailVerified && navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                          location.pathname === link.path 
                            ? 'bg-[#D4AF37] text-white shadow-md' 
                            : 'text-[#545454] hover:bg-gray-50'
                        }`}
                      >
                        <link.icon className="w-5 h-5" />
                        <span>{link.name}</span>
                      </Link>
                    ))}

                    {user.emailVerified && profile?.role === 'admin' && (profile.adminType === 'full' || (['shahriarislam275@gmail.com', 'shahriarislamratul065@gmail.com'].includes(profile.email.toLowerCase()))) && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all mt-4 ${
                          location.pathname === '/admin' 
                            ? 'bg-[#7A4900] text-white shadow-md' 
                            : 'text-[#7A4900] bg-[#7A4900]/5 hover:bg-[#7A4900]/10'
                        }`}
                      >
                        <Shield className="w-5 h-5" />
                        <span>Admin Panel</span>
                      </Link>
                    )}

                    {user.emailVerified && profile?.role === 'admin' && (
                      <Link
                        to="/questions"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all mt-2 ${
                          location.pathname === '/questions' 
                            ? 'bg-[#D4AF37] text-white shadow-md' 
                            : 'text-[#7A4900] bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10'
                        }`}
                      >
                        <BookOpen className="w-5 h-5" />
                        <span>Question Bank</span>
                      </Link>
                    )}

                    <div className="pt-8 mt-8 border-t space-y-2">
                      <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                          location.pathname === '/profile' 
                            ? 'bg-[#D4AF37] text-white' 
                            : 'text-[#545454] hover:bg-gray-50'
                        }`}
                      >
                        <UserIcon className="w-5 h-5" />
                        <span>My Profile</span>
                      </Link>
                      <button 
                        onClick={() => {
                          onLogout();
                          setIsOpen(false);
                        }} 
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-gray-400 text-center mb-6">Join Numinous Learn to start your journey.</p>
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center bg-[#D4AF37] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#B8860B] transition-all"
                    >
                      Login / Register
                    </Link>
                    <Link
                      to="/admin/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center bg-[#7A4900] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black transition-all"
                    >
                      Admin Portal
                    </Link>
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50">
                <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                  © {new Date().getFullYear()} Numinous Learn
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Landing() {
  const [stats, setStats] = useState({ studentsCount: 5000, questionsCount: 100000, eventsCount: 200 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'global_stats', 'counters'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setStats({
          studentsCount: data.studentsCount || 5000,
          questionsCount: data.questionsCount || 100000,
          eventsCount: data.eventsCount || 200
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k+';
    return num.toString();
  };

  return (
    <div className="flex flex-col space-y-32 py-10">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#D4AF37]/5 to-transparent -z-10" />
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-10"
        >
          <div className="absolute inset-0 bg-[#D4AF37] blur-3xl opacity-20 rounded-full" />
          <img
            src={LOGO_URL}
            alt="Numinous Learn"
            className="w-40 h-40 md:w-56 md:h-56 rounded-[2.5rem] shadow-2xl relative border-4 border-white object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl px-4"
        >
          <h1 className="text-5xl md:text-8xl font-bold text-[#7A4900] mb-8 leading-[1.1] font-serif">
            Elevate Your <span className="text-[#D4AF37]">Academic</span> Potential
          </h1>
          <p className="text-xl md:text-2xl text-[#545454] max-w-2xl mx-auto mb-12 leading-relaxed font-medium opacity-80">
            A premium learning sanctuary where students master their subjects through expert-curated practice and high-stakes evaluation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              to="/login"
              className="w-full sm:w-auto bg-[#D4AF37] text-white px-10 py-5 rounded-[2rem] font-bold text-xl hover:bg-[#B8860B] shadow-2xl shadow-amber-200 transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-3"
            >
              <LogIn className="w-6 h-6" />
              <span>Start Your Journey</span>
            </Link>
            <Link
              to="/leaderboard"
              className="w-full sm:w-auto bg-white text-[#7A4900] border-2 border-[#7A4900]/10 px-10 py-5 rounded-[2rem] font-bold text-xl hover:border-[#7A4900] hover:bg-gray-50 transition-all flex items-center justify-center space-x-3"
            >
              <Trophy className="w-6 h-6" />
              <span>Hall of Fame</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats/Social Proof Section */}
      <section className="bg-[#7A4900] rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <h3 className="text-5xl font-bold mb-2 font-serif">{loading ? '...' : formatNumber(stats.studentsCount)}</h3>
            <p className="text-white/60 font-bold uppercase tracking-widest text-sm">Active Students</p>
          </div>
          <div>
            <h3 className="text-5xl font-bold mb-2 font-serif">{loading ? '...' : formatNumber(stats.questionsCount)}</h3>
            <p className="text-white/60 font-bold uppercase tracking-widest text-sm">Questions Solved</p>
          </div>
          <div>
            <h3 className="text-5xl font-bold mb-2 font-serif">{loading ? '...' : formatNumber(stats.eventsCount)}</h3>
            <p className="text-white/60 font-bold uppercase tracking-widest text-sm">Monthly Events</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-sm font-bold text-[#D4AF37] uppercase tracking-[0.3em] mb-4">Core Capabilities</h2>
          <h2 className="text-4xl md:text-6xl font-bold text-[#7A4900] font-serif">Everything you need to excel</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Structured Practice",
              desc: "Subject-wise curated modules designed to build your base from the ground up.",
              icon: BookOpen,
              color: "bg-blue-50 text-blue-600"
            },
            {
              title: "Live Events",
              desc: "Compete in high-stakes mock tests with real-time ranking and exciting rewards.",
              icon: Calendar,
              color: "bg-amber-50 text-amber-600"
            },
            {
              title: "Deep Analytics",
              desc: "Track your progress with detailed performance reports and subject-wise mastery analysis.",
              icon: TrendingUp,
              color: "bg-emerald-50 text-emerald-600"
            }
          ].map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 hover:border-[#D4AF37] transition-all group"
            >
              <div className={`w-16 h-16 ${feat.color} rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                <feat.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#7A4900] mb-4 font-serif">{feat.title}</h3>
              <p className="text-[#545454] leading-relaxed opacity-80">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Portal Access */}
      <section className="bg-white rounded-[4rem] p-12 md:p-20 shadow-xl border border-gray-50 flex flex-col items-center">
        <h2 className="text-center font-serif text-4xl md:text-5xl font-bold text-[#7A4900] mb-16">Choose Your Portal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
          <Link
            to="/login?role=student"
            className="group relative bg-[#f5f5f0] p-12 rounded-[3.5rem] border-2 border-transparent hover:border-[#D4AF37] transition-all overflow-hidden"
          >
            <div className="relative z-10">
              <div className="w-16 h-16 bg-[#D4AF37] text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl">
                <UserIcon className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-[#7A4900] mb-4 font-serif">Student Portal</h3>
              <p className="text-[#545454] mb-8 font-medium opacity-80">Join as a student to access exams, track performance, and climb the leaderboard.</p>
              <span className="inline-flex items-center space-x-2 font-bold text-[#D4AF37] group-hover:translate-x-2 transition-transform">
                <span>Enter Academy</span>
                <ArrowRight className="w-5 h-5" />
              </span>
            </div>
            <UserIcon className="absolute -bottom-10 -right-10 w-48 h-48 text-[#D4AF37]/5 -rotate-12 group-hover:rotate-0 transition-transform" />
          </Link>

          <Link
            to="/login?role=admin"
            className="group relative bg-[#7A4900] p-12 rounded-[3.5rem] border-2 border-transparent hover:border-black transition-all overflow-hidden text-white"
          >
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white text-[#7A4900] rounded-2xl flex items-center justify-center mb-8 shadow-xl">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-4 font-serif">Admin Portal</h3>
              <p className="text-white/70 mb-8 font-medium">Administrative access for curators, question holders, and community managers.</p>
              <span className="inline-flex items-center space-x-2 font-bold text-white group-hover:translate-x-2 transition-transform">
                <span>Manage System</span>
                <ArrowRight className="w-5 h-5" />
              </span>
            </div>
            <Shield className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform" />
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-20 px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-[#7A4900] font-serif mb-8 max-w-3xl mx-auto">
          Ready to reach the pinnacle of your <span className="text-[#D4AF37]">potential</span>?
        </h2>
        <p className="text-xl text-[#545454] max-w-xl mx-auto mb-12 opacity-80">
          Join Numinous Learn today and transform the way you prepare for your academic future.
        </p>
        <Link
          to="/login"
          className="inline-block bg-[#D4AF37] text-white px-16 py-6 rounded-full font-bold text-2xl hover:bg-[#B8860B] shadow-2xl transition-all shadow-amber-200"
        >
          Create Free Account
        </Link>
      </section>
    </div>
  );
}

function Footer({ user }: { user: User | null }) {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        {(!user || !user.emailVerified) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <img src={LOGO_URL} alt="Numinous Learn" className="h-10 w-10 rounded-lg" referrerPolicy="no-referrer" />
                <span className="text-xl font-bold text-[#7A4900]">Numinous Learn</span>
              </div>
              <p className="text-[#545454] leading-relaxed max-w-sm">
                Empowering students to achieve excellence through structured practice and real-time evaluation. Join thousands of students on their journey to success.
              </p>
              <div className="flex items-center space-x-4 mt-6">
                <a 
                  href="https://www.youtube.com/@NuminousLearn" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  <Youtube className="w-5 h-5" />
                </a>
                <a 
                  href="https://www.facebook.com/share/18hQRvHAc5/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#7A4900] mb-6">Quick Links</h3>
              <ul className="space-y-4">
                <li><Link to="/practice" className="hover:text-[#D4AF37] transition-all">Practice Modules</Link></li>
                <li><Link to="/leaderboard" className="hover:text-[#D4AF37] transition-all">Leaderboard</Link></li>
                <li><Link to="/events" className="hover:text-[#D4AF37] transition-all">Upcoming Events</Link></li>
                <li><Link to="/feedback" className="hover:text-[#D4AF37] transition-all">Submit Feedback</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#7A4900] mb-6">Support</h3>
              <ul className="space-y-4">
                <li><Link to="/feedback" className="hover:text-[#D4AF37] transition-all">Report an Issue</Link></li>
                <li><Link to="/feedback" className="hover:text-[#D4AF37] transition-all">Suggestions</Link></li>
                <li className="text-sm text-gray-400">© {new Date().getFullYear()} Numinous Learn. All rights reserved.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
