// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { generateQuizRound, preloadRound } from './services/geminiService';
import { playSound } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import Timer from './components/Timer';
import SkipButton from './components/SkipButton';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center text-2xl font-black animate-pulse">
    🔍 Loading viral news...
  </div>
);

const fallbackItems: NewsItem[] = [
  { id: "1", headline: "Octopus has 3 hearts", title: "Octopus has 3 hearts", type: "REAL" },
  { id: "2", headline: "Cats can fly naturally", title: "Cats can fly naturally", type: "FAKE" }
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
    highScore: 0
  });

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastGuess, setLastGuess] = useState<'REAL' | 'FAKE' | 'TIMEOUT' | null>(null);

  // 🔥 PRELOAD (important)
  useEffect(() => {
    preloadRound();
  }, []);

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
    if (gameState.status !== 'PLAYING') return; // 🛡️ prevent spam

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
          className="px-6 py-3 bg-g-blue text-white font-black rounded active:scale-95 transition"
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default App;
