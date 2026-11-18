import React, { useState } from 'react';
import { Trash2, Volume2, X } from 'lucide-react';
import type { Bar, BarMeter, BeatUnit, CustomVoiceCue } from '../types';
import { formatChordDisplay, parseMeterBeats } from '../utils/chords';
import { BUNDLED_VOICE_CUES } from '../utils/voiceCues';
import { CuePointLibrary } from './CuePointLibrary';

interface BarEditorModalProps {
  bar: Bar;
  barNumber: number;
  sectionName: string;
  songBpm: number;
  songTimeSignature: string;
  libraryVersion?: number;
  onUpdateBar: (updated: Bar) => void;
  onRemoveBar: () => void;
  onPreviewBundledCue: (url: string) => void;
  onPreviewCustomCue: (cue: CustomVoiceCue) => void;
  onCacheInvalidate: (cueId: string) => void;
  onClose: () => void;
}

const COMMON_CHORDS = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B'];
const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHORD_TYPES = ['maj', 'min', '7', 'maj7', 'm7', 'sus2', 'sus4', 'add9', '6', '9', 'dim', 'aug', 'm7b5', '5'];
const BAR_METERS: BarMeter[] = ['4/4', '3/4', '2/4', '6/8', '5/4', '7/8', '9/8', '12/8'];
const BEAT_UNITS: BeatUnit[] = ['Quarter', 'Eighth', 'Dotted', 'Triplet'];

function parseRootAndType(chord: string): { root: string; type: string } {
  const clean = chord.trim();
  if (!clean || clean === '-' || clean === '—') {
    return { root: '', type: 'maj' };
  }
  const match = clean.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return { root: '', type: 'maj' };
  const suffix = match[2];
  if (suffix === '' || suffix === 'maj') return { root: match[1], type: 'maj' };
  if (suffix === 'm' || suffix === 'min') return { root: match[1], type: 'min' };
  return { root: match[1], type: suffix };
}

function buildChord(root: string, type: string): string {
  if (!root) return '-';
  if (type === 'maj') return root;
  if (type === 'min') return `${root}m`;
  return `${root}${type}`;
}

