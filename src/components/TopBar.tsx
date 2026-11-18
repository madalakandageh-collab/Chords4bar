import React from 'react';
import { Lock, LockOpen, Menu } from 'lucide-react';

interface TopBarProps {
  onOpenMenu: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMenu,
  isLocked,
  onToggleLock,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-[#6E7BF2] px-4 flex items-center justify-between shadow-sm">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/18 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      <span className="text-sm font-semibold tracking-[0.26em] text-white uppercase select-none whitespace-nowrap">
        CHORDBOOK
      </span>

      <button
        type="button"
        onClick={onToggleLock}
        aria-label={isLocked ? 'Unlock screen editing' : 'Lock screen editing'}
        aria-pressed={isLocked}
        className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full transition active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          isLocked
            ? 'bg-[#E5A958] text-[#121212] shadow-md'
            : 'bg-white/18 hover:bg-white/25 text-white'
        }`}
      >
        {isLocked ? <Lock className="w-[18px] h-[18px]" /> : <LockOpen className="w-[18px] h-[18px]" />}
      </button>
    </header>
  );
};
