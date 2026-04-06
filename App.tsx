// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { generateQuizRound, preloadRound } from './services/geminiService';
import { playSound, startMusic, stopMusic } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { ICONS, GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import Timer from './components/Timer';
import SkipButton from './components/SkipButton';

// 🔥 Performance Logic
const getPerformanceText = (score: number) => {
  const percent = Math.min(100, Math.floor((score / 1000) * 100));

  if (percent >= 90) return "🔥 You're better than 95% of players";
  if (percent >= 70) return "😎 You’ve got sharp instincts";
  if (percent >= 50) return "🤔 Not bad, but AI fooled you";
  return "💀 You fell for the fake news hard";
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);

  const [gameState, setGameState] = useState<QuizState>(() => ({
    currentRound: 1,
    totalRoundsPlayed: 0,
    score: 0,
    streak: 0,
    lives: GAME_CONFIG.MAX_LIVES,
    history: [],
    status: 'IDLE',
    difficulty: 'Medium',
    highScore: typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('spotFakeHighScore') || '0')
      : 0
  }));

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastGuess, setLastGuess] = useState<'REAL' | 'FAKE' | 'TIMEOUT' | null>(null);

  // 🔥 Challenge detection (NEW)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeScore = params.get('challengeScore');

    if (challengeScore) {
      setTimeout(() => {
        alert(`🔥 Challenge: Beat ${challengeScore} points!`);
      }, 500);
    }
  }, []);

  useEffect(() => {
    preloadRound('Easy', 1);
    preloadRound('Medium', 1);
    preloadRound('Hard', 1);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    const shouldPlay = musicEnabled && (gameState.status === 'PLAYING' || gameState.status === 'ANALYSIS');
    if (shouldPlay) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [musicEnabled, gameState.status]);

  const startGame = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    playSound('CLICK');
    setLoading(true);

    setGameState(prev => ({
      ...prev,
      currentRound: 1,
      totalRoundsPlayed: 0,
      score: 0,
      streak: 0,
      lives: GAME_CONFIG.MAX_LIVES,
      history: [],
      status: 'PLAYING',
      difficulty
    }));

    try {
      const items = await generateQuizRound(difficulty, 10);
      setQuizItems(items);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
      setQuizItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = useCallback((vote: 'REAL' | 'FAKE') => {
    const currentItem = quizItems[currentIndex];
    if (!currentItem) return;

    const isCorrect = vote === currentItem.type.toUpperCase();
    setLastGuess(vote);

    setGameState(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newScore = prev.score + (isCorrect ? 100 + (newStreak * 10) : 0);
      const newLives = isCorrect ? prev.lives : prev.lives - 1;

      if (newScore > prev.highScore) {
        localStorage.setItem('spotFakeHighScore', newScore.toString());
      }

      return {
        ...prev,
        score: newScore,
        streak: newStreak,
        lives: newLives,
        highScore: Math.max(newScore, prev.highScore),
        status: newLives <= 0 ? 'GAME_OVER' : 'ANALYSIS'
      };
    });

    setTimeout(() => setShowAnalysis(true), 200);
  }, [quizItems, currentIndex]);

  const nextQuestion = useCallback(async () => {
    if (currentIndex < quizItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
      return;
    }

    setLoading(true);
    try {
      const nextItems = await generateQuizRound(gameState.difficulty, 5);
      setQuizItems(nextItems);
      setCurrentIndex(0);
      setGameState(prev => ({ ...prev, status: 'PLAYING' }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentIndex, quizItems.length, gameState.difficulty]);

  // 🔥 VIRAL SHARE (UPDATED)
  const handleShare = async () => {
    playSound('CLICK');

    const percent = Math.min(100, Math.floor((gameState.score / 1000) * 100));
    const url = `${window.location.origin}?challengeScore=${gameState.score}`;

    const text = `I scored ${gameState.score} on Spot-the-Fake 🤯

I beat ${percent}% of players.
Can you beat me? 👇
${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Spot-the-Fake Challenge',
          text,
          url
        });
      } catch (err) {
        console.log(err);
      }
    } else {
      navigator.clipboard.writeText(text);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // 🔥 GAME OVER (UPGRADED)
  if (gameState.status === 'GAME_OVER') {
    return (
      <div className="min-h-screen bg-g-red flex items-center justify-center p-4">
        <div className="bg-white p-8 border-4 border-black text-center rounded-xl">

          <h1 className="text-4xl font-black mb-4">GAME OVER 💀</h1>

          <div className="text-5xl font-black text-g-yellow mb-2">
            {gameState.score}
          </div>

          <p className="mb-6 font-bold">
            {getPerformanceText(gameState.score)}
          </p>

          {/* 🔥 FAKE LEADERBOARD */}
          <div className="mb-6 text-sm text-left">
            <p className="font-bold mb-2">🏆 Top Players</p>
            <div className="flex justify-between"><span>Aman</span><span>1240</span></div>
            <div className="flex justify-between"><span>Priya</span><span>980</span></div>
            <div className="flex justify-between"><span>Rahul</span><span>870</span></div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setGameState(prev => ({ ...prev, status: 'IDLE' }))}
              className="px-6 py-3 bg-g-blue text-white font-black rounded"
            >
              Play Again
            </button>

            <button
              onClick={handleShare}
              className="px-6 py-3 bg-black text-white font-black rounded"
            >
              🚀 Challenge
            </button>
          </div>

        </div>
      </div>
    );
  }

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
          className="px-6 py-3 bg-g-blue text-white font-black rounded"
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default App;
