import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { playSound } from '../services/audioService';

interface GameCardProps {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isDarkMode?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Science:  { bg: '#F5C518', text: '#000' },
  Tech:     { bg: '#3B7FF5', text: '#fff' },
  Politics: { bg: '#9B51E0', text: '#fff' },
  Culture:  { bg: '#FF6B35', text: '#fff' },
  Health:   { bg: '#2DBD6E', text: '#fff' },
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy:   { bg: '#F7D748', text: '#000' },
  Medium: { bg: '#3B7FF5', text: '#fff' },
  Hard:   { bg: '#FF5E5B', text: '#000' },
};

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled, difficulty, isDarkMode = false }) => {
  const [imgSrc, setImgSrc] = useState(item?.imageUrl || '/placeholder.png');
  const [loaded, setLoaded] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const hasVoted = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    setLoaded(false);
    setImgSrc(item?.imageUrl || '/placeholder.png');
    setOffsetX(0);
    hasVoted.current = false;
  }, [item]);

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled || hasVoted.current) return;
    hasVoted.current = true;
    navigator.vibrate?.([10, 30, 10]);
    playSound(type === 'REAL' ? 'SUCCESS' : 'FAIL');
    onVote(type);
  };

  const handleStart = (clientX: number) => {
    if (disabled || hasVoted.current) return;
    setIsDragging(true);
    startX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled || hasVoted.current) return;
    const delta = clientX - startX.current;
    setOffsetX(Math.max(-180, Math.min(180, delta)));
  };

  const handleEnd = () => {
    if (!isDragging || hasVoted.current) return;
    setIsDragging(false);
    if (Math.abs(offsetX) > 90) {
      const vote = offsetX > 0 ? 'REAL' : 'FAKE';
      setOffsetX(offsetX > 0 ? 400 : -400);
      setTimeout(() => handleInteraction(vote), 100);
    } else {
      setOffsetX(0);
    }
  };

  const rotate = offsetX * 0.05;
  const opacityReal = Math.max(0, Math.min(1, offsetX / 100));
  const opacityFake = Math.max(0, Math.min(1, -offsetX / 100));

  const category = (item as any).category as string | undefined;
  const catStyle = category && CATEGORY_COLORS[category]
    ? CATEGORY_COLORS[category]
    : { bg: '#F5C518', text: '#000' };
  const diffStyle = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Medium;

  const cardBg = isDarkMode ? '#2a2a2a' : '#fff';

  return (
    <div
      className="select-none"
      style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}
    >
      <div
        style={{
          transform: `translate3d(${offsetX}px, 0, 0) rotate(${rotate}deg)`,
          transition: isDragging ? 'none' : 'transform 0.18s ease-out',
          willChange: 'transform',
          position: 'relative',
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => isDragging && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        {/* REAL swipe overlay */}
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'rgba(45,189,110,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: opacityReal, pointerEvents: 'none',
            border: '4px solid #000',
            boxShadow: '8px 8px 0 #000'
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 52, letterSpacing: 2 }}>REAL</span>
        </div>

        {/* FAKE swipe overlay */}
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'rgba(229,62,62,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: opacityFake, pointerEvents: 'none',
            border: '4px solid #000',
            boxShadow: '8px 8px 0 #000'
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 52, letterSpacing: 2 }}>FAKE</span>
        </div>

        {/* Card */}
        <div className="neo-card" style={{
          background: isDarkMode ? '#1f1f1f' : '#fffdf7',
          overflow: 'hidden',
        }}>
          {/* Image section */}
          <div style={{ position: 'relative', height: 250, background: isDarkMode ? '#444' : '#ddd', overflow: 'hidden', borderBottom: '4px solid #000' }}>
            {!loaded && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }} />
            )}
            <img
              src={imgSrc}
              alt=""
              loading="eager"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.png';
                setLoaded(true);
              }}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.3s'
              }}
            />

            {/* Difficulty badge */}
            <div className="neo-border neo-shadow-sm" style={{
              position: 'absolute', top: 14, left: 14,
              background: isDarkMode ? '#333' : diffStyle.bg, color: isDarkMode ? '#fff' : diffStyle.text,
              fontWeight: 900, fontSize: 11, letterSpacing: 1.5,
              padding: '6px 12px',
              textTransform: 'uppercase'
            }}>
              {difficulty}
            </div>

            {/* Category badge */}
            <div className="neo-border neo-shadow-sm" style={{
              position: 'absolute', top: 14, right: 14,
              background: catStyle.bg, color: catStyle.text,
              fontWeight: 900, fontSize: 11, letterSpacing: 1.5,
              padding: '6px 12px',
              textTransform: 'uppercase'
            }}>
              {category || 'SCIENCE'}
            </div>

            <div
              style={{
                position: 'absolute',
                left: 14,
                bottom: 14,
                background: '#000',
                color: '#fff',
                padding: '8px 10px',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Swipe left for fake / right for real
            </div>
          </div>

          {/* Content section */}
          <div style={{ padding: '22px 22px 24px', background: cardBg }}>
            <div
              style={{
                display: 'inline-block',
                marginBottom: 14,
                background: '#FF7A00',
                color: '#000',
                border: '3px solid #000',
                boxShadow: '4px 4px 0 #000',
                padding: '6px 10px',
                transform: 'rotate(-2deg)',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Breaking feed
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <h2 style={{
                flex: 1, margin: 0,
                fontWeight: 900, fontSize: 26, lineHeight: 1.05, color: isDarkMode ? '#fff' : '#000',
                fontFamily: "'Arial Black', 'Space Grotesk', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: -0.8,
              }}>
                {item.headline || (item as any).title}
              </h2>
            </div>

            {(item.summary || (item as any).description) && (
              <div style={{
                border: '3px solid #000',
                background: isDarkMode ? '#2b2b2b' : '#f3efe2',
                boxShadow: '5px 5px 0 #000',
                padding: '14px 16px',
                marginBottom: 24,
                color: isDarkMode ? '#bbb' : '#333',
                fontSize: 14,
                lineHeight: 1.6,
                fontWeight: 700
              }}>
                {item.summary || (item as any).description}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
              <button
                onClick={() => handleInteraction('FAKE')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button neo-vote-button"
                style={{
                  padding: '18px 0',
                  background: '#FF5E5B',
                  color: '#fff',
                  fontWeight: 900, fontSize: 20, letterSpacing: 1.5,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                FAKE!
              </button>

              <button
                onClick={() => handleInteraction('REAL')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button neo-vote-button"
                style={{
                  padding: '18px 0',
                  background: '#2DBD6E',
                  color: '#fff',
                  fontWeight: 900, fontSize: 20, letterSpacing: 1.5,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
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
