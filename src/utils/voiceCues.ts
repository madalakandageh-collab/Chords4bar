import type { CustomVoiceCue, SerializedVoiceCue } from '../types';

export interface BundledVoiceCue {
  label: string;
  url: string;
}

export const BUNDLED_VOICE_CUES: BundledVoiceCue[] = [
  { label: 'Acapella', url: '/cues/acapella.mp3' },
  { label: 'Ad Lib', url: '/cues/ad-lib.mp3' },
  { label: 'All In', url: '/cues/all-in.mp3' },
  { label: 'Bass', url: '/cues/bass.mp3' },
  { label: 'Bridge', url: '/cues/bridge.mp3' },
  { label: 'Chorus', url: '/cues/chorus.mp3' },
  { label: 'Interlude', url: '/cues/interlude.mp3' },
  { label: 'Intro', url: '/cues/intro.mp3' },
  { label: 'Key Change Up', url: '/cues/key-change-up.mp3' },
  { label: 'Keys', url: '/cues/keys.mp3' },
  { label: 'Last Time', url: '/cues/last-time.mp3' },
  { label: 'Outro', url: '/cues/outro.mp3' },
  { label: 'Pre Chorus 3', url: '/cues/pre-chorus-3.mp3' },
  { label: 'Rap', url: '/cues/rap.mp3' },
  { label: 'Verse', url: '/cues/verse.mp3' },
  { label: 'Worship Freely', url: '/cues/worship-freely.mp3' },
];

export const COUNT_CUE_URLS: Record<number, string> = {
  1: '/cues/counts/1.mp3',
  2: '/cues/counts/2.mp3',
  3: '/cues/counts/3.mp3',
  4: '/cues/counts/4.mp3',
  5: '/cues/counts/5.mp3',
  6: '/cues/counts/6.mp3',
  7: '/cues/counts/7.mp3',
};

export const BUNDLED_COUNT_CUES: BundledVoiceCue[] = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  label: `Count ${n}`,
  url: COUNT_CUE_URLS[n],
}));

const NORMALIZED_MAP = new Map<string, string>(
  BUNDLED_VOICE_CUES.map((c) => [c.label.toLowerCase(), c.url])
);

const ALIAS_MAP: Record<string, string> = {
  'a cappella': '/cues/acapella.mp3',
  keyboard: '/cues/keys.mp3',
  end: '/cues/outro.mp3',
  'pre chorus': '/cues/pre-chorus-3.mp3',
  'key change': '/cues/key-change-up.mp3',
};

export function resolveBundledCueUrl(label?: string): string | null {
  if (!label) return null;
  const norm = label.trim().toLowerCase();
  if (!norm) return null;
  return NORMALIZED_MAP.get(norm) || ALIAS_MAP[norm] || null;
}

export function resolveCountCueUrl(countNum: number): string {
  const clamped = ((Math.round(countNum) - 1) % 7 + 7) % 7 + 1;
  return COUNT_CUE_URLS[clamped] || COUNT_CUE_URLS[1];
}

// IndexedDB persistence for user-recorded and user-imported custom voice cues
const DB_NAME = 'chordbook_voice_cues_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_cues';

const memoryFallback = new Map<string, CustomVoiceCue>();

function openCueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

export async function listCustomVoiceCues(): Promise<CustomVoiceCue[]> {
  try {
    const db = await openCueDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as CustomVoiceCue[]) || [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        for (const item of items) {
          memoryFallback.set(item.id, item);
        }
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return Array.from(memoryFallback.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function saveCustomVoiceCue(cue: CustomVoiceCue): Promise<void> {
  memoryFallback.set(cue.id, cue);
  try {
    const db = await openCueDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(cue);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Kept in memoryFallback
  }
}

export async function renameCustomVoiceCue(id: string, newName: string): Promise<CustomVoiceCue | null> {
  const trimmed = newName.trim();
  if (!trimmed) return null;
  const existing = await getCustomVoiceCue(id);
  if (!existing) return null;
  const updated: CustomVoiceCue = { ...existing, name: trimmed };
  await saveCustomVoiceCue(updated);
  return updated;
}

export async function deleteCustomVoiceCue(id: string): Promise<void> {
  memoryFallback.delete(id);
  try {
    const db = await openCueDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore
  }
}

export async function getCustomVoiceCue(id: string): Promise<CustomVoiceCue | null> {
  if (memoryFallback.has(id)) {
    return memoryFallback.get(id) || null;
  }
  try {
    const db = await openCueDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = (req.result as CustomVoiceCue) || null;
        if (res) memoryFallback.set(res.id, res);
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

function cleanNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, '');
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || 'Imported Cue';
}

async function measureAudioDurationMs(arrayBuffer: ArrayBuffer): Promise<number> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const ms = Math.round(decoded.duration * 1000);
    await ctx.close().catch(() => {});
    return Math.max(200, ms);
  } catch {
    return 1000;
  }
}

export async function importAudioFilesAsCues(files: FileList | File[]): Promise<CustomVoiceCue[]> {
  const list = Array.from(files);
  const imported: CustomVoiceCue[] = [];

  for (const file of list) {
    try {
      const arrayData = await file.arrayBuffer();
      const durationMs = await measureAudioDurationMs(arrayData);
      const cue: CustomVoiceCue = {
        id: `import-cue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanNameFromFilename(file.name),
        mimeType: file.type || 'audio/mpeg',
        source: 'imported',
        audioData: arrayData,
        durationMs,
        createdAt: Date.now(),
      };
      await saveCustomVoiceCue(cue);
      imported.push(cue);
    } catch {
      // Skip unreadable file
    }
  }

  return imported;
}

// Base64 helpers for JSON Backup Export/Import
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    parts.push(String.fromCharCode(...chunk));
  }
  return btoa(parts.join(''));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function exportCustomVoiceCuesAsBase64(): Promise<SerializedVoiceCue[]> {
  const cues = await listCustomVoiceCues();
  return cues.map((cue) => ({
    id: cue.id,
    name: cue.name,
    mimeType: cue.mimeType,
    source: cue.source || 'recorded',
    audioBase64: arrayBufferToBase64(cue.audioData),
    durationMs: cue.durationMs,
    createdAt: cue.createdAt,
  }));
}

export async function importCustomVoiceCuesFromBase64(items: SerializedVoiceCue[]): Promise<number> {
  if (!Array.isArray(items)) return 0;
  let count = 0;
  for (const item of items) {
    if (!item || !item.id || !item.name || !item.audioBase64) continue;
    try {
      const audioData = base64ToArrayBuffer(item.audioBase64);
      const cue: CustomVoiceCue = {
        id: item.id,
        name: item.name,
        mimeType: item.mimeType || 'audio/webm',
        source: item.source || 'recorded',
        audioData,
        durationMs: item.durationMs || 1000,
        createdAt: item.createdAt || Date.now(),
      };
      await saveCustomVoiceCue(cue);
      count += 1;
    } catch {
      // Skip malformed entry
    }
  }
  return count;
}
