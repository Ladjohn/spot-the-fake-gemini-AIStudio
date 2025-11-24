import React from 'react';
import { ICONS } from '../constants';

interface SkipButtonProps {
  onSkip: () => void;
  disabled: boolean;
}

const SkipButton: React.FC<SkipButtonProps> = ({ onSkip, disabled }) => {
  return (
    <button
      onClick={onSkip}
      disabled={disabled}
      className="
        flex items-center gap-2 px-4 py-2
        bg-white dark:bg-zinc-800 text-black dark:text-white
        font-black uppercase tracking-wider text-sm
        border-2 border-black dark:border-white rounded-lg
        shadow-neo-hover dark:shadow-neo-hover-dark
        active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all
        hover:bg-gray-50 dark:hover:bg-zinc-700
      "
    >
      {ICONS.SKIP}
      <span>Skip</span>
    </button>
  );
};

export default SkipButton;