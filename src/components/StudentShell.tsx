import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, User as UserIcon, MessageSquare, FileText, Shield, LogOut, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../types';
import { motion } from 'motion/react';

interface StudentShellProps {
  children: React.ReactNode;
  profile: UserProfile | null;
}

export default function StudentShell({ children, profile }: StudentShellProps) {
  const location = useLocation();

  if (!profile) return <>{children}</>;

  const isPreviewMode = localStorage.getItem('admin_preview_mode') === 'true';

  const exitPreview = () => {
    localStorage.removeItem('admin_preview_mode');
    window.location.href = '/admin';
  };

  const menuItems = [
    { icon: LayoutDashboard, path: '/dashboard', label: 'Home' },
    { icon: Calendar, path: '/events', label: 'Exam' },
    { icon: BookOpen, path: '/practice', label: 'Topic' },
    { icon: FileText, path: '/resources', label: 'PDF' },
  ];

  // Profile always visible
  menuItems.push({ icon: UserIcon, path: '/profile', label: 'Profile' });

  return (
    <div className="max-w-5xl mx-auto pb-32 md:pb-12 pt-4 relative w-full px-4 sm:px-6">
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-2xl border-b border-slate-800 backdrop-blur-md bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500 p-1.5 rounded-lg text-slate-950">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Admin Preview Mode</span>
              <span className="text-[8px] font-medium text-slate-400 uppercase tracking-[0.2em]">Viewing student dashboard simulation</span>
            </div>
          </div>
          <button 
            onClick={exitPreview}
            className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/10 active:scale-95"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Return to Admin Panel</span>
          </button>
        </div>
      )}

      {/* Integrated App Header (Only visible on mobile as desktop has top navbar) */}
      <div className="md:hidden flex items-center justify-between mb-8 px-4">
        <div className="flex items-center space-x-2">
          <Link to="/feedback" className="p-3 bg-slate-900 rounded-2xl shadow-lg border border-slate-800 text-[#D4AF37] hover:bg-slate-800 transition-all relative">
            <MessageSquare className="w-5 h-5" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-slate-900 shadow-sm" />
          </Link>
        </div>
        <div className="flex items-center space-x-4 text-right">
          <div>
            <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">{profile.role === 'admin' ? 'Curator' : 'Scholar'}</p>
            <h2 className="text-xl font-bold text-white truncate max-w-[200px]">{profile.displayName.split(' ')[0]}</h2>
          </div>
          <Link to="/dashboard" className="relative group">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
              alt="" 
              className="w-12 h-12 rounded-2xl border-2 border-slate-800 shadow-xl object-cover transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            {profile.role === 'admin' ? (
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-indigo-600 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-lg">
                < Shield className="w-2.5 h-2.5 text-white" />
              </div>
            ) : (
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-lg" />
            )}
          </Link>
        </div>
      </div>

      {/* Main Screen Content */}
      <main className="min-h-[75vh] px-4">
        {children}
      </main>

      {/* Bottom Floating Navigation (Premium Mobile App Style - hidden on desktop/computers) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none z-50">
        <nav className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-1.5 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800 pointer-events-auto">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label}
                to={item.path}
                className={`p-3 sm:p-4 rounded-[2rem] transition-all flex flex-col items-center flex-1 relative group ${
                  isActive ? 'bg-[#D4AF37] text-slate-900 shadow-2xl translate-y-[-4px]' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isActive ? 'scale-110 mb-0.5' : 'scale-100'}`} />
                <span className={`text-[8px] font-black uppercase tracking-tighter sm:tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 h-0 scale-0'}`}>
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute -bottom-1 w-6 h-1 bg-slate-900/30 rounded-full"
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
