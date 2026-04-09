import React, { useState, useEffect } from 'react';
import GameCard from './components/GameCard';
import { generateQuizRound } from './services/geminiService';
import { NewsItem } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quizItems, setQuizItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'ANALYSIS'>('IDLE');

  const startGame = async () => {
    setLoading(true);
    setStatus('PLAYING');

    try {
      const items = await generateQuizRound(5, 'Medium');
      setQuizItems(items);
    } catch {
      setQuizItems([]);
    }

    setCurrentIndex(0);
    setLoading(false);
  };

  const handleVote = () => {
    setStatus('ANALYSIS');
  };

  useEffect(() => {
    if (status === 'ANALYSIS') {
      const t = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setStatus('PLAYING');
      }, 1500);

      return () => clearTimeout(t);
    }
  }, [status]);

  if (loading) return <div>Loading...</div>;

  if (status === 'IDLE') {
    return <button onClick={startGame}>Start Game</button>;
  }

  const currentItem = quizItems[currentIndex];

  return (
    <div>
      {currentItem && (
        <GameCard
          item={currentItem}
          onVote={handleVote}
          disabled={status !== 'PLAYING'}
          difficulty="Medium"
        />
      )}
    </div>
  );
};

export default App;
