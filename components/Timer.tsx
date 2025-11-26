import React, { useEffect, useRef, useState } from "react";
import { ICONS } from "../constants";

interface TimerProps {
  duration: number;
  onTimeUp: () => void;
  active: boolean;
}

const Timer: React.FC<TimerProps> = ({ duration, onTimeUp, active }) => {
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const intervalRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  // Reset when duration changes or when activated
  useEffect(() => {
    setTimeLeft(duration);
    finishedRef.current =        className={`h-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-g-red' : 'bg-g-blue'}`}
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
