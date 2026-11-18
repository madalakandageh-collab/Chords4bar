import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChordbookAudioEngine } from './audio/AudioEngine';
import { BarEditorModal } from './components/BarEditorModal';
import { ChordSheetScreen } from './components/ChordSheetScreen';
import { LiveModeScreen } from './components/LiveModeScreen';
import { LocalWifiScreen } from './components/LocalWifiScreen';
import { MetronomeModal } from './components/MetronomeModal';
import { NavDrawer } from './components/NavDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PersistentPlayBar } from './components/PersistentPlayBar';
import { PracticePlayerScreen, PracticeSelectScreen } from './components/PracticeScreens';
import { SheetsHomeScreen } from './components/SheetsHomeScreen';
import { SimpleMemberView } from './components/SimpleMemberView';
import { TopBar } from './components/TopBar';
import { INITIAL_SETLISTS, INITIAL_SONGS } from './data/initialSongs';
import { useRoomSync } from './hooks/useRoomSync';
import type {
  Bar,
  LyricSection,
  MetronomeSettings,
  RoomSyncState,
  ScreenName,
  SerializedVoiceCue,
  Setlist,
  Song,
  TimeSignature,
} from './types';
import { buildSongTimeline, createEmptyBar, getGlobalDisplayBarNumber } from './utils/chords';
import {
  exportCustomVoiceCuesAsBase64,
  importCustomVoiceCuesFromBase64,
} from './utils/voiceCues';

const STORAGE_KEYS = {
  songs: 'chordbook_songs_v1',
  setlists: 'chordbook_setlists_v1',
  settings: 'chordbook_metronome_v1',
  roomId: 'chordbook_room_id_v1',
  activeSongId: 'chordbook_active_song_id_v1',
};

