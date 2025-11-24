import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { speakText } from '../services/audioService';
import { ICONS } from '../constants';

interface GameCardProps {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled }) => {
  const [speaking, setSpeaking] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.imageUrl);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Swipe State
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgSrc(item.imageUrl);
    setIsGeneratingImage(false);
    setHasError(false);
    setOffsetX(0);
  }, [item]);

  const handleSpeak = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (speaking) return;
    setSpeaking(true);
    // Only speak the headline to be faster
    await speakText(item.headline);
    setSpeaking(false);
  };

  const handleImageError = async () => {
      if (hasError) return; // Prevent infinite loops
      
      // If we haven't tried AI gen yet, try it.
      if (!isGeneratingImage && !imgSrc.startsWith('data:') && item.headline) {
          setIsGeneratingImage(true);
          try {
              const aiImage = await generateAiImage(item.imagePrompt || item.headline);
              if (aiImage) {
                  setImgSrc(aiImage);
                  setIsGeneratingImage(false);
                  return;
              }
          } catch (e) {
              console.error("AI Gen Failed");
          }
          setIsGeneratingImage(false);
      }

      // If AI failed or we already tried it, fallback to placeholder
      setHasError(true);
      setImgSrc(`https://placehold.co/800x600/FBBC05/000000?text=${encodeURIComponent(item.category)}`);
  };

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled) return;
    if (navigator.vibrate) navigator.vibrate(10);
    onVote(type);
  };

  // --- Swipe Logic ---

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || disabled) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - startX;
    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    if (Math.abs(offsetX) > 100) {
      // Threshold met
      const vote = offsetX > 0 ? 'REAL' : 'FAKE';
      // Animate off screen
      const endX = offsetX > 0 ? 1000 : -1000;
      setOffsetX(endX);
      setTimeout(() => {
         handleInteraction(vote);
      }, 100); 
    } else {
      setOffsetX(0);
    }
  };

  const rotateDeg = (offsetX / 300) * 15;
  const opacityReal = Math.max(0, Math.min(1, offsetX / 150));
  const opacityFake = Math.max(0, Math.min(1, -offsetX / 150));

  return (
    <div className="w-full max-w-[90vw] md:max-w-md mx-auto my-4 relative select-none">
      <div className="absolute top-1/2 left-0 -translate-x-full pr-4 hidden lg:block">
         <span className="text-g-red font-black text-2xl transform -rotate-12 block">← FAKE</span>
      </div>
      <div className="absolute top-1/2 right-0 translate-x-full pl-4 hidden lg:block">
         <span className="text-g-green font-black text-2xl transform rotate-12 block">REAL →</span>
      </div>

      <div 
        ref={cardRef}
        className="relative transition-transform duration-100 ease-out cursor-grab active:cursor-grabbing animate-slide-in"
        style={{ 
          transform: `translateX(${offsetX}px) rotate(${rotateDeg}deg)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Swipe Overlays */}
        <div 
           className="absolute inset-0 z-20 bg-g-green/80 flex items-center justify-center rounded-xl border-4 border-black pointer-events-none"
           style={{ opacity: opacityReal }}
        >
            <span className="text-white font-black text-6xl border-4 border-white px-6 py-2 transform -rotate-12 uppercase">REAL!</span>
        </div>
        <div 
           className="absolute inset-0 z-20 bg-g-red/80 flex items-center justify-center rounded-xl border-4 border-black pointer-events-none"
           style={{ opacity: opacityFake }}
        >
            <span className="text-white font-black text-6xl border-4 border-white px-6 py-2 transform rotate-12 uppercase">FAKE!</span>
        </div>

        <div className="
            bg-white dark:bg-zinc-800 
            border-4 border-black dark:border-white 
            shadow-neo dark:shadow-neo-dark 
            rounded-xl overflow-hidden
            flex flex-col
        ">
          {/* Image Section */}
          <div className="relative h-64 border-b-4 border-black dark:border-white bg-gray-200 group pointer-events-none flex items-center justify-center overflow-hidden">
             {isGeneratingImage && (
                 <div className="absolute inset-0 z-10 bg-black/50 flex flex-col items-center justify-center text-white">
                     <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                     <span className="font-bold text-xs uppercase tracking-widest">Generating AI Image...</span>
                 </div>
             )}
             <img 
               src={imgSrc} 
               alt="News visual" 
               className="w-full h-full object-cover"
               loading="lazy"
               onError={handleImageError}
             />
             <div className="absolute top-4 right-4 bg-g-yellow text-black border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] z-20">
               {item.category}
             </div>
             <div className="absolute top-4 left-4 bg-white text-black border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] z-20">
               {item.difficulty}
             </div>
          </div>

          {/* Content Section */}
          <div className="p-6 flex flex-col gap-4 bg-white dark:bg-zinc-800 text-neo-black dark:text-neo-white relative">
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleSpeak}
              disabled={speaking}
              className={`absolute top-4 right-4 p-2 rounded-full border-2 border-black dark:border-white hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors z-30 ${speaking ? 'bg-g-yellow' : ''}`}
              title="Listen to story"
            >
              {speaking ? ICONS.LOADING : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <h2 className="text-2xl font-display font-black leading-tight pr-8">
              {item.headline}
            </h2>
            <p className="text-sm font-sans font-medium opacity-80 leading-relaxed border-l-4 border-g-blue pl-3 select-text">
              {item.summary}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4" 
                 onMouseDown={(e) => e.stopPropagation()}
                 onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleInteraction('FAKE')}
                disabled={disabled}
                className="
                  group relative py-4 px-2 
                  bg-g-red text-white font-black uppercase tracking-widest text-lg
                  border-4 border-black dark:border-white rounded-lg
                  shadow-neo dark:shadow-neo-dark
                  active:shadow-none active:translate-x-[5px] active:translate-y-[5px]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                  hover:brightness-110
                "
              >
                FAKE!
              </button>
              <button
                onClick={() => handleInteraction('REAL')}
                disabled={disabled}
                className="
                  group relative py-4 px-2
                  bg-g-green text-white font-black uppercase tracking-widest text-lg
                  border-4 border-black dark:border-white rounded-lg
                  shadow-neo dark:shadow-neo-dark
                  active:shadow-none active:translate-x-[5px] active:translate-y-[5px]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                  hover:brightness-110
                "
              >
                REAL!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
