import React from 'react';
import { ArrowLeft, Lock, LockOpen, Repeat, Target } from 'lucide-react';
import type { Song, TimelineBar } from '../types';
import { formatChordDisplay, transposeChord, transposeKey } from '../utils/chords';

interface PracticeSelectScreenProps {
  songs: Song[];
  onBack: () => void;
  onSelectSong: (songId: string) => void;
}

export const PracticeSelectScreen: React.FC<PracticeSelectScreenProps> = ({
  songs,
  onBack,
  onSelectSong,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-32">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to Your sheets"
        className="w-10 h-10 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="mt-4">
        <p className="text-[11px] font-medium tracking-[0.24em] text-[#9C968F] uppercase">
          PRACTICE
        </p>
        <h1 className="font-serif-display text-[36px] leading-[1.1] font-bold text-[#F5F2EE] mt-1">
          Rehearse
        </h1>
        <p className="text-[14px] text-[#9C968F] mt-1.5">
          Slow it down, loop a section and count yourself in.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {songs.map((song) => {
          const displayKey = transposeKey(song.key, song.transpose || 0);
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => onSelectSong(song.id)}
              className="w-full flex items-center justify-between gap-3.5 p-4 rounded-2xl bg-[#1C1B1A] hover:bg-[#22201E] active:scale-[0.99] border border-[#2D2B2A] text-left transition"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#2B2318] border border-[#E5A958]/20 text-[#E5A958] font-bold text-[15px] flex items-center justify-center shrink-0">
                  {displayKey}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-medium text-[#F5F2EE] truncate">
                    {song.title}
                  </h2>
                  <p className="text-[13px] text-[#9C968F] mt-0.5 tabular-nums">
                    {song.bpm} bpm · {song.timeSignature}
                  </p>
                </div>
              </div>
              <Target className="w-5 h-5 text-[#E5A958] shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface PracticePlayerScreenProps {
  song: Song;
  timeline: TimelineBar[];
  activeStepIndex: number;
  currentBeat: number;
  isPlaying: boolean;
  isLocked: boolean;
  speed: 50 | 75 | 100;
  loopSectionId: string | null;
  sectionTransposes: Record<string, number>;
  onBack: () => void;
  onToggleLock: () => void;
  onTransposeAll: (delta: number) => void;
  onSpeedChange: (speed: 50 | 75 | 100) => void;
  onLoopSectionChange: (sectionId: string | null) => void;
  onSectionTransposeChange: (sectionId: string, delta: number) => void;
  onSeekToBarIndex: (index: number) => void;
}

export const PracticePlayerScreen: React.FC<PracticePlayerScreenProps> = ({
  song,
  timeline,
  activeStepIndex,
  currentBeat,
  isPlaying,
  isLocked,
  speed,
  loopSectionId,
  sectionTransposes,
  onBack,
  onToggleLock,
  onTransposeAll,
  onSpeedChange,
  onLoopSectionChange,
  onSectionTransposeChange,
  onSeekToBarIndex,
}) => {
  const safeIndex = Math.max(0, Math.min(activeStepIndex, Math.max(0, timeline.length - 1)));
  const currentStep = timeline[safeIndex];
  const displayKey = transposeKey(song.key, song.transpose || 0);
  const totalBars = timeline.length;
  const effectiveBpm = Math.round((currentStep?.effectiveBpm || song.bpm) * (speed / 100));

  const currentChordRaw = currentStep?.bar.chord || '-';
  const currentTotalTranspose = (song.transpose || 0) + (currentStep?.sectionTranspose || 0);
  const currentChordDisplay = formatChordDisplay(
    transposeChord(currentChordRaw, currentTotalTranspose, displayKey)
  );

  // Upcoming 4 bars strip (starting at current bar)
  const upcomingBars = [0, 1, 2, 3].map((offset) => {
    const idx = safeIndex + offset;
    const step = timeline[idx];
    if (!step) return null;
    const tr = (song.transpose || 0) + step.sectionTranspose;
    return {
      idx,
      chord: formatChordDisplay(transposeChord(step.bar.chord, tr, displayKey)),
      isCurrent: offset === 0,
    };
  });

  return (
    <div className="min-h-screen bg-[#121212] pb-32">
      {/* Custom Practice Header (no blue bar, matching screenshot) */}
      <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Rehearse song list"
          className="w-10 h-10 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-medium tracking-[0.26em] text-[#9C968F] uppercase">
          PRACTICE · THIS PHONE
        </span>

        <button
          type="button"
          onClick={onToggleLock}
          aria-label={isLocked ? 'Unlock controls' : 'Lock controls'}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
            isLocked
              ? 'bg-[#E5A958] text-[#121212]'
              : 'bg-[#252019] border border-[#E5A958] text-[#E5A958]'
          }`}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        {/* Song Title & Current Section */}
        <div className="text-center">
          <p className="text-[11px] font-medium tracking-[0.28em] text-[#9C968F] uppercase">
            {song.title}
          </p>
          <h1 className="font-serif-display text-[22px] font-semibold text-[#E5A958] mt-1">
            {currentStep?.sectionName || song.sections[0]?.name || 'Start'}
          </h1>
        </div>

        {/* KEY Bar */}
        <div className="rounded-2xl bg-[#181716] border border-[#2D2B2A] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
              KEY
            </span>
            <span className="font-serif-display text-[22px] font-bold text-[#F5F2EE]">
              {displayKey}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] tracking-[0.18em] text-[#9C968F] uppercase">
              ALL
            </span>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onTransposeAll(-1)}
              className="w-8 h-8 rounded-full bg-[#242220] hover:bg-[#2D2B2A] disabled:opacity-40 border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold text-[#F5F2EE] tabular-nums">
              {song.transpose > 0 ? `+${song.transpose}` : song.transpose}
            </span>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onTransposeAll(1)}
              className="w-8 h-8 rounded-full bg-[#242220] hover:bg-[#2D2B2A] disabled:opacity-40 border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Main Active Chord Display */}
        <div className="rounded-3xl bg-[#161514] border border-[#2D2B2A] py-12 px-6 flex flex-col items-center justify-center text-center min-h-[205px]">
          <div className="font-serif-display text-[56px] leading-none font-bold text-[#F5F2EE]">
            {currentChordDisplay}
          </div>
          {currentStep?.bar.cue && (
            <div className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#E5A958]">
              Cue: {currentStep.bar.cue}
            </div>
          )}
          <p className="mt-5 text-[13px] text-[#9C968F] tabular-nums">
            Bar {currentStep?.displayBarNumber || 1} of {totalBars} · {effectiveBpm} bpm ·{' '}
            {currentStep?.effectiveMeter || song.timeSignature}
          </p>
          {isPlaying && (
            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: currentStep?.beatsPerBar || 4 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-transform ${
                    currentBeat === i + 1
                      ? 'bg-[#E5A958] scale-125'
                      : 'bg-[#2D2B2A]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* 4-Box Upcoming Bars Strip */}
        <div className="grid grid-cols-4 gap-2.5">
          {upcomingBars.map((item, i) => (
            <button
              key={i}
              type="button"
              disabled={!item}
              onClick={() => item && onSeekToBarIndex(item.idx)}
              className={`h-14 rounded-2xl border flex items-center justify-center font-serif-display text-[20px] font-semibold transition ${
                item?.isCurrent
                  ? 'bg-[#211C15] border-[#E5A958] text-[#F5F2EE]'
                  : 'bg-[#161514] border-[#2D2B2A] text-[#F5F2EE]/85 hover:bg-[#1C1B1A]'
              }`}
            >
              {item ? item.chord : ''}
            </button>
          ))}
        </div>

        {/* SPEED Card */}
        <div className="rounded-3xl bg-[#181716] border border-[#2D2B2A] p-4 space-y-3">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
            SPEED
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {([50, 75, 100] as const).map((pct) => {
              const active = speed === pct;
              return (
                <button
                  key={pct}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onSpeedChange(pct)}
                  className={`h-11 rounded-2xl border text-sm font-semibold tabular-nums transition ${
                    active
                      ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                      : 'bg-[#141312] border-[#2D2B2A] text-[#F5F2EE]/80 hover:text-[#F5F2EE]'
                  } disabled:opacity-50`}
                >
                  {pct}%
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#9C968F] leading-relaxed tabular-nums">
            {effectiveBpm} bpm · clicks and spoken counts keep their natural pitch
          </p>
        </div>

        {/* LOOP Card */}
        <div className="rounded-3xl bg-[#181716] border border-[#2D2B2A] p-4 space-y-3">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
            LOOP
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLoopSectionChange(null)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition ${
                loopSectionId === null
                  ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                  : 'bg-[#141312] border-[#2D2B2A] text-[#F5F2EE]/85 hover:text-[#F5F2EE]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Whole song</span>
            </button>
            {song.sections.map((sec) => {
              const active = loopSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => onLoopSectionChange(sec.id)}
                  className={`px-3.5 py-2 rounded-full border text-xs font-medium transition ${
                    active
                      ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                      : 'bg-[#141312] border-[#2D2B2A] text-[#F5F2EE]/85 hover:text-[#F5F2EE]'
                  }`}
                >
                  {sec.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION KEYS Card */}
        <div className="rounded-3xl bg-[#181716] border border-[#2D2B2A] p-4 space-y-2.5">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-1">
            SECTION KEYS
          </p>
          {song.sections.map((sec) => {
            const val = sectionTransposes[sec.id] ?? sec.transpose ?? 0;
            return (
              <div
                key={sec.id}
                className="rounded-2xl bg-[#141312] border border-[#2D2B2A] px-4 py-2.5 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-[#F5F2EE]">{sec.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => onSectionTransposeChange(sec.id, -1)}
                    className="w-8 h-8 rounded-full bg-[#1C1B1A] hover:bg-[#242220] disabled:opacity-40 border border-[#2D2B2A] text-[#9C968F] hover:text-[#F5F2EE] flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-[#F5F2EE] tabular-nums">
                    {val > 0 ? `+${val}` : val}
                  </span>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => onSectionTransposeChange(sec.id, 1)}
                    className="w-8 h-8 rounded-full bg-[#1C1B1A] hover:bg-[#242220] disabled:opacity-40 border border-[#2D2B2A] text-[#9C968F] hover:text-[#F5F2EE] flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
