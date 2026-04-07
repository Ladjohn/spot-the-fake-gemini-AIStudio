// src/App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateQuizRound, preloadRound } from './services/geminiService';
import { playSound, startMusic, stopMusic } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import { getHighScore, setHighScore } from './utils/storage';

// ─── Loading ───────────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 22, fontWeight: 900,
    background: '#F5C518'
  }}>
    🔍 Loading viral news...
  </div>
);

// ─── Start Screen ──────────────────────────────────────────────────────────
const StartScreen: React.FC<{ onStart: (d: 'Easy' | 'Medium' | 'Hard') => void }> = ({ onStart }) => {
  const best = getHighScore();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5C518', padding: '20px' }}>
      {/* Outer yellow border container */}
      <div style={{ background: '#F5C518', borderRadius: 32, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        {/* Inner white card */}
        <div style={{ background: '#fff', borderRadius: 24, width: 340, padding: '48px 32px 44px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* SF Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{
              width: 72, height: 72, background: '#3B7FF5', borderRadius: 14,
              transform: 'rotate(-8deg)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: '0 6px 16px rgba(59,127,245,0.4)', border: '3px solid #1e5cc8'
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 28, letterSpacing: 1.2 }}>SF</span>
            </div>
          </div>
          
          {/* Title */}
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 44, lineHeight: 1.1, letterSpacing: -1.5, color: '#000', marginBottom: 8, fontFamily: 'Space Grotesk, sans-serif' }}>
            SPOT<br />THE<br />FAKE
          </div>
          
          {/* Subtitle */}
          <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#666', marginBottom: 28, letterSpacing: 0.3 }}>
            Viral News Edition
          </div>
          
          {/* Best Score Box */}
          <div style={{ border: '2px solid #222', borderRadius: 12, padding: '14px 0', textAlign: 'center', marginBottom: 28, background: '#fafafa' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: 1.8, marginBottom: 4, textTransform: 'uppercase' }}>YOUR BEST</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#2DBD6E', lineHeight: 1 }}>{best}</div>
          </div>
          
          {/* Difficulty Label */}
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 2.2, marginBottom: 14, textTransform: 'uppercase' }}>
            SELECT DIFFICULTY
          </div>
          
          {/* Difficulty Buttons */}
          {(['Easy', 'Medium', 'Hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => onStart(d)}
              style={{
                width: '100%', padding: '16px 0', marginBottom: 12,
                border: '2px solid #222', borderRadius: 12, background: '#fff',
                fontWeight: 800, fontSize: 16, letterSpacing: 1.6, color: '#000',
                cursor: 'pointer', transition: 'all 0.15s ease',
                fontFamily: 'Inter, sans-serif'
              }}
              onMouseDown={e => {
                e.currentTarget.style.transform = 'scale(0.96)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              onMouseUp={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
              }}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Fallback data ─────────────────────────────────────────────────────────
const fallbackItems: NewsItem[] = [
  { id: '1', headline: 'Octopus has 3 hearts', title: 'Octopus has 3 hearts', type: 'REAL', summary: 'Octopuses really do have three hearts — two pump blood to the gills and one pumps it to the body.' } as any,
  { id: '2', headline: 'Scientists taught cats to bark', title: 'Scientists taught cats to bark', type: 'FAKE', summary: 'No such study exists — cats are physically unable to produce dog-like barking sounds.' } as any,
];

// ─── App ───────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.TIMER_SECONDS);
  const timerRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<QuizState>({
    currentRound: 1,
    totalRoundsPlayed: 0,
    score: 0,
    streak: 0,
    lives: GAME_CONFIG.MAX_LIVES,
    history: [],
    status: 'IDLE',
    difficulty: 'Medium',
    highScore: getHighScore()
  });

  // ── Preload on mount
  useEffect(() => { preloadRound(); }, []);

  // ── Save high score when game ends
  useEffect(() => {
    if (gameState.status === 'GAME_OVER') {
      const saved = getHighScore();
      if (gameState.score > saved) {
        setHighScore(gameState.score);
      }
      playSound('GAMEOVER');
    }
  }, [gameState.status]);

  // ── Timer
  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(GAME_CONFIG.TIMER_SECONDS);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          setGameState(s => ({ ...s, status: 'GAME_OVER' }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    if (gameState.status === 'PLAYING') {
      startTimer();
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [gameState.status, currentIndex]);

  // ── Sound toggle
  const toggleSound = () => {
    if (soundOn) { stopMusic(); }
    else { startMusic(); }
    setSoundOn(prev => !prev);
  };

  // ── Start game
  const startGame = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    playSound('CLICK');
    setLoading(true);
    setGameState(prev => ({
      ...prev, score: 0, streak: 0,
      lives: GAME_CONFIG.MAX_LIVES,
      status: 'PLAYING', difficulty
    }));
    try {
      const items = await Promise.race([
        generateQuizRound(5),
        new Promise<NewsItem[]>(res => setTimeout(() => res([]), 8000))
      ]);
      setQuizItems(items.length ? items : fallbackItems);
      setCurrentIndex(0);
    } catch {
      setQuizItems(fallbackItems);
    }
    setTimeout(() => setLoading(false), 300);
  };

  // ── Vote — just updates score/lives/status, no nextQuestion call here
  const handleVote = useCallback((vote: 'REAL' | 'FAKE') => {
    if (gameState.status !== 'PLAYING') return;
    navigator.vibrate?.(15);

    const currentItem = quizItems[currentIndex];
    if (!currentItem) return;

    const isCorrect = vote === currentItem.type;
    const newLives = isCorrect ? gameState.lives : gameState.lives - 1;
    const willGameOver = newLives <= 0;

    setGameState(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const bonus = newStreak >= 3 ? newStreak * 20 : 0;
      const newScore = prev.score + (isCorrect ? 100 + bonus : 0);
      return {
        ...prev, score: newScore, streak: newStreak, lives: newLives,
        status: willGameOver ? 'GAME_OVER' : 'ANALYSIS'
      };
    });
  }, [quizItems, currentIndex, gameState.status, gameState.lives]);

  // ── Next question
  const nextQuestion = useCallback(async () => {
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
      return;
    }
    setLoading(true);
    try {
      const nextItems = await generateQuizRound(5);
      setQuizItems(nextItems.length ? nextItems : fallbackItems);
      setCurrentIndex(0);
      preloadRound();
    } catch {
      setQuizItems(fallbackItems);
    }
    setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    setLoading(false);
  }, [currentIndex, quizItems.length]);

  // ── Auto-advance when ANALYSIS — always uses fresh nextQuestion via effect
  useEffect(() => {
    if (gameState.status !== 'ANALYSIS') return;
    const t = setTimeout(() => { nextQuestion(); }, 700);
    return () => clearTimeout(t);
  }, [gameState.status, nextQuestion]);

  if (loading) return <LoadingScreen />;
  if (gameState.status === 'IDLE' || gameState.status === 'GAME_OVER') {
    return <StartScreen onStart={startGame} />;
  }

  const currentItem = quizItems[currentIndex];
  const isUrgent = timeLeft <= 8;
  const totalItems = quizItems.length || 5;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{
        background: '#fff',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #eee',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        {/* SF Logo */}
        <div style={{
          width: 36, height: 36, background: '#3B7FF5', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-5deg)', flexShrink: 0
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: 0.5 }}>SF</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, flex: 1, justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: 1.5 }}>STREAK</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111', lineHeight: 1 }}>{gameState.streak}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: 1.5 }}>SCORE</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#3B7FF5', lineHeight: 1 }}>{gameState.score}</div>
          </div>
        </div>

        {/* Sound + Timer circles */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: soundOn ? '#2DBD6E' : '#ccc',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', transition: 'background 0.2s'
            }}
            aria-label="Toggle sound"
          >
            {soundOn ? (
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" strokeWidth="0"/>
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Timer circle */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: isUrgent ? '#E53E3E' : '#F5C518',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s'
          }}>
            <span style={{ fontWeight: 900, fontSize: 13, color: isUrgent ? '#fff' : '#111' }}>
              {timeLeft}
            </span>
          </div>
        </div>
      </header>

      {/* ── Round + Lives row ───────────────────────────────────────── */}
      <div style={{
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{
          background: '#111', color: '#fff',
          fontWeight: 800, fontSize: 12, letterSpacing: 1,
          padding: '5px 12px', borderRadius: 20
        }}>
          ROUND {currentIndex + 1}/{totalItems}
        </div>

        {/* Lives as dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: GAME_CONFIG.MAX_LIVES }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 12, height: 12, borderRadius: '50%',
                background: i < gameState.lives ? '#E53E3E' : '#ddd',
                transition: 'background 0.3s'
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Streak banner ───────────────────────────────────────────── */}
      {gameState.streak >= 3 && (
        <div style={{
          textAlign: 'center', fontWeight: 900, fontSize: 14,
          color: '#E97316', marginBottom: 4
        }}>
          🔥 {gameState.streak} STREAK!
        </div>
      )}

      {/* ── Card area ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {currentItem ? (
          <GameCard
            item={currentItem}
            onVote={handleVote}
            disabled={gameState.status === 'ANALYSIS'}
            difficulty={gameState.difficulty}
          />
        ) : (
          <div style={{ marginTop: 40, fontSize: 16, color: '#888' }}>Loading next round…</div>
        )}
      </div>
    </div>
  );
};

export default App;
