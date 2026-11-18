import React from 'react';
import { Music, Play, SlidersHorizontal, Square } from 'lucide-react';
import type { TimeSignature } from '../types';

interface PersistentPlayBarProps {
  bpm: number;
  timeSignature: TimeSignature | string;
  isPlaying: boolean;
  isCountIn: boolean;
  countInEnabled: boolean;
  currentBarNumber: number;
  totalBars: number;
  currentBeat: number;
  chordAudioEnabled: boolean;
  onTogglePlay: () => void;
  onToggleChordAudio: () => void;
  onOpenMixer: () => void;
}

export const PersistentPlayBar: React.FC<PersistentPlayBarProps> = ({
  bpm,
  timeSignature,
  isPlaying,
  isCountIn,
  countInEnabled,
  currentBarNumber,
  totalBars,
  currentBeat,
  chordAudioEnabled,
  onTogglePlay,
  onToggleChordAudio,
  onOpenMixer,
}) => {
  const statusText = isPlaying
    ? isCountIn
      ? `Count-in · Beat ${currentBeat}`
      : `Bar ${currentBarNumber} of ${totalBars} · Beat ${currentBeat}`
    : countInEnabled
    ? 'Count-in on · tap play'
    : 'Count-in off · tap play';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#171615]/95 backdrop-blur-md border-t border-[#2D2B2A] px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#E5A958] hover:bg-[#ecb66c] active:scale-95 text-[#121212] flex items-center justify-center shadow-lg shadow-[#E5A958]/20 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A958]"
          >
            {isPlaying ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold text-[#F5F2EE] tabular-nums whitespace-nowrap">
                {bpm} BPM
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#242220] border border-[#2D2B2A] text-[12px] font-medium text-[#9C968F] tabular-nums whitespace-nowrap">
                {timeSignature}
              </span>
            </div>
            <p className="text-[12px] text-[#9C968F] truncate mt-0.5 tabular-nums">
              {statusText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleChordAudio}
            aria-label={chordAudioEnabled ? 'Mute chord synth audio' : 'Enable chord synth audio'}
            title={chordAudioEnabled ? 'Chord synth ON' : 'Chord synth OFF'}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center transition active:scale-95 ${
              chordAudioEnabled
                ? 'bg-[#252019] border-[#E5A958]/60 text-[#E5A958]'
                : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#9C968F] hover:text-[#F5F2EE]'
            }`}
          >
            <Music className="w-[18px] h-[18px]" />
          </button>

          <button
            type="button"
            onClick={onOpenMixer}
            aria-label="Open Metronome and Audio Mixer"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition active:scale-95"
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
};
