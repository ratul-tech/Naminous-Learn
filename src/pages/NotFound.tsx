import { useNavigate } from 'react-router-dom';
import { Compass, RefreshCw, ArrowLeft, AlertCircle, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export default function NotFound({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      navigate('/');
    }
  };

  const isRuntimeCrash = !!error;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center select-none relative overflow-hidden">
      {/* Decorative ambient background element */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent opacity-30 pointer-events-none -y-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="max-w-md w-full flex flex-col items-center relative z-10"
      >
        {/* Animated Visual Token representing coordinates lost or alert */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-2 bg-gradient-to-tr from-[#D4AF37] to-amber-200 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
          
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center shadow-2xl relative select-none">
            {isRuntimeCrash ? (
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-[#D4AF37]" />
            ) : (
              <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-[#D4AF37] animate-[spin_8s_linear_infinite]" />
            )}
          </div>
        </div>

        {/* Humorous and beautiful copy */}
        <h1 className="text-5xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-none mb-4">
          {isRuntimeCrash ? 'Reading' : '404'} <span className="text-[#D4AF37]">{isRuntimeCrash ? 'Error' : 'Lost'}</span>
        </h1>
        
        <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.25em] leading-none mb-6">
          {isRuntimeCrash ? 'An unexpected rendering anomaly occurred' : 'The targeted academic coordinates do not exist'}
        </p>

        {/* Main message */}
        <p className="text-sm font-semibold text-slate-400 mb-8 max-w-sm leading-relaxed px-4">
          {isRuntimeCrash 
            ? `Our engine encountered a temporary component exception. Details have been logged for the developers. Exception: ${error?.message || 'Unknown render exception'}` 
            : 'The requested materials or page might have been retired, moved, or misspelled. Let’s get you back to familiar orbits.'}
        </p>

        {/* Clean actionable rows */}
        <div className="flex flex-col sm:flex-row gap-4 w-full px-4 justify-center">
          <button
            onClick={handleAction}
            className="flex items-center justify-center space-x-2 bg-[#D4AF37] hover:bg-[#B8860B] active:scale-95 text-slate-950 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer"
          >
            {isRuntimeCrash ? <RefreshCw className="w-4 h-4" /> : <Home className="w-4 h-4" />}
            <span>{isRuntimeCrash ? 'Retry Render' : 'Go to Homepage'}</span>
          </button>

          {!isRuntimeCrash && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center space-x-2 border border-slate-900 hover:border-slate-800 bg-transparent text-slate-300 hover:text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Navigate back</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
