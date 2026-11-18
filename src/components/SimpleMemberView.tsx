import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff } from 'lucide-react';
import type { RoomSyncState, Song } from '../types';
import type { SyncConnectionStatus } from '../hooks/useRoomSync';
import { useWakeLock } from '../hooks/useWakeLock';
import {
  buildSongTimeline,
  formatChordDisplay,
  transposeChord,
  transposeKey,
} from '../utils/chords';
import { PWAInstallButton } from './PWAInstallButton';

interface SimpleMemberViewProps {
  roomId: string;
  syncStatus: SyncConnectionStatus;
  syncedState: RoomSyncState | null;
  fallbackSong: Song;
  clockOffsetMs: number;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

export const SimpleMemberView: React.FC<SimpleMemberViewProps> = ({
  roomId,
  syncStatus,
  syncedState,
  fallbackSong,
  clockOffsetMs,
  isPreview = false,
  onExitPreview,
}) => {
  const [tab, setTab] = useState<'chords' | 'lyrics'>('chords');
  const [tickBarIndex, setTickBarIndex] = useState<number>(0);

  // Keep Band Member's screen awake on stage
  const wakeLockActive = useWakeLock(true);

  const activeSong = syncedState?.song || fallbackSong;
  const globalTranspose = syncedState?.transpose ?? activeSong.transpose ?? 0;
  const sectionTransposes = syncedState?.sectionTransposes ?? {};
  const isPlaying = syncedState?.isPlaying ?? false;
  const speed = syncedState?.speed ?? 100;
  const tempoOverride = syncedState?.tempoOverride ?? null;
  const loopSectionId = syncedState?.loopSectionId ?? null;

  const timeline = useMemo(
    () => buildSongTimeline(activeSong, sectionTransposes, loopSectionId),
    [activeSong, sectionTransposes, loopSectionId]
  );

  // Millisecond-synchronized bar tracking using server clock offset!
  useEffect(() => {
    if (!syncedState) return;
    if (!syncedState.isPlaying || !syncedState.playStartedAtServerTime) {
      setTickBarIndex(syncedState.activeBarIndex || 0);
      return;
    }

    const computeExactBar = () => {
      if (!timeline.length) return;
      const estimatedServerNow = Date.now() + clockOffsetMs;
      const elapsedSec = Math.max(
        0,
        (estimatedServerNow - (syncedState.playStartedAtServerTime || estimatedServerNow)) / 1000
      );

      let remaining = elapsedSec;
      let idx = Math.max(0, Math.min(syncedState.playStartBarIndex || 0, timeline.length - 1));

      // Step through timeline using exact bar durations
      for (let guard = 0; guard < 1000; guard++) {
        const step = timeline[idx];
        if (!step) break;
        const rawBpm = tempoOverride || step.effectiveBpm || activeSong.bpm;
        const effectiveBpm = Math.max(10, rawBpm * (speed / 100));
        const barDurationSec = (60 / effectiveBpm) * step.beatsPerBar;
        if (remaining < barDurationSec) {
          break;
        }
        remaining -= barDurationSec;
        idx += 1;
        if (idx >= timeline.length) {
          if (loopSectionId) {
            idx = 0;
          } else {
            idx = timeline.length - 1;
            break;
          }
        }
      }
      setTickBarIndex(idx);
    };

    computeExactBar();
    const interval = window.setInterval(computeExactBar, 80);
    return () => clearInterval(interval);
  }, [syncedState, clockOffsetMs, timeline, tempoOverride, activeSong.bpm, speed, loopSectionId]);

  const currentStep = timeline[tickBarIndex] || timeline[0];
  const activeBarId = currentStep?.barId || null;
  const activeSectionId = currentStep?.sectionId || syncedState?.activeSectionId || null;

  const activeBarRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tab === 'chords' && activeBarRef.current) {
      activeBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeBarId, tab]);

  useEffect(() => {
    if (tab === 'lyrics' && activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSectionId, tab]);

  const displayKey = transposeKey(activeSong.key, globalTranspose);
  const effectiveBpm = Math.round(
    (tempoOverride || currentStep?.effectiveBpm || activeSong.bpm) * (speed / 100)
  );

  let runningBarNum = 0;

  return (
    <div className="min-h-screen bg-[#121212] text-[#F5F2EE] pb-16">
      {/* Minimal Read-Only Member Header */}
      <header className="sticky top-0 z-30 bg-[#161514]/95 backdrop-blur-md border-b border-[#2D2B2A] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Left: LIVE SYNCED badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1B1A] border border-[#2D2B2A] shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'connected'
                  ? 'bg-emerald-400'
                  : syncStatus === 'connecting'
                  ? 'bg-[#E5A958]'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#F5F2EE] whitespace-nowrap">
              {syncStatus === 'connected' ? 'LIVE SYNCED' : `ROOM ${roomId}`}
            </span>
          </div>

          {/* Center: Song Title & Artist */}
          <div className="text-center min-w-0 flex-1">
            <h1 className="font-serif-display text-[17px] font-bold text-[#F5F2EE] truncate leading-tight">
              {activeSong.title}
            </h1>
            <p className="text-[11px] text-[#9C968F] truncate">{activeSong.artist}</p>
          </div>

          {/* Right: Current Key + BPM pill */}
          <div className="px-3 py-1 rounded-full bg-[#252019] border border-[#E5A958]/50 text-[#E5A958] text-xs font-bold tabular-nums whitespace-nowrap shrink-0">
            {displayKey} · {effectiveBpm} bpm
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Optional PWA Add to Home Screen prompt for Chordbook Stage */}
        <PWAInstallButton appName="Chordbook Stage" variant="banner" />

        {/* Clean Segmented Toggle: CHORDS | LYRICS */}
        <div className="p-1 rounded-full bg-[#181716] border border-[#2D2B2A] grid grid-cols-2">
          <button
            type="button"
            onClick={() => setTab('chords')}
            className={`py-2.5 rounded-full text-[13px] font-bold tracking-[0.16em] uppercase transition ${
              tab === 'chords'
                ? 'bg-[#E5A958] text-[#121212]'
                : 'text-[#9C968F] hover:text-[#F5F2EE]'
            }`}
          >
            CHORDS
          </button>
          <button
            type="button"
            onClick={() => setTab('lyrics')}
            className={`py-2.5 rounded-full text-[13px] font-bold tracking-[0.16em] uppercase transition ${
              tab === 'lyrics'
                ? 'bg-[#E5A958] text-[#121212]'
                : 'text-[#9C968F] hover:text-[#F5F2EE]'
            }`}
          >
            LYRICS
          </button>
        </div>

        {/* Read-Only High-Contrast Stage Content */}
        {tab === 'chords' ? (
          <div className="space-y-4">
            {activeSong.sections.map((section) => {
              const secTranspose = globalTranspose + (sectionTransposes[section.id] ?? section.transpose ?? 0);
              const isSectionPlaying = isPlaying && activeSectionId === section.id;

              return (
                <section
                  key={section.id}
                  className={`rounded-3xl border p-4 sm:p-5 transition ${
                    isSectionPlaying
                      ? 'bg-[#1D1B18] border-[#E5A958]/50'
                      : 'bg-[#181716] border-[#2D2B2A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`font-serif-display text-[22px] font-bold ${
                        isSectionPlaying ? 'text-[#E5A958]' : 'text-[#F5F2EE]'
                      }`}
                    >
                      {section.name}
                    </h2>
                    <span className="text-xs text-[#9C968F] tabular-nums">
                      {activeSong.timeSignature}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {section.bars.map((bar) => {
                      const barNum = runningBarNum + 1;
                      const repeats = bar.repeat && bar.repeat > 1 ? bar.repeat : 1;
                      runningBarNum += repeats;

                      const isActive = isPlaying && activeBarId === bar.id;
                      const chordText = formatChordDisplay(
                        transposeChord(bar.chord, secTranspose, displayKey)
                      );

                      return (
                        <div
                          key={bar.id}
                          ref={isActive ? activeBarRef : undefined}
                          className={`relative min-h-[88px] rounded-2xl border p-2 flex flex-col items-center justify-center text-center transition ${
                            isActive
                              ? 'bg-[#2E2416] border-[#E5A958] ring-2 ring-[#E5A958]/50 scale-[1.02]'
                              : 'bg-[#121212] border-[#2D2B2A]'
                          }`}
                        >
                          <span className="absolute top-2 left-2.5 text-[11px] text-[#78736D] tabular-nums">
                            {barNum}
                          </span>
                          {repeats > 1 && (
                            <span className="absolute top-2 right-2 text-[10px] font-semibold text-[#E5A958] tabular-nums">
                              ×{repeats}
                            </span>
                          )}
                          <span
                            className={`font-serif-display text-[22px] sm:text-[26px] font-bold ${
                              isActive ? 'text-[#E5A958]' : 'text-[#F5F2EE]'
                            }`}
                          >
                            {chordText}
                          </span>
                          {bar.cue && (
                            <span className="text-[10px] text-[#E5A958]/90 mt-1 truncate max-w-full">
                              {bar.cue}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-[#181716] border border-[#2D2B2A] p-6 space-y-6">
            {activeSong.lyrics.map((lyr) => {
              const currentSectionObj = activeSong.sections.find((s) => s.id === activeSectionId);
              const isHighlighted =
                isPlaying &&
                currentSectionObj &&
                currentSectionObj.name.toLowerCase().includes(lyr.label.toLowerCase());

              return (
                <div
                  key={lyr.id}
                  ref={isHighlighted ? activeLyricRef : undefined}
                  className={`rounded-2xl transition ${
                    isHighlighted
                      ? 'bg-[#252019] p-4 border border-[#E5A958]/50'
                      : ''
                  }`}
                >
                  <h3
                    className={`text-[16px] font-semibold mb-2.5 ${
                      isHighlighted ? 'text-[#E5A958]' : 'text-[#9C968F]'
                    }`}
                  >
                    {lyr.label}
                  </h3>
                  <div className="font-sinhala space-y-2 text-[22px] sm:text-[24px] leading-[1.7] text-[#F5F2EE]">
                    {lyr.lines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-[#78736D] pt-2">
          Chordbook Stage · Read-only live sync{wakeLockActive ? ' · Screen kept awake' : ''}
        </p>
      </div>

      {/* Exit Preview Pill (ONLY shown when Leader clicks "Preview Member App") */}
      {isPreview && onExitPreview && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            type="button"
            onClick={onExitPreview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#6E7BF2] hover:bg-[#7d89f5] text-white font-semibold text-xs shadow-xl transition"
          >
            <EyeOff className="w-4 h-4" />
            <span>Exit Member Preview</span>
          </button>
        </div>
      )}
    </div>
  );
};
