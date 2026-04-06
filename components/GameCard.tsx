import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { speakHeadline } from '../services/audioService';
import { ICONS } from '../constants';

interface GameCardProps {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled }) => {
  const [speaking, setSpeaking] = useState(false);

  const [imgSrc, setImgSrc] = useState(
    item?.imageUrl && item.imageUrl !== "" ? item.imageUrl : "/placeholder.png"
  );

  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  useEffect(() => {
    setImgSrc(item?.imageUrl && item.imageUrl !== "" ? item.imageUrl : "/placeholder.png");
  }, [item]);

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled) return;

    // 🔥 better haptic
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);

    onVote(type);
  };

  // 🔥 SWIPE IMPROVED
  const handleStart = (clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
    startX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled) return;
    setOffsetX(clientX - startX.current);
  };

  const handleEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    const threshold = 120;

    if (Math.abs(offsetX) > threshold) {
      const vote = offsetX > 0 ? 'REAL' : 'FAKE';

      // 🔥 smooth exit animation
      setOffsetX(offsetX > 0 ? 1000 : -1000);

      setTimeout(() => handleInteraction(vote), 150);
    } else {
      setOffsetX(0);
    }
  };

  const rotate = offsetX * 0.05;
  const opacityReal = Math.max(0, Math.min(1, offsetX / 120));
  const opacityFake = Math.max(0, Math.min(1, -offsetX / 120));

  return (
    <div className="w-full max-w-md mx-auto my-4 relative select-none">

      <div
        className="relative will-change-transform"
        style={{
          transform: `translateX(${offsetX}px) rotate(${rotate}deg)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out'
        }}

        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}

        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >

        {/* REAL overlay */}
        <div
          className="absolute inset-0 z-20 bg-g-green/80 flex items-center justify-center rounded-xl border-4 border-black pointer-events-none"
          style={{ opacity: opacityReal }}
        >
          <span className="text-white font-black text-5xl">REAL</span>
        </div>

        {/* FAKE overlay */}
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
                className="py-3 bg-g-red text-white font-black rounded active:scale-95 transition-transform"
              >
                FAKE
              </button>

              <button
                onClick={() => handleInteraction('REAL')}
                disabled={disabled}
                className="py-3 bg-g-green text-white font-black rounded active:scale-95 transition-transform"
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
