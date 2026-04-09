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
  Science: { bg: '#000', text: '#F5C518' }, // Swapped to Black bg to pop against the Yellow app bg
  Tech: { bg: '#3B7FF5', text: '#fff' },
  Politics: { bg: '#9B51E0', text: '#fff' },
  Culture: { bg: '#FF6B35', text: '#fff' },
  Health: { bg: '#2DBD6E', text: '#fff' },
};

const GameCard: React.FC<GameCardProps> = ({ item, onVote, disabled, difficulty, isDarkMode = false }) => {
  const [imgSrc, setImgSrc] = useState(item?.imageUrl || '');
  const [loaded, setLoaded] = useState(false);
  const hasVoted = useRef(false);

  useEffect(() => {
    setLoaded(false);
    setImgSrc(item?.imageUrl || '');
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
  const catStyle = category && CATEGORY_COLORS[category] ? CATEGORY_COLORS[category] : { bg: '#000', text: '#fff' };
  const cardBg = isDarkMode ? '#2a2a2a' : '#fff';

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      <div className="neo-card" style={{ background: cardBg, borderRadius: 0, overflow: 'hidden' }}>
        
        {/* Image Section */}
        <div style={{ position: 'relative', height: 260, background: '#000', borderBottom: '4px solid #000' }}>
          <img
            src={imgSrc}
            alt=""
            onLoad={() => setLoaded(true)}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              opacity: loaded ? 0.8 : 0, 
              transition: 'opacity 0.5s' 
            }}
          />
          
          {/* Difficulty Tag */}
          <div className="neo-border" style={{ position: 'absolute', top: 12, left: 12, background: '#fff', color: '#000', padding: '4px 10px', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>
            {difficulty}
          </div>

          {/* Category Tag */}
          <div className="neo-border" style={{ position: 'absolute', top: 12, right: 12, background: catStyle.bg, color: catStyle.text, padding: '4px 10px', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }}>
            {category || 'GENERAL'}
          </div>
        </div>

        {/* Text Content */}
        <div style={{ padding: '24px' }}>
          <h2 style={{ 
            margin: '0 0 24px 0', 
            fontWeight: 900, 
            fontSize: 28, 
            lineHeight: 1.1, 
            color: isDarkMode ? '#fff' : '#000',
            letterSpacing: -0.5
          }}>
            {item.headline}
          </h2>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="select-none">
            <button
              onClick={() => handleInteraction('FAKE')}
              disabled={disabled}
              className="neo-button neo-shadow neo-border"
              style={{
                padding: '20px',
                background: '#E53E3E',
                color: '#fff',
                fontWeight: 900,
                fontSize: 20,
                borderRadius: 0,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled && item.type !== 'FAKE' ? 0.3 : 1,
              }}
            >
              FAKE
            </button>

            <button
              onClick={() => handleInteraction('REAL')}
              disabled={disabled}
              className="neo-button neo-shadow neo-border"
              style={{
                padding: '20px',
                background: '#2DBD6E',
                color: '#fff',
                fontWeight: 900,
                fontSize: 20,
                borderRadius: 0,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled && item.type !== 'REAL' ? 0.3 : 1,
              }}
            >
              REAL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
