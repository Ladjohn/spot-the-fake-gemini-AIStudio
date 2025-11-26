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

  // ------------- IMAGE FIX ---------------
  const [imgSrc, setImgSrc] = useState<string>(
    item?.imageUrl && item.imageUrl !== "" ? item.imageUrl : "/placeholder.png"
  );

  useEffect(() => {
    setImgSrc(
      item?.imageUrl && item.imageUrl !== "" ? item.imageUrl : "/placeholder.png"
    );
  }, [item]);

  const handleImageError = () => {
    console.warn("Image failed, using placeholder:", item.imageUrl);
    setImgSrc("/placeholder.png");
  };
  // ----------------------------------------

  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSpeak = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (speaking) return;
    setSpeaking(true);
    await speakText(item.headline);
    setSpeaking(false);
  };

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled) return;
    if (navigator.vibrate) navigator.vibrate(10);
    onVote(type);
  };

  // ---------- SWIPE ----------
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || disabled) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - startX;
    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    if (Math.abs(offsetX) > 100) {
      const vote = offsetX > 0 ? 'REAL' : 'FAKE';
      const endX = offsetX > 0 ? 1000 : -1000;
      setOffsetX(endX);
      setTimeout(() => handleInteraction(vote), 120);
    } else {
      setOffsetX(0);
    }
  };

  const rotateDeg = (offsetX / 300) * 15;
  const opacityReal = Math.max(0, Math.min(1, offsetX / 150));
  const opacityFake = Math.max(0, Math.min(1, -offsetX / 150));

  // ---------- UI ----------
  return (
    <div className="w-full max-w-[90vw] md:max-w-md mx-auto my-4 relative select-none">
      
      {/* Desktop hints */}
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
          transition: isDragging ? "none" : "transform 0.25s ease"
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >

        {/* REAL overlay */}
        <div
          className="absolute inset-0 z-20 bg-g-green/80 flex items-center justify-center rounded-xl border-4 border-black pointer-events-none"
          style={{ opacity: opacityReal }}
        >
          <span className="text-white font-black text-6xl border-4 border-white px-6 py-2 transform -rotate-12 uppercase">
            REAL!
          </span>
        </div>

        {/* FAKE overlay */}
        <div
          className="absolute inset-0 z-20 bg-g-red/80 flex items-center justify-center rounded-xl border-4 border-black pointer-events-none"
          style={{ opacity: opacityFake }}
        >
          <span className="text-white font-black text-6xl border-4 border-white px-6 py-2 transform rotate-12 uppercase">
            FAKE!
          </span>
        </div>

        {/* CARD */}
        <div
          className="
          bg-white dark:bg-zinc-800
          border-4 border-black dark:border-white
          shadow-neo dark:shadow-neo-dark 
          rounded-xl overflow-hidden flex flex-col"
        >

          {/* IMAGE */}
          <div className="relative h-64 border-b-4 border-black bg-gray-200 flex items-center justify-center overflow-hidden">
            <img
              src={imgSrc}
              onError={handleImageError}
              alt="News visual"
              className="w-full h-full object-cover"
            />

            {/* Tags */}
            <div className="absolute top-4 right-4 bg-g-yellow text-black border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-lg">
              {item.category}
            </div>
            <div className="absolute top-4 left-4 bg-white text-black border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-lg">
              {item.difficulty}
            </div>
          </div>

          {/* TEXT */}
          <div className="p-6 flex flex-col gap-4 text-black dark:text-white relative">

            {/* Speak icon */}
            <button
              onClick={handleSpeak}
              disabled={speaking}
              className="absolute top-4 right-4 p-2 rounded-full border-2 border-black bg-white hover:bg-gray-100"
            >
              {speaking ? ICONS.LOADING : ICONS.SPEAKER}
            </button>

            <h2 className="text-2xl font-black leading-tight">{item.headline}</h2>
            <p className="text-sm opacity-80 border-l-4 border-g-blue pl-3">
              {item.summary}
            </p>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => handleInteraction("FAKE")}
                disabled={disabled}
                className="py-4 bg-g-red text-white font-black uppercase border-4 border-black rounded-lg shadow-neo"
              >
                FAKE!
              </button>

              <button
                onClick={() => handleInteraction("REAL")}
                disabled={disabled}
                className="py-4 bg-g-green text-white font-black uppercase border-4 border-black rounded-lg shadow-neo"
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
