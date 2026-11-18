import React, { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  FileJson,
  ListMusic,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { SerializedVoiceCue, Setlist, Song } from '../types';
import { createEmptyBar, getSongTotalBars, transposeKey } from '../utils/chords';

interface SheetsHomeScreenProps {
  songs: Song[];
  setlists: Setlist[];
  isLocked: boolean;
  onSelectSong: (songId: string) => void;
  onCreateSong: (song: Song) => void;
  onCreateSetlist: (name: string) => void;
  onDeleteSetlist: (setlistId: string) => void;
  onAddSongToSetlist: (setlistId: string, songId: string) => void;
  onRemoveSongFromSetlist: (setlistId: string, songId: string) => void;
  onPlaySongFromSetlist: (songId: string) => void;
  onImportJson: (data: {
    songs?: Song[];
    setlists?: Setlist[];
    customVoiceCues?: SerializedVoiceCue[];
  }) => void | Promise<void>;
  onExportJson: () => void | Promise<void>;
}

export const SheetsHomeScreen: React.FC<SheetsHomeScreenProps> = ({
  songs,
  setlists,
  isLocked,
  onSelectSong,
  onCreateSong,
  onCreateSetlist,
  onDeleteSetlist,
  onAddSongToSetlist,
  onRemoveSongFromSetlist,
  onPlaySongFromSetlist,
  onImportJson,
  onExportJson,
}) => {
  const [activeTab, setActiveTab] = useState<'songs' | 'setlists'>('songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSetlists, setExpandedSetlists] = useState<Record<string, boolean>>({});
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [showNewSetlistModal, setShowNewSetlistModal] = useState(false);
  const [addSongTargetSetlistId, setAddSongTargetSetlistId] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // New Song Form State
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newKey, setNewKey] = useState('G');
  const [newBpm, setNewBpm] = useState(92);
  const [newMeter, setNewMeter] = useState<'4/4' | '3/4' | '6/8'>('4/4');

  // New Setlist Form State
  const [newSetlistName, setNewSetlistName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSongs = songs.filter((song) => {
    if (!normalizedQuery) return true;
    const displayKey = transposeKey(song.key, song.transpose || 0);
    return (
      song.title.toLowerCase().includes(normalizedQuery) ||
      song.artist.toLowerCase().includes(normalizedQuery) ||
      displayKey.toLowerCase().includes(normalizedQuery)
    );
  });

  const filteredSetlists = setlists.filter((sl) => {
    if (!normalizedQuery) return true;
    return sl.name.toLowerCase().includes(normalizedQuery);
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          onImportJson({ songs: parsed as Song[] });
          setImportFeedback(`Imported ${parsed.length} songs`);
        } else if (parsed && typeof parsed === 'object') {
          const obj = parsed as {
            songs?: Song[];
            setlists?: Setlist[];
            customVoiceCues?: SerializedVoiceCue[];
          };
          void onImportJson(obj);
          const parts: string[] = [];
          if (obj.songs?.length) parts.push(`${obj.songs.length} songs`);
          if (obj.setlists?.length) parts.push(`${obj.setlists.length} setlists`);
          if (obj.customVoiceCues?.length) parts.push(`${obj.customVoiceCues.length} voice cues`);
          setImportFeedback(
            parts.length ? `Imported ${parts.join(', ')}` : 'Backup imported'
          );
        }
      } catch {
        setImportFeedback('Invalid JSON file');
      }
      setTimeout(() => setImportFeedback(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateSongSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: Song = {
      id: `song-${Date.now().toString(36)}`,
      title: newTitle.trim(),
      artist: newArtist.trim() || 'Unknown Artist',
      key: newKey,
      bpm: Math.max(20, Math.min(300, Number(newBpm) || 92)),
      timeSignature: newMeter,
      transpose: 0,
      updatedAt: Date.now(),
      sections: [
        {
          id: `sec-intro-${Date.now()}`,
          name: 'Intro',
          bars: [createEmptyBar(newKey), createEmptyBar('-'), createEmptyBar(newKey), createEmptyBar('-')],
        },
        {
          id: `sec-chorus-${Date.now()}`,
          name: 'Chorus',
          bars: [createEmptyBar(newKey), createEmptyBar(newKey), createEmptyBar('-'), createEmptyBar('-')],
        },
      ],
      lyrics: [
        {
          id: `lyr-${Date.now()}`,
          label: 'Chorus',
          lines: ['Add your lyrics here...'],
        },
      ],
    };
    onCreateSong(created);
    setNewTitle('');
    setNewArtist('');
    setShowNewSongModal(false);
  };

  const handleCreateSetlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistName.trim()) return;
    onCreateSetlist(newSetlistName.trim());
    setNewSetlistName('');
    setShowNewSetlistModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-36">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.26em] text-[#9C968F] uppercase">
            CHORDBOOK
          </p>
          <h1 className="font-serif-display text-[36px] leading-[1.08] font-bold text-[#F5F2EE] mt-1.5">
            Your sheets
          </h1>
          <p className="text-[14px] text-[#9C968F] mt-2">
            Works offline · saved on this device
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[13px] font-medium text-[#F5F2EE] transition whitespace-nowrap"
          >
            <FileJson className="w-4 h-4 text-[#E5A958]" />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            onClick={onExportJson}
            aria-label="Export all songs and setlists as JSON"
            title="Export JSON"
            className="w-10 h-10 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="mt-3 px-4 py-2 rounded-xl bg-[#252019] border border-[#E5A958]/40 text-xs text-[#E5A958]">
          {importFeedback}
        </div>
      )}

      {/* Search Bar */}
      <div className="mt-6 relative">
        <Search className="w-4 h-4 text-[#9C968F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search songs, artists, keys"
          className="w-full h-12 pl-11 pr-10 rounded-2xl bg-[#181716] border border-[#2D2B2A] focus:border-[#E5A958]/70 focus:outline-none text-[15px] text-[#F5F2EE] placeholder:text-[#78736D] transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-[#2D2B2A] text-[#9C968F] flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Segmented Pill Toggle */}
      <div className="mt-4 p-1 rounded-full bg-[#181716] border border-[#2D2B2A] grid grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveTab('songs')}
          className={`py-2.5 rounded-full text-[14px] font-semibold transition whitespace-nowrap tabular-nums ${
            activeTab === 'songs'
              ? 'bg-[#E5A958] text-[#121212] shadow-sm'
              : 'text-[#9C968F] hover:text-[#F5F2EE]'
          }`}
        >
          Songs {songs.length}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('setlists')}
          className={`py-2.5 rounded-full text-[14px] font-semibold transition whitespace-nowrap tabular-nums ${
            activeTab === 'setlists'
              ? 'bg-[#E5A958] text-[#121212] shadow-sm'
              : 'text-[#9C968F] hover:text-[#F5F2EE]'
          }`}
        >
          Setlists {setlists.length}
        </button>
      </div>

      {/* Songs List */}
      {activeTab === 'songs' ? (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSongs.map((song) => {
            const totalBars = getSongTotalBars(song);
            const displayKey = transposeKey(song.key, song.transpose || 0);
            return (
              <button
                key={song.id}
                type="button"
                onClick={() => onSelectSong(song.id)}
                className="w-full flex items-center justify-between gap-3.5 p-4 rounded-2xl bg-[#1C1B1A] hover:bg-[#22201E] active:scale-[0.99] border border-[#2D2B2A] text-left transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#2B2318] border border-[#E5A958]/20 text-[#E5A958] font-bold text-[15px] flex items-center justify-center shrink-0">
                    {displayKey}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif-display text-[17px] font-bold text-[#F5F2EE] truncate">
                      {song.title}
                    </h2>
                    <p className="text-[13px] text-[#9C968F] truncate mt-0.5 tabular-nums">
                      {song.artist} · {totalBars} bars · {song.bpm} bpm
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#78736D] group-hover:text-[#F5F2EE] shrink-0 transition" />
              </button>
            );
          })}

          {filteredSongs.length === 0 && (
            <div className="md:col-span-2 py-12 text-center rounded-2xl bg-[#1C1B1A] border border-[#2D2B2A]">
              <p className="text-[#9C968F] text-sm">No songs match &ldquo;{searchQuery}&rdquo;.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filteredSetlists.map((setlist) => {
            const isExpanded = !!expandedSetlists[setlist.id];
            const setlistSongs = setlist.songIds
              .map((id) => songs.find((s) => s.id === id))
              .filter((s): s is Song => Boolean(s));

            return (
              <div
                key={setlist.id}
                className="rounded-2xl bg-[#1C1B1A] border border-[#2D2B2A] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSetlists((prev) => ({ ...prev, [setlist.id]: !prev[setlist.id] }))
                  }
                  className="w-full flex items-center justify-between gap-3.5 p-4 hover:bg-[#22201E] transition text-left"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#242220] border border-[#2D2B2A] text-[#E5A958] flex items-center justify-center shrink-0">
                      <ListMusic className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-serif-display text-[18px] font-bold text-[#F5F2EE] truncate">
                        {setlist.name}
                      </h2>
                      <p className="text-[13px] text-[#9C968F] mt-0.5 tabular-nums">
                        {setlistSongs.length} {setlistSongs.length === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#9C968F] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#9C968F] shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#2D2B2A]/80 space-y-2">
                    {setlistSongs.length === 0 ? (
                      <p className="text-xs text-[#9C968F] py-2">
                        No songs in this setlist yet.
                      </p>
                    ) : (
                      setlistSongs.map((s, idx) => (
                        <div
                          key={`${setlist.id}-${s.id}-${idx}`}
                          className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#151413] border border-[#2D2B2A]/70"
                        >
                          <button
                            type="button"
                            onClick={() => onSelectSong(s.id)}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left"
                          >
                            <span className="text-xs text-[#78736D] tabular-nums w-4">
                              {idx + 1}.
                            </span>
                            <span className="w-7 h-7 rounded-full bg-[#2B2318] text-[#E5A958] text-xs font-bold flex items-center justify-center shrink-0">
                              {transposeKey(s.key, s.transpose || 0)}
                            </span>
                            <span className="text-sm font-medium text-[#F5F2EE] truncate">
                              {s.title}
                            </span>
                            <span className="text-xs text-[#9C968F] tabular-nums hidden sm:inline">
                              {s.bpm} bpm
                            </span>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onPlaySongFromSetlist(s.id)}
                              aria-label={`Play ${s.title}`}
                              className="w-8 h-8 rounded-full bg-[#E5A958]/15 hover:bg-[#E5A958]/25 text-[#E5A958] flex items-center justify-center"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => onRemoveSongFromSetlist(setlist.id, s.id)}
                                aria-label={`Remove ${s.title} from setlist`}
                                className="w-8 h-8 rounded-full hover:bg-red-500/15 text-[#9C968F] hover:text-red-400 flex items-center justify-center"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {!isLocked && (
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setAddSongTargetSetlistId(setlist.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#242220] hover:bg-[#2D2B2A] text-xs font-medium text-[#E5A958]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add song</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteSetlist(setlist.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-red-500/15 text-xs text-red-400/90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-[13px] text-[#9C968F] pt-3 px-1 leading-relaxed">
            Everything stays on this device — saved locally, works without a connection.
          </p>
        </div>
      )}

      {/* Bottom Floating Action Pill */}
      {!isLocked && (
        <div className="fixed bottom-20 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
          <button
            type="button"
            onClick={() =>
              activeTab === 'songs' ? setShowNewSongModal(true) : setShowNewSetlistModal(true)
            }
            className="pointer-events-auto inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#E5A958] hover:bg-[#ecb66c] active:scale-95 text-[#121212] font-semibold text-[15px] shadow-xl shadow-black/50 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{activeTab === 'songs' ? 'New song' : 'New setlist'}</span>
          </button>
        </div>
      )}

      {/* New Song Modal */}
      {showNewSongModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={handleCreateSongSubmit}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#1C1B1A] border border-[#2D2B2A] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif-display text-2xl font-bold text-[#F5F2EE]">New song</h2>
              <button
                type="button"
                onClick={() => setShowNewSongModal(false)}
                className="w-9 h-9 rounded-full bg-[#242220] text-[#F5F2EE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs tracking-wider uppercase text-[#9C968F] mb-1.5">
                Song title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Raththaran Neth"
                className="w-full h-11 px-3.5 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] focus:border-[#E5A958] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs tracking-wider uppercase text-[#9C968F] mb-1.5">
                Artist
              </label>
              <input
                type="text"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                placeholder="e.g. Victor Rathnayake"
                className="w-full h-11 px-3.5 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] focus:border-[#E5A958] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#9C968F] mb-1.5">
                  Key
                </label>
                <select
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] focus:border-[#E5A958] focus:outline-none"
                >
                  {['C', 'Cm', 'D', 'Dm', 'Eb', 'E', 'Em', 'F', 'Fm', 'G', 'Gm', 'Ab', 'A', 'Am', 'Bb', 'Bm', 'B'].map(
                    (k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#9C968F] mb-1.5">
                  BPM
                </label>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={newBpm}
                  onChange={(e) => setNewBpm(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] tabular-nums focus:border-[#E5A958] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#9C968F] mb-1.5">
                  Meter
                </label>
                <select
                  value={newMeter}
                  onChange={(e) => setNewMeter(e.target.value as '4/4' | '3/4' | '6/8')}
                  className="w-full h-11 px-3 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] focus:border-[#E5A958] focus:outline-none"
                >
                  <option value="4/4">4/4</option>
                  <option value="3/4">3/4</option>
                  <option value="6/8">6/8</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-full bg-[#E5A958] hover:bg-[#ecb66c] text-[#121212] font-semibold text-sm transition"
            >
              Create chord sheet
            </button>
          </form>
        </div>
      )}

      {/* New Setlist Modal */}
      {showNewSetlistModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={handleCreateSetlistSubmit}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#1C1B1A] border border-[#2D2B2A] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif-display text-2xl font-bold text-[#F5F2EE]">New setlist</h2>
              <button
                type="button"
                onClick={() => setShowNewSetlistModal(false)}
                className="w-9 h-9 rounded-full bg-[#242220] text-[#F5F2EE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs tracking-wider uppercase text-[#9C968F] mb-1.5">
                Setlist name
              </label>
              <input
                type="text"
                required
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
                placeholder="e.g. Friday Wedding Gig"
                className="w-full h-11 px-3.5 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] focus:border-[#E5A958] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-full bg-[#E5A958] hover:bg-[#ecb66c] text-[#121212] font-semibold text-sm transition"
            >
              Create setlist
            </button>
          </form>
        </div>
      )}

      {/* Add Song to Setlist Picker Modal */}
      {addSongTargetSetlistId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md max-h-[75vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#1C1B1A] border border-[#2D2B2A] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3">
              <h2 className="font-serif-display text-xl font-bold text-[#F5F2EE]">
                Add song to setlist
              </h2>
              <button
                type="button"
                onClick={() => setAddSongTargetSetlistId(null)}
                className="w-9 h-9 rounded-full bg-[#242220] text-[#F5F2EE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 pr-1">
              {songs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onAddSongToSetlist(addSongTargetSetlistId, s.id);
                    setAddSongTargetSetlistId(null);
                  }}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-[#151413] hover:bg-[#242220] border border-[#2D2B2A] text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#2B2318] text-[#E5A958] text-xs font-bold flex items-center justify-center shrink-0">
                      {transposeKey(s.key, s.transpose || 0)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#F5F2EE] truncate">{s.title}</div>
                      <div className="text-xs text-[#9C968F] truncate">{s.artist}</div>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-[#E5A958] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
