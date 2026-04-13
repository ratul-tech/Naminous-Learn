import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';
import { LogIn, LogOut, LayoutDashboard, User as UserIcon, BookOpen, Trophy, Calendar, Settings, Menu, X, MessageSquare, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Practice from './pages/Practice';
import Exam from './pages/Exam';
import Leaderboard from './pages/Leaderboard';
import Events from './pages/Events';
import Admin from './pages/Admin';
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
        // Try students collection first
        let userDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
        
        // If not in students, try admins
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
        }

        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
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
            <Route path="/exam" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <Exam profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/events" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <Events profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/feedback" element={user ? ((user.emailVerified || profile?.role === 'admin') ? <FeedbackForm profile={profile} /> : <Navigate to="/verify-email" />) : <Navigate to="/login" />} />
            <Route path="/admin" element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
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
              <img src={LOGO_URL} alt="Naminous" className="h-12 w-12 rounded-xl shadow-md object-cover" referrerPolicy="no-referrer" />
              <span className="text-2xl font-bold text-[#7A4900]">Naminous</span>
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

                    {user.emailVerified && profile?.role === 'admin' && (
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
                    <p className="text-sm text-gray-400 text-center mb-6">Join Naminous to start your journey.</p>
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
                  © {new Date().getFullYear()} Naminous
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
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.img
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={LOGO_URL}
        alt="Naminous"
        className="w-48 h-48 rounded-3xl shadow-2xl mb-8 border-4 border-[#D4AF37] object-cover"
        referrerPolicy="no-referrer"
      />
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl md:text-7xl font-bold text-[#7A4900] mb-8 leading-tight"
      >
        Achieve Academic Excellence with <span className="text-[#D4AF37]">Naminous</span>
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-[#545454] max-w-2xl mb-12 leading-relaxed"
      >
        A dedicated space for students to prepare for their future through structured learning, 
        comprehensive practice, and real-time evaluation.
      </motion.p>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
      >
        <Link
          to="/login"
          className="w-full sm:w-auto bg-[#D4AF37] text-white px-12 py-4 rounded-2xl font-bold text-lg hover:bg-[#B8860B] shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-2"
        >
          <LogIn className="w-6 h-6" />
          <span>Get Started Now</span>
        </Link>
        <Link
          to="/login?role=admin"
          className="w-full sm:w-auto bg-[#7A4900] text-white px-12 py-4 rounded-2xl font-bold text-lg hover:bg-black shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-2"
        >
          <Shield className="w-6 h-6" />
          <span>Admin Login</span>
        </Link>
        <Link
          to="/leaderboard"
          className="w-full sm:w-auto bg-white text-[#7A4900] border-2 border-[#7A4900] px-12 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all"
        >
          View Leaderboard
        </Link>
      </motion.div>

      {/* Quick Actions for Logged Out Users */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        className="mt-24 w-full max-w-4xl"
      >
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            to="/login?role=student"
            className="group bg-white p-8 rounded-3xl border-2 border-transparent hover:border-[#D4AF37] shadow-sm hover:shadow-xl transition-all text-left"
          >
            <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] mb-6 group-hover:scale-110 transition-transform">
              <UserIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#7A4900] mb-2">Student Portal</h3>
            <p className="text-sm text-[#545454]">Access your practice modules, exam history, and personalized dashboard.</p>
          </Link>

          <Link
            to="/login?role=admin"
            className="group bg-white p-8 rounded-3xl border-2 border-transparent hover:border-[#7A4900] shadow-sm hover:shadow-xl transition-all text-left"
          >
            <div className="w-12 h-12 bg-[#7A4900]/10 rounded-2xl flex items-center justify-center text-[#7A4900] mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#7A4900] mb-2">Admin Portal</h3>
            <p className="text-sm text-[#545454]">Secure administrative access for managing questions, events, and users.</p>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <img src={LOGO_URL} alt="Naminous" className="h-10 w-10 rounded-lg" referrerPolicy="no-referrer" />
              <span className="text-xl font-bold text-[#7A4900]">Naminous</span>
            </div>
            <p className="text-[#545454] leading-relaxed max-w-sm">
              Empowering students to achieve excellence through structured practice and real-time evaluation. Join thousands of students on their journey to success.
            </p>
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
              <li className="text-sm text-gray-400">© {new Date().getFullYear()} Naminous. All rights reserved.</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
