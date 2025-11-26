import React from "react";
import { ICONS } from "../constants";

interface SkipButtonProps {
  onSkip: () => void;
  disabled: boolean;
}

const SkipButton: React.FC<SkipButtonProps> = ({ onSkip, disabled }) => {
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();       // prevent triggering card drag
    if (navigator.vibrate) navigator.vibrate(10);
    if (!disabled) onSkip();
  };

  // keyboard accessibility
  const handleKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSkip();
    }
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleClick}
      onKeyDown={handleKey}
      disabled={disabled}
      className="
        flex items-center gap-2 px-4 py-2
        bg-white dark:bg-zinc-800 text-black dark:text-white
        font-black uppercase tracking-wider text-sm
        border-2 border-black dark:border-white rounded-lg
        shadow-neo-hover dark:shadow-neo-hover-dark
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all
        hover:bg-gray-50 dark:hover:bg-zinc-700
        select-none
      "
      aria-label="Skip this question"
    >
      {ICONS.SKIP}
      <span>Skip</span>
    </button>
  );
};

export default SkipButton;
