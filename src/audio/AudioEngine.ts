import type { BalanceSide, BeatUnit, CustomVoiceCue, MetronomeSettings, TimelineBar } from '../types';
import { chordToMidiNotes } from '../utils/chords';
import {
  BUNDLED_COUNT_CUES,
  BUNDLED_VOICE_CUES,
  getCustomVoiceCue,
  resolveBundledCueUrl,
  resolveCountCueUrl,
} from '../utils/voiceCues';

export interface PlaybackCallbacks {
  onBarChange: (timelineIndex: number, displayBarNumber: number, sectionId: string, beat: number, isCountIn: boolean) => void;
  onBeat: (beat: number, totalBeats: number, isCountIn: boolean) => void;
  onStop: () => void;
}

function balanceToPan(side: BalanceSide): number {
  if (side === 'Left') return -0.85;
  if (side === 'Right') return 0.85;
  return 0;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class ChordbookAudioEngine {
  private ctx: AudioContext | null = null;
  private timerId: number | null = null;
  private isRunning = false;
  private timeline: TimelineBar[] = [];
  private currentStepIndex = 0;
  private currentBeatInBar = 0;
  private nextNoteTime = 0;
  private speedPercent: 50 | 75 | 100 = 100;
  private globalTranspose = 0;
  private tempoOverride: number | null = null;
  private settings: MetronomeSettings;
  private callbacks: PlaybackCallbacks;
  private inCountIn = false;
  private countInBeat = 0;
  private countInTotalBeats = 4;
  private loopEnabled = false;
  private scheduledTimers: number[] = [];

  // Decoded AudioBuffer caches for bundled MP3 cues, 1-7 count MP3s, and user cues
  private bundledBufferCache = new Map<string, AudioBuffer>();
  private bundledLoadPromises = new Map<string, Promise<AudioBuffer | null>>();
  private customBufferCache = new Map<string, AudioBuffer>();
  private activeVoiceSources = new Set<AudioBufferSourceNode>();

  constructor(settings: MetronomeSettings, callbacks: PlaybackCallbacks) {
    this.settings = settings;
    this.callbacks = callbacks;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private async loadBundledCueBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.bundledBufferCache.has(url)) {
      return this.bundledBufferCache.get(url) || null;
    }
    const existingPromise = this.bundledLoadPromises.get(url);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
      try {
        const ctx = this.ensureContext();
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        this.bundledBufferCache.set(url, decoded);
        return decoded;
      } catch {
        return null;
      }
    })();

    this.bundledLoadPromises.set(url, promise);
    return promise;
  }

  private async loadCustomCueBuffer(cueId: string): Promise<AudioBuffer | null> {
    if (this.customBufferCache.has(cueId)) {
      return this.customBufferCache.get(cueId) || null;
    }
    try {
      const cue = await getCustomVoiceCue(cueId);
      if (!cue) return null;
      const ctx = this.ensureContext();
      const decoded = await ctx.decodeAudioData(cue.audioData.slice(0));
      this.customBufferCache.set(cueId, decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  public invalidateCustomCueCache(cueId: string): void {
    this.customBufferCache.delete(cueId);
  }

  public preloadAllBundledCues(): void {
    for (const cue of BUNDLED_VOICE_CUES) {
      void this.loadBundledCueBuffer(cue.url);
    }
    for (const countCue of BUNDLED_COUNT_CUES) {
      void this.loadBundledCueBuffer(countCue.url);
    }
  }

  private playBufferWithVoiceMixer(buffer: AudioBuffer, time: number): void {
    if (!this.ctx || this.settings.voiceVolume <= 0) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(1.0, time); // Keep natural vocal pitch across 50%, 75%, 100%

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0, Math.min(1.5, this.settings.voiceVolume / 100)), time);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(balanceToPan(this.settings.voiceBalance), time);

    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    this.activeVoiceSources.add(source);
    source.onended = () => {
      this.activeVoiceSources.delete(source);
    };

    source.start(Math.max(this.ctx.currentTime, time));
  }

  private scheduleVoiceCue(time: number, cueLabel?: string, customCueId?: string): void {
    if (this.settings.voiceVolume <= 0) return;

    if (customCueId) {
      const cached = this.customBufferCache.get(customCueId);
      if (cached) {
        this.playBufferWithVoiceMixer(cached, time);
        return;
      }
      void this.loadCustomCueBuffer(customCueId).then((buf) => {
        if (buf && this.isRunning && this.ctx) {
          this.playBufferWithVoiceMixer(buf, Math.max(this.ctx.currentTime, time));
        }
      });
      return;
    }

    const url = resolveBundledCueUrl(cueLabel);
    if (!url) return;

    const cached = this.bundledBufferCache.get(url);
    if (cached) {
      this.playBufferWithVoiceMixer(cached, time);
      return;
    }

    void this.loadBundledCueBuffer(url).then((buf) => {
      if (buf && this.isRunning && this.ctx) {
        this.playBufferWithVoiceMixer(buf, Math.max(this.ctx.currentTime, time));
      }
    });
  }

  private scheduleCountNumber(time: number, countNumber: number): void {
    if (this.settings.voiceVolume <= 0) return;
    const url = resolveCountCueUrl(countNumber);
    const cached = this.bundledBufferCache.get(url);
    if (cached) {
      this.playBufferWithVoiceMixer(cached, time);
      return;
    }
    void this.loadBundledCueBuffer(url).then((buf) => {
      if (buf && this.isRunning && this.ctx) {
        this.playBufferWithVoiceMixer(buf, Math.max(this.ctx.currentTime, time));
      }
    });
  }

  public updateSettings(settings: MetronomeSettings): void {
    this.settings = settings;
  }

  public updateLiveParams(params: {
    speedPercent?: 50 | 75 | 100;
    globalTranspose?: number;
    tempoOverride?: number | null;
    timeline?: TimelineBar[];
    loopEnabled?: boolean;
  }): void {
    if (params.speedPercent !== undefined) this.speedPercent = params.speedPercent;
    if (params.globalTranspose !== undefined) this.globalTranspose = params.globalTranspose;
    if (params.tempoOverride !== undefined) this.tempoOverride = params.tempoOverride;
    if (params.timeline !== undefined) {
      this.timeline = params.timeline;
      if (this.currentStepIndex >= this.timeline.length) {
        this.currentStepIndex = 0;
      }
    }
    if (params.loopEnabled !== undefined) this.loopEnabled = params.loopEnabled;
  }

  public start(options: {
    timeline: TimelineBar[];
    startIndex: number;
    speedPercent: 50 | 75 | 100;
    globalTranspose: number;
    tempoOverride: number | null;
    loopEnabled: boolean;
    skipCountIn?: boolean;
  }): void {
    this.stop(false);
    if (!options.timeline.length) return;

    const ctx = this.ensureContext();
    this.timeline = options.timeline;
    this.currentStepIndex = Math.max(0, Math.min(options.startIndex, options.timeline.length - 1));
    this.currentBeatInBar = 0;
    this.speedPercent = options.speedPercent;
    this.globalTranspose = options.globalTranspose;
    this.tempoOverride = options.tempoOverride;
    this.loopEnabled = options.loopEnabled;

    // Preload all 16 voice cue MP3s, 1-7 count MP3s, and custom cues used in timeline
    this.preloadAllBundledCues();
    for (const step of this.timeline) {
      if (step.bar.customCueId) {
        void this.loadCustomCueBuffer(step.bar.customCueId);
      }
    }

    const firstBar = this.timeline[this.currentStepIndex];
    this.countInTotalBeats = firstBar?.beatsPerBar || 4;
    this.inCountIn = Boolean(this.settings.countInBar && !options.skipCountIn);
    this.countInBeat = 0;

    this.isRunning = true;
    this.nextNoteTime = ctx.currentTime + 0.06;

    this.timerId = window.setInterval(() => this.scheduler(), 25);
  }

  public stop(notify = true): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    for (const id of this.scheduledTimers) {
      clearTimeout(id);
    }
    this.scheduledTimers = [];
    for (const src of this.activeVoiceSources) {
      try {
        src.stop();
      } catch {
        // Already stopped
      }
    }
    this.activeVoiceSources.clear();

    if (notify) {
      this.callbacks.onStop();
    }
  }

  public async testVoice(cueUrl = '/cues/chorus.mp3'): Promise<void> {
    const ctx = this.ensureContext();
    const buf = await this.loadBundledCueBuffer(cueUrl);
    if (buf) {
      this.playBufferWithVoiceMixer(buf, ctx.currentTime + 0.02);
    }
  }

  public async playCustomCue(cue: CustomVoiceCue): Promise<void> {
    const ctx = this.ensureContext();
    let buf = this.customBufferCache.get(cue.id);
    if (!buf) {
      try {
        buf = await ctx.decodeAudioData(cue.audioData.slice(0));
        this.customBufferCache.set(cue.id, buf);
      } catch {
        return;
      }
    }
    this.playBufferWithVoiceMixer(buf, ctx.currentTime + 0.02);
  }

  private playClick(time: number, isDownbeat: boolean, isSubdivision: boolean): void {
    if (!this.ctx || this.settings.clickVolume <= 0) return;
    const vol = (this.settings.clickVolume / 100) * (isSubdivision ? 0.38 : isDownbeat ? 0.95 : 0.65);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    panner.pan.setValueAtTime(balanceToPan(this.settings.clickBalance), time);
    osc.type = isDownbeat ? 'triangle' : 'sine';
    const freq = isDownbeat ? 1280 : isSubdivision ? 680 : 880;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.035);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.065);
  }

  private playChord(time: number, chordStr: string, semitones: number, durationSec: number): void {
    if (!this.ctx || !this.settings.chordAudioEnabled || this.settings.chordVolume <= 0) return;
    const notes = chordToMidiNotes(chordStr, semitones);
    if (!notes.length) return;

    const vol = (this.settings.chordVolume / 100) * 0.14;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1650, time);

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, time);
    masterGain.gain.linearRampToValueAtTime(vol, time + 0.025);
    masterGain.gain.exponentialRampToValueAtTime(vol * 0.45, time + Math.min(durationSec * 0.85, 1.5));
    masterGain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(durationSec, 1.8));

    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    for (const midi of notes) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(midi), time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + Math.min(durationSec + 0.05, 1.9));
    }
  }

  private scheduleSubdivisions(beatStartTime: number, beatDurationSec: number, unit: BeatUnit): void {
    if (unit === 'Eighth') {
      this.playClick(beatStartTime + beatDurationSec * 0.5, false, true);
    } else if (unit === 'Dotted') {
      this.playClick(beatStartTime + beatDurationSec * 0.75, false, true);
    } else if (unit === 'Triplet') {
      this.playClick(beatStartTime + beatDurationSec / 3, false, true);
      this.playClick(beatStartTime + (beatDurationSec * 2) / 3, false, true);
    }
  }

  private scheduler(): void {
    if (!this.isRunning || !this.ctx) return;

    const scheduleAheadTime = 0.1;
    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      const currentStep = this.timeline[this.currentStepIndex];
      if (!currentStep) {
        this.stop(true);
        return;
      }

      const rawBpm = this.tempoOverride || currentStep.effectiveBpm || 92;
      const effectiveBpm = Math.max(10, Math.min(300, rawBpm * (this.speedPercent / 100)));
      const beatDurationSec = 60 / effectiveBpm;

      if (this.inCountIn) {
        const beatNum = this.countInBeat + 1;
        const scheduledTime = this.nextNoteTime;

        this.playClick(scheduledTime, beatNum === 1, false);
        this.scheduleSubdivisions(scheduledTime, beatDurationSec, this.settings.subdivision);
        // Play spoken MP3 count 1-7 for the count-in bar (e.g. 1-2-3-4 for 4/4, 1-2-3 for 3/4, 1-2-3-4-5-6 for 6/8)
        this.scheduleCountNumber(scheduledTime, beatNum);

        const delayMs = Math.max(0, (scheduledTime - this.ctx.currentTime) * 1000);
        const timer = window.setTimeout(() => {
          if (!this.isRunning) return;
          this.callbacks.onBarChange(
            this.currentStepIndex,
            currentStep.displayBarNumber,
            currentStep.sectionId,
            beatNum,
            true
          );
          this.callbacks.onBeat(beatNum, this.countInTotalBeats, true);
        }, delayMs);
        this.scheduledTimers.push(timer);

        this.nextNoteTime += beatDurationSec;
        this.countInBeat += 1;
        if (this.countInBeat >= this.countInTotalBeats) {
          this.inCountIn = false;
          this.countInBeat = 0;
        }
        continue;
      }

      const beatIndex = this.currentBeatInBar;
      const beatNum = beatIndex + 1;
      const beatsInBar = currentStep.beatsPerBar;
      const scheduledTime = this.nextNoteTime;
      const stepIdxSnapshot = this.currentStepIndex;

      this.playClick(scheduledTime, beatNum === 1, false);
      const activeUnit = currentStep.bar.beatUnit || this.settings.subdivision;
      this.scheduleSubdivisions(scheduledTime, beatDurationSec, activeUnit);

      if (beatNum === 1) {
        const totalTranspose = this.globalTranspose + currentStep.sectionTranspose;
        this.playChord(scheduledTime, currentStep.bar.chord, totalTranspose, beatDurationSec * beatsInBar);

        if (currentStep.bar.cue || currentStep.bar.customCueId) {
          this.scheduleVoiceCue(scheduledTime, currentStep.bar.cue, currentStep.bar.customCueId);
        }
      }

      // Play spoken MP3 counts 1-7 when Voice count is locked to this bar
      if (currentStep.bar.voiceCountLocked) {
        const countPattern = (currentStep.bar.countingSystem || '1 1 1 1')
          .trim()
          .split(/[\s,]+/)
          .filter(Boolean);
        const countToken = countPattern[(beatNum - 1) % Math.max(1, countPattern.length)] || String(beatNum);
        const parsedCount = parseInt(countToken, 10);
        if (!Number.isNaN(parsedCount) && parsedCount >= 1 && parsedCount <= 7) {
          this.scheduleCountNumber(scheduledTime, parsedCount);
        }
      }

      const delayMs = Math.max(0, (scheduledTime - this.ctx.currentTime) * 1000);
      const timer = window.setTimeout(() => {
        if (!this.isRunning) return;
        this.callbacks.onBarChange(
          stepIdxSnapshot,
          currentStep.displayBarNumber,
          currentStep.sectionId,
          beatNum,
          false
        );
        this.callbacks.onBeat(beatNum, beatsInBar, false);
      }, delayMs);
      this.scheduledTimers.push(timer);

      this.nextNoteTime += beatDurationSec;
      this.currentBeatInBar += 1;

      if (this.currentBeatInBar >= beatsInBar) {
        this.currentBeatInBar = 0;
        this.currentStepIndex += 1;
        if (this.currentStepIndex >= this.timeline.length) {
          if (this.loopEnabled) {
            this.currentStepIndex = 0;
          } else {
            const endDelay = Math.max(0, (this.nextNoteTime - this.ctx.currentTime) * 1000);
            const stopTimer = window.setTimeout(() => {
              if (this.isRunning) this.stop(true);
            }, endDelay);
            this.scheduledTimers.push(stopTimer);
            return;
          }
        }
      }
    }
  }
}
