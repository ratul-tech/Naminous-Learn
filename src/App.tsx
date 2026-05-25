import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';
import { LogIn, LogOut, LayoutDashboard, User as UserIcon, BookOpen, Trophy, Calendar, Settings, Menu, X, MessageSquare, Shield, Facebook, Youtube, TrendingUp, ArrowRight, ArrowLeft } from 'lucide-react';
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
import Resources from './pages/Resources';

// Shells
import StudentShell from './components/StudentShell';

const LOGO_URL = "https://i.postimg.cc/0241N65R/received-982626700958526.jpg";

function Layout({ user, profile, setProfile, onLogout, refreshUser }: { user: User | null, profile: UserProfile | null, setProfile: (p: UserProfile | null) => void, onLogout: () => void, refreshUser: () => Promise<void> }) {
  const location = useLocation();

  const renderContent = () => {
    if (!user) {
      return (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Navigate to="/login?role=admin" replace />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      );
    }

    if (!user.emailVerified && profile?.role !== 'admin') {
      return (
        <Routes>
          <Route path="/verify-email" element={<VerifyEmail onVerified={refreshUser} />} />
          <Route path="*" element={<Navigate to="/verify-email" />} />
        </Routes>
      );
    }

    const isPreviewMode = localStorage.getItem('admin_preview_mode') === 'true';

    if (profile?.role === 'admin' && !isPreviewMode) {
      return (
        <Routes>
          <Route path="/admin" element={<Admin profile={profile} />} />
          <Route path="/profile" element={<Profile profile={profile} setProfile={setProfile} />} />
          <Route path="/questions" element={<Questions profile={profile} />} />
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      );
    }

    const Shell = StudentShell;

    return (
      <Shell profile={profile}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard profile={profile} />} />
          <Route path="/profile" element={<Profile profile={profile} setProfile={setProfile} />} />
          <Route path="/practice" element={<Practice profile={profile} />} />
          <Route path="/exam/:id" element={<Exam profile={profile} />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/events" element={<Events profile={profile} />} />
          <Route path="/resources" element={<Resources profile={profile} />} />
          <Route path="/feedback" element={<FeedbackForm profile={profile} />} />
          <Route path="/questions" element={profile?.role === 'admin' ? <Questions profile={profile} /> : <Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Shell>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex flex-col transition-colors duration-500">
      {(!user || location.pathname === '/') && (
        <Navbar user={user} profile={profile} onLogout={onLogout} />
      )}
      
      <main className={`container mx-auto px-4 flex-grow ${user ? 'py-4' : 'py-8'}`}>
        {renderContent()}
      </main>

      {!user && <Footer user={user} />}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'global_stats', 'counters'));
      } catch (error: any) {
        if (error?.message?.includes('the client is offline')) {
          console.error("Firestore is offline. Check your configuration.");
        }
      }
    }
    testConnection();
  }, []);

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
        let userDoc;
        
        userDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
        }

        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setProfile(data);
        } else {
          // Special case for bootstrap admin
          if (firebaseUser.email === 'shahriarislam275@gmail.com' && firebaseUser.emailVerified) {
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'Initial Admin',
              role: 'admin',
              status: 'active',
              createdAt: new Date().toISOString(),
            } as UserProfile);
          } else {
            setProfile(null);
          }
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
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} profile={profile} setProfile={setProfile} onLogout={handleLogout} refreshUser={refreshUser} />
    </Router>
  );
}

