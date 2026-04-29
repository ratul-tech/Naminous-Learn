import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, User as UserIcon, MessageSquare, FileText, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { motion } from 'motion/react';

interface StudentShellProps {
  children: React.ReactNode;
  profile: UserProfile | null;
}

export default function StudentShell({ children, profile }: StudentShellProps) {
  const location = useLocation();

  if (!profile) return <>{children}</>;

  const menuItems = [
    { icon: Calendar, path: '/events', label: 'Live Exam' },
    { icon: BookOpen, path: '/practice', label: 'Practice Exam' },
    { icon: FileText, path: '/resources', label: 'PDF' },
  ];

  // Add Admin Dashboard if user is admin
  if (profile.role === 'admin') {
    menuItems.push({ icon: Shield, path: '/admin', label: 'Admin' });
  }

  // Always keep Profile at the end (far right)
  menuItems.push({ icon: UserIcon, path: '/profile', label: 'Profile' });

  return (
    <div className="max-w-2xl mx-auto pb-32 lg:pb-12 pt-4">
      {/* Integrated App Header */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center space-x-2">
          <Link to="/feedback" className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-[#7A4900] hover:bg-gray-50 transition-all relative">
            <MessageSquare className="w-5 h-5" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </Link>
        </div>
        <div className="flex items-center space-x-4 text-right">
          <div>
            <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">{profile.role === 'admin' ? 'Curator' : 'Scholar'}</p>
            <h2 className="text-xl font-bold text-[#7A4900] truncate max-w-[200px]">{profile.displayName.split(' ')[0]}</h2>
          </div>
          <Link to="/dashboard" className="relative group">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
              alt="" 
              className="w-12 h-12 rounded-2xl border-2 border-white shadow-md object-cover transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            {profile.role === 'admin' ? (
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-purple-600 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                <Shield className="w-2.5 h-2.5 text-white" />
              </div>
            ) : (
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
            )}
          </Link>
        </div>
      </div>

      {/* Main Screen Content */}
      <main className="min-h-[75vh] px-4">
        {children}
      </main>

      {/* Bottom Floating Navigation (Premium Mobile App Style) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none z-50">
        <nav className="max-w-md mx-auto bg-[#7A4900]/95 backdrop-blur-xl rounded-[2.5rem] p-1.5 flex items-center justify-around shadow-[0_20px_50px_rgba(122,73,0,0.3)] border border-white/20 pointer-events-auto">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label}
                to={item.path}
                className={`p-3 sm:p-4 rounded-[2rem] transition-all flex flex-col items-center flex-1 relative group ${
                  isActive ? 'bg-white text-[#7A4900] shadow-xl translate-y-[-4px]' : 'text-white/60 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isActive ? 'scale-110 mb-0.5' : 'scale-100'}`} />
                <span className={`text-[8px] font-black uppercase tracking-tighter sm:tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 h-0 scale-0'}`}>
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute -bottom-1 w-6 h-1 bg-[#D4AF37] rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
