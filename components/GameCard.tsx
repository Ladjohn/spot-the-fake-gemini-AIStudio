import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { playSound } from '../services/audioService';

interface GameCardProps {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled }) => {
  const [imgSrc, setImgSrc] = useState(
    item?.imageUrl || "/placeholder.png"
  );

  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const hasVoted = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    setImgSrc(item?.imageUrl || "/placeholder.png");
    setOffsetX(0);
    hasVoted.current = false; // 🔥 reset per card
  }, [item]);

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled || hasVoted.current) return;

    hasVoted.current = true;

    // 🔥 haptic + sound
    navigator.vibrate?.([10, 30, 10]);
    playSound(type === 'REAL' ? 'SUCCESS' : 'ERROR');

    onVote(type);
  };

  // 🔥 swipe start
  const handleStart = (clientX: number) => {
    if (disabled || hasVoted.current) return;
    setIsDragging(true);
    startX.current = clientX;
  };

  // 🔥 swipe move (smoothed)
  const handleMove = (clientX: number) => {
    if (!isDragging || disabled || hasVoted.current) return;

    const delta = clientX - startX.current;

    // 🔥 limit max drag (prevents crazy jumps)
    const clamped = Math.max(-200, Math.min(200, delta));
    setOffsetX(clamped);
  };

  const handleEnd = () => {
    if (!isDragging || hasVoted.current) return;

    setIsDragging(false);

    const threshold = 100;

    if (Math.abs(offsetX) > threshold) {
      const vote = offsetX > 0 ? 'REAL' : 'FAKE';

      // 🔥 smooth exit
      setOffsetX(offsetX > 0 ? 500 : -500);

      setTimeout(() => handleInteraction(vote), 120);
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
          transform: `translateX(${offsetX}px) rotate(${rotate}deg)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
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
          <div className="h-64 bg-gray-200">
            <img
              src={imgSrc}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.png";
              }}
              className="w-full h-full object-cover"
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
