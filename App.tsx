import React, { useState, useEffect, useCallback } from 'react';
import { generateQuizRound, preloadRound } from './services/geminiService';
import { playSound, startMusic, stopMusic } from './services/audioService';
import { NewsItem, QuizState } from './types';
import { ICONS, GAME_CONFIG } from './constants';
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import Timer from './components/Timer';
import SkipButton from './components/SkipButton';

// Fun Loading Component
const FunLoadingScreen: React.FC = () => {
    const [mode, setMode] = useState(0); // 0: Newspaper, 1: TV, 2: Podcast
    
    useEffect(() => {
        const interval = setInterval(() => {
            setMode(prev => (prev + 1) % 3);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const content = [
        { 
            icon: '📰', 
            text: 'Scanning Headlines',
            sub: 'Reading between the lines...',
            color: 'bg-white',
            border: 'border-black'
        },
        { 
            icon: '📺', 
            text: 'Tuning Channels', 
            sub: 'Filtering the static...',
            color: 'bg-g-blue',
            border: 'border-black'
        },
        { 
            icon: '📡', 
            text: 'Intercepting Feeds', 
            sub: 'Decoding viral signals...',
            color: 'bg-g-red',
            border: 'border-black'
        }
    ];

    return (
        <div className="min-h-screen bg-g-yellow flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className={`
                ${content[mode].color} border-4 ${content[mode].border} 
                p-10 rounded-xl shadow-neo text-center max-w-sm w-full 
                animate-bounce-slight transition-colors duration-500
            `}>
                <div className="text-8xl mb-6 transition-transform duration-300 transform scale-110 drop-shadow-md">
                    {content[mode].icon}
                </div>
                <h2 className={`text-3xl font-black uppercase mb-2 ${content[mode].color === 'bg-white' ? 'text-black' : 'text-white'}`}>
                    {content[mode].text}
                </h2>
                <p className={`font-mono text-sm font-bold ${content[mode].color === 'bg-white' ? 'text-gray-600' : 'text-white/80'}`}>
                    {content[mode].sub}
                </p>
                
                <div className="mt-8 h-4 bg-black/20 rounded-full overflow-hidden border-2 border-black">
                     <div className="h-full bg-black animate-[slideIn_1.5s_infinite]"></div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  
  const [gameState, setGameState] = useState<QuizState>({
    currentRound: 1,
    totalRoundsPlayed: 0,
    score: 0,
    streak: 0,
    lives: GAME_CONFIG.MAX_LIVES,
    history: [],
    status: 'IDLE',
    difficulty: 'Medium',
    highScore: parseInt(localStorage.getItem('spotFakeHighScore') || '0')
  });

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastGuess, setLastGuess] = useState<'REAL' | 'FAKE' | 'TIMEOUT' | null>(null);

  // Pre-load rounds on mount
  useEffect(() => {
    preloadRound('Easy', 1);
    preloadRound('Medium', 1);
    preloadRound('Hard', 1);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Music State
  useEffect(() => {
    const shouldPlay = musicEnabled && (gameState.status === 'PLAYING' || gameState.status === 'ANALYSIS');
    
    if (shouldPlay) {
        startMusic();
    } else {
        stopMusic();
    }
    
    return () => {
       stopMusic();
    }
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
      difficulty: difficulty
    }));
    try {
      const items = await generateQuizRound(10, difficulty);
      setQuizItems(items);
      setCurrentIndex(0);
    } catch (e) {
      console.error("Error starting game", e);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = useCallback((vote: 'REAL' | 'FAKE') => {
    const currentItem = quizItems[currentIndex];
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
        history: [...prev.history, { itemId: currentItem.id, correct: isCorrect, timeTaken: 0 }],
        status: newLives <= 0 ? 'GAME_OVER' : 'ANALYSIS'
      };
    });
    
    setTimeout(() => {
        setShowAnalysis(true);
    }, 200);
  }, [quizItems, currentIndex]);

  const nextQuestion = useCallback(async () => {
     const newTotalRounds = gameState.totalRoundsPlayed + 1;
     
     if (newTotalRounds >= GAME_CONFIG.ROUNDS_PER_GAME) {
        playSound('WIN');
        setGameState(prev => ({ ...prev, status: 'COMPLETED', totalRoundsPlayed: newTotalRounds }));
        return;
     }
     
     setGameState(prev => ({ ...prev, totalRoundsPlayed: newTotalRounds }));

     if (currentIndex < quizItems.length - 1) {
       setCurrentIndex(prev => prev + 1);
       setGameState(prev => ({ ...prev, status: 'PLAYING' }));
     } else {
       setLoading(true);
       try {
         const nextItems = await generateQuizRound(5, gameState.difficulty);
         setQuizItems(nextItems);
         setCurrentIndex(0);
         setGameState(prev => ({ ...prev, currentRound: prev.currentRound + 1, status: 'PLAYING' }));
       } catch (e) {
           setGameState(prev => ({...prev, status: 'COMPLETED'}));
       } finally {
         setLoading(false);
       }
     }
  }, [currentIndex, quizItems.length, gameState.totalRoundsPlayed, gameState.difficulty]);


  const handleSkip = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(10);
    playSound('CLICK');
    setGameState(prev => ({
      ...prev,
      streak: 0
    }));
    nextQuestion();
  }, [nextQuestion]);

  const handleTimeUp = useCallback(() => {
    if (gameState.status !== 'PLAYING') return;
    setLastGuess('TIMEOUT');
    setGameState(prev => {
        const newLives = prev.lives - 1;
        return {
            ...prev,
            streak: 0,
            lives: newLives,
            status: newLives <= 0 ? 'GAME_OVER' : 'ANALYSIS'
        };
    });
    setShowAnalysis(true);
  }, [gameState.status]);

  const handleNextAfterAnalysis = useCallback(() => {
    setShowAnalysis(false);
    setLastGuess(null);
    if (gameState.lives <= 0) {
      playSound('GAMEOVER');
      setGameState(prev => ({...prev, status: 'GAME_OVER'}));
      return;
    }
    nextQuestion();
  }, [gameState.lives, nextQuestion]);

  const handleShare = async () => {
      playSound('CLICK');
      const text = `I scored ${gameState.score} on Spot-the-Fake! Can you beat my high score of ${gameState.highScore}? #SpotTheFake`;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Spot-the-Fake: Viral Edition',
                  text: text,
                  url: window.location.href
              });
          } catch (err) {
              console.log('Share failed', err);
          }
      } else {
          navigator.clipboard.writeText(text);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      }
  };


  // -- RENDER SCREENS --

  if (loading) {
    return <FunLoadingScreen />;
  }

  // IDLE
  if (gameState.status === 'IDLE') {
    return (
      <div className="min-h-screen bg-g-yellow flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent animate-pulse"></div>
        
        <div className="bg-white dark:bg-zinc-900 max-w-md w-full p-8 border-4 border-black dark:border-white shadow-neo dark:shadow-neo-dark rounded-xl text-center relative z-10">
            <div className="w-20 h-20 bg-g-blue text-white text-3xl font-black flex items-center justify-center border-4 border-black mx-auto mb-6 transform rotate-3 shadow-[4px_4px_0px_0px_black]">
                SF
            </div>
            <h1 className="text-5xl font-display font-black text-black dark:text-white mb-2 uppercase tracking-tighter leading-none">
                Spot<br/>The<br/>Fake
            </h1>
            <p className="text-gray-600 dark:text-gray-300 font-bold mb-6 text-lg">Viral News Edition</p>

            {gameState.highScore > 0 && (
               <div className="mb-6 bg-gray-100 dark:bg-zinc-800 p-2 rounded border-2 border-black dark:border-white transform -rotate-1">
                  <p className="text-xs font-black uppercase text-gray-500">Your Best</p>
                  <p className="text-2xl font-black text-g-green">{gameState.highScore}</p>
               </div>
            )}

            <div className="space-y-3">
                <p className="text-xs font-black uppercase text-gray-400">Select Difficulty</p>
                {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                    <button 
                        key={diff}
                        onClick={() => startGame(diff)}
                        className="w-full py-4 bg-white dark:bg-zinc-800 text-black dark:text-white font-black rounded-lg border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-all uppercase tracking-widest flex justify-between px-6 group"
                    >
                        <span>{diff}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // GAME OVER / COMPLETED
  if (gameState.status === 'GAME_OVER' || gameState.status === 'COMPLETED') {
    const isWin = gameState.status === 'COMPLETED';
    return (
        <div className={`min-h-screen ${isWin ? 'bg-g-green' : 'bg-g-red'} flex items-center justify-center p-4 relative`}>
            {/* Toast Notification */}
            {showToast && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full font-bold shadow-lg animate-bounce z-50 whitespace-nowrap">
                   📋 Score copied to clipboard!
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 max-w-md w-full p-8 border-4 border-black dark:border-white shadow-neo-dark rounded-xl text-center">
                <h1 className="text-5xl font-display font-black text-black dark:text-white mb-2 uppercase">
                    {isWin ? 'VICTORY!' : 'BUSTED!'}
                </h1>
                <p className="text-black dark:text-white font-bold mb-8">
                    {isWin ? 'You survived the viral cycle.' : 'You believed the lies.'}
                </p>
                
                <div className="bg-black dark:bg-white text-white dark:text-black p-6 rounded-lg mb-8 border-2 border-transparent transform rotate-1">
                    <div className="text-sm uppercase tracking-widest mb-1 font-bold">Final Score</div>
                    <div className="text-6xl font-black text-g-yellow">{gameState.score}</div>
                </div>

                <div className="space-y-3 mb-8 text-center">
                     <div className="flex justify-between text-sm p-3 border-2 border-black dark:border-white bg-gray-50 dark:bg-zinc-800 text-black dark:text-white">
                        <span className="font-bold">Your Personal Best</span>
                        <span className="font-mono font-bold text-g-blue">{gameState.highScore}</span>
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={() => {
                          playSound('CLICK');
                          setGameState(prev => ({...prev, status: 'IDLE'}));
                        }}
                        className="w-full py-3 bg-g-blue text-white font-black rounded-lg border-4 border-black dark:border-white shadow-neo hover:shadow-neo-hover transition-all uppercase tracking-widest text-sm"
                    >
                        Play Again
                    </button>
                    <button 
                        onClick={handleShare}
                        className="w-full py-3 bg-white dark:bg-zinc-800 text-black dark:text-white font-black rounded-lg border-4 border-black dark:border-white shadow-neo hover:shadow-neo-hover transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                    >
                        {ICONS.SHARE} Share
                    </button>
                </div>
            </div>
        </div>
    )
  }

  const currentItem = quizItems[currentIndex];

  // PLAYING
  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative selection:bg-g-yellow selection:text-black bg-off-white dark:bg-neo-black">
      
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 bg-white dark:bg-zinc-900 border-b-4 border-black dark:border-white flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-2">
             <div className="w-10 h-10 bg-g-blue border-2 border-black text-white flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_0px_black] dark:shadow-[2px_2px_0px_0px_white]">
                 SF
             </div>
             <span className="font-display font-black text-xl hidden sm:block tracking-tighter text-black dark:text-white">Spot-the-Fake</span>
         </div>
         
         <div className="flex items-center gap-6 font-mono">
             <div className="flex flex-col items-center">
                 <span className="text-[10px] font-bold uppercase text-gray-500">Streak</span>
                 <span className={`font-black text-xl text-black dark:text-white ${gameState.streak > 2 ? 'text-g-red animate-bounce' : ''}`}>
                     {gameState.streak}
                 </span>
             </div>
             <div className="flex flex-col items-center">
                 <span className="text-[10px] font-bold uppercase text-gray-500">Score</span>
                 <span className="font-black text-xl text-g-blue">{gameState.score}</span>
             </div>
         </div>

         <div className="flex gap-2">
             <button
                onClick={() => setMusicEnabled(!musicEnabled)}
                className={`w-10 h-10 flex items-center justify-center border-2 border-black dark:border-white rounded-full transition-transform hover:scale-110 ${musicEnabled ? 'bg-g-green text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'}`}
             >
                 {musicEnabled ? ICONS.MUSIC : ICONS.MUSIC_OFF}
             </button>

             <button 
                onClick={() => { playSound('CLICK'); setDarkMode(!darkMode); }}
                className="w-10 h-10 flex items-center justify-center border-2 border-black dark:border-white bg-g-yellow rounded-full hover:scale-110 transition-transform"
             >
                {darkMode ? '☀️' : '🌙'}
             </button>
         </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 pt-28 pb-20 px-4 flex flex-col items-center justify-center relative w-full max-w-3xl mx-auto">
        <div className="absolute top-20 left-10 w-32 h-32 bg-g-blue rounded-full opacity-20 blur-3xl animate-bounce-slight delay-700"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-g-red rounded-full opacity-20 blur-3xl animate-bounce-slight"></div>

        {currentItem && (
            <div className="w-full flex flex-col items-center animate-slide-in">
                 
                 <div className="w-full max-w-md mb-4 flex justify-between items-center px-2">
                     <span className="text-xs font-black bg-black text-white px-2 py-1 transform -rotate-1 border-2 border-white">
                         ROUND {gameState.totalRoundsPlayed + 1} / {GAME_CONFIG.ROUNDS_PER_GAME}
                     </span>
                     <div className="flex gap-1">
                        {[...Array(GAME_CONFIG.MAX_LIVES)].map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 border-black dark:border-white transition-colors ${i < gameState.lives ? 'bg-g-red' : 'bg-transparent'}`} />
                        ))}
                    </div>
                 </div>
                 
                 <GameCard 
                    key={currentItem.id}
                    item={currentItem} 
                    onVote={handleVote} 
                    disabled={gameState.status === 'ANALYSIS'}
                 />

                 <div className="w-full max-w-md mt-6 flex items-center gap-4">
                    <div className="flex-1">
                       <Timer 
                         duration={GAME_CONFIG.TIMER_SECONDS} 
                         onTimeUp={handleTimeUp} 
                         active={gameState.status === 'PLAYING'}
                       />
                    </div>
                    <SkipButton 
                      onSkip={handleSkip} 
                      disabled={gameState.status !== 'PLAYING'}
                    />
                 </div>
            </div>
        )}
      </main>

      {showAnalysis && currentItem && lastGuess && (
        <AnalysisModal 
            item={currentItem}
            userGuess={lastGuess}
            onClose={() => setShowAnalysis(false)} 
            onNext={handleNextAfterAnalysis}
        />
      )}
    </div>
  );
};

export default App;
