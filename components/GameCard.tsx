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

const GameCard: React.FC<GameCardProps> = ({
  item,
  onVote,
  disabled,
  difficulty,
  isDarkMode = false,
}) => {
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
    playSound(type === 'REAL' ? 'SUCCESS' : 'FAIL');

    onVote(type);
  };

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      <div className="neo-card" style={{ overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: 260, background: '#000' }}>
          <img
            src={imgSrc}
            alt=""
            onLoad={() => setLoaded(true)}
            onError={() => {
              setImgSrc('/fallback.jpg');
              setLoaded(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: loaded ? 0.8 : 0,
              transition: 'opacity 0.5s',
            }}
          />
        </div>

        <div style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 900 }}>{item.headline}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <button onClick={() => handleInteraction('FAKE')} disabled={disabled}>
              FAKE
            </button>
            <button onClick={() => handleInteraction('REAL')} disabled={disabled}>
              REAL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
