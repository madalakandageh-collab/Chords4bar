import React, { useState } from 'react';
import { Headphones, X } from 'lucide-react';
import type { BalanceSide, BeatUnit, CustomVoiceCue, MetronomeSettings } from '../types';
import { BUNDLED_VOICE_CUES } from '../utils/voiceCues';
import { CuePointLibrary } from './CuePointLibrary';

interface MetronomeModalProps {
  settings: MetronomeSettings;
  songTempo: number;
  isLocked: boolean;
  libraryVersion?: number;
  onUpdateSettings: (next: MetronomeSettings) => void;
  onUpdateSongTempo: (bpm: number) => void;
  onTestVoice: (cueUrl: string) => void;
  onPreviewCustomCue: (cue: CustomVoiceCue) => void;
  onCacheInvalidate: (cueId: string) => void;
  onClose: () => void;
}

const BALANCES: BalanceSide[] = ['Left', 'Center', 'Right'];
const SUBDIVISIONS: Array<{ id: BeatUnit; label: string }> = [
  { id: 'Quarter', label: 'Quarter' },
  { id: 'Eighth', label: 'Eighth' },
  { id: 'Dotted', label: 'Dotted' },
  { id: 'Triplet', label: '3 Triplet' },
];

export const MetronomeModal: React.FC<MetronomeModalProps> = ({
  settings,
  songTempo,
  isLocked,
  libraryVersion,
  onUpdateSettings,
  onUpdateSongTempo,
  onTestVoice,
  onPreviewCustomCue,
  onCacheInvalidate,
  onClose,
}) => {
  const [testCueUrl, setTestCueUrl] = useState('/cues/chorus.mp3');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-t-3xl bg-[#181716] border-t border-x border-[#2D2B2A] shadow-2xl">
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#3A3734]" />
        </div>

        <div className="px-5 pb-4 flex items-start justify-between shrink-0">
          <div>
            <h2 className="font-serif-display text-[28px] font-bold text-[#F5F2EE] leading-tight">
              Metronome
            </h2>
            <p className="text-[13px] text-[#9C968F] mt-0.5">Click, cues and feel</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Metronome mixer"
            className="w-10 h-10 rounded-full bg-[#242220] hover:bg-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 space-y-5">
          {/* CLICK VOLUME */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
                CLICK VOLUME
              </span>
              <span className="text-xs font-medium text-[#F5F2EE] tabular-nums">
                {settings.clickVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.clickVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, clickVolume: Number(e.target.value) })
              }
              className="amber-slider"
            />
          </div>

          {/* CLICK BALANCE */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-2.5">
              CLICK BALANCE
            </p>
            <div className="grid grid-cols-3 gap-2">
              {BALANCES.map((side) => {
                const active = settings.clickBalance === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, clickBalance: side })}
                    className={`h-10 rounded-full border text-sm font-medium transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    {side}
                  </button>
                );
              })}
            </div>
          </div>

          {/* VOICE CUE VOLUME */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
                VOICE CUE VOLUME
              </span>
              <span className="text-xs font-medium text-[#F5F2EE] tabular-nums">
                {settings.voiceVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.voiceVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, voiceVolume: Number(e.target.value) })
              }
              className="amber-slider"
            />
          </div>

          {/* VOICE BALANCE */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase mb-2.5">
              VOICE BALANCE
            </p>
            <div className="grid grid-cols-3 gap-2">
              {BALANCES.map((side) => {
                const active = settings.voiceBalance === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, voiceBalance: side })}
                    className={`h-10 rounded-full border text-sm font-medium transition ${
                      active
                        ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                        : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                    }`}
                  >
                    {side}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onTestVoice(testCueUrl)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-sm font-medium text-[#F5F2EE] transition"
              >
                <Headphones className="w-4 h-4 text-[#E5A958]" />
                <span>Test voice</span>
              </button>

              <select
                value={testCueUrl}
                onChange={(e) => {
                  setTestCueUrl(e.target.value);
                  onTestVoice(e.target.value);
                }}
                aria-label="Select cue to test"
                className="h-9 px-3 rounded-full bg-[#141312] border border-[#2D2B2A] text-xs text-[#9C968F] focus:border-[#E5A958] focus:outline-none"
              >
                {BUNDLED_VOICE_CUES.map((c) => (
                  <option key={c.url} value={c.url}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <CuePointLibrary
                mode="mixer"
                libraryVersion={libraryVersion}
                onPreviewBundledCue={onTestVoice}
                onPreviewCustomCue={onPreviewCustomCue}
                onCacheInvalidate={onCacheInvalidate}
              />
            </div>
          </div>

          {/* CHORD VOLUME */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
                CHORD VOLUME
              </span>
              <span className="text-xs font-medium text-[#F5F2EE] tabular-nums">
                {settings.chordVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.chordVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, chordVolume: Number(e.target.value) })
              }
              className="amber-slider"
            />
          </div>

          {/* Count-in bar toggle */}
          <div className="rounded-2xl bg-[#141312] border border-[#2D2B2A] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-medium text-[#F5F2EE]">Count-in bar</p>
              <p className="text-xs text-[#9C968F] mt-0.5">
                Clicks and counts 1–4 before the song
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.countInBar}
              onClick={() =>
                onUpdateSettings({ ...settings, countInBar: !settings.countInBar })
              }
              className={`w-12 h-7 rounded-full p-1 transition shrink-0 ${
                settings.countInBar ? 'bg-[#E5A958]' : 'bg-[#2D2B2A]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#F5F2EE] transition-transform ${
                  settings.countInBar ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* SONG TEMPO */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
              SONG TEMPO
            </p>
            <p className="text-xs text-[#9C968F] mt-0.5 mb-3">
              Any value from 10 to 300
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                disabled={isLocked}
                min={10}
                max={300}
                value={songTempo}
                onChange={(e) =>
                  onUpdateSongTempo(Math.max(10, Math.min(300, Number(e.target.value) || 92)))
                }
                className="w-20 h-12 rounded-2xl bg-[#141312] border border-[#2D2B2A] text-center font-serif-display text-xl font-bold text-[#F5F2EE] tabular-nums disabled:opacity-50 focus:border-[#E5A958] focus:outline-none shrink-0"
              />
              <input
                type="range"
                disabled={isLocked}
                min={10}
                max={300}
                value={songTempo}
                onChange={(e) => onUpdateSongTempo(Number(e.target.value))}
                className="amber-slider disabled:opacity-50"
              />
            </div>
          </div>

          {/* Beat subdivisions */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {SUBDIVISIONS.map((sub) => {
              const active = settings.subdivision === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, subdivision: sub.id })}
                  className={`h-11 rounded-full border text-xs sm:text-sm font-medium transition ${
                    active
                      ? 'bg-[#252019] border-dashed border-[#E5A958] text-[#E5A958]'
                      : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