const DEFAULT_SETTINGS: MetronomeSettings = {
  clickVolume: 70,
  clickBalance: 'Center',
  voiceVolume: 100,
  voiceBalance: 'Center',
  chordVolume: 70,
  chordAudioEnabled: true,
  countInBar: false,
  subdivision: 'Quarter',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlMode = urlParams.get('mode');
  const urlRoom = urlParams.get('room');
  const isDedicatedMemberUrl = urlMode === 'member';

  const [songs, setSongs] = useState<Song[]>(() =>
    loadFromStorage<Song[]>(STORAGE_KEYS.songs, INITIAL_SONGS)
  );
  const [setlists, setSetlists] = useState<Setlist[]>(() =>
    loadFromStorage<Setlist[]>(STORAGE_KEYS.setlists, INITIAL_SETLISTS)
  );
  const [settings, setSettings] = useState<MetronomeSettings>(() =>
    loadFromStorage<MetronomeSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  );
  const [roomId, setRoomId] = useState<string>(() =>
    (urlRoom || loadFromStorage<string>(STORAGE_KEYS.roomId, '4829')).toUpperCase()
  );
  const [activeSongId, setActiveSongId] = useState<string>(() =>
    loadFromStorage<string>(STORAGE_KEYS.activeSongId, INITIAL_SONGS[0].id)
  );

  const [screen, setScreen] = useState<ScreenName>(
    isDedicatedMemberUrl ? 'member' : 'sheets'
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Playback & Practice state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountIn, setIsCountIn] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [speed, setSpeed] = useState<50 | 75 | 100>(100);
  const [loopSectionId, setLoopSectionId] = useState<string | null>(null);
  const [sectionTransposes, setSectionTransposes] = useState<Record<string, number>>({});
  const [playStartedAtServerTime, setPlayStartedAtServerTime] = useState<number | null>(null);
  const [playStartBarIndex, setPlayStartBarIndex] = useState(0);

  // Modals
  const [editingBarTarget, setEditingBarTarget] = useState<{
    sectionId: string;
    barId: string;
  } | null>(null);
  const [showMetronomeModal, setShowMetronomeModal] = useState(false);
  const [cueLibraryVersion, setCueLibraryVersion] = useState(0);

  // Member synced state (used when role === 'member' or Preview Member App)
  const [remoteMemberState, setRemoteMemberState] = useState<RoomSyncState | null>(null);

  const activeSong = useMemo(
    () => songs.find((s) => s.id === activeSongId) || songs[0] || INITIAL_SONGS[0],
    [songs, activeSongId]
  );

  const timeline = useMemo(
    () => buildSongTimeline(activeSong, sectionTransposes, loopSectionId),
    [activeSong, sectionTransposes, loopSectionId]
  );

  const currentStep = timeline[Math.max(0, Math.min(activeStepIndex, Math.max(0, timeline.length - 1)))];

  // Configure Member PWA Manifest ("Chordbook Stage") if booted in ?mode=member
  useEffect(() => {
    if (!isDedicatedMemberUrl) return;
    document.title = 'Chordbook Stage';
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', 'Chordbook Stage');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', '#121212');
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute(
        'href',
        `/manifest-member.webmanifest?room=${encodeURIComponent(roomId)}`
      );
    }
  }, [isDedicatedMemberUrl, roomId]);

  // Persist to localStorage (Offline-first)
  useEffect(() => {
    if (isDedicatedMemberUrl) return;
    try {
      localStorage.setItem(STORAGE_KEYS.songs, JSON.stringify(songs));
    } catch {
      // Storage quota full
    }
  }, [songs, isDedicatedMemberUrl]);

  useEffect(() => {
    if (isDedicatedMemberUrl) return;
    try {
      localStorage.setItem(STORAGE_KEYS.setlists, JSON.stringify(setlists));
    } catch {
      // Ignore
    }
  }, [setlists, isDedicatedMemberUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  useEffect(() => {
    if (isDedicatedMemberUrl) return;
    try {
      localStorage.setItem(STORAGE_KEYS.roomId, JSON.stringify(roomId));
      localStorage.setItem(STORAGE_KEYS.activeSongId, JSON.stringify(activeSongId));
    } catch {
      // Ignore
    }
  }, [roomId, activeSongId, isDedicatedMemberUrl]);

  // Real-time Sync Engine
  const isMemberRole = isDedicatedMemberUrl || screen === 'member';
  const {
    status: syncStatus,
    presence,
    rttMs,
    clockOffsetMs,
    sendState,
  } = useRoomSync({
    roomId,
    role: isMemberRole ? 'member' : 'leader',
    onRemoteState: useCallback((state: RoomSyncState) => {
      setRemoteMemberState(state);
    }, []),
  });

  // Broadcast Leader state whenever song/playback/transpose changes
  useEffect(() => {
    if (isMemberRole || !activeSong) return;
    const leaderSyncState: RoomSyncState = {
      roomId,
      song: activeSong,
      transpose: activeSong.transpose || 0,
      sectionTransposes,
      isPlaying,
      activeBarIndex: activeStepIndex,
      activeSectionId: currentStep?.sectionId || activeSong.sections[0]?.id || null,
      speed,
      tempoOverride: null,
      playStartedAtServerTime,
      playStartBarIndex,
      loopSectionId,
      updatedAt: Date.now(),
    };
    sendState(leaderSyncState);
  }, [
    isMemberRole,
    roomId,
    activeSong,
    sectionTransposes,
    isPlaying,
    activeStepIndex,
    currentStep?.sectionId,
    speed,
    playStartedAtServerTime,
    playStartBarIndex,
    loopSectionId,
    sendState,
  ]);

  // Web Audio Engine ref
  const audioEngineRef = useRef<ChordbookAudioEngine | null>(null);

  if (!audioEngineRef.current) {
    audioEngineRef.current = new ChordbookAudioEngine(settings, {
      onBarChange: (stepIndex, _displayBarNumber, _sectionId, beat, countIn) => {
        setActiveStepIndex(stepIndex);
        setCurrentBeat(beat);
        setIsCountIn(countIn);
      },
      onBeat: (beat, _totalBeats, countIn) => {
        setCurrentBeat(beat);
        setIsCountIn(countIn);
      },
      onStop: () => {
        setIsPlaying(false);
        setIsCountIn(false);
        setPlayStartedAtServerTime(null);
      },
    });
  }

  useEffect(() => {
    audioEngineRef.current?.updateSettings(settings);
  }, [settings]);

  useEffect(() => {
    audioEngineRef.current?.updateLiveParams({
      speedPercent: speed,
      globalTranspose: activeSong?.transpose || 0,
      timeline,
      loopEnabled: screen === 'practice-player' || loopSectionId !== null,
    });
  }, [speed, activeSong?.transpose, timeline, screen, loopSectionId]);

  useEffect(() => {
    return () => {
      audioEngineRef.current?.stop(false);
    };
  }, []);

  const startPlaybackFromIndex = useCallback(
    (startIndex: number, skipCountIn = false) => {
      if (!timeline.length) return;
      const safeStart = Math.max(0, Math.min(startIndex, timeline.length - 1));
      setActiveStepIndex(safeStart);
      setPlayStartBarIndex(safeStart);
      setPlayStartedAtServerTime(Date.now() + clockOffsetMs);
      setIsPlaying(true);
      audioEngineRef.current?.start({
        timeline,
        startIndex: safeStart,
        speedPercent: speed,
        globalTranspose: activeSong.transpose || 0,
        tempoOverride: null,
        loopEnabled: screen === 'practice-player' || loopSectionId !== null,
        skipCountIn,
      });
    },
    [timeline, clockOffsetMs, speed, activeSong.transpose, screen, loopSectionId]
  );

  const stopPlayback = useCallback(() => {
    audioEngineRef.current?.stop(false);
    setIsPlaying(false);
    setIsCountIn(false);
    setPlayStartedAtServerTime(null);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlaybackFromIndex(activeStepIndex);
    }
  }, [isPlaying, stopPlayback, startPlaybackFromIndex, activeStepIndex]);

  // Song Update Helper
  const updateActiveSong = useCallback(
    (updater: (song: Song) => Song) => {
      setSongs((prev) =>
        prev.map((s) => (s.id === activeSong.id ? { ...updater(s), updatedAt: Date.now() } : s))
      );
      setHasUnsavedChanges(true);
    },
    [activeSong.id]
  );

  const handleSelectSong = useCallback(
    (songId: string, targetScreen: ScreenName = 'song-detail') => {
      stopPlayback();
      setActiveSongId(songId);
      setActiveStepIndex(0);
      setLoopSectionId(null);
      setSectionTransposes({});
      setHasUnsavedChanges(false);
      setScreen(targetScreen);
    },
    [stopPlayback]
  );

  const handleSaveSong = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.songs, JSON.stringify(songs));
    } catch {
      // Ignore
    }
    setHasUnsavedChanges(false);
  }, [songs]);

  const handleExportJson = useCallback(async () => {
    const customVoiceCues = await exportCustomVoiceCuesAsBase64();
    const payload = JSON.stringify({ songs, setlists, customVoiceCues }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chordbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [songs, setlists]);

  const handleImportJson = useCallback(
    async (data: {
      songs?: Song[];
      setlists?: Setlist[];
      customVoiceCues?: SerializedVoiceCue[];
    }) => {
      if (data.songs && Array.isArray(data.songs)) {
        setSongs((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const incoming = data.songs!.filter((s) => s && s.id && s.title);
          const merged = [...prev];
          for (const item of incoming) {
            if (existingIds.has(item.id)) {
              const idx = merged.findIndex((x) => x.id === item.id);
              if (idx >= 0) merged[idx] = item;
            } else {
              merged.push(item);
            }
          }
          return merged;
        });
      }
      if (data.setlists && Array.isArray(data.setlists)) {
        setSetlists((prev) => {
          const existingIds = new Set(prev.map((sl) => sl.id));
          const merged = [...prev];
          for (const sl of data.setlists!) {
            if (sl && sl.id && !existingIds.has(sl.id)) {
              merged.push(sl);
            }
          }
          return merged;
        });
      }
      if (data.customVoiceCues && Array.isArray(data.customVoiceCues)) {
        await importCustomVoiceCuesFromBase64(data.customVoiceCues);
        for (const cue of data.customVoiceCues) {
          if (cue?.id) audioEngineRef.current?.invalidateCustomCueCache(cue.id);
        }
        setCueLibraryVersion((v) => v + 1);
      }
    },
    []
  );

  // Dedicated Member Mode or Preview Member App
  if (isDedicatedMemberUrl || screen === 'member') {
    const previewSyncedState: RoomSyncState =
      remoteMemberState || {
        roomId,
        song: activeSong,
        transpose: activeSong.transpose || 0,
        sectionTransposes,
        isPlaying,
        activeBarIndex: activeStepIndex,
        activeSectionId: currentStep?.sectionId || null,
        speed,
        tempoOverride: null,
        playStartedAtServerTime,
        playStartBarIndex,
        loopSectionId,
        updatedAt: Date.now(),
      };

    return (
      <SimpleMemberView
        roomId={roomId}
        syncStatus={isDedicatedMemberUrl ? syncStatus : 'connected'}
        syncedState={isDedicatedMemberUrl ? remoteMemberState : previewSyncedState}
        fallbackSong={activeSong}
        clockOffsetMs={clockOffsetMs}
        isPreview={!isDedicatedMemberUrl}
        onExitPreview={() => setScreen('local-wifi')}
      />
    );
  }

  // Locate editing bar for BarEditorModal
  const editingSection = editingBarTarget
    ? activeSong.sections.find((s) => s.id === editingBarTarget.sectionId)
    : null;
  const editingBar = editingSection
    ? editingSection.bars.find((b) => b.id === editingBarTarget?.barId)
    : null;
  const editingBarNumber =
    editingBarTarget && editingBar
      ? getGlobalDisplayBarNumber(activeSong, editingBarTarget.sectionId, editingBarTarget.barId)
      : 1;

  const showTopBlueBar = screen !== 'practice-player';

  return (
    <div className="min-h-screen bg-[#121212] text-[#F5F2EE]">
      {showTopBlueBar && (
        <TopBar
          onOpenMenu={() => setIsDrawerOpen(true)}
          isLocked={isLocked}
          onToggleLock={() => setIsLocked((v) => !v)}
        />
      )}

      <OfflineIndicator />

      <NavDrawer
        isOpen={isDrawerOpen}
        activeScreen={screen}
        memberCount={presence.memberCount}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(nextScreen) => {
          setScreen(nextScreen);
        }}
      />

      {screen === 'sheets' && (
        <SheetsHomeScreen
          songs={songs}
          setlists={setlists}
          isLocked={isLocked}
          onSelectSong={(id) => handleSelectSong(id, 'song-detail')}
          onCreateSong={(song) => {
            setSongs((prev) => [song, ...prev]);
            setActiveSongId(song.id);
            setScreen('song-detail');
          }}
          onCreateSetlist={(name) => {
            setSetlists((prev) => [
              ...prev,
              {
                id: `setlist-${Date.now().toString(36)}`,
                name,
                songIds: [],
                createdAt: Date.now(),
              },
            ]);
          }}
          onDeleteSetlist={(setlistId) => {
            setSetlists((prev) => prev.filter((sl) => sl.id !== setlistId));
          }}
          onAddSongToSetlist={(setlistId, songId) => {
            setSetlists((prev) =>
              prev.map((sl) =>
                sl.id === setlistId && !sl.songIds.includes(songId)
                  ? { ...sl, songIds: [...sl.songIds, songId] }
                  : sl
              )
            );
          }}
          onRemoveSongFromSetlist={(setlistId, songId) => {
            setSetlists((prev) =>
              prev.map((sl) =>
                sl.id === setlistId
                  ? { ...sl, songIds: sl.songIds.filter((id) => id !== songId) }
                  : sl
              )
            );
          }}
          onPlaySongFromSetlist={(songId) => {
            handleSelectSong(songId, 'song-detail');
          }}
          onImportJson={handleImportJson}
          onExportJson={handleExportJson}
        />
      )}

      {screen === 'song-detail' && activeSong && (
        <ChordSheetScreen
          song={activeSong}
          isLocked={isLocked}
          hasUnsavedChanges={hasUnsavedChanges}
          isPlaying={isPlaying}
          activeBarId={currentStep?.barId || null}
          activeSectionId={currentStep?.sectionId || null}
          activeDisplayBarNumber={currentStep?.displayBarNumber || null}
          onBack={() => setScreen('sheets')}
          onSaveSong={handleSaveSong}
          onTransposeChange={(delta) =>
            updateActiveSong((s) => ({
              ...s,
              transpose: Math.max(-11, Math.min(11, (s.transpose || 0) + delta)),
            }))
          }
          onTimeSignatureChange={(ts: TimeSignature) =>
            updateActiveSong((s) => ({ ...s, timeSignature: ts }))
          }
          onOpenBarEditor={(sectionId, barId) => {
            if (isLocked) return;
            setEditingBarTarget({ sectionId, barId });
          }}
          onAddBarToSection={(sectionId) => {
            if (isLocked) return;
            updateActiveSong((s) => ({
              ...s,
              sections: s.sections.map((sec) =>
                sec.id === sectionId
                  ? { ...sec, bars: [...sec.bars, createEmptyBar('-')] }
                  : sec
              ),
            }));
          }}
          onPlaySection={(sectionId) => {
            const idx = timeline.findIndex((step) => step.sectionId === sectionId);
            startPlaybackFromIndex(idx >= 0 ? idx : 0, true);
          }}
          onAddSection={(name) => {
            if (isLocked) return;
            updateActiveSong((s) => ({
              ...s,
              sections: [
                ...s.sections,
                {
                  id: `sec-${Date.now().toString(36)}`,
                  name,
                  bars: [
                    createEmptyBar('-'),
                    createEmptyBar('-'),
                    createEmptyBar('-'),
                    createEmptyBar('-'),
                  ],
                },
              ],
            }));
          }}
          onRenameSection={(sectionId, newName) => {
            if (isLocked) return;
            updateActiveSong((s) => ({
              ...s,
              sections: s.sections.map((sec) =>
                sec.id === sectionId ? { ...sec, name: newName } : sec
              ),
            }));
          }}
          onDeleteSection={(sectionId) => {
            if (isLocked) return;
            updateActiveSong((s) => ({
              ...s,
              sections: s.sections.filter((sec) => sec.id !== sectionId),
            }));
          }}
          onUpdateSongMeta={(title, artist, key) => {
            if (isLocked) return;
            updateActiveSong((s) => ({ ...s, title, artist, key }));
          }}
          onUpdateLyrics={(lyrics: LyricSection[]) => {
            if (isLocked) return;
            updateActiveSong((s) => ({ ...s, lyrics }));
          }}
          onDeleteSong={() => {
            if (isLocked) return;
            stopPlayback();
            setSongs((prev) => {
              const next = prev.filter((s) => s.id !== activeSong.id);
              if (next.length > 0) setActiveSongId(next[0].id);
              return next;
            });
            setScreen('sheets');
          }}
        />
      )}

      {screen === 'practice-select' && (
        <PracticeSelectScreen
          songs={songs}
          onBack={() => setScreen('sheets')}
          onSelectSong={(id) => handleSelectSong(id, 'practice-player')}
        />
      )}

      {screen === 'practice-player' && activeSong && (
        <PracticePlayerScreen
          song={activeSong}
          timeline={timeline}
          activeStepIndex={activeStepIndex}
          currentBeat={currentBeat}
          isPlaying={isPlaying}
          isLocked={isLocked}
          speed={speed}
          loopSectionId={loopSectionId}
          sectionTransposes={sectionTransposes}
          onBack={() => {
            setLoopSectionId(null);
            setSpeed(100);
            setScreen('practice-select');
          }}
          onToggleLock={() => setIsLocked((v) => !v)}
          onTransposeAll={(delta) =>
            updateActiveSong((s) => ({
              ...s,
              transpose: Math.max(-11, Math.min(11, (s.transpose || 0) + delta)),
            }))
          }
          onSpeedChange={(nextSpeed) => setSpeed(nextSpeed)}
          onLoopSectionChange={(secId) => {
            setLoopSectionId(secId);
            setActiveStepIndex(0);
            if (isPlaying) {
              const nextTimeline = buildSongTimeline(activeSong, sectionTransposes, secId);
              audioEngineRef.current?.start({
                timeline: nextTimeline,
                startIndex: 0,
                speedPercent: speed,
                globalTranspose: activeSong.transpose || 0,
                tempoOverride: null,
                loopEnabled: true,
                skipCountIn: true,
              });
            }
          }}
          onSectionTransposeChange={(secId, delta) => {
            setSectionTransposes((prev) => ({
              ...prev,
              [secId]: Math.max(-11, Math.min(11, (prev[secId] ?? 0) + delta)),
            }));
          }}
          onSeekToBarIndex={(idx) => {
            if (isPlaying) {
              startPlaybackFromIndex(idx, true);
            } else {
              setActiveStepIndex(idx);
            }
          }}
        />
      )}

      {screen === 'live-mode' && activeSong && (
        <LiveModeScreen
          songs={songs}
          activeSong={activeSong}
          timeline={timeline}
          activeStepIndex={activeStepIndex}
          currentBeat={currentBeat}
          isPlaying={isPlaying}
          isLocked={isLocked}
          presence={presence}
          syncStatus={syncStatus}
          onBack={() => setScreen('sheets')}
          onSelectSong={(id) => {
            stopPlayback();
            setActiveSongId(id);
            setActiveStepIndex(0);
            setLoopSectionId(null);
            setSectionTransposes({});
          }}
          onTranspose={(delta) =>
            updateActiveSong((s) => ({
              ...s,
              transpose: Math.max(-11, Math.min(11, (s.transpose || 0) + delta)),
            }))
          }
          onSeekToSection={(secId) => {
            const idx = timeline.findIndex((step) => step.sectionId === secId);
            if (idx >= 0) {
              if (isPlaying) startPlaybackFromIndex(idx, true);
              else setActiveStepIndex(idx);
            }
          }}
          onSeekToBarIndex={(idx) => {
            if (isPlaying) startPlaybackFromIndex(idx, true);
            else setActiveStepIndex(idx);
          }}
          onOpenLocalWifi={() => setScreen('local-wifi')}
        />
      )}

      {screen === 'local-wifi' && (
        <LocalWifiScreen
          roomId={roomId}
          presence={presence}
          syncStatus={syncStatus}
          rttMs={rttMs}
          onChangeRoomId={(next) => setRoomId(next || '4829')}
          onPreviewMemberApp={() => setScreen('member')}
          onBack={() => setScreen('sheets')}
        />
      )}

      {/* Persistent Always-Visible Play/Stop Bar across all Leader screens */}
      {activeSong && (
        <PersistentPlayBar
          bpm={Math.round((currentStep?.effectiveBpm || activeSong.bpm) * (speed / 100))}
          timeSignature={currentStep?.effectiveMeter || activeSong.timeSignature}
          isPlaying={isPlaying}
          isCountIn={isCountIn}
          countInEnabled={settings.countInBar}
          currentBarNumber={currentStep?.displayBarNumber || 1}
          totalBars={timeline.length || 1}
          currentBeat={currentBeat}
          chordAudioEnabled={settings.chordAudioEnabled}
          onTogglePlay={handleTogglePlay}
          onToggleChordAudio={() =>
            setSettings((prev) => ({
              ...prev,
              chordAudioEnabled: !prev.chordAudioEnabled,
            }))
          }
          onOpenMixer={() => setShowMetronomeModal(true)}
        />
      )}

      {/* Bar Editor Modal */}
      {editingBar && editingSection && editingBarTarget && (
        <BarEditorModal
          bar={editingBar}
          barNumber={editingBarNumber}
          sectionName={editingSection.name}
          songBpm={activeSong.bpm}
          songTimeSignature={activeSong.timeSignature}
          libraryVersion={cueLibraryVersion}
          onUpdateBar={(updatedBar: Bar) => {
            updateActiveSong((s) => ({
              ...s,
              sections: s.sections.map((sec) =>
                sec.id === editingBarTarget.sectionId
                  ? {
                      ...sec,
                      bars: sec.bars.map((b) =>
                        b.id === editingBarTarget.barId ? updatedBar : b
                      ),
                    }
                  : sec
              ),
            }));
          }}
          onRemoveBar={() => {
            updateActiveSong((s) => ({
              ...s,
              sections: s.sections.map((sec) =>
                sec.id === editingBarTarget.sectionId
                  ? {
                      ...sec,
                      bars: sec.bars.filter((b) => b.id !== editingBarTarget.barId),
                    }
                  : sec
              ),
            }));
            setEditingBarTarget(null);
          }}
          onPreviewBundledCue={(url) => {
            void audioEngineRef.current?.testVoice(url);
          }}
          onPreviewCustomCue={(cue) => {
            void audioEngineRef.current?.playCustomCue(cue);
          }}
          onCacheInvalidate={(cueId) => {
            audioEngineRef.current?.invalidateCustomCueCache(cueId);
            setCueLibraryVersion((v) => v + 1);
          }}
          onClose={() => setEditingBarTarget(null)}
        />
      )}

      {/* Metronome & Audio Mixer Modal */}
      {showMetronomeModal && activeSong && (
        <MetronomeModal
          settings={settings}
          songTempo={activeSong.bpm}
          isLocked={isLocked}
          libraryVersion={cueLibraryVersion}
          onUpdateSettings={(next) => setSettings(next)}
          onUpdateSongTempo={(bpm) =>
            updateActiveSong((s) => ({ ...s, bpm }))
          }
          onTestVoice={(cueUrl) => {
            void audioEngineRef.current?.testVoice(cueUrl);
          }}
          onPreviewCustomCue={(cue) => {
            void audioEngineRef.current?.playCustomCue(cue);
          }}
          onCacheInvalidate={(cueId) => {
            audioEngineRef.current?.invalidateCustomCueCache(cueId);
            setCueLibraryVersion((v) => v + 1);
          }}
          onClose={() => setShowMetronomeModal(false)}
        />
      )}
    </div>
  );
}
