// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { generateQuizRound, preloadRound } from './services/geminiService';
import { playSound } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import Timer from './components/Timer';
import SkipButton from './components/SkipButton';
import { getHighScore, setHighScore } from './utils/storage';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center text-2xl font-black animate-pulse" style={{ background: '#F5C518' }}>
    🔍 Loading viral news...
  </div>
);

const StartScreen: React.FC<{ onStart: (d: 'Easy' | 'Medium' | 'Hard') => void }> = ({ onStart }) => {
  const best = getHighScore();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#F5C518' }}
    >
      <div
        className="bg-white rounded-3xl flex flex-col items-center"
        style={{
          width: 320,
          padding: '36px 28px 40px',
          boxShadow: '0 6px 32px rgba(0,0,0,0.13)'
        }}
      >
        {/* SF Logo */}
        <div
          style={{
            width: 64,
            height: 64,
            background: '#3B7FF5',
            borderRadius: 12,
            transform: 'rotate(-6deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 4px 12px rgba(59,127,245,0.35)'
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: 1 }}>SF</span>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 40, lineHeight: 1.05, letterSpacing: -1, color: '#111' }}>
            SPOT<br />THE<br />FAKE
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ fontWeight: 600, fontSize: 14, color: '#555', marginBottom: 24, letterSpacing: 0.5 }}>
          Viral News Edition
        </div>

        {/* Your Best */}
        <div
          style={{
            width: '100%',
            border: '1.5px solid #e0e0e0',
            borderRadius: 10,
            padding: '10px 0',
            textAlign: 'center',
            marginBottom: 22
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1.5, marginBottom: 2 }}>
            YOUR BEST
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#2DBD6E', lineHeight: 1 }}>
            {best}
          </div>
        </div>

        {/* Difficulty label */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 2, marginBottom: 12 }}>
          SELECT DIFFICULTY
        </div>

        {/* Difficulty buttons */}
        {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
          <button
            key={d}
            onClick={() => onStart(d)}
            style={{
              width: '100%',
              padding: '14px 0',
              marginBottom: 10,
              border: '1.5px solid #ddd',
              borderRadius: 10,
              background: '#fff',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: 1.5,
              color: '#222',
              cursor: 'pointer',
              transition: 'background 0.12s, transform 0.1s'
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {d.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

const fallbackItems: NewsItem[] = [
  { id: "1", headline: "Octopus has 3 hearts", title: "Octopus has 3 hearts", type: "REAL" } as any,
  { id: "2", headline: "Cats can fly naturally", title: "Cats can fly naturally", type: "FAKE" } as any
];

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastGuess, setLastGuess] = useState<'REAL' | 'FAKE' | 'TIMEOUT' | null>(null);

  // 🔥 PRELOAD (important)
  useEffect(() => {
    preloadRound();
  }, []);

  // Save high score when game ends
  useEffect(() => {
    if (gameState.status === 'GAME_OVER') {
      const saved = getHighScore();
      if (gameState.score > saved) {
        setHighScore(gameState.score);
        setGameState(prev => ({ ...prev, highScore: gameState.score }));
      }
    }
  }, [gameState.status]);

  const startGame = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    playSound('CLICK');
    setLoading(true);

    setGameState(prev => ({
      ...prev,
      score: 0,
      streak: 0,
      lives: GAME_CONFIG.MAX_LIVES,
      status: 'PLAYING',
      difficulty
    }));

    try {
      const items = await Promise.race([
        generateQuizRound(5),
        new Promise<NewsItem[]>((res) => setTimeout(() => res([]), 8000))
      ]);

      setQuizItems(items.length ? items : fallbackItems);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
      setQuizItems(fallbackItems);
    }

    setTimeout(() => setLoading(false), 300);
  };

  const handleVote = useCallback((vote: 'REAL' | 'FAKE') => {
    if (gameState.status !== 'PLAYING') return;

    navigator.vibrate?.(15);

    const currentItem = quizItems[currentIndex];
    if (!currentItem) return;

    const isCorrect = vote === currentItem.type;
    setLastGuess(vote);

    setGameState(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const bonus = newStreak >= 3 ? newStreak * 20 : 0;

      const newScore = prev.score + (isCorrect ? 100 + bonus : 0);
      const newLives = isCorrect ? prev.lives : prev.lives - 1;

      return {
        ...prev,
        score: newScore,
        streak: newStreak,
        lives: newLives,
        status: newLives <= 0 ? 'GAME_OVER' : 'ANALYSIS'
      };
    });

    setTimeout(() => setShowAnalysis(true), 250);
  }, [quizItems, currentIndex, gameState.status]);

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

      // 🔥 preload next (pro move)
      preloadRound();
    } catch (e) {
      console.error(e);
      setQuizItems(fallbackItems);
    }

    setLoading(false);
  }, [currentIndex, quizItems.length]);

  if (loading) return <LoadingScreen />;

  // Show start screen when idle or game over
  if (gameState.status === 'IDLE' || gameState.status === 'GAME_OVER') {
    return <StartScreen onStart={startGame} />;
  }

  const currentItem = quizItems[currentIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">

      {/* 📊 PROGRESS */}
      <div className="text-xs font-bold text-gray-500 mb-2">
        Question {currentIndex + 1}
      </div>

      {/* 🔥 STREAK */}
      {gameState.streak > 1 && (
        <div className="mb-2 text-lg font-black text-orange-500 animate-bounce">
          🔥 {gameState.streak} STREAK!
        </div>
      )}

      {/* ⚠️ LAST LIFE */}
      {gameState.lives === 1 && (
        <div className="mb-2 text-red-500 font-black animate-pulse">
          ⚠️ LAST LIFE
        </div>
      )}

      {currentItem ? (
        <>
          <div className="animate-fade-in">
            <GameCard
              item={currentItem}
              onVote={handleVote}
              disabled={gameState.status === 'ANALYSIS'}
            />
          </div>

          <Timer
            duration={GAME_CONFIG.TIMER_SECONDS}
            onTimeUp={() =>
              setGameState(prev => ({ ...prev, status: 'GAME_OVER' }))
            }
            active={gameState.status === 'PLAYING'}
          />

          <SkipButton onSkip={nextQuestion} />
        </>
      ) : (
        <button
          onClick={() => startGame('Medium')}
          className="px-6 py-3 bg-blue-500 text-white font-black rounded active:scale-95 transition"
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default App;
