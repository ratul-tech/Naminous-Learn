import React from 'react';
import { motion } from 'motion/react';
import { FileText, Download, ExternalLink, Search } from 'lucide-react';
import { UserProfile } from '../types';

interface ResourcesProps {
  profile: UserProfile | null;
}

const RESOURCES = [
  { id: '1', title: 'Mathematics Grade 10 - Semester 1', category: 'Math', size: '4.2 MB', date: '2024-03-20' },
  { id: '2', title: 'English Grammar & Composition', category: 'English', size: '2.8 MB', date: '2024-03-15' },
  { id: '3', title: 'Physics Fundamentals - Part 1', category: 'Science', size: '5.1 MB', date: '2024-03-10' },
  { id: '4', title: 'General Knowledge 2024 Edition', category: 'GK', size: '1.5 MB', date: '2024-03-05' },
  { id: '5', title: 'Chemistry Lab Manual', category: 'Science', size: '3.3 MB', date: '2024-03-01' },
];

export default function Resources({ profile }: ResourcesProps) {
  return (
    <div className="space-y-8 px-2 sm:px-0">
      <header>
        <h1 className="text-3xl font-bold text-[#7A4900] font-serif mb-2">Resource Library</h1>
        <p className="text-[#545454] font-medium opacity-70">Download academic PDFs and study guides</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search for study materials..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm outline-none focus:border-[#D4AF37] transition-all"
        />
      </div>

      <div className="space-y-4">
        {RESOURCES.map((res, i) => (
          <motion.div
            key={res.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex items-center justify-between hover:shadow-md transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-50 text-[#D4AF37] rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#7A4900] truncate max-w-[200px] sm:max-w-md">{res.title}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">{res.category}</span>
                  <span className="w-1 h-1 bg-gray-200 rounded-full" />
                  <span className="text-[10px] font-black uppercase text-gray-400">{res.size}</span>
                </div>
              </div>
            </div>
            <button 
              className="p-3 bg-[#7A4900]/5 text-[#7A4900] rounded-xl hover:bg-[#7A4900] hover:text-white transition-all shadow-sm"
              onClick={() => alert('Download started for ' + res.title)}
            >
              <Download className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#7A4900] p-8 rounded-[2.5rem] text-white text-center shadow-xl shadow-amber-900/20 relative overflow-hidden group">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Request Materials?</h3>
          <p className="text-white/70 text-sm mb-6">Need a specific book or guide that isn't listed here?</p>
          <button className="bg-[#D4AF37] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all">
            Contact Academic Office
          </button>
        </div>
        <ExternalLink className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform" />
      </div>
    </div>
  );
}
