import React, { useEffect, useRef, useState } from "react";
import { ICONS } from "../constants";

interface TimerProps {
  duration: number;
  onTimeUp: () => void;
  active: boolean;
}

const Timer: React.FC<TimerProps> = ({ duration, onTimeUp, active }) => {
  // Remaining seconds
  const [timeLeft, setTimeLeft] = useState<number>(duration);

  // store interval id so we can clear it
  const intervalRef = useRef<number | null>(null);

  // ref to the inner progress div (optional: not strictly necessary)
  const finishedRef = useRef<HTMLDivElement | null>(null);

  // percentage of *remaining* time (0-100)
  const percentage = duration > 0 ? (timeLeft / duration) * 100 : 0;

  // mark urgent when time is low (here: <= 5s or <= 20% of duration)
  const isUrgent = timeLeft <= 5 || timeLeft <= Math.ceil(duration * 0.2);

  // Reset timer when duration changes or when `active` toggles on
  useEffect(() => {
    // reset state
    setTimeLeft(duration);

    // clear any existing interval
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // if active, start counting down
    if (active) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // stop the interval and notify once
            if (intervalRef.current !== null) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000) as unknown as number; // keep type as number for browser DOM interval
    }

    // cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, active]); // intentionally depend on duration and active

  // Make sure timer resets immediately when duration changes even if not active
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  return (
    <div className="relative w-full h-8">
      <div className="w-full h-full bg-g-surface rounded overflow-hidden">
        <div
          ref={finishedRef}
          // progress shows remaining time width (shrinks as timeLeft decreases)
          className={`h-full transition-all duration-1000 ease-linear ${isUrgent ? "bg-g-red" : "bg-g-blue"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
        {ICONS.TIMER}
        <span className={`text-xs font-black font-mono ${isUrgent ? "text-white" : "text-black"}`}>
          {timeLeft}s
        </span>
      </div>
    </div>
  );
};

export default Timer;
