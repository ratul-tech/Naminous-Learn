import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, School, GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

import { UserProfile } from '../types';

interface PracticeProps {
  profile: UserProfile | null;
}

export default function Practice({ profile }: PracticeProps) {
  const navigate = useNavigate();
  const [category, setCategory] = useState<'Board' | 'College Admission' | null>(null);
  const [config, setConfig] = useState({
    board: 'Dhaka',
    college: 'NDC',
    count: 20,
  });

  const boards = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Comilla', 'Jessore', 'Dinajpur', 'Mymensingh', 'Madrasah'];
  const colleges = ['NDC', 'STJC', 'HCC'];
  const counts = [20, 30, 50, 75, 100];

  const handleStart = () => {
    navigate('/exam', { state: { category, ...config } });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#7A4900]">Practice Modules</h1>
        <p className="text-[#545454]">Select your preferred module and start practicing</p>
      </div>

      {!category ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ModuleCard
            icon={GraduationCap}
            title="Board Practice"
            description="Practice based on specific education boards and previous year questions."
            onClick={() => setCategory('Board')}
          />
          <ModuleCard
            icon={School}
            title="College Admission"
            description="Specialized practice for top colleges like NDC, STJC, and HCC."
            onClick={() => setCategory('College Admission')}
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <button onClick={() => setCategory(null)} className="text-sm text-[#D4AF37] hover:underline mb-6 flex items-center space-x-1">
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Categories</span>
          </button>

          <h2 className="text-2xl font-bold text-[#7A4900] mb-8">Configure Your {category} Practice</h2>

          <div className="space-y-8">
            {category === 'Board' ? (
              <div>
                <label className="block text-sm font-medium text-[#545454] mb-4">Select Board</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {boards.map((b) => (
                    <button
                      key={b}
                      onClick={() => setConfig({ ...config, board: b })}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${config.board === b ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#545454] mb-4">Select College</label>
                <div className="grid grid-cols-3 gap-3">
                  {colleges.map((c) => (
                    <button
                      key={c}
                      onClick={() => setConfig({ ...config, college: c })}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${config.college === c ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#545454] mb-4">Number of Questions</label>
              <div className="grid grid-cols-5 gap-3">
                {counts.map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfig({ ...config, count: c })}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${config.count === c ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#7A4900]' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={handleStart}
                className="w-full bg-[#D4AF37] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#B8860B] shadow-lg transition-all flex items-center justify-center space-x-3"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>Start Practice Exam</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ModuleCard({ icon: Icon, title, description, onClick }: { icon: any, title: string, description: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -10 }}
      onClick={onClick}
      className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all text-left group border-2 border-transparent hover:border-[#D4AF37]"
    >
      <div className="p-4 bg-[#f5f5f0] rounded-2xl w-fit mb-6 group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-bold text-[#7A4900] mb-3">{title}</h3>
      <p className="text-[#545454] mb-6">{description}</p>
      <div className="flex items-center text-[#D4AF37] font-bold">
        <span>Select Module</span>
        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
      </div>
    </motion.button>
  );
}
