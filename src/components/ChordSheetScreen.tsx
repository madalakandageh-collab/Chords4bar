import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  MoreVertical,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Bar, LyricSection, Section, Song, TimeSignature } from '../types';
import {
  formatChordDisplay,
  getSongTotalBars,
  parseMeterBeats,
  transposeChord,
  transposeKey,
} from '../utils/chords';

interface ChordSheetScreenProps {
  song: Song;
  isLocked: boolean;
  hasUnsavedChanges: boolean;
  isPlaying: boolean;
  activeBarId: string | null;
  activeSectionId: string | null;
  activeDisplayBarNumber: number | null;
  onBack: () => void;
  onSaveSong: () => void;
  onTransposeChange: (delta: number) => void;
  onTimeSignatureChange: (ts: TimeSignature) => void;
  onOpenBarEditor: (sectionId: string, barId: string) => void;
  onAddBarToSection: (sectionId: string) => void;
  onPlaySection: (sectionId: string) => void;
  onAddSection: (name: string) => void;
  onRenameSection: (sectionId: string, newName: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onUpdateSongMeta: (title: string, artist: string, key: string) => void;
  onUpdateLyrics: (lyrics: LyricSection[]) => void;
  onDeleteSong: () => void;
}

export const ChordSheetScreen: React.FC<ChordSheetScreenProps> = ({
  song,
  isLocked,
  hasUnsavedChanges,
  isPlaying,
  activeBarId,
  activeSectionId,
  onBack,
  onSaveSong,
  onTransposeChange,
  onTimeSignatureChange,
  onOpenBarEditor,
  onAddBarToSection,
  onPlaySection,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onUpdateSongMeta,
  onUpdateLyrics,
  onDeleteSong,
}) => {
  const [tab, setTab] = useState<'chords' | 'lyrics'>('chords');
  const [showSongMenu, setShowSongMenu] = useState(false);
  const [activeSectionMenuId, setActiveSectionMenuId] = useState<string | null>(null);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [renamingSection, setRenamingSection] = useState<{ id: string; name: string } | null>(null);
  const [showEditMetaModal, setShowEditMetaModal] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [editArtist, setEditArtist] = useState(song.artist);
  const [editKey, setEditKey] = useState(song.key);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [lyricsDraftText, setLyricsDraftText] = useState('');

  const activeBarRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isPlaying && activeBarRef.current) {
      activeBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isPlaying, activeBarId]);

  const totalBars = getSongTotalBars(song);
  const displayKey = transposeKey(song.key, song.transpose || 0);

  let runningBarNum = 0;

  const openLyricsModal = () => {
    const serialized = song.lyrics
      .map((sec) => `[${sec.label}]\n${sec.lines.join('\n')}`)
      .join('\n\n');
    setLyricsDraftText(serialized);
    setShowLyricsEditor(true);
  };

  const handleSaveLyricsText = (e: React.FormEvent) => {
    e.preventDefault();
    const blocks = lyricsDraftText.split(/\n\s*\n/).filter((b) => b.trim());
    const parsed: LyricSection[] = blocks.map((block, idx) => {
      const lines = block.split('\n').map((l) => l.trimEnd());
      const firstLine = lines[0]?.trim() || '';
      const headerMatch = firstLine.match(/^\[(.+)\]$/);
      if (headerMatch) {
        return {
          id: `lyr-${idx}-${Date.now()}`,
          label: headerMatch[1].trim(),
          lines: lines.slice(1).filter((l) => l.length > 0),
        };
      }
      return {
        id: `lyr-${idx}-${Date.now()}`,
        label: `Section ${idx + 1}`,
        lines: lines.filter((l) => l.length > 0),
      };
    });
    onUpdateLyrics(parsed.length ? parsed : [{ id: `lyr-0`, label: 'Chorus', lines: [''] }]);
    setShowLyricsEditor(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-32">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to Your sheets"
        className="w-10 h-10 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Song Header */}
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-[0.24em] text-[#9C968F] uppercase">
            CHORD SHEET
          </p>
          <h1 className="font-serif-display text-[32px] leading-[1.12] font-bold text-[#F5F2EE] mt-1 truncate">
            {song.title}
          </h1>
          <p className="text-[15px] text-[#9C968F] mt-1 truncate">{song.artist}</p>
        </div>

        <div className="flex items-center gap-2 pt-3 shrink-0 relative">
          <button
            type="button"
            onClick={onSaveSong}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition whitespace-nowrap ${
              hasUnsavedChanges
                ? 'bg-[#E5A958] text-[#121212] hover:bg-[#ecb66c]'
                : 'bg-[#1C1B1A] border border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
            }`}
          >
            Save Song
          </button>

          <button
            type="button"
            onClick={() => setShowSongMenu((v) => !v)}
            aria-label="Song options"
            className="w-10 h-10 rounded-full bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-[#F5F2EE] flex items-center justify-center transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showSongMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowSongMenu(false)} />
              <div className="absolute right-0 top-14 z-40 w-48 rounded-2xl bg-[#1C1B1A] border border-[#2D2B2A] shadow-2xl py-1.5 text-sm">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setShowSongMenu(false);
                    setEditTitle(song.title);
                    setEditArtist(song.artist);
                    setEditKey(song.key);
                    setShowEditMetaModal(true);
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#242220] disabled:opacity-40 text-[#F5F2EE]"
                >
                  Edit song info
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setShowSongMenu(false);
                    setShowAddSectionModal(true);
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#242220] disabled:opacity-40 text-[#F5F2EE]"
                >
                  Add section
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setShowSongMenu(false);
                    openLyricsModal();
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#242220] disabled:opacity-40 text-[#F5F2EE]"
                >
                  Edit lyrics
                </button>
                <div className="my-1 border-t border-[#2D2B2A]" />
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setShowSongMenu(false);
                    onDeleteSong();
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-red-500/10 disabled:opacity-40 text-red-400"
                >
                  Delete song
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metadata Badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="px-3.5 py-1.5 rounded-full bg-[#1C1B1A] border border-[#2D2B2A] text-[13px] font-medium text-[#F5F2EE] tabular-nums">
          Key {displayKey}
        </span>
        <span className="px-3.5 py-1.5 rounded-full bg-[#1C1B1A] border border-[#2D2B2A] text-[13px] font-medium text-[#F5F2EE] tabular-nums">
          {song.bpm} bpm
        </span>
        <span className="px-3.5 py-1.5 rounded-full bg-[#1C1B1A] border border-[#2D2B2A] text-[13px] font-medium text-[#F5F2EE] tabular-nums">
          {song.timeSignature}
        </span>
        <span className="text-[13px] text-[#9C968F] pl-1 tabular-nums">{totalBars} bars</span>
      </div>

      {/* Transpose & Time Signature Card */}
      <div className="mt-5 rounded-3xl bg-[#181716] border border-[#2D2B2A] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
              FULL SONG TRANSPOSE
            </p>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="font-serif-display text-[26px] font-bold text-[#F5F2EE]">
                {displayKey}
              </span>
              <span className="text-[14px] text-[#9C968F]">every chord</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] tracking-[0.18em] text-[#9C968F] uppercase mr-1">
              ALL
            </span>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onTransposeChange(-1)}
              aria-label="Transpose down one semitone"
              className="w-9 h-9 rounded-full bg-[#242220] hover:bg-[#2D2B2A] disabled:opacity-40 border border-[#2D2B2A] text-[#F5F2EE] text-lg flex items-center justify-center transition"
            >
              −
            </button>
            <span className="w-6 text-center text-[15px] font-semibold text-[#F5F2EE] tabular-nums">
              {song.transpose > 0 ? `+${song.transpose}` : song.transpose}
            </span>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onTransposeChange(1)}
              aria-label="Transpose up one semitone"
              className="w-9 h-9 rounded-full bg-[#242220] hover:bg-[#2D2B2A] disabled:opacity-40 border border-[#2D2B2A] text-[#F5F2EE] text-lg flex items-center justify-center transition"
            >
              +
            </button>
          </div>
        </div>

        <div className="border-t border-[#2D2B2A]" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
              TIME SIGNATURE
            </p>
            <p className="text-[13px] text-[#9C968F] mt-1">
              Whole song · drives the metronome
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['4/4', '3/4', '6/8'] as TimeSignature[]).map((ts) => {
              const active = song.timeSignature === ts;
              return (
                <button
                  key={ts}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onTimeSignatureChange(ts)}
                  className={`px-3.5 py-2 rounded-full text-[13px] font-semibold tabular-nums transition ${
                    active
                      ? 'bg-[#252019] border border-[#E5A958] text-[#E5A958]'
                      : 'bg-[#1C1B1A] border border-[#2D2B2A] text-[#9C968F] hover:text-[#F5F2EE]'
                  } disabled:opacity-50`}
                >
                  {ts}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Screen Lock Banner */}
      {isLocked && (
        <div className="mt-4 rounded-2xl bg-[#251E14] border border-[#E5A958]/45 px-4 py-3 text-[13px] leading-relaxed text-[#E5A958]">
          Screen lock is on — chord editing, transpose and tempo are frozen. Scrolling and playback still work.
        </div>
      )}

      {/* CHORDS | LYRICS Switcher */}
      <div className="mt-5 p-1 rounded-full bg-[#181716] border border-[#2D2B2A] grid grid-cols-2">
        <button
          type="button"
          onClick={() => setTab('chords')}
          className={`py-2.5 rounded-full text-[13px] font-bold tracking-[0.14em] uppercase transition ${
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
          className={`py-2.5 rounded-full text-[13px] font-bold tracking-[0.14em] uppercase transition ${
            tab === 'lyrics'
              ? 'bg-[#E5A958] text-[#121212]'
              : 'text-[#9C968F] hover:text-[#F5F2EE]'
          }`}
        >
          LYRICS
        </button>
      </div>

      {/* CHORDS TAB */}
      {tab === 'chords' ? (
        <div className="mt-5 space-y-4">
          {song.sections.map((section: Section) => {
            const secBarCount = section.bars.reduce(
              (acc, b) => acc + (b.repeat && b.repeat > 1 ? b.repeat : 1),
              0
            );
            const secTranspose = (song.transpose || 0) + (section.transpose || 0);

            return (
              <section
                key={section.id}
                className="rounded-3xl bg-[#181716] border border-[#2D2B2A] p-4 sm:p-5 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-serif-display text-[22px] font-bold text-[#F5F2EE]">
                      {section.name}
                    </h2>
                    <p className="text-[13px] text-[#9C968F] mt-0.5 tabular-nums">
                      {song.bpm} bpm · {song.timeSignature} · {secBarCount}{' '}
                      {secBarCount === 1 ? 'bar' : 'bars'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 relative">
                    <button
                      type="button"
                      onClick={() => onPlaySection(section.id)}
                      aria-label={`Play ${section.name}`}
                      className="w-9 h-9 rounded-full hover:bg-[#242220] text-[#9C968F] hover:text-[#E5A958] flex items-center justify-center transition"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => onAddBarToSection(section.id)}
                      aria-label={`Add bar to ${section.name}`}
                      className="w-9 h-9 rounded-full hover:bg-[#242220] disabled:opacity-35 text-[#9C968F] hover:text-[#F5F2EE] flex items-center justify-center transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() =>
                        setActiveSectionMenuId((prev) =>
                          prev === section.id ? null : section.id
                        )
                      }
                      aria-label={`Options for ${section.name}`}
                      className="w-9 h-9 rounded-full hover:bg-[#242220] disabled:opacity-35 text-[#9C968F] hover:text-[#F5F2EE] flex items-center justify-center transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeSectionMenuId === section.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActiveSectionMenuId(null)}
                        />
                        <div className="absolute right-0 top-10 z-40 w-40 rounded-2xl bg-[#1C1B1A] border border-[#2D2B2A] shadow-xl py-1.5 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSectionMenuId(null);
                              setRenamingSection({ id: section.id, name: section.name });
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-[#242220] text-[#F5F2EE]"
                          >
                            Rename section
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSectionMenuId(null);
                              onDeleteSection(section.id);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-red-500/10 text-red-400"
                          >
                            Delete section
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 4-column Bar Grid */}
                <div className="mt-4 grid grid-cols-4 gap-2.5">
                  {section.bars.map((bar: Bar) => {
                    const barNum = runningBarNum + 1;
                    const repeats = bar.repeat && bar.repeat > 1 ? bar.repeat : 1;
                    runningBarNum += repeats;

                    const isBarActive = isPlaying && activeBarId === bar.id;
                    const transposed = transposeChord(bar.chord, secTranspose, displayKey);
                    const displayChord = formatChordDisplay(transposed);

                    return (
                      <button
                        key={bar.id}
                        ref={isBarActive ? activeBarRef : undefined}
                        type="button"
                        disabled={isLocked}
                        onClick={() => onOpenBarEditor(section.id, bar.id)}
                        className={`relative min-h-[82px] rounded-2xl border p-2.5 flex flex-col items-center justify-center transition text-center ${
                          isBarActive
                            ? 'bg-[#2B2318] border-[#E5A958] ring-2 ring-[#E5A958]/35'
                            : 'bg-[#141312] hover:bg-[#1E1C1A] border-[#2D2B2A]'
                        } disabled:cursor-default`}
                      >
                        <span className="absolute top-2 left-2.5 text-[11px] font-medium text-[#78736D] tabular-nums">
                          {barNum}
                        </span>

                        {repeats > 1 && (
                          <span className="absolute top-2 right-2 text-[10px] font-semibold text-[#E5A958] tabular-nums">
                            ×{repeats}
                          </span>
                        )}

                        <span
                          className={`font-serif-display text-[18px] sm:text-[20px] font-semibold mt-1 ${
                            isBarActive ? 'text-[#E5A958]' : 'text-[#F5F2EE]'
                          }`}
                        >
                          {displayChord}
                        </span>

                        {bar.cue && (
                          <span className="text-[10px] text-[#9C968F] mt-1 truncate max-w-full">
                            cue
                          </span>
                        )}

                        {bar.meter && bar.meter !== song.timeSignature && (
                          <span className="text-[9px] text-[#E5A958]/80 mt-0.5 tabular-nums">
                            {parseMeterBeats(bar.meter)}b
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!isLocked && (
            <button
              type="button"
              onClick={() => setShowAddSectionModal(true)}
              className="w-full py-3.5 rounded-2xl border border-dashed border-[#2D2B2A] hover:border-[#E5A958]/60 text-sm font-medium text-[#9C968F] hover:text-[#E5A958] flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add section</span>
            </button>
          )}
        </div>
      ) : (
        /* LYRICS TAB */
        <div className="mt-5 rounded-3xl bg-[#181716] border border-[#2D2B2A] p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-[0.2em] text-[#9C968F] uppercase">
              SONG LYRICS
            </span>
            {!isLocked && (
              <button
                type="button"
                onClick={openLyricsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#242220] hover:bg-[#2D2B2A] text-xs font-medium text-[#E5A958]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit lyrics</span>
              </button>
            )}
          </div>

          {song.lyrics.length === 0 ? (
            <p className="text-sm text-[#9C968F]">No lyrics added yet.</p>
          ) : (
            song.lyrics.map((lyr) => {
              const currentPlayingSection = song.sections.find((s) => s.id === activeSectionId);
              const isHighlighted =
                isPlaying &&
                currentPlayingSection &&
                currentPlayingSection.name.toLowerCase().includes(lyr.label.toLowerCase());

              return (
                <div
                  key={lyr.id}
                  className={`rounded-2xl transition ${
                    isHighlighted ? 'bg-[#252019]/70 p-4 border border-[#E5A958]/40' : ''
                  }`}
                >
                  <h3 className="text-[16px] font-medium text-[#9C968F] mb-2.5">
                    {lyr.label}
                  </h3>
                  <div className="font-sinhala space-y-1.5 text-[18px] leading-[1.7] text-[#F5F2EE]">
                    {lyr.lines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSectionName.trim()) return;
              onAddSection(newSectionName.trim());
              setNewSectionName('');
              setShowAddSectionModal(false);
            }}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#1C1B1A] border border-[#2D2B2A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl font-bold text-[#F5F2EE]">Add section</h3>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="w-8 h-8 rounded-full bg-[#242220] text-[#F5F2EE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Verse 3, Bridge, Interlude"
              className="w-full h-11 px-3.5 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] focus:border-[#E5A958] focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {['Intro', 'Chorus', 'Verse 1', 'Inter 1', 'Bridge', 'Solo', 'Outro'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewSectionName(preset)}
                  className="px-3 py-1 rounded-full bg-[#242220] text-xs text-[#9C968F] hover:text-[#F5F2EE]"
                >
                  {preset}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-full bg-[#E5A958] text-[#121212] font-semibold text-sm"
            >
              Add section
            </button>
          </form>
        </div>
      )}

      {/* Rename Section Modal */}
      {renamingSection && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!renamingSection.name.trim()) return;
              onRenameSection(renamingSection.id, renamingSection.name.trim());
              setRenamingSection(null);
            }}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#1C1B1A] border border-[#2D2B2A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl font-bold text-[#F5F2EE]">Rename section</h3>
              <button
                type="button"
                onClick={() => setRenamingSection(null)}
                className="w-8 h-8 rounded-full bg-[#242220] text-[#F5F2EE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={renamingSection.name}
              onChange={(e) => setRenamingSection({ ...renamingSection, name: e.target.value })}
              className="w-full h-11 px-3.5 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE] focus:border-[#E5A958] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full h-11 rounded-full bg-[#E5A958] text-[#121212] font-semibold text-sm"
            >
              Save name
            </button>
          </form>
        </div>
      )}

      {/* Edit Song Meta Modal */}
      {showEditMetaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateSongMeta(editTitle.trim() || song.title, editArtist.trim() || song.artist, editKey);
              setShowEditMetaModal(false);
            }}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#1C1B1A] border border-[#2D2B2A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl font-bold text-[#F5F2EE]">Edit song info</h3>
              <button
                type="button"
                onClick={() => setShowEditMetaModal(false)}
                className="w-8 h-8 rounded-full bg-[#242220] text-[#F5F2EE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9C968F] mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9C968F] mb-1">Artist</label>
              <input
                type="text"
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9C968F] mb-1">Base Key</label>
              <select
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#141312] border border-[#2D2B2A] text-sm text-[#F5F2EE]"
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
            <button
              type="submit"
              className="w-full h-11 rounded-full bg-[#E5A958] text-[#121212] font-semibold text-sm"
            >
              Update info
            </button>
          </form>
        </div>
      )}

      {/* Lyrics Editor Modal */}
      {showLyricsEditor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
          <form
            onSubmit={handleSaveLyricsText}
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#1C1B1A] border border-[#2D2B2A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-xl font-bold text-[#F5F2EE]">Edit lyrics</h3>
              <button
                type="button"
                onClick={() => setShowLyricsEditor(false)}
                className="w-8 h-8 rounded-full bg-[#242220] text-[#F5F2EE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#9C968F]">
              Use [Chorus] or [Verse 1] headings separated by a blank line. Sinhala &amp; English supported.
            </p>
            <textarea
              rows={10}
              value={lyricsDraftText}
              onChange={(e) => setLyricsDraftText(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#141312] border border-[#2D2B2A] text-sm font-sinhala text-[#F5F2EE] leading-relaxed focus:border-[#E5A958] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full h-11 rounded-full bg-[#E5A958] text-[#121212] font-semibold text-sm"
            >
              Save lyrics
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
