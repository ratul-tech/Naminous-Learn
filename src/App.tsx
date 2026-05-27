import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer, collection, getCountFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';
import { LogIn, LogOut, LayoutDashboard, User as UserIcon, BookOpen, Trophy, Calendar, Settings, Menu, X, MessageSquare, Shield, Facebook, Youtube, TrendingUp, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
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

    const isStudent = profile?.role === 'student';
    const isNotVerified = isStudent && !user.emailVerified;

    if (isNotVerified) {
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

  const isPlainAdminDashboard = profile?.role === 'admin' && location.pathname === '/admin' && localStorage.getItem('admin_preview_mode') !== 'true';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex flex-col transition-colors duration-500">
      {!isPlainAdminDashboard && (
        <Navbar user={user} profile={profile} onLogout={onLogout} />
      )}
      
      <main className="container mx-auto px-4 flex-grow py-4">
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

  // Sync high-contrast theme preference
  useEffect(() => {
    const activePref = profile?.themePreference || (localStorage.getItem('theme_high_contrast') === 'true' ? 'high-contrast' : 'normal');
    const isHighContrast = activePref === 'high-contrast';
    document.documentElement.classList.toggle('high-contrast', isHighContrast);
    localStorage.setItem('theme_high_contrast', isHighContrast ? 'true' : 'false');
  }, [profile?.themePreference]);

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
      if (firebaseUser) {
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
          if (firebaseUser.email === 'shahriarislam275@gmail.com') {
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

  const getNavLinks = () => {
    if (!user) {
      return [
        { name: 'Home', path: '/', icon: LayoutDashboard },
        { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      ];
    }
    
    if (profile?.role === 'admin') {
      const isPreviewMode = localStorage.getItem('admin_preview_mode') === 'true';
      if (isPreviewMode) {
        return [
          { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Exams', path: '/events', icon: Calendar },
          { name: 'Topic', path: '/practice', icon: BookOpen },
          { name: 'Library', path: '/resources', icon: FileText },
          { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
          { name: 'Feedback', path: '/feedback', icon: MessageSquare },
        ];
      }
      return [
        { name: 'Admin Control', path: '/admin', icon: Shield },
        { name: 'Question Bank', path: '/questions', icon: BookOpen },
        { name: 'My Profile', path: '/profile', icon: UserIcon },
      ];
    }
    
    return [
      { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Exams', path: '/events', icon: Calendar },
      { name: 'Topic', path: '/practice', icon: BookOpen },
      { name: 'Library', path: '/resources', icon: FileText },
      { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { name: 'Feedback', path: '/feedback', icon: MessageSquare },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-[#0f172a]/90 backdrop-blur-xl sticky top-0 z-50 border-b border-indigo-500/10 shadow-2xl transition-all duration-300">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center h-16 md:h-20">
          
          {/* Brand & Left Section */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
            {showNavBack && (
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 sm:p-2 hover:bg-white/5 rounded-xl transition-all text-[#D4AF37] flex items-center space-x-1 font-bold group"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline text-[9px] uppercase tracking-wider font-extrabold">Back</span>
              </button>
            )}
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
              <img src={LOGO_URL} alt="Numinous Learn" className="h-8 w-8 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl shadow-xl object-cover border border-indigo-500/20" referrerPolicy="no-referrer" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-lg font-black text-white tracking-tight truncate max-w-[120px] sm:max-w-none font-sans">
                  Numinous Learn
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] hidden sm:block">
                  Academic Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Tablets & Computers Adaptive Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2 px-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  title={link.name}
                  className={`px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs lg:text-[13px] font-bold transition-all duration-200 flex items-center space-x-1.5 border group ${
                    isActive
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 shadow-md shadow-amber-500/5'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <link.icon className="w-4 h-4 text-inherit transition-transform group-hover:scale-110" />
                  <span className="hidden lg:inline">{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Action / Profile Section */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Authenticated User state badge */}
            {user && (
              <div className="flex items-center space-x-2 md:space-x-3.5 bg-slate-900/60 pl-2 lg:pl-3 pr-2 py-1 lg:py-1.5 rounded-xl md:rounded-2xl border border-slate-800/80">
                <Link to="/profile" className="flex items-center space-x-2 lg:space-x-2.5 group">
                  <div className="relative">
                    <img 
                      src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`} 
                      alt="Profile" 
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ring-2 ring-indigo-500/10 group-hover:scale-105 transition-transform object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full border border-slate-900 ${profile?.role === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-[10px] md:text-xs font-extrabold text-slate-200 group-hover:text-white transition-colors truncate max-w-[60px] md:max-w-[100px]">
                      {profile?.displayName?.split(' ')[0] || 'User'}
                    </span>
                    <span className="text-[8px] md:text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider">
                      {profile?.role === 'admin' ? 'Curator' : 'Scholar'}
                    </span>
                  </div>
                </Link>
                
                <div className="hidden md:block w-px h-6 bg-slate-800" />
                
                <button
                  onClick={onLogout}
                  className="hidden md:flex p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Desktop Auth login buttons when not authenticated */}
            {!user && (
              <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
                <Link
                  to="/login"
                  className="px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-[13px] font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent"
                >
                  Login
                </Link>
                <Link
                  to="/login?role=student"
                  className="px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-[13px] font-extrabold bg-[#D4AF37] hover:bg-[#ffdf64] hover:shadow-amber-500/25 text-slate-950 rounded-xl transition-all shadow-md shadow-amber-500/10"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Button / Responsive indicator */}
            <button 
              onClick={() => setIsOpen(true)} 
              className="p-2 sm:p-2.5 rounded-xl text-[#D4AF37] bg-slate-900/40 border border-slate-800 hover:bg-white/5 hover:border-indigo-500/20 lg:hidden transition-all flex items-center space-x-1 sm:space-x-1.5 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              <span className="font-extrabold text-[10px] sm:text-xs uppercase tracking-wider hidden sm:inline text-slate-300">Space Menu</span>
            </button>
            
          </div>
        </div>
      </div>

      {/* Responsive Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-[#0f172a] z-[110] shadow-2xl flex flex-col border-l border-indigo-500/10"
            >
              <div className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-950/20">
                <div className="flex items-center space-x-3">
                  <img src={LOGO_URL} alt="Logo" className="h-8 w-8 rounded-xl border border-indigo-500/20 object-cover" referrerPolicy="no-referrer" />
                  <span className="font-black text-sm uppercase tracking-widest text-[#D4AF37]">Academic Deck</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-2">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="block mb-6 group">
                      <div className="p-4 bg-slate-900 rounded-2xl flex items-center space-x-3.5 border border-slate-800 hover:border-[#D4AF37]/35 shadow-inner transition-all">
                        <img 
                          src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`} 
                          alt="Profile" 
                          className="h-11 w-11 rounded-xl border border-slate-700 object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="overflow-hidden">
                          <p className="font-bold text-white text-sm truncate group-hover:text-[#D4AF37] transition-colors">{profile?.displayName || 'Numinous Scholar'}</p>
                          <p className="text-[10px] text-slate-500 truncate lowercase">{profile?.email}</p>
                        </div>
                      </div>
                    </Link>
                    
                    {navLinks.map((link) => {
                      const isActive = location.pathname === link.path;
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                            isActive 
                              ? 'bg-[#D4AF37] text-slate-950 shadow-lg shadow-amber-500/25' 
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <link.icon className="w-4.5 h-4.5" />
                          <span>{link.name}</span>
                        </Link>
                      );
                    })}

                    {profile?.role === 'admin' && (
                      <div className="pt-4 mt-4 border-t border-slate-800/80">
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                            location.pathname === '/admin' 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                              : 'text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10'
                          }`}
                        >
                          <Shield className="w-4.5 h-4.5" />
                          <span>Team Admin Console</span>
                        </Link>
                      </div>
                    )}

                    <div className="pt-6 mt-6 border-t border-slate-800 space-y-1.5">
                      <button 
                        onClick={() => {
                          onLogout();
                          setIsOpen(false);
                          navigate('/login');
                        }} 
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-black text-rose-400 hover:bg-[#f43f5e]/10 transition-all text-sm text-left"
                      >
                        <LogOut className="w-4.5 h-4.5" />
                        <span>Sign Out Portal</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 pt-4">
                    <p className="text-xs font-semibold text-slate-500 text-center mb-6 leading-relaxed">Access full mock exams, analytics dashboards, and track scores on Numinous Learn.</p>
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center bg-[#D4AF37] text-slate-950 py-3.5 rounded-xl font-bold shadow-lg hover:bg-[#ffdf64] transition-all text-sm"
                    >
                      Login / Register Account
                    </Link>
                    <Link
                      to="/login?role=admin"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center bg-slate-900 text-slate-300 py-3 rounded-xl font-semibold shadow-md hover:bg-slate-850 hover:text-white transition-all text-xs border border-slate-800"
                    >
                      Team Curator Login
                    </Link>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-950/20">
                <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest font-black">
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
  const [stats, setStats] = useState({ studentsCount: 15, questionsCount: 45, eventsCount: 3 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Subscribe to real-time cached stats
    const unsub = onSnapshot(doc(db, 'global_stats', 'counters'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setStats({
          studentsCount: data.studentsCount ?? 15,
          questionsCount: data.questionsCount ?? 45,
          eventsCount: data.eventsCount ?? 3
        });
      }
      setLoading(false);
    }, (error) => {
      console.warn("Could not load global_stats:", error);
      setLoading(false);
    });

    // 2. If a user is signed in, sync precise values from actual collections
    const syncRealCounts = async () => {
      if (auth.currentUser) {
        try {
          const [studentsSnap, questionsSnap, eventsSnap] = await Promise.all([
            getCountFromServer(collection(db, 'students')),
            getCountFromServer(collection(db, 'questions')),
            getCountFromServer(collection(db, 'events'))
          ]);

          const liveStudents = studentsSnap.data().count;
          const liveQuestions = questionsSnap.data().count;
          const liveEvents = eventsSnap.data().count;

          const updated = {
            studentsCount: liveStudents > 0 ? liveStudents : 15,
            questionsCount: liveQuestions > 0 ? liveQuestions : 45,
            eventsCount: liveEvents > 0 ? liveEvents : 3
          };

          setStats(updated);

          // Update cache doc for non-logged-in visitors (allowed as write: if isSignedIn())
          await setDoc(doc(db, 'global_stats', 'counters'), updated, { merge: true });
        } catch (e) {
          console.warn("Offline or insufficient database scan permission:", e);
        }
      }
    };

    syncRealCounts();

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
        <motion.div 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          id="landing-stats"
          className="bg-gradient-to-b from-[#0f172a]/95 to-[#050811]/98 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-800/80 grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-500"
        >
          {/* Subtle gold-glowing atmospheric overlay */}
          <div className="absolute -inset-2 bg-gradient-to-tr from-[#D4AF37] to-indigo-500 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none -z-10 blur-2xl" />

          {/* Students Count Card */}
          <div className="text-center flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl hover:bg-white/[0.02] transition-colors duration-300">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 flex items-center justify-center mb-2.5 shadow-md shadow-[#D4AF37]/5 transition-transform duration-300 group-hover:scale-105">
              <UserIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-inherit" />
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-none mb-1">
              {loading ? (
                <span className="inline-block animate-pulse text-slate-750">...</span>
              ) : (
                formatNumber(stats.studentsCount)
              )}
            </h3>
            <p className="text-[9px] md:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Students</p>
          </div>

          {/* Questions Count Card */}
          <div className="text-center flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl hover:bg-white/[0.02] transition-colors duration-300 border-x border-slate-805/80">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-2.5 shadow-md shadow-indigo-500/5 transition-transform duration-300 group-hover:scale-105">
              <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-inherit" />
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-none mb-1">
              {loading ? (
                <span className="inline-block animate-pulse text-slate-750">...</span>
              ) : (
                formatNumber(stats.questionsCount)
              )}
            </h3>
            <p className="text-[9px] md:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Questions</p>
          </div>

          {/* Events Count Card */}
          <div className="text-center flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl hover:bg-white/[0.02] transition-colors duration-300">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-2.5 shadow-md shadow-emerald-500/5 transition-transform duration-300 group-hover:scale-105">
              <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-inherit" />
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-none mb-1">
              {loading ? (
                <span className="inline-block animate-pulse text-slate-750">...</span>
              ) : (
                formatNumber(stats.eventsCount)
              )}
            </h3>
            <p className="text-[9px] md:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Events</p>
          </div>
        </motion.div>
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
        {!user && (
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
