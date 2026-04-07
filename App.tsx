import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateQuizRound, preloadRound } from './services/geminiService';
import { playSound, startMusic, stopMusic } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import { getHighScore, setHighScore } from './utils/storage';

const LoadingScreen = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 22,
      fontWeight: 900,
      background: '#F5C518',
      color: '#000',
    }}
  >
    Loading Fake Or Real...
  </div>
);

const StartScreen: React.FC<{ onStart: (d: 'Easy' | 'Medium' | 'Hard') => void }> = ({ onStart }) => {
  const best = getHighScore();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5C518',
        padding: '20px',
      }}
    >
      <div style={{ background: '#F5C518', borderRadius: 32, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ background: '#fff', borderRadius: 24, width: 340, padding: '48px 32px 44px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div
              style={{
                width: 72,
                height: 72,
                background: '#3B7FF5',
                borderRadius: 14,
                transform: 'rotate(-8deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(59,127,245,0.4)',
                border: '3px solid #1e5cc8',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: 1 }}>F.O.R</span>
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              fontWeight: 900,
              fontSize: 42,
              lineHeight: 1.05,
              letterSpacing: -1.2,
              color: '#000',
              marginBottom: 10,
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            FAKE
            <br />
            OR REAL
          </div>

          <div style={{ textAlign: 'center', fontSize: 15, color: '#444', marginBottom: 26, lineHeight: 1.4 }}>
            Pick the right answer and learn the truth behind the headline.
          </div>

          <div style={{ border: '2px solid #222', borderRadius: 12, padding: '14px 0', textAlign: 'center', marginBottom: 28, background: '#fafafa' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: 1.8, marginBottom: 4, textTransform: 'uppercase' }}>BEST SCORE</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#2DBD6E', lineHeight: 1 }}>{best}</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 2.2, marginBottom: 14, textTransform: 'uppercase' }}>
            SELECT DIFFICULTY
          </div>

          {(['Easy', 'Medium', 'Hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => onStart(d)}
              style={{
                width: '100%',
                padding: '16px 0',
                marginBottom: 12,
                border: '2px solid #222',
                borderRadius: 12,
                background: d === 'Easy' ? '#fff7cc' : d === 'Medium' ? '#eef4ff' : '#ffe7e7',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: 1.2,
                color: '#000',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'Inter, sans-serif',
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

const fallbackItems: NewsItem[] = [
  {
    id: '1',
    headline: 'Octopus has 3 hearts',
    title: 'Octopus has 3 hearts',
    type: 'REAL',
    summary: 'Octopuses really do have three hearts - two pump blood to the gills and one pumps it to the body.',
  } as any,
  {
    id: '2',
    headline: 'Scientists taught cats to bark',
    title: 'Scientists taught cats to bark',
    type: 'FAKE',
    summary: 'No such study exists - cats are physically unable to produce dog-like barking sounds.',
  } as any,
];

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.TIMER_SECONDS);
  const [userGuess, setUserGuess] = useState<'REAL' | 'FAKE' | 'TIMEOUT' | null>(null);
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
    highScore: getHighScore(),
  });

  useEffect(() => {
    preloadRound();
    startMusic();
  }, []);

  useEffect(() => {
    if (gameState.status === 'GAME_OVER') {
      const saved = getHighScore();
      if (gameState.score > saved) {
        setHighScore(gameState.score);
      }
      playSound('GAMEOVER');
    }
  }, [gameState.status, gameState.score]);

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
  }, [gameState.status, currentIndex, startTimer, stopTimer]);

  const toggleSound = () => {
    if (soundOn) {
      stopMusic();
    } else {
      startMusic();
    }
    setSoundOn(prev => !prev);
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const startGame = async (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    playSound('CLICK');
    setLoading(true);
    setGameState(prev => ({
      ...prev,
      score: 0,
      streak: 0,
      lives: GAME_CONFIG.MAX_LIVES,
      status: 'PLAYING',
      difficulty,
    }));

    try {
      const items = await Promise.race([
        generateQuizRound(5),
        new Promise<NewsItem[]>(res => setTimeout(() => res([]), 8000)),
      ]);
      setQuizItems(items.length ? items : fallbackItems);
      setCurrentIndex(0);
    } catch {
      setQuizItems(fallbackItems);
    }

    setTimeout(() => setLoading(false), 300);
  };

  const handleVote = useCallback(
    (vote: 'REAL' | 'FAKE') => {
      if (gameState.status !== 'PLAYING') return;
      navigator.vibrate?.(15);

      const currentItem = quizItems[currentIndex];
      if (!currentItem) return;

      const isCorrect = vote === currentItem.type;
      const newLives = isCorrect ? gameState.lives : gameState.lives - 1;
      const willGameOver = newLives <= 0;

      setUserGuess(vote);
      setGameState(prev => {
        const newStreak = isCorrect ? prev.streak + 1 : 0;
        const bonus = newStreak >= 3 ? newStreak * 20 : 0;
        const newScore = prev.score + (isCorrect ? 100 + bonus : 0);
        return {
          ...prev,
          score: newScore,
          streak: newStreak,
          lives: newLives,
          status: willGameOver ? 'GAME_OVER' : 'ANALYSIS',
        };
      });
    },
    [quizItems, currentIndex, gameState.status, gameState.lives]
  );

  const nextQuestion = useCallback(async () => {
    setUserGuess(null);
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

  const skipQuestion = () => {
    playSound('CLICK');
    nextQuestion();
  };

  useEffect(() => {
    if (gameState.status !== 'ANALYSIS') return;
    const t = setTimeout(() => {
      nextQuestion();
    }, 10000);
    return () => clearTimeout(t);
  }, [gameState.status, nextQuestion]);

  if (loading) return <LoadingScreen />;
  if (gameState.status === 'IDLE' || gameState.status === 'GAME_OVER') {
    return <StartScreen onStart={startGame} />;
  }

  const currentItem = quizItems[currentIndex];
  const isUrgent = timeLeft <= 8;
  const totalItems = quizItems.length || 5;
  const timerPercentage = (timeLeft / GAME_CONFIG.TIMER_SECONDS) * 100;

  const bgColor = isDarkMode ? '#1a1a1a' : '#fefcf0';
  const cardBg = isDarkMode ? '#2a2a2a' : '#fff';
  const textColor = isDarkMode ? '#fff' : '#000';
  const headerBg = isDarkMode ? '#111' : '#fff';

  return (
    <div style={{ minHeight: '100vh', background: bgColor, display: 'flex', flexDirection: 'column', color: textColor }}>
      {gameState.status === 'ANALYSIS' && currentItem && userGuess && (
        <AnalysisModal item={currentItem} userGuess={userGuess} onNext={nextQuestion} />
      )}

      <header
        style={{
          background: headerBg,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid #000',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: '#3B7FF5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-5deg)',
            flexShrink: 0,
            border: '2px solid #000',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 0.4 }}>F.O.R</span>
        </div>

        <div style={{ display: 'flex', gap: 32, flex: 1, justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: isDarkMode ? '#aaa' : '#888', letterSpacing: 1.2, textTransform: 'uppercase' }}>STREAK</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: textColor, lineHeight: 1 }}>{gameState.streak}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: isDarkMode ? '#aaa' : '#888', letterSpacing: 1.2, textTransform: 'uppercase' }}>SCORE</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#3B7FF5', lineHeight: 1 }}>{gameState.score}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={toggleSound}
            className="neo-border neo-shadow-sm neo-button"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: soundOn ? '#2DBD6E' : '#E53E3E',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            {soundOn ? '?' : '×'}
          </button>
          <button
            onClick={toggleTheme}
            className="neo-border neo-shadow-sm neo-button"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#F5C518',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
            }}
          >
            {isDarkMode ? '?' : '?'}
          </button>
        </div>
      </header>

      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: headerBg,
          borderBottom: isDarkMode ? '1px solid #333' : '1px solid #eee',
        }}
      >
        <div
          className="neo-border"
          style={{
            background: isDarkMode ? '#333' : '#000',
            color: '#fff',
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: 1.5,
            padding: '6px 14px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}
        >
          ROUND {currentIndex + 1}/{totalItems}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: GAME_CONFIG.MAX_LIVES }).map((_, i) => (
            <div
              key={i}
              className="neo-border"
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: i < gameState.lives ? '#E53E3E' : isDarkMode ? '#444' : '#ddd',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {currentItem ? (
          <GameCard
            item={currentItem}
            onVote={handleVote}
            disabled={gameState.status === 'ANALYSIS'}
            difficulty={gameState.difficulty}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>LOADING...</div>
        )}
      </div>

      <div
        style={{
          padding: '16px',
          background: headerBg,
          borderTop: '3px solid #000',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          className="neo-border"
          style={{
            flex: 1,
            height: 32,
            background: cardBg,
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${timerPercentage}%`,
              height: '100%',
              background: isUrgent ? '#E53E3E' : '#3B7FF5',
              transition: 'width 1s linear, background 0.3s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 900,
              color: timerPercentage < 55 ? textColor : '#fff',
              letterSpacing: 0.5,
            }}
          >
            TIMER {timeLeft}s
          </div>
        </div>

        <button
          onClick={skipQuestion}
          className="neo-border neo-shadow-sm neo-button"
          style={{
            padding: '0 20px',
            height: 40,
            background: cardBg,
            color: textColor,
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: 1,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>{'>>'}</span> SKIP
        </button>
      </div>
    </div>
  );
};

export default App;