export const BarEditorModal: React.FC<BarEditorModalProps> = ({
  bar,
  barNumber,
  sectionName,
  songBpm,
  songTimeSignature,
  libraryVersion,
  onUpdateBar,
  onRemoveBar,
  onPreviewBundledCue,
  onPreviewCustomCue,
  onCacheInvalidate,
  onClose,
}) => {
  const [typingMode, setTypingMode] = useState(false);
  const parsed = parseRootAndType(bar.chord);
  const effectiveMeter = (bar.meter || songTimeSignature) as BarMeter;
  const effectiveBeats = parseMeterBeats(effectiveMeter);
  const effectiveTempo = bar.tempo ?? songBpm;
  const effectiveBeatUnit = bar.beatUnit ?? 'Quarter';
  const effectiveCounting = bar.countingSystem ?? '1 1 1 1';
  const repeatCount = bar.repeat ?? 1;

  const handleSelectRoot = (root: string) => {
    const nextType = parsed.type || 'maj';
    onUpdateBar({ ...bar, chord: buildChord(root, nextType) });
  };

  const handleSelectType = (type: string) => {
    const root = parsed.root || 'C';
    onUpdateBar({ ...bar, chord: buildChord(root, type) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-t-3xl bg-[#181716] border-t border-x border-[#2D2B2A] shadow-2xl">
        {/* Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#3A3734]" />
        </div>

        {/* Sticky Modal Header */}
        <div className="px-5 pb-4 flex items-start justify-between border-b border-[#2D2B2A]/60 shrink-0">
          <div>
            <h2 className="font-serif-display text-[28px] font-bold text-[#F5F2EE] leading-tight">
              Bar {barNumber}
            </h2>
            <p className="text-[13px] text-[#9C968F] mt-0.5 tabular-nums">
              {sectionName} · {effectiveTempo} bpm · {effectiveMeter}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Bar Editor"
            className="w-10 h-10 rounded-full bg-[#242220] hover:bg-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 py-5 space-y-6 pb-8">
          {/* CHORD */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
                CHORD
              </span>
              <div className="flex items-center gap-2">
                {bar.chord && bar.chord !== '-' && (
                  <button
                    type="button"
                    onClick={() => onUpdateBar({ ...bar, chord: '-' })}
                    className="px-3 py-1 rounded-full bg-[#242220] border border-[#2D2B2A] text-xs text-[#9C968F] hover:text-[#F5F2EE]"
                  >
                    Clear (—)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTypingMode((v) => !v)}
                  className={`px-3.5 py-1 rounded-full border text-xs font-medium transition ${
                    typingMode
                      ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                      : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE]'
                  }`}
                >
                  {typingMode ? 'Done' : 'Type'}
                </button>
              </div>
            </div>

            {typingMode ? (
              <input
                type="text"
                autoFocus
                value={bar.chord === '-' ? '' : bar.chord}
                onChange={(e) => onUpdateBar({ ...bar, chord: e.target.value || '-' })}
                placeholder="Type chord e.g. G/B, F#m7"
                className="w-full h-16 px-4 rounded-2xl bg-[#141312] border border-[#E5A958] text-center font-serif-display text-2xl font-bold text-[#F5F2EE] focus:outline-none"
              />
            ) : (
              <div className="w-full h-16 rounded-2xl bg-[#141312] border border-[#2D2B2A] flex items-center justify-center">
                <span className="font-serif-display text-[26px] font-bold text-[#F5F2EE]">
                  {formatChordDisplay(bar.chord)}
                </span>
              </div>
            )}
          </div>

          {/* COMMON */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-2.5">
              COMMON
            </p>
            <div className="grid grid-cols-4 gap-2">
              {COMMON_CHORDS.map((c) => {
                const active = bar.chord === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateBar({ ...bar, chord: c })}
                    className={`h-11 rounded-full border text-sm font-medium transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ROOT */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-2.5">
              ROOT
            </p>
            <div className="grid grid-cols-6 gap-2">
              {ROOTS.map((r) => {
                const active = parsed.root === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSelectRoot(r)}
                    className={`h-10 rounded-full border text-sm font-medium transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TYPE */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-2.5">
              TYPE
            </p>
            <div className="grid grid-cols-4 gap-2">
              {CHORD_TYPES.map((t) => {
                const active = parsed.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectType(t)}
                    className={`h-10 rounded-full border text-sm font-medium transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BAR METER */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
                BAR METER
              </span>
              <span className="text-xs text-[#9C968F] tabular-nums">
                {bar.meter ? `${effectiveBeats} beats` : 'Follows the song'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BAR_METERS.map((m) => {
                const active = effectiveMeter === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      onUpdateBar({
                        ...bar,
                        meter: m === songTimeSignature ? undefined : m,
                      })
                    }
                    className={`h-10 rounded-full border text-sm font-medium tabular-nums transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BAR TEMPO */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
                  BAR TEMPO
                </p>
                <p className="text-xs text-[#9C968F] mt-1 tabular-nums">
                  Overrides this bar only · section is {songBpm}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {bar.tempo !== undefined && (
                  <button
                    type="button"
                    onClick={() => onUpdateBar({ ...bar, tempo: undefined })}
                    className="text-xs text-[#E5A958] underline"
                  >
                    Reset
                  </button>
                )}
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={effectiveTempo}
                  onChange={(e) =>
                    onUpdateBar({
                      ...bar,
                      tempo: Math.max(20, Math.min(300, Number(e.target.value) || songBpm)),
                    })
                  }
                  className="w-20 h-11 rounded-2xl bg-[#141312] border border-[#2D2B2A] text-center font-serif-display text-lg font-bold text-[#F5F2EE] tabular-nums focus:border-[#E5A958] focus:outline-none"
                />
              </div>
            </div>
            <input
              type="range"
              min={20}
              max={240}
              value={effectiveTempo}
              onChange={(e) => onUpdateBar({ ...bar, tempo: Number(e.target.value) })}
              className="amber-slider"
            />
          </div>

          {/* BEAT UNIT */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-2.5">
              BEAT UNIT
            </p>
            <div className="grid grid-cols-4 gap-2">
              {BEAT_UNITS.map((unit) => {
                const active = effectiveBeatUnit === unit;
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => onUpdateBar({ ...bar, beatUnit: unit })}
                    className={`h-10 rounded-full border text-xs sm:text-sm font-medium transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    {unit}
                  </button>
                );
              })}
            </div>
          </div>

          {/* VOICE CUE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
                VOICE CUE
              </p>
              {bar.cue && (
                <button
                  type="button"
                  onClick={() => onUpdateBar({ ...bar, cue: undefined, customCueId: undefined })}
                  className="text-xs text-[#9C968F] hover:text-[#F5F2EE]"
                >
                  Clear cue
                </button>
              )}
            </div>

            <input
              type="text"
              value={bar.cue || ''}
              onChange={(e) =>
                onUpdateBar({
                  ...bar,
                  cue: e.target.value || undefined,
                  customCueId: undefined,
                })
              }
              placeholder='Select a bundled voice cue or record your own'
              className="w-full h-12 px-4 rounded-2xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] placeholder:text-[#78736D] focus:border-[#E5A958] focus:outline-none"
            />

            <div className="flex flex-wrap gap-2">
              {BUNDLED_VOICE_CUES.map((cueItem) => {
                const active = !bar.customCueId && bar.cue === cueItem.label;
                return (
                  <button
                    key={cueItem.label}
                    type="button"
                    onClick={() => {
                      if (active) {
                        onUpdateBar({ ...bar, cue: undefined, customCueId: undefined });
                      } else {
                        onUpdateBar({ ...bar, cue: cueItem.label, customCueId: undefined });
                        onPreviewBundledCue(cueItem.url);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-medium transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    <Volume2 className="w-3 h-3 opacity-70" />
                    <span>{cueItem.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-[#9C968F] leading-relaxed">
              Quick picks play studio female voice recordings offline — routed through your Voice Cue Volume &amp; Left/Right Balance.
            </p>

            <CuePointLibrary
              mode="bar-editor"
              libraryVersion={libraryVersion}
              selectedCustomCueId={bar.customCueId}
              selectedBundledCueLabel={bar.cue}
              onSelectBundledCue={(label, url) => {
                onUpdateBar({ ...bar, cue: label, customCueId: undefined });
                onPreviewBundledCue(url);
              }}
              onSelectCustomCue={(customCue) => {
                onUpdateBar({
                  ...bar,
                  cue: customCue.name,
                  customCueId: customCue.id,
                });
              }}
              onPreviewBundledCue={onPreviewBundledCue}
              onPreviewCustomCue={onPreviewCustomCue}
              onCustomCueRenamed={(renamed) => {
                if (bar.customCueId === renamed.id) {
                  onUpdateBar({ ...bar, cue: renamed.name });
                }
              }}
              onCustomCueDeleted={(deletedId) => {
                if (bar.customCueId === deletedId) {
                  onUpdateBar({ ...bar, cue: undefined, customCueId: undefined });
                }
              }}
              onCacheInvalidate={onCacheInvalidate}
            />
          </div>

          {/* Voice count locked to this bar */}
          <div className="rounded-2xl bg-[#141312] border border-[#2D2B2A] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-medium text-[#F5F2EE]">
                Voice count locked to this bar
              </p>
              <p className="text-xs text-[#9C968F] mt-1 leading-relaxed tabular-nums">
                Counts this bar&apos;s {effectiveBeats} beats at {effectiveTempo} bpm · numbers restart at each group
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!bar.voiceCountLocked}
              onClick={() =>
                onUpdateBar({ ...bar, voiceCountLocked: !bar.voiceCountLocked })
              }
              className={`w-12 h-7 rounded-full p-1 transition shrink-0 ${
                bar.voiceCountLocked ? 'bg-[#E5A958]' : 'bg-[#2D2B2A]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#F5F2EE] transition-transform ${
                  bar.voiceCountLocked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* COUNTING SYSTEM */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
              COUNTING SYSTEM
            </p>
            <p className="text-xs text-[#9C968F] mt-1 mb-3 tabular-nums">
              Spoken 1–7 MP3 count on each of this bar&apos;s {effectiveBeats} beats
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {['1 1 1 1', '1 2 3 1', '1 2 1 2'].map((pattern) => {
                const active = effectiveCounting === pattern;
                return (
                  <button
                    key={pattern}
                    type="button"
                    onClick={() => onUpdateBar({ ...bar, countingSystem: pattern })}
                    className={`px-4 py-2 rounded-full border text-xs font-medium tracking-[0.2em] tabular-nums transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE]'
                    }`}
                  >
                    {pattern}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={bar.countingSystem || ''}
              onChange={(e) =>
                onUpdateBar({ ...bar, countingSystem: e.target.value || undefined })
              }
              placeholder="Custom sequence (1–7), e.g. 1 2 3 4 5 6"
              className="w-full h-11 px-4 rounded-2xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] placeholder:text-[#78736D] focus:border-[#E5A958] focus:outline-none"
            />
          </div>

          {/* Repeat this bar */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <p className="text-[15px] font-medium text-[#F5F2EE]">Repeat this bar</p>
              <p className="text-xs text-[#9C968F] mt-0.5 tabular-nums">
                Plays it ×{repeatCount} in a row, live and in the export
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-[#141312] border border-[#2D2B2A]">
              <button
                type="button"
                onClick={() =>
                  onUpdateBar({ ...bar, repeat: Math.max(1, repeatCount - 1) })
                }
                className="w-7 h-7 rounded-full hover:bg-[#242220] text-[#9C968F] hover:text-[#F5F2EE] flex items-center justify-center text-lg"
              >
                −
              </button>
              <span className="text-sm font-semibold text-[#F5F2EE] tabular-nums min-w-[24px] text-center">
                ×{repeatCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateBar({ ...bar, repeat: Math.min(16, repeatCount + 1) })
                }
                className="w-7 h-7 rounded-full hover:bg-[#242220] text-[#9C968F] hover:text-[#F5F2EE] flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Remove this bar */}
          <button
            type="button"
            onClick={onRemoveBar}
            className="w-full h-12 rounded-full bg-[#241617] hover:bg-[#2F1B1C] border border-[#6E2D30] text-[#E68A8D] font-semibold text-sm flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove this bar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
