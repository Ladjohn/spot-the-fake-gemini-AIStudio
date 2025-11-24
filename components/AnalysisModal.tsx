import React, { useEffect, useState } from 'react';
import { NewsItem, VerificationResult } from '../types';
import { analyzeAuthenticity } from '../services/geminiService';
import { playSound } from '../services/audioService';
import { ICONS } from '../constants';

interface AnalysisModalProps {
  item: NewsItem;
  userGuess: 'REAL' | 'FAKE' | 'TIMEOUT';
  onClose: () => void;
  onNext: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ item, userGuess, onClose, onNext }) => {
  const [analysis, setAnalysis] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Case insensitive check.
  const isCorrect = userGuess === item.type.toUpperCase();
  const isTimeout = userGuess === 'TIMEOUT';

  useEffect(() => {
    // Play sound on mount
    if (isCorrect) playSound('SUCCESS');
    else playSound('FAIL');

    let mounted = true;
    const fetchAnalysis = async () => {
      const result = await analyzeAuthenticity(item.headline, item.summary);
      if (mounted) {
        setAnalysis(result);
        setLoading(false);
      }
    };
    fetchAnalysis();
    return () => { mounted = false; };
  }, [item, isCorrect]);

  const handleNext = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      playSound('CLICK');
      onNext();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-slide-in">
      <div className="
          w-full sm:max-w-lg max-h-[90vh] flex flex-col
          bg-off-white dark:bg-zinc-900 
          border-t-4 sm:border-4 border-black dark:border-white
          sm:rounded-xl shadow-[0_-10px_0_0_rgba(0,0,0,1)] sm:shadow-neo dark:sm:shadow-neo-dark
          overflow-hidden
      ">
        {/* Header */}
        <div className={`
            p-6 text-center border-b-4 border-black dark:border-white
            ${isTimeout ? 'bg-gray-700' : isCorrect ? 'bg-g-green' : 'bg-g-red'}
            text-white
        `}>
          <h2 className="text-4xl font-display font-black uppercase italic transform -rotate-2">
            {isTimeout ? 'TOO SLOW!' : isCorrect ? 'NAILED IT!' : 'NOPE!'}
          </h2>
          <div className="mt-2 flex justify-center gap-4 text-sm font-bold bg-black/20 inline-block px-4 py-1 rounded-full">
            <span>You: {userGuess === 'TIMEOUT' ? 'TIME UP' : userGuess}</span>
            <span>vs</span>
            <span>Truth: {item.type}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {/* Main Explanation */}
          <div className="bg-white dark:bg-zinc-800 p-4 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            <h3 className="font-bold text-g-blue mb-2 flex items-center gap-2 uppercase tracking-wide">
              {ICONS.BRAIN} The Truth
            </h3>
            <p className="text-lg font-medium leading-snug dark:text-gray-200">{item.explanation}</p>
          </div>

          {/* Loading or Result */}
          {loading ? (
             <div className="space-y-4 animate-pulse opacity-70">
               <div className="h-8 bg-gray-300 dark:bg-gray-700 w-3/4 rounded border-2 border-transparent"></div>
               <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded border-2 border-transparent"></div>
               <p className="text-center font-mono text-sm text-g-blue font-bold uppercase tracking-wider">Scanning Viral Database...</p>
             </div>
          ) : analysis ? (
            <div className="space-y-4">
               {/* Authenticity Meter */}
               <div className="flex items-center gap-3 border-2 border-black dark:border-white p-2 rounded bg-gray-100 dark:bg-zinc-700">
                 <div className="flex-1 h-4 bg-gray-300 rounded-full overflow-hidden border border-black">
                    <div 
                        className="h-full transition-all duration-1000 ease-out"
                        style={{ 
                            width: `${analysis.authenticityScore * 100}%`,
                            backgroundColor: analysis.authenticityScore > 0.7 ? '#34A853' : analysis.authenticityScore < 0.3 ? '#EA4335' : '#FBBC05'
                        }}
                    ></div>
                 </div>
                 <span className="font-mono font-bold text-sm text-black dark:text-white">{Math.round(analysis.authenticityScore * 100)}% AUTH</span>
               </div>
               
               {/* Report */}
               <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white">
                 <h4 className="font-black text-sm uppercase mb-2 text-gray-500 dark:text-gray-400">AI Verification</h4>
                 <p className="text-sm font-medium mb-4 dark:text-gray-300">{analysis.reasoning}</p>
                 
                 {/* Sources */}
                 {analysis.sources.length > 0 && (
                   <div className="border-t-2 border-dashed border-gray-300 dark:border-zinc-600 pt-3">
                     <p className="text-xs font-bold uppercase mb-2 text-g-blue">Linked Evidence</p>
                     <ul className="space-y-2">
                       {analysis.sources.map((source, idx) => (
                         <li key={idx}>
                           <a href={source.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold hover:text-g-blue truncate group text-black dark:text-white">
                             <span className="w-2 h-2 bg-black dark:bg-white rounded-full group-hover:bg-g-blue shrink-0"></span>
                             <span className="truncate">{source.title}</span>
                           </a>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
            </div>
          ) : (
            <div className="text-center font-bold text-g-red">Connection Failed</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-zinc-800 border-t-4 border-black dark:border-white">
            <button 
              onClick={handleNext}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase text-xl rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-neo dark:shadow-neo-dark active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              Next Round ->
            </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
