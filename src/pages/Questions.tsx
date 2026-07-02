import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, where, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Question, UserProfile, Category, OperationType } from '../types';
import { MathRenderer } from '../components/MathRenderer';
import { Plus, Trash2, Edit, Search, Filter, BookOpen, AlertCircle, Save, X, Eye, ArrowLeft, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { ALL_SUBJECTS } from '../constants';

const PRESET_BOARDS = [
  'Dhaka', 'Sylhet', 'Rajshahi', 'Chattogram', 'Jashore', 'Barishal', 'Cumilla', 'Dinajpur', 'Mymensingh', 'Madrasah', 'Technical'
];

const PRESET_COLLEGES = [
  'NDC',
  'STJC',
  'HCC',
  'St. Greg'
];

const PRESET_YEARS = [
  '2024', '2023', '2022', '2021', '2020', '2019', '2018'
];

interface QuestionsProps {
  profile: UserProfile | null;
}

export default function Questions({ profile }: QuestionsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isFullAdmin = profile?.role === 'admin' && profile?.adminType !== 'question_holder';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'Board' as Category,
    board: 'Dhaka',
    college: 'NDC',
    class: 'SSC Candidate',
    subject: 'Physics',
    imageUrl: '',
  });

  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [showBoardSuggestions, setShowBoardSuggestions] = useState(false);
  const [showCollegeSuggestions, setShowCollegeSuggestions] = useState(false);

  const handleSelectBoardPreset = (boardName: string) => {
    const yearMatch = newQ.board.match(/\d{4}/);
    if (yearMatch) {
      setNewQ({ ...newQ, board: `${boardName} ${yearMatch[0]}` });
    } else {
      setNewQ({ ...newQ, board: boardName });
    }
  };

  const handleSelectYearPreset = (year: string) => {
    const cleanBoard = newQ.board.replace(/\s*\d{4}/g, '').trim();
    setNewQ({ ...newQ, board: cleanBoard ? `${cleanBoard} ${year}` : year });
  };

  useEffect(() => {
    const unsubQuestions = onSnapshot(query(collection(db, 'questions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
      setLoading(false);
    });

    return () => unsubQuestions();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !isFullAdmin) {
      alert("Access Denied: You do not have permission to edit questions.");
      return;
    }
    try {
      const questionData = {
        text: newQ.text.trim(),
        options: newQ.options.map(o => o.trim()),
        correctAnswer: newQ.correctAnswer,
        category: newQ.category,
        class: newQ.class,
        subject: newQ.subject,
        imageUrl: newQ.imageUrl.trim(),
        board: newQ.category === 'Board' ? newQ.board.trim() : '',
        college: newQ.category === 'College Admission' ? newQ.college.trim() : '',
      };

      if (editingId) {
        await updateDoc(doc(db, 'questions', editingId), {
          ...questionData,
        });
      } else {
        await addDoc(collection(db, 'questions'), {
          ...questionData,
          createdAt: new Date().toISOString(),
          createdBy: profile?.uid || 'unknown',
          createdByEmail: profile?.email || 'unknown',
          createdByName: profile?.displayName || 'System',
        });
        // Increment global question count
        await setDoc(doc(db, 'global_stats', 'counters'), { 
          questionsCount: increment(1) 
        }, { merge: true });
      }
      setShowAdd(false);
      setEditingId(null);
      setNewQ({ text: '', options: ['', '', '', ''], correctAnswer: 0, category: 'Board', board: 'Dhaka', college: 'NDC', class: 'SSC Candidate', subject: 'Physics', imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, editingId ? `questions/${editingId}` : 'questions');
    }
  };

  const handleEdit = (q: Question) => {
    if (!isFullAdmin) {
      alert("Access Denied: You do not have permission to edit questions.");
      return;
    }
    setNewQ({
      text: q.text,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      category: q.category,
      board: q.board || 'Dhaka',
      college: q.college || 'NDC',
      class: q.class || 'SSC Candidate',
      subject: q.subject || 'Physics',
      imageUrl: q.imageUrl || '',
    });
    setEditingId(q.id);
    setShowAdd(true);
  };

  useEffect(() => {
    if (location.state?.editQuestion) {
      handleEdit(location.state.editQuestion);
      // Clear state to avoid re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.openAdd) {
      setShowAdd(true);
      // Clear state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const handleDeleteQuestion = async (id: string) => {
    if (!isFullAdmin) {
      alert("Access Denied: You do not have permission to delete questions.");
      return;
    }
    setConfirmModal({
      show: true,
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'questions', id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
        }
      }
    });
  };

  const uniqueBoards = Array.from(new Set(questions.map(q => q.board).filter(Boolean))).sort() as string[];
  const uniqueColleges = Array.from(new Set(questions.map(q => q.college).filter(Boolean))).sort() as string[];

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = 
      q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.board && q.board.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.college && q.college.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.category && q.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.subject && q.subject.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesClass = filterClass === 'All' || q.class === filterClass;
    const matchesSubject = filterSubject === 'All' || q.subject === filterSubject;
    
    let matchesCategory = true;
    if (filterCategory !== 'All') {
      if (filterCategory.startsWith('board:')) {
        const boardVal = filterCategory.replace('board:', '');
        matchesCategory = q.category === 'Board' && q.board === boardVal;
      } else if (filterCategory.startsWith('college:')) {
        const collegeVal = filterCategory.replace('college:', '');
        matchesCategory = q.category === 'College Admission' && q.college === collegeVal;
      } else {
        matchesCategory = q.category === filterCategory;
      }
    }
    
    return matchesSearch && matchesClass && matchesSubject && matchesCategory;
  });

  if (loading) return <div className="text-center py-20 text-slate-500 font-bold tracking-widest animate-pulse uppercase">Loading questions...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-20 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-serif">Question Bank</h1>
          <p className="text-xs sm:text-sm text-slate-400">Manage and organize exam questions across categories</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="bg-[#D4AF37] text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-amber-400 shadow-xl shadow-amber-500/10 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-grow relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search questions by text, board (Sylhet, Dhaka etc.), or college name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all text-sm text-white placeholder:text-slate-600 shadow-inner"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full lg:w-40 px-4 py-3 rounded-xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-xs sm:text-sm appearance-none cursor-pointer hover:bg-slate-800 text-slate-300 shadow-inner"
              >
                <option value="All">All Classes</option>
                <option value="SSC Candidate">SSC Candidate</option>
                <option value="College Admission">College Admission</option>
              </select>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full lg:w-48 px-4 py-3 rounded-xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-xs sm:text-sm appearance-none cursor-pointer hover:bg-slate-800 text-slate-300 shadow-inner"
              >
                <option value="All">All Subjects</option>
                {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full lg:w-48 px-4 py-3 rounded-xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-xs sm:text-sm appearance-none cursor-pointer hover:bg-slate-800 text-slate-300 shadow-inner"
              >
                <option value="All">All Categories</option>
                <option value="Board">All Boards Only</option>
                <option value="College Admission">All Colleges Only</option>
                {uniqueBoards.length > 0 && (
                  <optgroup label="Syllabus Boards">
                    {uniqueBoards.map(b => (
                      <option key={`board:${b}`} value={`board:${b}`}>{b}</option>
                    ))}
                  </optgroup>
                )}
                {uniqueColleges.length > 0 && (
                  <optgroup label="Specific Colleges">
                    {uniqueColleges.map(c => (
                      <option key={`college:${c}`} value={`college:${c}`}>{c}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
      </div>

      {showAdd && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border-2 border-[#D4AF37]"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => { setShowAdd(false); setEditingId(null); }}
                className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg active:scale-95 border border-slate-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-white font-serif">{editingId ? 'Edit Question' : 'Add New Question'}</h2>
            </div>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
                <label className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest">Question Text</label>
                <div className="flex items-center space-x-4">
                  <button 
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-[#D4AF37] transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
                  </button>
                  <a 
                    href="https://katex.org/docs/supported.html" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-slate-500 hover:text-[#D4AF37] underline"
                  >
                    Math Guide
                  </a>
                </div>
              </div>
              <textarea
                value={newQ.text}
                onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                placeholder="Enter question text here... Use $math$ for inline and $$math$$ for block."
                className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-medium h-32 resize-y text-white placeholder:text-slate-700 shadow-inner"
                required
              />
              
              <AnimatePresence>
                {showPreview && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 rounded-2xl bg-[#D4AF37]/5 border-2 border-[#D4AF37]/10 space-y-4">
                      <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Live Math Preview</p>
                      <div className="p-4 bg-slate-950/50 rounded-xl">
                        <MathRenderer content={newQ.text || '*No text entered yet*'} className="text-white font-medium text-lg" engine={profile?.mathEngine} />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        {newQ.options.map((opt, i) => (
                          <div key={i} className="flex items-center space-x-3 p-3 bg-slate-950/30 rounded-xl border border-[#D4AF37]/10">
                            <span className="font-bold text-[#D4AF37] text-xs font-mono">{String.fromCharCode(65 + i)}:</span>
                            <MathRenderer content={opt || '*Empty*'} className="text-sm text-slate-300" engine={profile?.mathEngine} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newQ.options.map((opt, i) => (
                <div key={i} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest">Option {String.fromCharCode(65 + i)}</label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ({ ...newQ, options: opts });
                    }}
                    placeholder={`Enter option ${String.fromCharCode(65 + i)}`}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-medium text-white shadow-inner"
                    required
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Correct Answer</label>
                <select
                  value={newQ.correctAnswer}
                  onChange={(e) => setNewQ({ ...newQ, correctAnswer: parseInt(e.target.value) })}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-slate-300 shadow-inner"
                >
                  {newQ.options.map((_, i) => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}
                </select>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewQ({ ...newQ, category: 'Board' })}
                    className={`px-4 py-3.5 rounded-2xl border transition-all font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 leading-tight shadow-md ${
                      newQ.category === 'Board' 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] ring-1 ring-[#D4AF37]/30' 
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-[#D4AF37]/80'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                    <span>Board Exam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewQ({ ...newQ, category: 'College Admission' })}
                    className={`px-4 py-3.5 rounded-2xl border transition-all font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 leading-tight shadow-md ${
                      newQ.category === 'College Admission' 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] ring-1 ring-[#D4AF37]/30' 
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-[#D4AF37]/80'
                    }`}
                  >
                    <Trophy className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                    <span>College Admission</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Class</label>
                <select
                  value={newQ.class}
                  onChange={(e) => setNewQ({ ...newQ, class: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-slate-300 shadow-inner"
                >
                  <option value="SSC Candidate">SSC Candidate</option>
                  <option value="College Admission">College Admission</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Subject</label>
                <select
                  value={newQ.subject}
                  onChange={(e) => setNewQ({ ...newQ, subject: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-slate-300 shadow-inner"
                >
                  {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {newQ.category === 'Board' ? (
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest">Board & Year</label>
                    <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider">Tap quick presets below</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={newQ.board}
                      onChange={(e) => setNewQ({ ...newQ, board: e.target.value })}
                      placeholder="e.g. Dhaka 2023"
                      onFocus={() => setShowBoardSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBoardSuggestions(false), 250)}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] hover:border-slate-800 outline-none transition-all font-medium text-white shadow-inner font-semibold"
                      required
                    />
                    {showBoardSuggestions && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
                        {Array.from(new Set([...PRESET_BOARDS, ...uniqueBoards]))
                          .filter(b => b.toLowerCase().includes(newQ.board.toLowerCase()) && b.toLowerCase() !== newQ.board.toLowerCase())
                          .map(s => (
                            <button
                              key={s}
                              type="button"
                              onMouseDown={() => {
                                handleSelectBoardPreset(s);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Select Grid for Board Questions */}
                  <div className="space-y-2 mt-2 bg-slate-950/40 p-3 rounded-2xl border border-slate-850">
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {PRESET_BOARDS.map(b => (
                        <button
                          key={b}
                          type="button"
                          onMouseDown={() => handleSelectBoardPreset(b)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            newQ.board.toLowerCase().startsWith(b.toLowerCase()) 
                              ? 'bg-[#D4AF37]/10 border-[#D4AF37]/35 text-[#D4AF37]' 
                              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-800/50 pt-2 flex flex-wrap gap-1.5">
                      <span className="text-[9px] text-slate-500 font-bold self-center mr-1 uppercase font-serif">Year:</span>
                      {PRESET_YEARS.map(y => (
                        <button
                          key={y}
                          type="button"
                          onMouseDown={() => handleSelectYearPreset(y)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                            newQ.board.includes(y) 
                              ? 'bg-blue-500/10 border-blue-500/35 text-blue-400 font-bold' 
                              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-slate-403 uppercase tracking-widest">College Name</label>
                    <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider">Tap quick presets below</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={newQ.college}
                      onChange={(e) => setNewQ({ ...newQ, college: e.target.value })}
                      placeholder="e.g. NDC"
                      onFocus={() => setShowCollegeSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCollegeSuggestions(false), 250)}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] hover:border-slate-800 outline-none transition-all font-medium text-white shadow-inner font-semibold"
                      required
                    />
                    {showCollegeSuggestions && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
                        {Array.from(new Set([...PRESET_COLLEGES, ...uniqueColleges]))
                          .filter(c => c.toLowerCase().includes(newQ.college.toLowerCase()) && c.toLowerCase() !== newQ.college.toLowerCase())
                          .map(s => (
                            <button
                              key={s}
                              type="button"
                              onMouseDown={() => {
                                setNewQ({ ...newQ, college: s });
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Select Colleges Grid for Admission Questions */}
                  <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-850 mt-2">
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {PRESET_COLLEGES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={() => setNewQ({ ...newQ, college: c })}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all truncate max-w-[150px] ${
                            newQ.college.toLowerCase() === c.toLowerCase()
                              ? 'bg-[#D4AF37]/10 border-[#D4AF37]/35 text-[#D4AF37]' 
                              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                          title={c}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={newQ.imageUrl}
                  onChange={(e) => setNewQ({ ...newQ, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.png"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-medium text-white shadow-inner"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button 
                type="button" 
                onClick={() => { setShowAdd(false); setEditingId(null); }} 
                className="px-8 py-4 text-slate-500 font-bold hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-[#D4AF37] text-slate-900 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-amber-400 transition-all flex items-center space-x-2 shadow-xl shadow-amber-500/10"
              >
                <Save className="w-5 h-5" />
                <span>{editingId ? 'Update Question' : 'Save Question'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-6 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-bold text-white font-serif">Showing {filteredQuestions.length} Questions</h2>
          <div className="flex items-center space-x-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            <Filter className="w-4 h-4" />
            <span>Active Filters</span>
          </div>
        </div>
        <div className="divide-y divide-slate-800/50">
          {filteredQuestions.map((q) => (
            <div key={q.id} className="p-4 sm:p-8 hover:bg-slate-800/30 transition-colors group">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 sm:gap-6">
                <div className="flex-grow space-y-4 w-full">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 sm:px-3 py-1 bg-slate-800 rounded-full text-slate-500 border border-slate-700">{q.category}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 sm:px-3 py-1 bg-[#D4AF37]/10 rounded-full text-[#D4AF37] border border-[#D4AF37]/20 font-mono">
                        {q.category === 'Board' ? q.board : q.college}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 sm:px-3 py-1 bg-blue-500/10 rounded-full text-blue-400 border border-blue-500/20">{q.class}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 sm:px-3 py-1 bg-purple-500/10 rounded-full text-purple-400 border border-purple-500/20">{q.subject}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 font-medium">
                      <span className="w-1 h-1 rounded-full bg-slate-700 hidden sm:inline" />
                      <span>Added by:</span>
                      <span className="text-indigo-400 font-bold">{q.createdByName || 'System'}</span>
                      {q.createdByEmail && q.createdByEmail !== 'unknown' && (
                        <span className="text-slate-600 font-normal">({q.createdByEmail})</span>
                      )}
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="font-mono text-slate-400">{q.createdAt ? new Date(q.createdAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed font-serif">
                    <MathRenderer content={q.text} engine={profile?.mathEngine} />
                  </h3>
                  {q.imageUrl && (
                    <div className="my-4 max-w-full sm:max-w-md rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950/40 p-2">
                      <img 
                        src={q.imageUrl} 
                        alt="Question visual context" 
                        className="w-full h-auto object-contain max-h-60 rounded-lg" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-12 gap-y-3">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`flex items-start space-x-3 text-[13px] sm:text-sm ${i === q.correctAnswer ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center border-2 shrink-0 mt-0.5 shadow-inner ${i === q.correctAnswer ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/50'}`}>
                          <span className="text-[10px] sm:text-xs font-mono">{String.fromCharCode(65 + i)}</span>
                        </div>
                        <div className="min-w-0 font-medium">
                          <MathRenderer content={opt} engine={profile?.mathEngine} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {isFullAdmin && (
                  <div className="flex flex-row md:flex-col items-center space-x-2 md:space-x-0 md:space-y-2 w-full md:w-auto justify-end md:justify-start pt-2 md:pt-0">
                    <button 
                      onClick={() => handleEdit(q)} 
                      className="flex-1 md:flex-none p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/20 shadow-lg flex items-center justify-center sm:block"
                      title="Edit Question"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteQuestion(q.id)} 
                      className="flex-1 md:flex-none p-3 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all border border-rose-500/20 shadow-lg flex items-center justify-center sm:block"
                      title="Delete Question"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredQuestions.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                <Search className="w-10 h-10 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No questions found</h3>
              <p className="text-slate-500">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 rounded-[2rem] shadow-2xl max-w-md w-full p-8 border border-slate-800"
            >
              <div className="w-20 h-20 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2 font-serif">{confirmModal.title}</h2>
              <p className="text-slate-400 text-center mb-8">{confirmModal.message}</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-xl shadow-rose-500/10"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
