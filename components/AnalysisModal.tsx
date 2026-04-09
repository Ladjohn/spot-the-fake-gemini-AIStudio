import React from 'react';
import { NewsItem, VerificationResult } from '../types';
import { playSound } from '../services/audioService';

interface Props {
  item: NewsItem;
  userGuess: 'REAL' | 'FAKE' | 'TIMEOUT';
  verification?: VerificationResult | string | any;
  onNext: () => void;
  isDarkMode?: boolean; // Added prop
}

const AnalysisModal: React.FC<Props> = ({ item, userGuess, verification, onNext, isDarkMode = false }) => {
  let v: VerificationResult = {
    authenticityScore: 50,
    verdict: 'UNCERTAIN',
    reasoning: 'No verification available.',
    sources: [],
    usedSearch: false,
    visualArtifacts: [],
  };

  try {
    if (typeof verification === 'string') {
      const maybe = JSON.parse(verification);
      v = {
        authenticityScore: Number(maybe.authenticityScore ?? 50),
        verdict: (maybe.verdict ?? 'UNCERTAIN').toUpperCase(),
        reasoning: maybe.reasoning ?? 'No explanation provided.',
        sources: maybe.sources ?? [],
        usedSearch: !!maybe.usedSearch,
        visualArtifacts: maybe.visualArtifacts ?? [],
      };
    } else if (verification) {
      v = { ...v, ...verification };
    }
  } catch (e) {
    console.warn('Error parsing verification:', e);
  }

  const correct = userGuess === item.type;
  const truthText = item.summary || item.explanation || v.reasoning || 'No additional information available.';

  // Theme Variables
  const modalBg = isDarkMode ? '#1f1f1f' : '#fff';
  const textColor = isDarkMode ? '#fff' : '#111';
  const subTextColor = isDarkMode ? '#aaa' : '#444';
  const boxBg = isDarkMode ? '#2a2a2a' : '#fafafa';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: modalBg,
          border: '4px solid #000', // Thick Brutalist Border
          width: '100%',
          maxWidth: 420,
          overflow: 'hidden',
          boxShadow: '12px 12px 0px 0px #000', // Heavy Brutalist Shadow
          transform: 'rotate(-1deg)', // Slight rotation for "vibe"
        }}
      >
        <div
          style={{
            background: correct ? '#2DBD6E' : '#E53E3E',
            padding: '28px 24px',
            textAlign: 'center',
            borderBottom: '4px solid #000',
          }}
        >
          <h1
            style={{
              fontSize: 42,
              fontWeight: 900,
              color: '#fff',
              margin: 0,
              letterSpacing: -1,
              textTransform: 'uppercase',
              textShadow: '3px 3px 0px #000',
            }}
          >
            {correct ? 'NAILED IT!' : 'BUSTED!'}
          </h1>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#000', background: '#fff', display: 'inline-block', padding: '2px 8px', marginTop: 10, textTransform: 'uppercase' }}>
            {userGuess} WAS {correct ? 'CORRECT' : 'WRONG'}
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          <div
            style={{
              border: '3px solid #000',
              padding: '16px',
              background: boxBg,
              boxShadow: '4px 4px 0px 0px #000',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{item.type === 'REAL' ? '✅' : '❌'}</span>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: textColor, margin: 0, textTransform: 'uppercase' }}>
                The Actual Truth
              </h3>
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: textColor, margin: 0, lineHeight: 1.5 }}>
              {truthText}
            </p>
            
            {item.source && (
              <a 
                href={item.source} 
                target="_blank" 
                rel="noreferrer"
                style={{ display: 'block', marginTop: 12, fontSize: 11, fontWeight: 900, color: '#3B7FF5', textDecoration: 'none', textTransform: 'uppercase' }}
              >
                🔗 Verify via Source
              </a>
            )}
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <button
            className="neo-button"
            onClick={() => {
              navigator.vibrate?.(12);
              playSound('CLICK');
              onNext();
            }}
            style={{
              width: '100%',
              padding: '18px 0',
              background: '#3B7FF5', // Changed to blue to separate from "Truth" colors
              color: '#fff',
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 1.5,
              border: '3px solid #000',
              cursor: 'pointer',
              textTransform: 'uppercase',
              boxShadow: '6px 6px 0px 0px #000',
            }}
          >
            NEXT ROUND →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
