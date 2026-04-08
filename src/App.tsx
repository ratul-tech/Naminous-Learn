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

const LOGO_URL = "https://i.postimg.cc/0241N65R/received-982626700958526.jpg";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
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
            <Route path="/dashboard" element={user ? <Dashboard profile={profile} /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile profile={profile} setProfile={setProfile} /> : <Navigate to="/login" />} />
            <Route path="/practice" element={user ? <Practice profile={profile} /> : <Navigate to="/login" />} />
            <Route path="/exam" element={user ? <Exam profile={profile} /> : <Navigate to="/login" />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/events" element={user ? <Events profile={profile} /> : <Navigate to="/login" />} />
            <Route path="/feedback" element={user ? <FeedbackForm profile={profile} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/dashboard" />} />
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
          <Link to="/" className="flex items-center space-x-3">
            <img src={LOGO_URL} alt="Naminous Learn" className="h-12 w-12 rounded-xl shadow-md object-cover" referrerPolicy="no-referrer" />
            <span className="text-2xl font-bold text-[#7A4900] hidden sm:block">Naminous Learn</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2">
            {user && navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
                  location.pathname === link.path 
                    ? 'bg-[#D4AF37] text-white shadow-md' 
                    : 'text-[#545454] hover:bg-gray-100'
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            ))}
            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
                  location.pathname === '/admin' 
                    ? 'bg-[#7A4900] text-white shadow-md' 
                    : 'text-[#7A4900] hover:bg-[#7A4900]/10'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
            {user ? (
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-100">
                <Link to="/profile" className="flex items-center space-x-2">
                  <img src={profile?.photoURL || undefined} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#D4AF37]" referrerPolicy="no-referrer" />
                </Link>
                <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-all">
                  <LogOut className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#B8860B] shadow-lg transition-all">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center space-x-4 p-4 mb-4 bg-gray-50 rounded-2xl">
                    <img src={profile?.photoURL || undefined} alt="Profile" className="h-12 w-12 rounded-full border-2 border-[#D4AF37]" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold text-[#7A4900]">{profile?.displayName}</p>
                      <p className="text-xs text-gray-400">{profile?.email}</p>
                    </div>
                  </div>
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold ${
                        location.pathname === link.path 
                          ? 'bg-[#D4AF37] text-white' 
                          : 'text-[#545454] hover:bg-gray-100'
                      }`}
                    >
                      <link.icon className="w-5 h-5" />
                      <span>{link.name}</span>
                    </Link>
                  ))}
                  {profile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-[#7A4900] hover:bg-[#7A4900]/10"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-[#545454] hover:bg-gray-100"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span>My Profile</span>
                  </Link>
                  <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50">
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center bg-[#D4AF37] text-white py-4 rounded-xl font-bold"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
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
        alt="Naminous Learn"
        className="w-48 h-48 rounded-3xl shadow-2xl mb-8 border-4 border-[#D4AF37] object-cover"
        referrerPolicy="no-referrer"
      />
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl md:text-7xl font-bold text-[#7A4900] mb-8 leading-tight"
      >
        Master Your Exams with <span className="text-[#D4AF37]">Naminous Learn</span>
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-[#545454] max-w-2xl mb-12 leading-relaxed"
      >
        The ultimate practice platform for Board Exams and College Admissions. 
        Join thousands of students and track your progress in real-time.
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
          to="/leaderboard"
          className="w-full sm:w-auto bg-white text-[#7A4900] border-2 border-[#7A4900] px-12 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all"
        >
          View Leaderboard
        </Link>
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
              <img src={LOGO_URL} alt="Naminous Learn" className="h-10 w-10 rounded-lg" referrerPolicy="no-referrer" />
              <span className="text-xl font-bold text-[#7A4900]">Naminous Learn</span>
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
              <li className="text-sm text-gray-400">© {new Date().getFullYear()} Naminous Learn. All rights reserved.</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
