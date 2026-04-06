// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { generateQuizRound } from './services/geminiService';
import { playSound, startMusic, stopMusic } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { ICONS, GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import Timer from './components/Timer';
import SkipButton from './components/SkipButton';

// 🔥 Simple Loading Screen (RESTORED)
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center text-2xl font-black animate-pulse">
    🔍 Loading viral news...
  </div>
);

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
    highScore: 0
  });

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastGuess, setLastGuess] = useState<'REAL' | 'FAKE' | 'TIMEOUT' | null>(null);

  // 🔥 PRELOAD ON LOAD (makes it feel instant)
  useEffect(() => {
    generateQuizRound(5);
  }, []);

  const startGame = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    playSound('CLICK');

    setLoading(true); // 🔥 show loader immediately

    setGameState(prev => ({
      ...prev,
      score: 0,
      streak: 0,
      lives: GAME_CONFIG.MAX_LIVES,
      status: 'PLAYING',
      difficulty
    }));

    try {
      // 🔥 reduced from 10 → 5 (faster)
      const items = await generateQuizRound(5);

      setQuizItems(items);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
      setQuizItems([]);
    }

    // 🔥 smooth transition
    setTimeout(() => setLoading(false), 300);
  };

  const handleVote = useCallback((vote: 'REAL' | 'FAKE') => {
    if (navigator.vibrate) navigator.vibrate(15); // 🔥 haptic

    const currentItem = quizItems[currentIndex];
    if (!currentItem) return;

    const isCorrect = vote === currentItem.type;

    setLastGuess(vote);

    setGameState(prev => {
      const newScore = prev.score + (isCorrect ? 100 : 0);
      const newLives = isCorrect ? prev.lives : prev.lives - 1;

      return {
        ...prev,
        score: newScore,
        lives: newLives,
        status: newLives <= 0 ? 'GAME_OVER' : 'ANALYSIS'
      };
    });

    setTimeout(() => setShowAnalysis(true), 150);
  }, [quizItems, currentIndex]);

  const nextQuestion = useCallback(async () => {
    // 🔥 instant next if available
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
      return;
    }

    // 🔥 fetch new batch
    setLoading(true);

    try {
      const nextItems = await generateQuizRound(5);
      setQuizItems(nextItems);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }, [currentIndex, quizItems.length]);

  // 🔥 SHOW LOADING SCREEN
  if (loading) return <LoadingScreen />;

  const currentItem = quizItems[currentIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">

      {currentItem ? (
        <>
          <GameCard
            item={currentItem}
            onVote={handleVote}
            disabled={gameState.status === 'ANALYSIS'}
          />

          <Timer
            duration={GAME_CONFIG.TIMER_SECONDS}
            onTimeUp={() => setGameState(prev => ({ ...prev, status: 'GAME_OVER' }))}
            active={gameState.status === 'PLAYING'}
          />

          <SkipButton onSkip={nextQuestion} />
        </>
      ) : (
        <button
          onClick={() => startGame('Medium')}
          className="px-6 py-3 bg-g-blue text-white font-black rounded active:scale-95 transition"
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default App;
