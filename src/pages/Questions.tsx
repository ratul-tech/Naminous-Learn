import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Question, UserProfile, Category, OperationType } from '../types';
import { MathRenderer } from '../components/MathRenderer';
import { Plus, Trash2, Edit, Search, Filter, BookOpen, AlertCircle, Save, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { ALL_SUBJECTS } from '../constants';

interface QuestionsProps {
  profile: UserProfile | null;
}

export default function Questions({ profile }: QuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'Board' as Category,
    board: 'Dhaka',
    college: 'NDC',
    class: 'Class 9',
    subject: 'Physics',
  });

  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const unsubQuestions = onSnapshot(query(collection(db, 'questions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
      setLoading(false);
    });

    return () => unsubQuestions();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'questions', editingId), {
          ...newQ,
        });
      } else {
        await addDoc(collection(db, 'questions'), {
          ...newQ,
          createdAt: new Date().toISOString(),
        });
      }
      setShowAdd(false);
      setEditingId(null);
      setNewQ({ text: '', options: ['', '', '', ''], correctAnswer: 0, category: 'Board', board: 'Dhaka', college: 'NDC', class: 'Class 9', subject: 'Physics' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, editingId ? `questions/${editingId}` : 'questions');
    }
  };

  const handleEdit = (q: Question) => {
    setNewQ({
      text: q.text,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      category: q.category,
      board: q.board || 'Dhaka',
      college: q.college || 'NDC',
      class: q.class || 'Class 9',
      subject: q.subject || 'Physics',
    });
    setEditingId(q.id);
    setShowAdd(true);
  };

  const handleDeleteQuestion = async (id: string) => {
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

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'All' || q.class === filterClass;
    const matchesSubject = filterSubject === 'All' || q.subject === filterSubject;
    const matchesCategory = filterCategory === 'All' || q.category === filterCategory;
    return matchesSearch && matchesClass && matchesSubject && matchesCategory;
  });

  if (loading) return <div className="text-center py-20">Loading questions...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#7A4900]">Question Bank</h1>
          <p className="text-[#545454]">Manage and organize exam questions across categories</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-[#B8860B] shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all"
              />
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
              >
                <option value="All">All Classes</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="SSC Candidate">SSC Candidate</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
                <option value="HSC Candidate">HSC Candidate</option>
              </select>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
              >
                <option value="All">All Subjects</option>
                {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold text-sm"
              >
                <option value="All">All Categories</option>
                <option value="Board">Board</option>
                <option value="College Admission">College Admission</option>
              </select>
            </div>
          </div>
      </div>

      {showAdd && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-[#D4AF37]"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-[#7A4900]">{editingId ? 'Edit Question' : 'Add New Question'}</h2>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
                <label className="text-sm font-bold text-[#7A4900]">Question Text (Supports LaTeX: $math$, $$block math$$)</label>
                <div className="flex items-center space-x-4">
                  <button 
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center space-x-2 text-xs font-bold text-[#D4AF37] hover:text-[#B8860B] transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
                  </button>
                  <a 
                    href="https://katex.org/docs/supported.html" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-gray-400 hover:text-[#D4AF37] underline"
                  >
                    Math Guide
                  </a>
                </div>
              </div>
              <textarea
                value={newQ.text}
                onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                placeholder="Enter question text here... Use $x^2$ for $x^2$, $x_2$ for $x_2$, $\sqrt{x}$ for $\sqrt{x}$"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-medium h-32 resize-none"
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
                    <div className="p-6 rounded-2xl bg-[#D4AF37]/5 border-2 border-[#D4AF37]/20 space-y-4">
                      <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Live Preview</p>
                      <MathRenderer content={newQ.text || '*No text entered yet*'} className="text-[#7A4900] font-bold text-lg" />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        {newQ.options.map((opt, i) => (
                          <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-[#D4AF37]/20 shadow-sm">
                            <span className="font-bold text-[#D4AF37]">{String.fromCharCode(65 + i)}:</span>
                            <MathRenderer content={opt || '*Empty*'} className="text-sm text-[#545454]" />
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
                  <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">Option {String.fromCharCode(65 + i)}</label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ({ ...newQ, options: opts });
                    }}
                    placeholder={`Enter option ${String.fromCharCode(65 + i)}`}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-medium"
                    required
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#7A4900] ml-1">Correct Answer</label>
                <select
                  value={newQ.correctAnswer}
                  onChange={(e) => setNewQ({ ...newQ, correctAnswer: parseInt(e.target.value) })}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold"
                >
                  {newQ.options.map((_, i) => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#7A4900] ml-1">Category</label>
                <select
                  value={newQ.category}
                  onChange={(e) => setNewQ({ ...newQ, category: e.target.value as Category })}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold"
                >
                  <option value="Board">Board</option>
                  <option value="College Admission">College Admission</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#7A4900] ml-1">Class</label>
                <select
                  value={newQ.class}
                  onChange={(e) => setNewQ({ ...newQ, class: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold"
                >
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="SSC Candidate">SSC Candidate</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                  <option value="HSC Candidate">HSC Candidate</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#7A4900] ml-1">Subject</label>
                <select
                  value={newQ.subject}
                  onChange={(e) => setNewQ({ ...newQ, subject: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-bold"
                >
                  {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {newQ.category === 'Board' ? (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#7A4900] ml-1">Board / Year</label>
                  <input
                    type="text"
                    value={newQ.board}
                    onChange={(e) => setNewQ({ ...newQ, board: e.target.value })}
                    placeholder="e.g. Dhaka 2023"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-medium"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#7A4900] ml-1">College Name</label>
                  <input
                    type="text"
                    value={newQ.college}
                    onChange={(e) => setNewQ({ ...newQ, college: e.target.value })}
                    placeholder="e.g. Notre Dame College"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#D4AF37] outline-none transition-all font-medium"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button 
                type="button" 
                onClick={() => { setShowAdd(false); setEditingId(null); }} 
                className="px-8 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>{editingId ? 'Update Question' : 'Save Question'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="p-6 bg-[#f5f5f0] border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-[#7A4900]">Showing {filteredQuestions.length} Questions</h2>
          <div className="flex items-center space-x-2 text-xs text-[#545454] uppercase font-bold">
            <Filter className="w-4 h-4" />
            <span>Active Filters</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filteredQuestions.map((q) => (
            <div key={q.id} className="p-8 hover:bg-gray-50 transition-colors group">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-grow space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-gray-100 rounded-full text-gray-500">{q.category}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-[#D4AF37]/10 rounded-full text-[#7A4900]">{q.board || q.college}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-full text-blue-600">{q.class}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-purple-50 rounded-full text-purple-600">{q.subject}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#7A4900] leading-relaxed">
                    <MathRenderer content={q.text} />
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`flex items-center space-x-3 text-sm ${i === q.correctAnswer ? 'text-green-600 font-bold' : 'text-[#545454]'}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shrink-0 ${i === q.correctAnswer ? 'border-green-600 bg-green-50' : 'border-gray-100 bg-white'}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <MathRenderer content={opt} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex md:flex-col items-center space-x-2 md:space-x-0 md:space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(q)} 
                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm"
                    title="Edit Question"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteQuestion(q.id)} 
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all shadow-sm"
                    title="Delete Question"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredQuestions.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-bold text-[#7A4900] mb-2">No questions found</h3>
              <p className="text-[#545454]">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-[#7A4900] text-center mb-2">{confirmModal.title}</h2>
              <p className="text-[#545454] text-center mb-8">{confirmModal.message}</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-100"
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
