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
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-1">Knowledge Hub</h1>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Access Restricted Asset Nodes</p>
      </header>

      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#D4AF37] transition-colors" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scan for encrypted datasheets..."
            className="w-full pl-12 pr-4 py-5 rounded-[2rem] bg-slate-900 border-2 border-slate-800 text-white shadow-sm outline-none focus:border-[#D4AF37]/30 transition-all font-bold placeholder-slate-700"
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
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 shadow-sm border ${
                selectedCategory === cat 
                  ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-amber-900/10' 
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
              className="bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-800 flex items-center justify-between hover:shadow-xl hover:border-[#D4AF37]/20 transition-all group overflow-hidden relative"
            >
              <div className="flex items-center space-x-5 flex-1 min-w-0">
                <div className="w-14 h-14 bg-slate-800 text-[#D4AF37] rounded-3xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-[#D4AF37] group-hover:text-slate-950 transition-all transform group-hover:rotate-6">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-white text-lg leading-tight uppercase tracking-tight mb-1 truncate">{res.title}</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-[9px] font-black uppercase text-[#D4AF37] px-2 py-0.5 rounded-lg bg-amber-500/5 border border-amber-500/10">{res.category}</span>
                    <span className="w-1 h-1 bg-slate-800 rounded-full" />
                    <span className="text-[9px] font-black uppercase text-slate-500">{res.size || 'Auto Size'}</span>
                  </div>
                </div>
              </div>
              <a 
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 p-4 bg-slate-800 text-[#D4AF37] border border-slate-700 rounded-2xl hover:bg-[#D4AF37] hover:text-slate-950 hover:scale-110 active:scale-95 transition-all shadow-lg"
              >
                <Download className="w-6 h-6" />
              </a>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Syncing Hub...</p>
          </div>
        ) : filteredResources.length === 0 && (
          <div className="text-center py-20 bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-800">
            <FileText className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Archive Empty</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden group shadow-2xl border border-slate-800">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-2">Sync Request</p>
          <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-3">Manifest Missing?</h3>
          <p className="text-slate-500 text-xs font-bold leading-relaxed mb-8 max-w-[200px]">Signal our terminal if a specific datasheet is required for your mission.</p>
          <button className="bg-slate-800 text-white border border-slate-700 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#D4AF37] hover:text-slate-950 transition-all shadow-xl active:scale-95">
            Open Uplink
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
