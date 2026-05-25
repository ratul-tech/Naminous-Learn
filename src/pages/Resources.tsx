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
    <div className="space-y-8 pb-10">
      <header className="px-1">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-1">Academic Resource Center</h1>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Lecture notes, books, and reference material</p>
      </header>

      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#D4AF37] transition-colors" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for lecture notes, exam papers, and guides..."
            className="w-full pl-12 pr-4 py-4 sm:py-5 rounded-[2rem] bg-slate-900 border-2 border-slate-800 text-white shadow-sm outline-none focus:border-[#D4AF37]/30 transition-all font-bold placeholder-slate-600 text-sm"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2 px-1">
          <div className="p-2.5 bg-slate-900 rounded-xl shadow-sm border border-slate-800 shrink-0">
            <Filter className="w-4 h-4 text-slate-500" />
          </div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 shadow-sm border ${
                selectedCategory === cat 
                  ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-amber-950/25' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-[#D4AF37]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredResources.map((res, i) => (
            <motion.div
              layout
              key={res.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-800 flex items-center justify-between hover:shadow-xl hover:border-[#D4AF37]/25 transition-all group overflow-hidden relative"
            >
              <div className="flex items-center space-x-4 sm:space-x-5 flex-1 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 text-[#D4AF37] rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-[#D4AF37] group-hover:text-slate-950 transition-all transform group-hover:rotate-6">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base sm:text-lg leading-tight uppercase tracking-tight mb-1 truncate">{res.title}</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-[9px] font-black uppercase text-[#D4AF37] px-2 py-0.5 rounded-lg bg-amber-500/5 border border-amber-500/10">{res.category}</span>
                    <span className="w-1 h-1 bg-slate-800 rounded-full" />
                    <span className="text-[9px] font-bold uppercase text-slate-500">{res.size || 'Auto Size'}</span>
                  </div>
                </div>
              </div>
              <a 
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 p-3.5 bg-slate-800 text-[#D4AF37] border border-slate-700 rounded-xl sm:rounded-2xl hover:bg-[#D4AF37] hover:text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Download className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em]">Syncing Library...</p>
          </div>
        ) : filteredResources.length === 0 && (
          <div className="text-center py-20 bg-slate-900 rounded-3xl border-2 border-dashed border-slate-800">
            <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No resources found</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 sm:p-10 rounded-3xl text-white relative overflow-hidden group shadow-2xl border border-slate-800">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-2">Resource Request</p>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-3">Looking for something specific?</h3>
          <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed mb-6 max-w-md">Let your course teachers or instructors know if you need any book, worksheet, or formula paper and they will upload it here.</p>
          <button 
            onClick={() => window.location.href = 'mailto:shahriarislam275+numinous@gmail.com'}
            className="bg-slate-800 text-white border border-slate-700 px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#D4AF37] hover:text-slate-950 transition-all shadow-xl active:scale-95"
          >
            Request Study Material
          </button>
        </div>
        <div className="absolute top-0 right-0 p-8">
           <div className="w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl" />
        </div>
        <FileText className="absolute -bottom-6 -right-6 w-48 h-48 text-white/5 opacity-40 group-hover:scale-110 transition-transform transform rotate-12" />
      </div>
    </div>

  );
}
