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

const SpeakerIcon: React.FC<{ muted?: boolean }> = ({ muted = false }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    {!muted ? (
      <>
        <path d="M15.5 8.5a5 5 0 010 7" />
        <path d="M18.5 6a9 9 0 010 12" />
      </>
    ) : (
      <line x1="4" y1="4" x2="20" y2="20" />
    )}
  </svg>
);

const ThemeIcon: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  dark ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  )
);

const StartScreen: React.FC<{
  onStart: (d: 'Easy' | 'Medium' | 'Hard') => void;
  currentScore?: number;
  highScore?: number;
  isGameOver?: boolean;
}> = ({ onStart, currentScore = 0, highScore = 0, isGameOver = false }) => {
  const best = getHighScore();
  const shownHighScore = Math.max(best, highScore);

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
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#fff',
          border: '4px solid #000',
          boxShadow: '10px 10px 0 #000',
          padding: '28px 24px 22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: '#3B7FF5',
              transform: 'rotate(-8deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '6px 6px 0 #000',
              border: '3px solid #000',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: 1 }}>F.O.R</span>
          </div>

          <div
            style={{
              minWidth: 110,
              background: '#fff',
              border: '3px solid #000',
              boxShadow: '6px 6px 0 #000',
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>Best Score</div>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: '#2DBD6E' }}>{shownHighScore}</div>
          </div>
        </div>

        <div
          style={{
            textAlign: 'left',
            fontWeight: 900,
            fontSize: 46,
            lineHeight: 0.95,
            letterSpacing: -1.5,
            color: '#000',
            marginBottom: 12,
            fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase',
          }}
        >
          Fake
          <br />
          Or Real
        </div>

        <div
          style={{
            border: '3px solid #000',
            boxShadow: '5px 5px 0 #000',
            background: '#fff',
            padding: '12px 14px',
            marginBottom: 22,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.35,
          }}
        >
          Can you spot fact from fiction?
        </div>

        {isGameOver && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div style={{ border: '3px solid #000', boxShadow: '5px 5px 0 #000', background: '#FF7A00', padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>Your Score</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{currentScore}</div>
            </div>
            <div style={{ border: '3px solid #000', boxShadow: '5px 5px 0 #000', background: '#00D1B2', padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>Top Score</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{shownHighScore}</div>
            </div>
            <div style={{ gridColumn: '1 / -1', border: '3px solid #000', boxShadow: '5px 5px 0 #000', background: '#111', color: '#fff', padding: '12px 14px', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
              {currentScore >= shownHighScore ? 'New high score. Absolute menace.' : 'Round over. Hit play and beat it.'}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#111', letterSpacing: 2.2, marginBottom: 14, textTransform: 'uppercase' }}>
          {isGameOver ? 'Play Again' : 'Select Difficulty'}
        </div>

        {(['Easy', 'Medium', 'Hard'] as const).map(d => (
          <button
            key={d}
            onClick={() => onStart(d)}
            style={{
              width: '100%',
              padding: '18px 16px',
              marginBottom: 14,
              border: '3px solid #000',
              background: d === 'Easy' ? '#F7D548' : d === 'Medium' ? '#3B7FF5' : '#FF5A5F',
              color: d === 'Medium' ? '#fff' : '#000',
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 1.2,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '6px 6px 0 #000',
              fontFamily: 'Space Grotesk, sans-serif',
              textTransform: 'uppercase',
            }}
          >
            {d}
          </button>
        ))}
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
    return (
      <StartScreen
        onStart={startGame}
        currentScore={gameState.score}
        highScore={Math.max(gameState.highScore, getHighScore())}
        isGameOver={gameState.status === 'GAME_OVER'}
      />
    );
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
            <SpeakerIcon muted={!soundOn} />
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
            <ThemeIcon dark={isDarkMode} />
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
