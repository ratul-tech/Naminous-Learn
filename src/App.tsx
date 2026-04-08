import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile, UserRole } from './types';
import { LogIn, LogOut, LayoutDashboard, User as UserIcon, BookOpen, Trophy, Calendar, Settings, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pages (will implement these next)
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Practice from './pages/Practice';
import Exam from './pages/Exam';
import Leaderboard from './pages/Leaderboard';
import Events from './pages/Events';
import Admin from './pages/Admin';

const LOGO_URL = "https://i.postimg.cc/0241N65R/received-982626700958526.jpg";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // New user, will redirect to profile onboarding
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: 'student',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setProfile(newProfile);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

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
      <div className="min-h-screen bg-[#f5f5f0] text-[#545454] font-sans">
        <Navbar user={user} profile={profile} onLogin={handleLogin} onLogout={handleLogout} />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing onLogin={handleLogin} />} />
            <Route path="/dashboard" element={user ? <Dashboard profile={profile} /> : <Navigate to="/" />} />
            <Route path="/profile" element={user ? <Profile profile={profile} setProfile={setProfile} /> : <Navigate to="/" />} />
            <Route path="/practice" element={user ? <Practice /> : <Navigate to="/" />} />
            <Route path="/exam" element={user ? <Exam profile={profile} /> : <Navigate to="/" />} />
            <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/" />} />
            <Route path="/events" element={user ? <Events profile={profile} /> : <Navigate to="/" />} />
            <Route path="/admin" element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

function Navbar({ user, profile, onLogin, onLogout }: { user: User | null, profile: UserProfile | null, onLogin: () => void, onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Practice', path: '/practice', icon: BookOpen },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Events', path: '/events', icon: Calendar },
  ];

  if (profile?.role === 'admin') {
    navLinks.push({ name: 'Admin', path: '/admin', icon: Settings });
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img src={LOGO_URL} alt="Naminous Learn" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
            <span className="text-xl font-bold text-[#7A4900]">Naminous Learn</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {user && navLinks.map((link) => (
              <Link key={link.path} to={link.path} className="flex items-center space-x-1 hover:text-[#7A4900] transition-colors">
                <link.icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            ))}
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center space-x-2">
                  <img src={profile?.photoURL || user.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full border border-[#D4AF37]" referrerPolicy="no-referrer" />
                </Link>
                <button onClick={onLogout} className="text-sm font-medium text-red-600 hover:text-red-700">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={onLogin} className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-medium hover:bg-[#B8860B] transition-colors flex items-center space-x-2">
                <LogIn className="w-4 h-4" />
                <span>Login with Google</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-[#545454]">
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
            className="md:hidden bg-white border-t"
          >
            <div className="px-4 py-4 space-y-4">
              {user && navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 py-2 hover:text-[#7A4900]"
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-2 py-2 hover:text-[#7A4900]"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <button onClick={onLogout} className="flex items-center space-x-2 py-2 text-red-600 w-full text-left">
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button onClick={onLogin} className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-medium w-full flex items-center justify-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Login with Google</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.img
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={LOGO_URL}
        alt="Naminous Learn"
        className="w-48 h-48 rounded-full shadow-2xl mb-8 border-4 border-[#D4AF37]"
        referrerPolicy="no-referrer"
      />
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-[#7A4900] mb-4"
      >
        Master Your Exams with Naminous Learn
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-[#545454] max-w-2xl mb-12"
      >
        The ultimate practice platform for Board Exams and College Admissions. 
        Join thousands of students and track your progress in real-time.
      </motion.p>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onLogin}
        className="bg-[#D4AF37] text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-[#B8860B] shadow-lg hover:shadow-xl transition-all flex items-center space-x-3"
      >
        <LogIn className="w-6 h-6" />
        <span>Get Started Now</span>
      </motion.button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t mt-auto py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="text-[#545454]">&copy; {new Date().getFullYear()} Naminous Learn. All rights reserved.</p>
        <div className="mt-4 flex justify-center space-x-6">
          <a href="#" className="text-sm hover:text-[#7A4900]">Privacy Policy</a>
          <a href="#" className="text-sm hover:text-[#7A4900]">Terms of Service</a>
          <a href="#" className="text-sm hover:text-[#7A4900]">Contact Us</a>
        </div>
      </div>
    </footer>
  );
}
