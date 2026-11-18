import React from 'react';
import { BookOpen, GraduationCap, Radio, Wifi, X } from 'lucide-react';
import type { ScreenName } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavDrawerProps {
  isOpen: boolean;
  activeScreen: ScreenName;
  memberCount: number;
  onClose: () => void;
  onNavigate: (screen: ScreenName) => void;
}

export const NavDrawer: React.FC<NavDrawerProps> = ({
  isOpen,
  activeScreen,
  memberCount,
  onClose,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const navItems: Array<{
    id: ScreenName;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'sheets',
      label: 'Your sheets',
      icon: <BookOpen className="w-5 h-5 text-[#E5A958]" />,
    },
    {
      id: 'live-mode',
      label: 'Live mode',
      icon: <Radio className="w-5 h-5 text-[#E5A958]" />,
      badge: memberCount > 0 ? `${memberCount} synced` : undefined,
    },
    {
      id: 'practice-select',
      label: 'Practice',
      icon: <GraduationCap className="w-5 h-5 text-[#E5A958]" />,
    },
    {
      id: 'local-wifi',
      label: 'Local Wi-Fi',
      icon: <Wifi className="w-5 h-5 text-[#E5A958]" />,
    },
  ];

  const isHighlighted = (id: ScreenName) => {
    if (id === 'sheets' && (activeScreen === 'sheets' || activeScreen === 'song-detail')) return true;
    if (id === 'practice-select' && (activeScreen === 'practice-select' || activeScreen === 'practice-player')) return true;
    return activeScreen === id;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="relative z-10 w-[290px] max-w-[82vw] h-full bg-[#161514] border-r border-[#2D2B2A] flex flex-col p-6 shadow-2xl"
        aria-label="Navigation Drawer"
      >
        <div className="flex items-center justify-between pb-6">
          <span className="text-xs font-medium tracking-[0.28em] text-[#9C968F] uppercase">
            CHORDBOOK
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="w-10 h-10 rounded-full bg-[#242220] hover:bg-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = isHighlighted(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3.5 rounded-xl text-left transition ${
                  active
                    ? 'bg-[#E5A958]/12 text-[#F5F2EE]'
                    : 'text-[#F5F2EE]/90 hover:bg-[#1C1B1A]'
                }`}
              >
                <span className="flex items-center gap-4">
                  <span className="shrink-0">{item.icon}</span>
                  <span className="text-[16px] font-medium whitespace-nowrap">{item.label}</span>
                </span>
                {item.badge && (
                  <span className="text-[11px] font-medium text-[#E5A958] tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          <PWAInstallButton variant="drawer" />
        </div>

        <div className="mt-8 pt-6 border-t border-[#2D2B2A]/70">
          <p className="text-[13px] leading-relaxed text-[#9C968F]">
            Everything is stored on this device — songs, setlists and settings work without a connection.
          </p>
        </div>
      </aside>
    </div>
  );
};
