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
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    }}
  >
    Emergency broadcast: the fake-or-real reactor is spitting sparks...
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
        background:
          'linear-gradient(135deg, #f7d748 0%, #f7d748 50%, #ff7a00 50%, #ff7a00 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 34px, rgba(0,0,0,0.09) 34px 38px), repeating-linear-gradient(90deg, transparent 0 34px, rgba(0,0,0,0.09) 34px 38px)',
          opacity: 0.65,
          pointerEvents: 'none',
        }}
      />

      <div
        className="neo-start-shell"
        style={{
          width: 'min(100%, 420px)',
          background: '#fffdf7',
          border: '4px solid #000',
          boxShadow: '12px 12px 0 #000',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -18,
            right: 18,
            background: '#00e0b8',
            border: '4px solid #000',
            boxShadow: '6px 6px 0 #000',
            padding: '8px 12px',
            transform: 'rotate(6deg)',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          Truth Meltdown
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              background: '#3b7ff5',
              border: '4px solid #000',
              boxShadow: '8px 8px 0 #000',
              transform: 'rotate(-10deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 30, letterSpacing: 1.6 }}>F.O.R</span>
          </div>

          <div
            style={{
              background: '#ff5e5b',
              border: '4px solid #000',
              boxShadow: '8px 8px 0 #000',
              padding: '12px 14px',
              textAlign: 'center',
              minWidth: 118,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.6, textTransform: 'uppercase' }}>Top Score</div>
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, marginTop: 6 }}>{best}</div>
          </div>
        </div>

        <div
          style={{
            fontFamily: "'Arial Black', 'Space Grotesk', sans-serif",
            fontSize: 'clamp(3rem, 9vw, 4.5rem)',
            lineHeight: 0.9,
            letterSpacing: -2.5,
            textTransform: 'uppercase',
            color: '#000',
            marginBottom: 14,
          }}
        >
          Fake
          <br />
          Or Real
        </div>

        <div
          style={{
            display: 'inline-block',
            background: '#fff',
            border: '3px solid #000',
            padding: '8px 12px',
            boxShadow: '5px 5px 0 #000',
            transform: 'rotate(-2deg)',
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 800,
            lineHeight: 1.3,
          }}
        >
          Swipe through absurd headlines.
          <br />
          Trust your gut. Break the streak if you blink.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: 'Rounds', value: '5', bg: '#f7d748' },
            { label: 'Lives', value: `${GAME_CONFIG.MAX_LIVES}`, bg: '#00e0b8' },
            { label: 'Mood', value: 'Chaos', bg: '#9f7aea' },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: item.bg,
                border: '3px solid #000',
                padding: '10px 8px',
                textAlign: 'center',
                boxShadow: '4px 4px 0 #000',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, marginTop: 6 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2.2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Choose Your Chaos
        </div>

        {(
          [
            { level: 'Easy', accent: '#f7d748', note: 'Warm up your lie detector' },
            { level: 'Medium', accent: '#3b7ff5', note: 'Balanced chaos' },
            { level: 'Hard', accent: '#ff5e5b', note: 'Maximum misinformation energy' },
          ] as const
        ).map(({ level, accent, note }) => (
          <button
            key={level}
            onClick={() => onStart(level)}
            className="neo-start-button"
            style={{
              width: '100%',
              marginBottom: 14,
              border: '4px solid #000',
              background: accent,
              boxShadow: '7px 7px 0 #000',
              padding: '16px 18px',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: "'Trebuchet MS', 'Arial Black', sans-serif",
              color: level === 'Medium' ? '#fff' : '#000',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1.1, textTransform: 'uppercase' }}>{level}</div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, marginTop: 4 }}>{note}</div>
          </button>
        ))}

        <div
          style={{
            marginTop: 8,
            background: '#000',
            color: '#fff',
            padding: '10px 12px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          No fluff. Just bold cards, weird facts, and hard calls.
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

  const bgColor = isDarkMode ? '#151515' : '#f6f1df';
  const cardBg = isDarkMode ? '#232323' : '#fffdf7';
  const textColor = isDarkMode ? '#fff' : '#000';
  const headerBg = isDarkMode ? '#0b0b0b' : '#fff';

  return (
    <div style={{ minHeight: '100vh', background: bgColor, display: 'flex', flexDirection: 'column', color: textColor }}>
      {gameState.status === 'ANALYSIS' && currentItem && userGuess && (
        <AnalysisModal item={currentItem} userGuess={userGuess} onNext={nextQuestion} />
      )}

      <header
        style={{
          background: headerBg,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          borderBottom: '4px solid #000',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: '#3B7FF5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-7deg)',
            flexShrink: 0,
            border: '3px solid #000',
            boxShadow: '5px 5px 0 #000',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, letterSpacing: 0.8 }}>F.O.R</span>
        </div>

        <div style={{ display: 'flex', gap: 12, flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              minWidth: 86,
              textAlign: 'center',
              border: '3px solid #000',
              background: isDarkMode ? '#1e1e1e' : '#F7D748',
              boxShadow: '4px 4px 0 #000',
              padding: '8px 10px',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, textTransform: 'uppercase' }}>Heat</div>
            <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>{gameState.streak}</div>
          </div>
          <div
            style={{
              minWidth: 96,
              textAlign: 'center',
              border: '3px solid #000',
              background: '#FF7A00',
              boxShadow: '4px 4px 0 #000',
              padding: '8px 10px',
              color: '#000',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.3, textTransform: 'uppercase' }}>Score</div>
            <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>{gameState.score}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={toggleSound}
            className="neo-border neo-shadow-sm neo-button"
            style={{
              width: 42,
              height: 42,
              background: soundOn ? '#2DBD6E' : '#FF5E5B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              position: 'relative',
            }}
          >
            {soundOn ? (
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.5 4.06c0-1.336-1.616-2.256-2.73-1.72l-5.24 3.102A1 1 0 005 7.25M9 19l-4.773-2.834A1 1 0 003 15.25V8.75a1 1 0 011.227-.96l4.773 2.834M9 19v4m0-11.726v.005" strokeWidth="2" stroke="currentColor" fill="none" />
              </svg>
            ) : (
              <div style={{ position: 'relative', width: 18, height: 18 }}>
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3 }}>
                  <path d="M13.5 4.06c0-1.336-1.616-2.256-2.73-1.72l-5.24 3.102A1 1 0 005 7.25M9 19l-4.773-2.834A1 1 0 003 15.25V8.75a1 1 0 011.227-.96l4.773 2.834M9 19v4m0-11.726v.005" />
                </svg>
                <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
              </div>
            )}
          </button>
          <button
            onClick={toggleTheme}
            className="neo-border neo-shadow-sm neo-button"
            style={{
              width: 42,
              height: 42,
              background: '#F7D748',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
            }}
          >
            {isDarkMode ? (
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.64 15.89c-.5-.11-1.033.122-1.141.66-.426 2.034-1.671 3.893-3.368 5.12-1.697 1.227-3.802 1.804-5.957 1.604-2.155-.2-4.149-1.17-5.541-2.562-1.392-1.392-2.362-3.386-2.562-5.541-.2-2.155.377-4.26 1.604-5.957 1.227-1.697 3.086-2.942 5.12-3.368.538-.108.77-.641.66-1.141-.11-.5-.641-.77-1.141-.66C5.275 3.71 3.12 5.075 1.71 7.078c-1.41 2.003-2.108 4.495-1.908 6.987.2 2.492.898 4.984 2.308 6.987 1.41 2.003 3.565 3.368 5.92 3.878 2.355.51 4.847.21 7.05-.9 2.203-1.11 4.008-2.975 5.118-5.178.11-.5-.122-1.033-.66-1.141z" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4m0 12v4M4.22 4.22l2.83 2.83m8.94 8.94l2.83 2.83M2 12h4m12 0h4M4.22 19.78l2.83-2.83m8.94-8.94l2.83-2.83" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          background: headerBg,
          borderBottom: '4px solid #000',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            background: '#000',
            color: '#fff',
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: 1.6,
            padding: '8px 14px',
            textTransform: 'uppercase',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #FF7A00',
          }}
        >
          Case {currentIndex + 1}/{totalItems}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {Array.from({ length: GAME_CONFIG.MAX_LIVES }).map((_, i) => (
            <div
              key={i}
              className="neo-border"
              style={{
                width: 18,
                height: 18,
                background: i < gameState.lives ? '#FF5E5B' : isDarkMode ? '#333' : '#d9d4c7',
                boxShadow: '2px 2px 0 #000',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: '22px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
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
          borderTop: '4px solid #000',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          className="neo-border"
          style={{
            flex: 1,
            height: 38,
            background: cardBg,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '4px 4px 0 #000',
          }}
        >
          <div
            style={{
              width: `${timerPercentage}%`,
              height: '100%',
              background: isUrgent ? '#FF5E5B' : '#3B7FF5',
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
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Clock {timeLeft}s
          </div>
        </div>

        <button
          onClick={skipQuestion}
          className="neo-border neo-shadow-sm neo-button"
          style={{
            padding: '0 20px',
            height: 44,
            background: '#00E0B8',
            color: '#000',
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: 1.2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
         <span style={{ fontSize: 16 }}>{'->'}</span> PASS
        </button>
      </div>
    </div>
  );
};

export default App;
