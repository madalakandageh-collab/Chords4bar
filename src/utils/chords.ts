import type { Bar, BarMeter, Song, TimelineBar } from '../types';

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const DISPLAY_FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

export function normalizeRootIndex(note: string): number | null {
  const idx = NOTE_TO_INDEX[note];
  return typeof idx === 'number' ? idx : null;
}

export function transposeNote(note: string, semitones: number, preferFlats = false): string {
  const idx = normalizeRootIndex(note);
  if (idx === null) return note;
  const wrapped = ((idx + semitones) % 12 + 12) % 12;
  if (preferFlats) {
    return FLAT_SCALE[wrapped];
  }
  // Common stage-friendly spellings: C#, Eb, F#, Ab, Bb
  const stageScale = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return stageScale[wrapped];
}

export function transposeChord(chord: string, semitones: number, targetKey?: string): string {
  const trimmed = chord.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || semitones === 0) {
    return trimmed === '-' ? '—' : trimmed;
  }

  const preferFlats = targetKey ? DISPLAY_FLAT_KEYS.has(targetKey) : false;

  // Handle slash chords e.g. G/B, Dm7/C
  const slashParts = trimmed.split('/');
  const mainPart = slashParts[0];
  const bassPart = slashParts[1];

  const mainMatch = mainPart.match(/^([A-G][#b]?)(.*)$/);
  if (!mainMatch) return trimmed;

  const newRoot = transposeNote(mainMatch[1], semitones, preferFlats);
  let result = `${newRoot}${mainMatch[2]}`;

  if (bassPart) {
    const bassMatch = bassPart.match(/^([A-G][#b]?)(.*)$/);
    if (bassMatch) {
      const newBass = transposeNote(bassMatch[1], semitones, preferFlats);
      result += `/${newBass}${bassMatch[2]}`;
    } else {
      result += `/${bassPart}`;
    }
  }

  return result;
}

export function transposeKey(baseKey: string, semitones: number): string {
  const trimmed = baseKey.trim();
  if (!trimmed || semitones === 0) return trimmed;
  const match = trimmed.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return trimmed;
  const newRoot = transposeNote(match[1], semitones, false);
  return `${newRoot}${match[2]}`;
}

export function formatChordDisplay(chord: string): string {
  if (!chord || chord.trim() === '' || chord.trim() === '-') {
    return '—';
  }
  return chord.trim();
}

export function parseMeterBeats(meter: BarMeter | string): number {
  const [numStr] = meter.split('/');
  const num = parseInt(numStr, 10);
  if (Number.isNaN(num) || num < 1) return 4;
  return num;
}

export function getSongTotalBars(song: Song): number {
  return song.sections.reduce((acc, sec) => {
    const secTotal = sec.bars.reduce((bAcc, bar) => bAcc + (bar.repeat && bar.repeat > 1 ? bar.repeat : 1), 0);
    return acc + secTotal;
  }, 0);
}

export function buildSongTimeline(
  song: Song,
  sectionTransposes: Record<string, number> = {},
  loopSectionId: string | null = null
): TimelineBar[] {
  const timeline: TimelineBar[] = [];
  let displayBarCounter = 0;

  for (const section of song.sections) {
    const secTranspose = sectionTransposes[section.id] ?? section.transpose ?? 0;
    for (const bar of section.bars) {
      const repeats = bar.repeat && bar.repeat > 1 ? bar.repeat : 1;
      for (let r = 1; r <= repeats; r++) {
        displayBarCounter += 1;
        if (loopSectionId && section.id !== loopSectionId) {
          continue;
        }
        const effectiveMeter = (bar.meter || song.timeSignature) as BarMeter;
        const effectiveBpm = bar.tempo || song.bpm;
        timeline.push({
          globalBarIndex: timeline.length,
          displayBarNumber: displayBarCounter,
          sectionId: section.id,
          sectionName: section.name,
          barId: bar.id,
          bar,
          repeatIteration: r,
          repeatTotal: repeats,
          effectiveBpm,
          effectiveMeter,
          beatsPerBar: parseMeterBeats(effectiveMeter),
          sectionTranspose: secTranspose,
        });
      }
    }
  }

  return timeline;
}

export function getGlobalDisplayBarNumber(song: Song, targetSectionId: string, targetBarId: string): number {
  let count = 0;
  for (const sec of song.sections) {
    for (const bar of sec.bars) {
      const repeats = bar.repeat && bar.repeat > 1 ? bar.repeat : 1;
      if (sec.id === targetSectionId && bar.id === targetBarId) {
        return count + 1;
      }
      count += repeats;
    }
  }
  return 1;
}

export function chordToMidiNotes(chordStr: string, semitones = 0): number[] {
  const transposed = transposeChord(chordStr, semitones);
  if (!transposed || transposed === '—' || transposed === '-') return [];

  const mainPart = transposed.split('/')[0];
  const match = mainPart.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return [];

  const rootIdx = normalizeRootIndex(match[1]);
  if (rootIdx === null) return [];

  const quality = match[2].toLowerCase();
  const baseMidi = 48 + rootIdx; // C3..B3 range

  let intervals = [0, 4, 7]; // major default
  if (quality === 'min' || quality === 'm') {
    intervals = [0, 3, 7];
  } else if (quality === '7') {
    intervals = [0, 4, 7, 10];
  } else if (quality === 'maj7') {
    intervals = [0, 4, 7, 11];
  } else if (quality === 'm7' || quality === 'min7') {
    intervals = [0, 3, 7, 10];
  } else if (quality === 'sus2') {
    intervals = [0, 2, 7];
  } else if (quality === 'sus4') {
    intervals = [0, 5, 7];
  } else if (quality === 'add9') {
    intervals = [0, 4, 7, 14];
  } else if (quality === '6') {
    intervals = [0, 4, 7, 9];
  } else if (quality === '9') {
    intervals = [0, 4, 7, 10, 14];
  } else if (quality === 'dim') {
    intervals = [0, 3, 6];
  } else if (quality === 'aug') {
    intervals = [0, 4, 8];
  } else if (quality === 'm7b5') {
    intervals = [0, 3, 6, 10];
  } else if (quality === '5') {
    intervals = [0, 7, 12];
  } else if (quality.startsWith('m')) {
    intervals = [0, 3, 7];
  }

  return intervals.map((iv) => baseMidi + iv);
}

export function createEmptyBar(chord = '-'): Bar {
  return {
    id: `bar-${Math.random().toString(36).slice(2, 9)}`,
    chord,
    repeat: 1,
  };
}

export { SHARP_SCALE, FLAT_SCALE };
