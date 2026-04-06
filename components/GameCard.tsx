import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { playSound } from '../services/audioService';

interface GameCardProps {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled }) => {
  const [imgSrc, setImgSrc] = useState(item?.imageUrl || "/placeholder.png");
  const [loaded, setLoaded] = useState(false);

  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const hasVoted = useRef(false);
  const startX = useRef(0);

  // 🔥 reset per new card
  useEffect(() => {
    setLoaded(false);
    setImgSrc(item?.imageUrl || "/placeholder.png");
    setOffsetX(0);
    hasVoted.current = false;
  }, [item]);

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled || hasVoted.current) return;

    hasVoted.current = true;

    navigator.vibrate?.([10, 30, 10]);
    playSound(type === 'REAL' ? 'SUCCESS' : 'ERROR');

    onVote(type);
  };

  // 👉 SWIPE START
  const handleStart = (clientX: number) => {
    if (disabled || hasVoted.current) return;
    setIsDragging(true);
    startX.current = clientX;
  };

  // 👉 SWIPE MOVE (GPU-friendly)
  const handleMove = (clientX: number) => {
    if (!isDragging || disabled || hasVoted.current) return;

    const delta = clientX - startX.current;
    const clamped = Math.max(-180, Math.min(180, delta));

    setOffsetX(clamped);
  };

  // 👉 SWIPE END
  const handleEnd = () => {
    if (!isDragging || hasVoted.current) return;

    setIsDragging(false);

    const threshold = 90;

    if (Math.abs(offsetX) > threshold) {
      const vote = offsetX > 0 ? 'REAL' : 'FAKE';

      // 🔥 smooth swipe out
      setOffsetX(offsetX > 0 ? 400 : -400);

      setTimeout(() => handleInteraction(vote), 100);
    } else {
      setOffsetX(0);
    }
  };

  const rotate = offsetX * 0.05;
  const opacityReal = Math.max(0, Math.min(1, offsetX / 100));
  const opacityFake = Math.max(0, Math.min(1, -offsetX / 100));

  return (
    <div className="w-full max-w-md mx-auto my-4 relative select-none">

      <div
        className="relative will-change-transform"
        style={{
          transform: `translate3d(${offsetX}px, 0, 0) rotate(${rotate}deg)`,
          transition: isDragging ? 'none' : 'transform 0.18s ease-out'
        }}

        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}

        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >

        {/* REAL */}
        <div
          className="absolute inset-0 z-20 bg-g-green/80 flex items-center justify-center rounded-xl border-4 border-black pointer-events-none"
          style={{ opacity: opacityReal }}
        >
          <span className="text-white font-black text-5xl">REAL</span>
        </div>

        {/* FAKE */}
        <div
          className="absolute inset-0 z-20 bg-g-red/80 flex items-center justify-center rounded-xl border-4 border-black pointer-events-none"
          style={{ opacity: opacityFake }}
        >
          <span className="text-white font-black text-5xl">FAKE</span>
        </div>

        {/* CARD */}
        <div className="bg-white border-4 border-black rounded-xl overflow-hidden shadow-neo">

          {/* IMAGE */}
          <div className="h-64 relative overflow-hidden bg-gray-200">

            {/* 🔥 skeleton (no blank flash) */}
            {!loaded && (
              <div className="absolute inset-0 animate-pulse bg-gray-300" />
            )}

            <img
              src={imgSrc}
              alt=""
              loading="eager"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.png";
                setLoaded(true);
              }}
              className={`w-full h-full object-cover transition-all duration-300 ${
                loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            />
          </div>

          {/* TEXT */}
          <div className="p-5">
            <h2 className="text-xl font-black mb-2">{item.headline}</h2>

            {/* BUTTONS */}
            <div className="grid grid-cols-2 gap-3 mt-4">

              <button
                onClick={() => handleInteraction('FAKE')}
                disabled={disabled}
                className="py-3 bg-g-red text-white font-black rounded active:scale-90 active:brightness-110 transition-all"
              >
                FAKE
              </button>

              <button
                onClick={() => handleInteraction('REAL')}
                disabled={disabled}
                className="py-3 bg-g-green text-white font-black rounded active:scale-90 active:brightness-110 transition-all"
              >
                REAL
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
