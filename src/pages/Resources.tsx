import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Search, Filter } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Resource } from '../types';

interface ResourcesProps {
  profile: UserProfile | null;
}

export default function Resources({ profile }: ResourcesProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const categories = ['All', ...new Set(resources.map(r => r.category))];

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12 pb-10">
      <header className="px-1 py-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 uppercase leading-none tracking-tight">Academic <span className="text-[#D4AF37]">Resources</span></h1>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Lecture notes, booklets and reference material</p>
      </header>

      <div className="space-y-6">
        <div className="relative group">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for lecture notes, exam papers, and guides..."
            className="w-full pl-0 pr-4 py-4 sm:py-5 bg-transparent border-b border-slate-900 text-white outline-none focus:border-[#D4AF37]/45 transition-all font-black placeholder-slate-700 text-sm"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2 px-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
                selectedCategory === cat 
                  ? 'text-[#D4AF37] border-b border-[#D4AF37]/40 pb-1.5' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1">
        <AnimatePresence mode="popLayout">
          {filteredResources.map((res, i) => (
            <motion.div
              layout
              key={res.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="py-5 flex items-center justify-between border-b border-dashed border-slate-905 transition-all group relative"
            >
              <div className="flex items-center space-x-4 sm:space-x-5 flex-1 min-w-0">
                <div className="w-10 h-10 bg-slate-950 text-[#D4AF37] border border-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-white text-base leading-tight uppercase tracking-tight mb-2 truncate group-hover:text-[#D4AF37] transition-all">{res.title}</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-[9px] font-black uppercase text-[#D4AF37]/75 border-b border-[#D4AF37]/15 pb-0.5">{res.category}</span>
                    <span className="w-2 h-[1px] sm:w-[1px] sm:h-2 bg-slate-805" />
                    <span className="text-[9px] font-black uppercase text-slate-500">{res.size || 'Auto Size'}</span>
                  </div>
                </div>
              </div>
              <a 
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 p-3 bg-slate-950 text-[#D4AF37] border border-slate-900 rounded-xl hover:border-[#D4AF37] hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Download className="w-4 h-4" />
              </a>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-bold uppercase text-slate-505 tracking-[0.2em]">Syncing Library...</p>
          </div>
        ) : filteredResources.length === 0 && (
          <div className="text-center py-20 border-b border-dashed border-slate-900">
            <FileText className="w-12 h-12 text-slate-80 shadow-md mx-auto mb-4 opacity-30" />
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">No resources found</p>
          </div>
        )}
      </div>

      <div className="py-10 border-t border-dashed border-slate-900 text-white relative overflow-hidden group">
        <div className="relative z-10 text-center max-w-lg mx-auto">
          <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-2">Resource Request</p>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-3">Looking for something specific?</h3>
          <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed mb-6">Let your instructors know if you need any textbook, worksheet, or formula book and they will upload it here.</p>
          <button 
            onClick={() => window.location.href = 'mailto:shahriarislam275+numinous@gmail.com'}
            className="border border-[#D4AF37] text-[#D4AF37] bg-transparent hover:bg-[#D4AF37]/5 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Request Study Material
          </button>
        </div>
      </div>
    </div>

  );
}
