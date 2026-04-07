import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { playSound } from '../services/audioService';

interface GameCardProps {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Science:  { bg: '#F5C518', text: '#000' },
  Tech:     { bg: '#3B7FF5', text: '#fff' },
  Politics: { bg: '#9B51E0', text: '#fff' },
  Culture:  { bg: '#FF6B35', text: '#fff' },
  Health:   { bg: '#2DBD6E', text: '#fff' },
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy:   { bg: '#fff', text: '#000' },
  Medium: { bg: '#fff', text: '#000' },
  Hard:   { bg: '#fff', text: '#000' },
};

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled, difficulty }) => {
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

  return (
    <div
      className="select-none"
      style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}
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
            background: 'rgba(45,189,110,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 16, opacity: opacityReal, pointerEvents: 'none',
            border: '3px solid #000'
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 48 }}>REAL</span>
        </div>

        {/* FAKE swipe overlay */}
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'rgba(229,62,62,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 16, opacity: opacityFake, pointerEvents: 'none',
            border: '3px solid #000'
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 48 }}>FAKE</span>
        </div>

        {/* Card */}
        <div className="neo-card" style={{
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {/* Image section */}
          <div style={{ position: 'relative', height: 240, background: '#ddd', overflow: 'hidden', borderBottom: '3px solid #000' }}>
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
              position: 'absolute', top: 12, left: 12,
              background: diffStyle.bg, color: diffStyle.text,
              fontWeight: 800, fontSize: 11, letterSpacing: 1,
              padding: '4px 12px', borderRadius: 4,
              textTransform: 'uppercase'
            }}>
              {difficulty}
            </div>

            {/* Category badge */}
            <div className="neo-border neo-shadow-sm" style={{
              position: 'absolute', top: 12, right: 12,
              background: catStyle.bg, color: catStyle.text,
              fontWeight: 800, fontSize: 11, letterSpacing: 1,
              padding: '4px 12px', borderRadius: 4,
              textTransform: 'uppercase'
            }}>
              {category || 'SCIENCE'}
            </div>
          </div>

          {/* Content section */}
          <div style={{ padding: '20px 20px 24px' }}>
            {/* Headline row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <h2 style={{
                flex: 1, margin: 0,
                fontWeight: 900, fontSize: 22, lineHeight: 1.2, color: '#000',
                fontFamily: 'Space Grotesk, sans-serif'
              }}>
                {item.headline || (item as any).title}
              </h2>

              {/* Speaker button */}
              <button
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    const u = new SpeechSynthesisUtterance(item.headline || (item as any).title);
                    u.rate = 0.95;
                    window.speechSynthesis.speak(u);
                  }
                }}
                className="neo-border neo-shadow-sm neo-button"
                style={{
                  flexShrink: 0, width: 40, height: 40,
                  borderRadius: '50%',
                  background: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000'
                }}
                aria-label="Read headline aloud"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z" />
                </svg>
              </button>
            </div>

            {/* Summary with blue left border */}
            {(item.summary || (item as any).description) && (
              <div style={{
                borderLeft: '4px solid #3B7FF5',
                paddingLeft: 16,
                marginBottom: 24,
                color: '#333',
                fontSize: 15,
                lineHeight: 1.6,
                fontWeight: 500
              }}>
                {item.summary || (item as any).description}
              </div>
            )}

            {/* Vote buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
              <button
                onClick={() => handleInteraction('FAKE')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button"
                style={{
                  padding: '16px 0',
                  background: '#E53E3E',
                  color: '#fff',
                  fontWeight: 900, fontSize: 18, letterSpacing: 1.5,
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1
                }}
              >
                FAKE!
              </button>

              <button
                onClick={() => handleInteraction('REAL')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button"
                style={{
                  padding: '16px 0',
                  background: '#2DBD6E',
                  color: '#fff',
                  fontWeight: 900, fontSize: 18, letterSpacing: 1.5,
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1
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
