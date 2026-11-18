import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Edit2,
  FolderPlus,
  Mic,
  Play,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import type { CustomVoiceCue } from '../types';
import {
  BUNDLED_COUNT_CUES,
  BUNDLED_VOICE_CUES,
  deleteCustomVoiceCue,
  importAudioFilesAsCues,
  listCustomVoiceCues,
  renameCustomVoiceCue,
  saveCustomVoiceCue,
} from '../utils/voiceCues';

interface CuePointLibraryProps {
  mode: 'bar-editor' | 'mixer';
  selectedCustomCueId?: string;
  selectedBundledCueLabel?: string;
  libraryVersion?: number;
  onSelectCustomCue?: (cue: CustomVoiceCue) => void;
  onSelectBundledCue?: (label: string, url: string) => void;
  onPreviewBundledCue: (url: string) => void;
  onPreviewCustomCue: (cue: CustomVoiceCue) => void;
  onCustomCueDeleted?: (cueId: string) => void;
  onCustomCueRenamed?: (cue: CustomVoiceCue) => void;
  onCacheInvalidate?: (cueId: string) => void;
}

export const CuePointLibrary: React.FC<CuePointLibraryProps> = ({
  mode,
  selectedCustomCueId,
  selectedBundledCueLabel,
  libraryVersion = 0,
  onSelectCustomCue,
  onSelectBundledCue,
  onPreviewBundledCue,
  onPreviewCustomCue,
  onCustomCueDeleted,
  onCustomCueRenamed,
  onCacheInvalidate,
}) => {
  const [customCues, setCustomCues] = useState<CustomVoiceCue[]>([]);
  const [libraryTab, setLibraryTab] = useState<'custom' | 'builtin' | 'counts'>('custom');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [cueNameInput, setCueNameInput] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const refreshCues = async () => {
    const items = await listCustomVoiceCues();
    setCustomCues(items);
  };

  useEffect(() => {
    void refreshCues();
  }, [libraryVersion]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const showTempStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2600);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setRecordingMs(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const durationMs = Math.max(200, Date.now() - startTimeRef.current);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        const arrayBuf = await blob.arrayBuffer();

        const existingCount = (await listCustomVoiceCues()).length;
        const cleanName = cueNameInput.trim() || `Recorded Cue ${existingCount + 1}`;
        const newCue: CustomVoiceCue = {
          id: `custom-cue-${Date.now().toString(36)}`,
          name: cleanName,
          mimeType: blob.type,
          source: 'recorded',
          audioData: arrayBuf,
          durationMs,
          createdAt: Date.now(),
        };

        await saveCustomVoiceCue(newCue);
        onCacheInvalidate?.(newCue.id);
        setCueNameInput('');
        setIsRecording(false);
        await refreshCues();
        showTempStatus(`Saved "${newCue.name}"`);
        onSelectCustomCue?.(newCue);
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingMs(Date.now() - startTimeRef.current);
      }, 100);
    } catch {
      setErrorMsg('Microphone permission denied or unavailable.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || !files.length) return;

    const imported = await importAudioFilesAsCues(files);
    e.target.value = '';
    if (imported.length === 0) {
      setErrorMsg('Could not import selected audio file(s).');
      return;
    }

    for (const cue of imported) {
      onCacheInvalidate?.(cue.id);
    }
    await refreshCues();
    showTempStatus(`Imported ${imported.length} audio ${imported.length === 1 ? 'cue' : 'cues'}`);
    if (imported.length === 1 && onSelectCustomCue) {
      onSelectCustomCue(imported[0]);
    }
  };

  const handleSaveRename = async (id: string) => {
    const updated = await renameCustomVoiceCue(id, renameDraft);
    setRenamingId(null);
    if (updated) {
      await refreshCues();
      onCustomCueRenamed?.(updated);
    }
  };

  const handleDelete = async (cueId: string) => {
    await deleteCustomVoiceCue(cueId);
    onCacheInvalidate?.(cueId);
    onCustomCueDeleted?.(cueId);
    await refreshCues();
  };

  const recordedCues = customCues.filter((c) => c.source !== 'imported');
  const importedCues = customCues.filter((c) => c.source === 'imported');

  const renderCustomCueRow = (cue: CustomVoiceCue) => {
    const isSelected = selectedCustomCueId === cue.id;
    const isRenaming = renamingId === cue.id;

    return (
      <div
        key={cue.id}
        className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 transition ${
          isSelected
            ? 'bg-[#252019] border-[#E5A958]'
            : 'bg-[#1C1B1A] border-[#2D2B2A]'
        }`}
      >
        {isRenaming ? (
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSaveRename(cue.id);
                } else if (e.key === 'Escape') {
                  setRenamingId(null);
                }
              }}
              className="flex-1 h-8 px-2.5 rounded-lg bg-[#141312] border border-[#E5A958] text-xs text-[#F5F2EE] focus:outline-none min-w-0"
            />
            <button
              type="button"
              onClick={() => void handleSaveRename(cue.id)}
              aria-label="Confirm rename"
              className="w-7 h-7 rounded-full bg-[#E5A958] text-[#121212] flex items-center justify-center shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRenamingId(null)}
              aria-label="Cancel rename"
              className="w-7 h-7 rounded-full bg-[#242220] text-[#9C968F] flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onSelectCustomCue) {
                onSelectCustomCue(cue);
              } else {
                onPreviewCustomCue(cue);
              }
            }}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-2">
              <p
                className={`text-xs font-semibold truncate ${
                  isSelected ? 'text-[#E5A958]' : 'text-[#F5F2EE]'
                }`}
              >
                {cue.name}
              </p>
              <span className="text-[10px] text-[#9C968F] shrink-0">
                {cue.source === 'imported' ? 'Imported' : 'Recorded'}
              </span>
            </div>
            <p className="text-[11px] text-[#9C968F] tabular-nums">
              {(cue.durationMs / 1000).toFixed(1)}s · {onSelectCustomCue ? 'tap to assign' : 'tap to preview'}
            </p>
          </button>
        )}

        {!isRenaming && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onPreviewCustomCue(cue)}
              aria-label={`Preview ${cue.name}`}
              className="w-8 h-8 rounded-full bg-[#242220] hover:bg-[#2D2B2A] text-[#E5A958] flex items-center justify-center"
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setRenamingId(cue.id);
                setRenameDraft(cue.name);
              }}
              aria-label={`Rename ${cue.name}`}
              className="w-8 h-8 rounded-full hover:bg-[#242220] text-[#9C968F] hover:text-[#F5F2EE] flex items-center justify-center"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(cue.id)}
              aria-label={`Delete ${cue.name}`}
              className="w-8 h-8 rounded-full hover:bg-red-500/15 text-[#9C968F] hover:text-red-400 flex items-center justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-[#141312] border border-[#2D2B2A] p-4 space-y-3.5">
      {/* Header + Import Audio Cue button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#E5A958] uppercase">
            CUE POINT LIBRARY
          </p>
          <p className="text-xs text-[#9C968F] mt-0.5">
            Built-in studio cues, microphone recordings &amp; imported audio files
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => void handleImportFiles(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#242220] hover:bg-[#2D2B2A] border border-[#E5A958]/40 text-xs font-semibold text-[#E5A958] transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Import Audio Cue</span>
          </button>
        </div>
      </div>

      {/* Custom/Imported Quick-Select Pills inside Bar Editor Modal */}
      {mode === 'bar-editor' && customCues.length > 0 && (
        <div>
          <p className="text-[10px] font-medium tracking-[0.18em] text-[#9C968F] uppercase mb-2">
            YOUR RECORDED &amp; IMPORTED CUES
          </p>
          <div className="flex flex-wrap gap-2">
            {customCues.map((cue) => {
              const active = selectedCustomCueId === cue.id;
              return (
                <button
                  key={cue.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomCue?.(cue);
                    onPreviewCustomCue(cue);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-medium transition ${
                    active
                      ? 'bg-[#252019] border-[#E5A958] text-[#E5A958]'
                      : 'bg-[#1C1B1A] border-[#2D2B2A] text-[#F5F2EE] hover:bg-[#242220]'
                  }`}
                >
                  <Volume2 className="w-3 h-3 opacity-75" />
                  <span>{cue.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mic Recorder Row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          disabled={isRecording}
          value={cueNameInput}
          onChange={(e) => setCueNameInput(e.target.value)}
          placeholder="Record mic cue label (e.g. Watch Tempo)"
          className="flex-1 h-10 px-3 rounded-xl bg-[#1C1B1A] border border-[#2D2B2A] text-xs text-[#F5F2EE] placeholder:text-[#78736D] focus:border-[#E5A958] focus:outline-none disabled:opacity-60"
        />

        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="h-10 px-3.5 rounded-xl bg-[#E5A958] hover:bg-[#ecb66c] text-[#121212] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="h-10 px-3.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="tabular-nums">Stop ({(recordingMs / 1000).toFixed(1)}s)</span>
          </button>
        )}
      </div>

      {statusMsg && <p className="text-xs text-[#E5A958]">{statusMsg}</p>}
      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

      {/* Category Switcher inside Library */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => setLibraryTab('custom')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition tabular-nums ${
            libraryTab === 'custom'
              ? 'bg-[#252019] border border-[#E5A958] text-[#E5A958]'
              : 'bg-[#1C1B1A] border border-[#2D2B2A] text-[#9C968F] hover:text-[#F5F2EE]'
          }`}
        >
          Custom &amp; Imported ({customCues.length})
        </button>
        <button
          type="button"
          onClick={() => setLibraryTab('builtin')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition tabular-nums ${
            libraryTab === 'builtin'
              ? 'bg-[#252019] border border-[#E5A958] text-[#E5A958]'
              : 'bg-[#1C1B1A] border border-[#2D2B2A] text-[#9C968F] hover:text-[#F5F2EE]'
          }`}
        >
          Built-in ({BUNDLED_VOICE_CUES.length})
        </button>
        <button
          type="button"
          onClick={() => setLibraryTab('counts')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition tabular-nums ${
            libraryTab === 'counts'
              ? 'bg-[#252019] border border-[#E5A958] text-[#E5A958]'
              : 'bg-[#1C1B1A] border border-[#2D2B2A] text-[#9C968F] hover:text-[#F5F2EE]'
          }`}
        >
          Counts (1–7)
        </button>
      </div>

      {/* Library Content */}
      {libraryTab === 'custom' && (
        <div className="space-y-3">
          {customCues.length === 0 ? (
            <p className="text-xs text-[#9C968F] py-2">
              No recorded or imported cues yet. Tap Record or + Import Audio Cue above (MP3, WAV, M4A, OGG).
            </p>
          ) : (
            <>
              {recordedCues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] tracking-[0.18em] text-[#78736D] uppercase">
                    USER-RECORDED ({recordedCues.length})
                  </p>
                  {recordedCues.map(renderCustomCueRow)}
                </div>
              )}
              {importedCues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] tracking-[0.18em] text-[#78736D] uppercase">
                    USER-IMPORTED ({importedCues.length})
                  </p>
                  {importedCues.map(renderCustomCueRow)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {libraryTab === 'builtin' && (
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {BUNDLED_VOICE_CUES.map((c) => {
            const active = !selectedCustomCueId && selectedBundledCueLabel === c.label;
            return (
              <div
                key={c.url}
                className={`rounded-xl border px-2.5 py-2 flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-[#252019] border-[#E5A958]'
                    : 'bg-[#1C1B1A] border-[#2D2B2A]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectBundledCue) {
                      onSelectBundledCue(c.label, c.url);
                    } else {
                      onPreviewBundledCue(c.url);
                    }
                  }}
                  className={`text-xs font-medium truncate text-left flex-1 ${
                    active ? 'text-[#E5A958]' : 'text-[#F5F2EE]'
                  }`}
                >
                  {c.label}
                </button>
                <button
                  type="button"
                  onClick={() => onPreviewBundledCue(c.url)}
                  aria-label={`Preview ${c.label}`}
                  className="w-7 h-7 rounded-full bg-[#242220] text-[#E5A958] flex items-center justify-center shrink-0"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {libraryTab === 'counts' && (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {BUNDLED_COUNT_CUES.map((c, idx) => (
            <button
              key={c.url}
              type="button"
              onClick={() => onPreviewBundledCue(c.url)}
              className="h-10 rounded-xl bg-[#1C1B1A] hover:bg-[#242220] border border-[#2D2B2A] text-xs font-semibold text-[#F5F2EE] flex items-center justify-center gap-1 tabular-nums"
            >
              <Play className="w-3 h-3 text-[#E5A958] fill-current" />
              <span>{idx + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
