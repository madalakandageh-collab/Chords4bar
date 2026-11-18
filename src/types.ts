export type TimeSignature = '4/4' | '3/4' | '6/8';

export type BarMeter = '4/4' | '3/4' | '2/4' | '6/8' | '5/4' | '7/8' | '9/8' | '12/8';

export type BeatUnit = 'Quarter' | 'Eighth' | 'Dotted' | 'Triplet';

export type BalanceSide = 'Left' | 'Center' | 'Right';

export type ScreenName =
  | 'sheets'
  | 'song-detail'
  | 'practice-select'
  | 'practice-player'
  | 'live-mode'
  | 'local-wifi'
  | 'member';

export interface Bar {
  id: string;
  chord: string; // e.g. 'G', 'Em', 'D7', or '-' for rest/continue
  meter?: BarMeter; // undefined means follows the song/section
  tempo?: number; // undefined means follows the song/section
  beatUnit?: BeatUnit;
  cue?: string; // e.g. 'Intro', 'Chorus', 'Bridge'
  customCueId?: string; // ID of a user-recorded custom voice cue in IndexedDB
  voiceCountLocked?: boolean;
  countingSystem?: string; // e.g. '1 1 1 1', '1 2 3 1', '1 2 1 2', or custom
  repeat?: number; // default 1
}

export interface CustomVoiceCue {
  id: string;
  name: string;
  mimeType: string;
  source?: 'recorded' | 'imported';
  audioData: ArrayBuffer;
  durationMs: number;
  createdAt: number;
}

export interface SerializedVoiceCue {
  id: string;
  name: string;
  mimeType: string;
  source?: 'recorded' | 'imported';
  audioBase64: string;
  durationMs: number;
  createdAt: number;
}

export interface Section {
  id: string;
  name: string;
  bars: Bar[];
  transpose?: number;
}

export interface LyricSection {
  id: string;
  label: string;
  lines: string[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  timeSignature: TimeSignature;
  transpose: number;
  sections: Section[];
  lyrics: LyricSection[];
  updatedAt: number;
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

export interface MetronomeSettings {
  clickVolume: number; // 0-100
  clickBalance: BalanceSide;
  voiceVolume: number; // 0-100
  voiceBalance: BalanceSide;
  chordVolume: number; // 0-100
  chordAudioEnabled: boolean;
  countInBar: boolean;
  subdivision: BeatUnit;
}

export interface RoomSyncState {
  roomId: string;
  song: Song | null;
  transpose: number;
  sectionTransposes: Record<string, number>;
  isPlaying: boolean;
  activeBarIndex: number;
  activeSectionId: string | null;
  speed: 50 | 75 | 100;
  tempoOverride: number | null;
  playStartedAtServerTime: number | null;
  playStartBarIndex: number;
  loopSectionId: string | null;
  updatedAt: number;
}

export interface RoomMemberInfo {
  clientId: string;
  role: 'leader' | 'member';
  deviceName: string;
  joinedAt: number;
}

export interface RoomPresence {
  roomId: string;
  memberCount: number;
  leaderConnected: boolean;
  members: RoomMemberInfo[];
}

export interface TimelineBar {
  globalBarIndex: number; // index into flattened expanded playback
  displayBarNumber: number; // 1-based bar index in song
  sectionId: string;
  sectionName: string;
  barId: string;
  bar: Bar;
  repeatIteration: number;
  repeatTotal: number;
  effectiveBpm: number;
  effectiveMeter: BarMeter;
  beatsPerBar: number;
  sectionTranspose: number;
}
