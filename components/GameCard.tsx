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
  Science: { bg: '#F5C518', text: '#000' },
  Tech: { bg: '#3B7FF5', text: '#fff' },
  Politics: { bg: '#9B51E0', text: '#fff' },
  Culture: { bg: '#FF6B35', text: '#fff' },
  Health: { bg: '#2DBD6E', text: '#fff' },
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: '#fff7cc', text: '#000' },
  Medium: { bg: '#eef4ff', text: '#000' },
  Hard: { bg: '#ffe7e7', text: '#000' },
};

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled, difficulty, isDarkMode = false }) => {
  const [imgSrc, setImgSrc] = useState(item?.imageUrl || '/placeholder.png');
  const [loaded, setLoaded] = useState(false);

  const hasVoted = useRef(false);

  useEffect(() => {
    setLoaded(false);
    setImgSrc(item?.imageUrl || '/placeholder.png');
    hasVoted.current = false;
  }, [item]);

  const handleInteraction = (type: 'REAL' | 'FAKE') => {
    if (disabled || hasVoted.current) return;
    hasVoted.current = true;
    navigator.vibrate?.([10, 30, 10]);
    playSound(type === 'REAL' ? 'SUCCESS' : 'FAIL');
    onVote(type);
  };

  const category = (item as any).category as string | undefined;
  const catStyle = category && CATEGORY_COLORS[category] ? CATEGORY_COLORS[category] : { bg: '#F5C518', text: '#000' };
  const diffStyle = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Medium;
  const cardBg = isDarkMode ? '#2a2a2a' : '#fff';
  const imagePlaceholderBg = isDarkMode ? 'linear-gradient(90deg, #3a3a3a 25%, #4a4a4a 50%, #3a3a3a 75%)' : 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)';

  return (
    <div className="select-none" style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      <div
        style={{
          position: 'relative',
        }}
      >
        <div className="neo-card" style={{ background: cardBg, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ position: 'relative', minHeight: 220, height: 'clamp(220px, 42vw, 320px)', background: isDarkMode ? '#444' : '#ddd', overflow: 'hidden', borderBottom: '3px solid #000' }}>
            {!loaded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: imagePlaceholderBg,
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            )}
            <img
              src={imgSrc}
              alt=""
              loading="eager"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={e => {
                const image = e.target as HTMLImageElement;
                if (!image.src.endsWith('/placeholder.png')) {
                  image.src = '/placeholder.png';
                }
                setLoaded(true);
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />

            <div
              className="neo-border neo-shadow-sm"
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: isDarkMode ? '#333' : diffStyle.bg,
                color: isDarkMode ? '#fff' : diffStyle.text,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 1,
                padding: '4px 12px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}
            >
              {difficulty}
            </div>

            <div
              className="neo-border neo-shadow-sm"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: catStyle.bg,
                color: catStyle.text,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 1,
                padding: '4px 12px',
                borderRadius: 4,
                textTransform: 'uppercase',
              }}
            >
              {category || 'SCIENCE'}
            </div>
          </div>

          <div style={{ padding: 'clamp(16px, 4vw, 24px)', background: cardBg }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 22 }}>
              <h2
                style={{
                  flex: 1,
                  margin: 0,
                  fontWeight: 900,
                  fontSize: 'clamp(20px, 4vw, 28px)',
                  lineHeight: 1.2,
                  color: isDarkMode ? '#fff' : '#000',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                {item.headline || (item as any).title}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
              <button
                onClick={() => handleInteraction('FAKE')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button"
                style={{
                  minHeight: 58,
                  padding: '16px 12px',
                  background: '#E53E3E',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 1.5,
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1,
                }}
              >
                FAKE!
              </button>

              <button
                onClick={() => handleInteraction('REAL')}
                disabled={disabled}
                className="neo-border neo-shadow neo-button"
                style={{
                  minHeight: 58,
                  padding: '16px 12px',
                  background: '#2DBD6E',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 1.5,
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.7 : 1,
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