function Navbar({ user, profile, onLogout }: { user: User | null, profile: UserProfile | null, onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const showNavBack = location.pathname !== '/';

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Practice', path: '/practice', icon: BookOpen },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Events', path: '/events', icon: Calendar },
    { name: 'Feedback', path: '/feedback', icon: MessageSquare },
  ];

  return (
    <nav className="bg-[#0f172a]/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-indigo-500/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-4">
            {showNavBack && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 mr-2 hover:bg-white/5 rounded-xl transition-all text-[#D4AF37] flex items-center space-x-1 font-bold group"
                aria-label="Go back"
              >
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Back</span>
              </button>
            )}
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
              <img src={LOGO_URL} alt="Numinous Learn" className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl shadow-md object-cover border border-indigo-500/20" referrerPolicy="no-referrer" />
              <span className="text-lg sm:text-2xl font-bold text-white truncate">Numinous Learn</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user && user.emailVerified && (
              <div className="hidden sm:flex items-center space-x-4 mr-4 pr-4 border-r border-slate-800">
                <Link to="/profile" className="flex items-center space-x-2 group">
                  <img src={profile?.photoURL || undefined} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#D4AF37] group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  <span className="text-sm font-bold text-slate-300 group-hover:text-white">{profile?.displayName}</span>
                </Link>
              </div>
            )}
            
            <button 
              onClick={() => setIsOpen(true)} 
              className="p-3 rounded-xl text-[#D4AF37] hover:bg-white/5 transition-all flex items-center space-x-2 border border-transparent hover:border-indigo-500/20"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-[#0f172a] z-[70] shadow-2xl flex flex-col border-l border-indigo-500/20"
            >
              <div className="p-6 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <img src={LOGO_URL} alt="Logo" className="h-8 w-8 rounded-lg" referrerPolicy="no-referrer" />
                  <span className="font-bold text-white">Navigation</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-2">
                {user ? (
                  <>
                    {user.emailVerified && (
                      <div className="mb-8 p-4 bg-[#020617] rounded-2xl flex items-center space-x-4 border border-slate-800 shadow-inner">
                        <img src={profile?.photoURL || undefined} alt="Profile" className="h-12 w-12 rounded-full border-2 border-[#D4AF37]" referrerPolicy="no-referrer" />
                        <div className="overflow-hidden">
                          <p className="font-bold text-white truncate">{profile?.displayName}</p>
                          <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
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
                            ? 'bg-[#D4AF37] text-slate-900 shadow-lg shadow-amber-500/20' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <link.icon className="w-5 h-5" />
                        <span>{link.name}</span>
                      </Link>
                    ))}

                    {user.emailVerified && profile?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all mt-4 ${
                          location.pathname === '/admin' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                            : 'text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10'
                        }`}
                      >
                        <Shield className="w-5 h-5" />
                        <span>Admin Panel</span>
                      </Link>
                    )}

                    <div className="pt-8 mt-8 border-t border-slate-800 space-y-2">
                      <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                          location.pathname === '/profile' 
                            ? 'bg-slate-800 text-white' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-slate-500 text-center mb-6">Join Numinous Learn to start your journey.</p>
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center bg-[#D4AF37] text-slate-900 py-4 rounded-xl font-bold shadow-lg hover:bg-amber-400 transition-all"
                    >
                      Login / Register
                    </Link>
                    <Link
                      to="/admin/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all border border-slate-700"
                    >
                      Admin Portal
                    </Link>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800 bg-[#020617]/50">
                <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold">
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
    <div className="flex flex-col space-y-12 py-4 max-w-lg mx-auto">
      {/* App-like Welcome Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-6"
        >
          <img
            src={LOGO_URL}
            alt="Numinous Learn"
            className="w-32 h-32 rounded-3xl shadow-2xl relative border-4 border-[#0f172a] object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -inset-1 bg-gradient-to-tr from-[#D4AF37] to-amber-200 rounded-3xl -z-10 blur-md opacity-20" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight font-serif">
            Numinous Learn
          </h1>
          <p className="text-base text-slate-400 max-w-sm mb-8 font-medium leading-relaxed">
            Your premium sanctuary for academic excellence and high-stakes evaluation.
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-[280px] mx-auto">
            <Link
              to="/login?role=student"
              className="w-full bg-[#D4AF37] text-slate-900 py-4 rounded-2xl font-bold text-lg hover:bg-amber-400 shadow-xl shadow-amber-500/10 transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>Get Started</span>
            </Link>
            <Link
              to="/admin/login"
              className="w-full bg-slate-800 text-white border border-slate-700 py-4 rounded-2xl font-bold text-lg hover:bg-slate-700 transition-all flex items-center justify-center space-x-2"
            >
              <Shield className="w-5 h-5" />
              <span>Admin Login</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* App Stats List */}
      <section className="px-4">
        <div className="bg-[#0f172a] rounded-3xl p-6 shadow-xl border border-slate-800 grid grid-cols-3 gap-2">
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#D4AF37]">{loading ? '...' : formatNumber(stats.studentsCount)}</h3>
            <p className="text-[9px] font-black uppercase text-slate-500">Users</p>
          </div>
          <div className="text-center border-x border-slate-800">
            <h3 className="text-xl font-bold text-[#D4AF37]">{loading ? '...' : formatNumber(stats.questionsCount)}</h3>
            <p className="text-[9px] font-black uppercase text-slate-500">Solved</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#D4AF37]">{loading ? '...' : formatNumber(stats.eventsCount)}</h3>
            <p className="text-[9px] font-black uppercase text-slate-500">Events</p>
          </div>
        </div>
      </section>

      {/* Features Cards */}
      <section className="px-4 pb-12">
        <div className="space-y-4">
          {[
            { title: "Smart Practice", icon: BookOpen, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { title: "Live Competition", icon: Calendar, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { title: "Global Ranks", icon: Trophy, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" }
          ].map((item, i) => (
            <div key={i} className={`flex items-center space-x-4 bg-slate-900 p-4 rounded-2xl border ${item.color.split(' ')[2]} shadow-lg`}>
              <div className={`p-3 rounded-xl ${item.color.split(' ').slice(0, 2).join(' ')}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-200">{item.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Footer({ user }: { user: User | null }) {
  return (
    <footer className="bg-[#0f172a] border-t border-slate-800 mt-auto">
      <div className="container mx-auto px-4 py-12">
        {(!user || !user.emailVerified) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <img src={LOGO_URL} alt="Numinous Learn" className="h-10 w-10 rounded-lg border border-indigo-500/20" referrerPolicy="no-referrer" />
                <span className="text-xl font-bold text-white">Numinous Learn</span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-sm">
                Empowering students to achieve excellence through structured practice and real-time evaluation. Join thousands of students on their journey to success.
              </p>
              <div className="flex items-center space-x-4 mt-6">
                <a 
                  href="https://www.youtube.com/@NuminousLearn" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-500/20"
                >
                  <Youtube className="w-5 h-5" />
                </a>
                <a 
                  href="https://www.facebook.com/share/18hQRvHAc5/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-lg border border-blue-500/20"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-6">Quick Links</h3>
              <ul className="space-y-4">
                <li><Link to="/practice" className="text-slate-400 hover:text-[#D4AF37] transition-all flex items-center space-x-2"><ArrowRight className="w-3 h-3" /><span>Practice Modules</span></Link></li>
                <li><Link to="/leaderboard" className="text-slate-400 hover:text-[#D4AF37] transition-all flex items-center space-x-2"><ArrowRight className="w-3 h-3" /><span>Leaderboard</span></Link></li>
                <li><Link to="/events" className="text-slate-400 hover:text-[#D4AF37] transition-all flex items-center space-x-2"><ArrowRight className="w-3 h-3" /><span>Upcoming Events</span></Link></li>
                <li><Link to="/feedback" className="text-slate-400 hover:text-[#D4AF37] transition-all flex items-center space-x-2"><ArrowRight className="w-3 h-3" /><span>Submit Feedback</span></Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-6">Support</h3>
              <ul className="space-y-4">
                <li><Link to="/feedback" className="text-slate-400 hover:text-[#D4AF37] transition-all">Report an Issue</Link></li>
                <li><Link to="/feedback" className="text-slate-400 hover:text-[#D4AF37] transition-all">Suggestions</Link></li>
                <li className="text-sm text-slate-500 pt-4 border-t border-slate-800/50">© {new Date().getFullYear()} Numinous Learn. All rights reserved.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
