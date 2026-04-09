import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateQuizRound, preloadRound } from './services/geminiService';
import { playSound, startMusic, stopMusic } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import { getHighScore, getThemePreference, setHighScore, setThemePreference } from './utils/storage';

/* ---------------- LOADING ---------------- */

const LOADING_LINES = [
  'Scanning the internet for deadly questions...',
  'Reading people\'s minds for suspicious facts...',
  'Polishing fake facts until they sparkle...',
];

let loadingLineBag: string[] = [];

function getRandomLoadingLine() {
  if (!loadingLineBag.length) {
    loadingLineBag = [...LOADING_LINES].sort(() => Math.random() - 0.5);
  }
  return loadingLineBag.pop() || LOADING_LINES[0];
}

/* ---------------- LOGO ---------------- */

const LogoMark: React.FC<{ size?: number; fontSize?: number }> = ({
  size = 72,
  fontSize = 24,
}) => (
  <div
    className="for-logo-build"
    style={{
      width: size,
      height: size,
      background: '#3B7FF5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `6px 6px 0 #000`,
      border: `3px solid #000`,
      fontSize,
    }}
  >
    <span>F.O.R</span>
  </div>
);

/* ---------------- LOADING SCREEN ---------------- */

const LoadingScreen = () => {
  const [line] = useState(getRandomLoadingLine);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5C518' }}>
      <div
        className="neo-card loading-card"
        style={{
          background: '#fff',
          padding: '28px',
          transform: 'translateZ(0)',
        }}
      >
        <LogoMark size={60} fontSize={18} />
        <p style={{ fontWeight: 900 }}>{line}</p>
      </div>
    </div>
  );
};

/* ---------------- APP ---------------- */

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
    highScore: getHighScore(),
  });

  const startGame = async () => {
    setLoading(true);
    setGameState(prev => ({ ...prev, status: 'PLAYING' }));

    try {
      const items = await generateQuizRound(5, 'Medium');
      setQuizItems(items);
    } catch {
      setQuizItems([]);
    }

    setCurrentIndex(0);
    setLoading(false);
  };

  const handleVote = (vote: 'REAL' | 'FAKE') => {
    const currentItem = quizItems[currentIndex];
    if (!currentItem) return;

    const isCorrect = vote === currentItem.type;

    setGameState(prev => ({
      ...prev,
      score: prev.score + (isCorrect ? 100 : 0),
      status: 'ANALYSIS',
    }));
  };

  const nextQuestion = () => {
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    } else {
      setGameState(prev => ({ ...prev, status: 'GAME_OVER' }));
    }
  };

  useEffect(() => {
    if (gameState.status === 'ANALYSIS') {
      const t = setTimeout(nextQuestion, 1500);
      return () => clearTimeout(t);
    }
  }, [gameState.status]);

  if (loading) return <LoadingScreen />;

  if (gameState.status === 'IDLE') {
    return (
      <div style={{ padding: 40 }}>
        <button onClick={startGame}>Start Game</button>
      </div>
    );
  }

  if (gameState.status === 'GAME_OVER') {
    return (
      <div style={{ padding: 40 }}>
        <h1>Score: {gameState.score}</h1>
        <button onClick={startGame}>Play Again</button>
      </div>
    );
  }

  const currentItem = quizItems[currentIndex];

  return (
    <div style={{ padding: 20 }}>
      {currentItem && (
        <GameCard
          item={currentItem}
          onVote={handleVote}
          disabled={gameState.status !== 'PLAYING'}
          difficulty="Medium"
        />
      )}
    </div>
  );
};

export default App;
