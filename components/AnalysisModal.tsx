import React from 'react';
import { NewsItem, VerificationResult } from '../types';
import { playSound } from '../services/audioService';

interface Props {
  item: NewsItem;
  userGuess: 'REAL' | 'FAKE' | 'TIMEOUT';
  verification?: VerificationResult | string | any;
  onClose?: () => void;
  onNext: () => void;
}

const AnalysisModal: React.FC<Props> = ({ item, userGuess, verification, onNext }) => {
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
      v = {
        authenticityScore: Number(verification.authenticityScore ?? 50),
        verdict: (verification.verdict ?? 'UNCERTAIN').toUpperCase(),
        reasoning: verification.reasoning ?? 'No explanation provided.',
        sources: verification.sources ?? [],
        usedSearch: !!verification.usedSearch,
        visualArtifacts: verification.visualArtifacts ?? [],
      };
    }
  } catch (e) {
    console.warn('Error parsing verification:', e, verification);
  }

  const correct = userGuess === item.type;
  const truthText = item.summary || item.explanation || v.reasoning || 'No additional information available.';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            background: correct ? '#2DBD6E' : '#E53E3E',
            padding: '28px 24px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: '#fff',
              margin: 0,
              letterSpacing: 1.2,
            }}
          >
            {correct ? 'NAILED IT!' : 'NOPE!'}
          </h1>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              margin: '8px 0 0',
              letterSpacing: 0.5,
            }}
          >
            You: <b>{userGuess}</b> &nbsp; vs &nbsp; Truth: <b>{item.type}</b>
          </p>
        </div>

        <div style={{ padding: '28px 24px' }}>
          <div
            style={{
              border: '2px solid #111',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 24,
              background: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: '#3B7FF5',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                i
              </div>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#3B7FF5',
                  margin: 0,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                THE TRUTH
              </h3>
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#333',
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}
            >
              {truthText}
            </p>
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
              padding: '16px 0',
              background: '#111',
              color: '#fff',
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: 1.5,
              border: '3px solid #000',
              borderRadius: 12,
              cursor: 'pointer',
              textTransform: 'uppercase',
              boxShadow: '4px 4px 0px 0px #000',
            }}
          >
            NEXT ROUND
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
