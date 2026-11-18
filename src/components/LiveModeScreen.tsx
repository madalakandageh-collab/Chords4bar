import React from 'react';
import { ArrowLeft, Radio, Users, Wifi } from 'lucide-react';
import type { RoomPresence, Song, TimelineBar } from '../types';
import { formatChordDisplay, transposeChord, transposeKey } from '../utils/chords';
import { useWakeLock } from '../hooks/useWakeLock';

interface LiveModeScreenProps {
  songs: Song[];
  activeSong: Song;
  timeline: TimelineBar[];
  activeStepIndex: number;
  currentBeat: number;
  isPlaying: boolean;
  isLocked: boolean;
  presence: RoomPresence;
  syncStatus: 'connecting' | 'connected' | 'offline';
  onBack: () => void;
  onSelectSong: (songId: string) => void;
  onTranspose: (delta: number) => void;
  onSeekToSection: (sectionId: string) => void;
  onSeekToBarIndex: (idx: number) => void;
  onOpenLocalWifi: () => void;
}

export const LiveModeScreen: React.FC<LiveModeScreenProps> = ({
  songs,
  activeSong,
  timeline,
  activeStepIndex,
  currentBeat,
  isPlaying,
  isLocked,
  presence,
  syncStatus,
  onBack,
  onSelectSong,
  onTranspose,
  onSeekToSection,
  onSeekToBarIndex,
  onOpenLocalWifi,
}) => {
  // Keep Leader screen awake on stage in Live Mode
  useWakeLock(true);

  const safeIdx = Math.max(0, Math.min(activeStepIndex, Math.max(0, timeline.length - 1)));
  const currentStep = timeline[safeIdx];
  const displayKey = transposeKey(activeSong.key, activeSong.transpose || 0);
  const totalTranspose = (activeSong.transpose || 0) + (currentStep?.sectionTranspose || 0);
  const currentChord = formatChordDisplay(
    transposeChord(currentStep?.bar.chord || '-', totalTranspose, displayKey)
  );

  const nextBars = [0, 1, 2, 3].map((offset) => {
    const idx = safeIdx + offset;
    const step = timeline[idx];
    if (!step) return null;
    const tr = (activeSong.transpose || 0) + step.sectionTranspose;
    return {
      idx,
      barNum: step.displayBarNumber,
      chord: formatChordDisplay(transposeChord(step.bar.chord, tr, displayKey)),
      cue: step.bar.cue,
      isCurrent: offset === 0,
    };
  });

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-32 space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Your sheets"
          className="w-10 h-10 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenLocalWifi}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-xs font-medium transition"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              syncStatus === 'connected' ? 'bg-emerald-400' : 'bg-[#E5A958]'
            }`}
          />
          <Users className="w-3.5 h-3.5 text-[#E5A958]" />
          <span className="text-[#F5F2EE] tabular-nums">
            {presence.memberCount} {presence.memberCount === 1 ? 'member' : 'members'} synced
          </span>
          <Wifi className="w-3.5 h-3.5 text-[#9C968F]" />
        </button>
      </div>

      {/* Stage Song Switcher */}
      <div>
        <p className="text-[11px] font-medium tracking-[0.22em] text-[#9C968F] uppercase mb-2">
          LIVE STAGE · BROADCASTING TO ROOM {presence.roomId}
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {songs.map((s) => {
            const active = s.id === activeSong.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSong(s.id)}
                className={`px-3.5 py-2 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 transition ${
                  active
                    ? 'bg-[#E5A958] border-[#E5A958] text-[#121212] font-semibold'
                    : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE]/85 hover:bg-[#242220]'
                }`}
              >
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Song Banner + Key Transpose */}
      <div className="rounded-3xl bg-[#181716] border border-[#2D2B2A] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[#E5A958] font-medium">
            <Radio className="w-3.5 h-3.5" />
            <span>{currentStep?.sectionName || 'Start'}</span>
          </div>
          <h1 className="font-serif-display text-2xl font-bold text-[#F5F2EE] truncate mt-0.5">
            {activeSong.title}
          </h1>
          <p className="text-xs text-[#9C968F] tabular-nums">
            {activeSong.artist} · Key {displayKey} · {activeSong.bpm} bpm · {activeSong.timeSignature}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] tracking-[0.18em] text-[#9C968F] uppercase">KEY</span>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => onTranspose(-1)}
            className="w-9 h-9 rounded-full bg-[#242220] hover:bg-[#2D2B2A] disabled:opacity-40 border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center"
          >
            −
          </button>
          <span className="w-8 text-center font-serif-display text-lg font-bold text-[#E5A958]">
            {displayKey}
          </span>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => onTranspose(1)}
            className="w-9 h-9 rounded-full bg-[#242220] hover:bg-[#2D2B2A] disabled:opacity-40 border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Big Stage Active Chord Display */}
      <div className="rounded-3xl bg-[#161514] border border-[#2D2B2A] py-12 px-6 flex flex-col items-center justify-center text-center">
        <div className="font-serif-display text-[68px] leading-none font-bold text-[#F5F2EE]">
          {currentChord}
        </div>
        {currentStep?.bar.cue && (
          <div className="mt-3 px-3 py-1 rounded-full bg-[#252019] border border-[#E5A958]/40 text-xs font-semibold text-[#E5A958] uppercase tracking-wider">
            {currentStep.bar.cue}
          </div>
        )}
        <p className="mt-4 text-sm text-[#9C968F] tabular-nums">
          Bar {currentStep?.displayBarNumber || 1} of {timeline.length} · {currentStep?.effectiveBpm || activeSong.bpm} bpm · {currentStep?.effectiveMeter || activeSong.timeSignature}
        </p>
        {isPlaying && (
          <div className="mt-3 flex items-center gap-2">
            {Array.from({ length: currentStep?.beatsPerBar || 4 }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-transform ${
                  currentBeat === i + 1 ? 'bg-[#E5A958] scale-125' : 'bg-[#2D2B2A]'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Next 4 Bars */}
      <div className="grid grid-cols-4 gap-2.5">
        {nextBars.map((item, i) => (
          <button
            key={i}
            type="button"
            disabled={!item}
            onClick={() => item && onSeekToBarIndex(item.idx)}
            className={`relative h-20 rounded-2xl border flex flex-col items-center justify-center transition ${
              item?.isCurrent
                ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                : 'bg-[#181716] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#1C1B1A]'
            }`}
          >
            {item && (
              <>
                <span className="absolute top-1.5 left-2 text-[10px] text-[#78736D] tabular-nums">
                  {item.barNum}
                </span>
                <span className="font-serif-display text-xl font-bold">{item.chord}</span>
                {item.cue && (
                  <span className="text-[10px] text-[#9C968F] truncate max-w-[90%]">
                    {item.cue}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Section Jump Bar */}
      <div className="rounded-3xl bg-[#181716] border border-[#2D2B2A] p-4">
        <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-2.5">
          JUMP TO SECTION
        </p>
        <div className="flex flex-wrap gap-2">
          {activeSong.sections.map((sec) => {
            const isCurrentSec = currentStep?.sectionId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSeekToSection(sec.id)}
                className={`px-3.5 py-2 rounded-full border text-xs font-medium transition ${
                  isCurrentSec
                    ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                    : 'bg-[#141312] border-[#2D2B2A] text-[#F5F2EE]/85 hover:bg-[#242220]'
                }`}
              >
                {sec.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
