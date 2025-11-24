import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants';

interface TimerProps {
  duration: number;
  onTimeUp: () => void;
  active: boolean;
}

const Timer: React.FC<TimerProps> = ({ duration, onTimeUp, active }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!active) return;
    
    setTimeLeft(duration);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, duration, onTimeUp]);

  const percentage = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="relative w-full h-6 bg-white border-2 border-black dark:border-white rounded-full overflow-hidden shadow-neo-hover">
      <div 
        className={`h-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-g-red' : 'bg-g-blue'}`}
        style={{ width: `${percentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center gap-1">
        {ICONS.TIMER}
        <span className={`text-xs font-black font-mono ${isUrgent ? 'text-white' : 'text-black'}`}>
          {timeLeft}s
        </span>
      </div>
    </div>
  );
};

export default Timer;