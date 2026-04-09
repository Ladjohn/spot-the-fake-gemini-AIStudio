import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { playSound } from '../services/audioService';

interface Props {
  item: NewsItem;
  onVote: (type: 'REAL' | 'FAKE') => void;
  disabled: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const GameCard: React.FC<Props> = ({ item, onVote, disabled }) => {
  const [imgSrc, setImgSrc] = useState(item?.imageUrl || '');
  const [loaded, setLoaded] = useState(false);
  const hasVoted = useRef(false);

  useEffect(() => {
    setLoaded(false);
    setImgSrc(item?.imageUrl || '');
    hasVoted.current = false;
  }, [item]);

  const handleClick = (type: 'REAL' | 'FAKE') => {
    if (disabled || hasVoted.current) return;

    hasVoted.current = true;
    playSound(type === 'REAL' ? 'SUCCESS' : 'FAIL');

    onVote(type);
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="neo-card">
        <div style={{ height: 260, background: '#000' }}>
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
              opacity: loaded ? 0.85 : 0,
              transition: 'opacity 0.4s',
            }}
          />
        </div>

        <div style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 900 }}>{item.headline}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button onClick={() => handleClick('FAKE')} disabled={disabled}>
              FAKE
            </button>
            <button onClick={() => handleClick('REAL')} disabled={disabled}>
              REAL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
