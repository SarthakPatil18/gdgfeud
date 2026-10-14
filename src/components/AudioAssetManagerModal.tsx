import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Play,
  Square,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  Music,
  Sparkles,
} from 'lucide-react';
import { AUDIO_EVENT_DEFINITIONS, type AudioAssetKey, type AudioAssetMetadata } from '../types/audio';
import { audioStorage } from '../utils/audioStorage';
import { soundEffects } from '../utils/soundEffects';
import { syncManager } from '../utils/syncManager';

interface AudioAssetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioAssetManagerModal: React.FC<AudioAssetManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [metadataMap, setMetadataMap] = useState<Record<AudioAssetKey, AudioAssetMetadata>>({} as Record<AudioAssetKey, AudioAssetMetadata>);
  const [activePlayingKey, setActivePlayingKey] = useState<AudioAssetKey | null>(null);
  const [loadingKey, setLoadingKey] = useState<AudioAssetKey | null>(null);

  // Load all metadata from IndexedDB
  const refreshMetadata = async () => {
    const meta = await audioStorage.getAllMetadata();
    setMetadataMap(meta);
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      audioStorage.getAllMetadata().then((meta) => {
        if (isMounted) setMetadataMap(meta);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    return audioStorage.onAudioAssetsChanged(() => {
      audioStorage.getAllMetadata().then(setMetadataMap);
    });
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = async (key: AudioAssetKey, file: File) => {
    try {
      setLoadingKey(key);
      await audioStorage.saveAudioAsset(key, file);
      await refreshMetadata();
    } catch (e) {
      console.error('Failed to save audio file:', e);
      alert('Could not save audio file. Please check file format.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleRemoveAsset = async (key: AudioAssetKey) => {
    if (activePlayingKey === key) {
      soundEffects.stopActiveMusic();
      setActivePlayingKey(null);
    }
    await audioStorage.removeAudioAsset(key);
    await refreshMetadata();
  };

  const handleTogglePlay = async (key: AudioAssetKey) => {
    if (activePlayingKey === key) {
      soundEffects.stopActiveMusic();
      setActivePlayingKey(null);
      syncManager.broadcastStopSound();
    } else {
      soundEffects.stopActiveMusic();
      setActivePlayingKey(key);
      await soundEffects.playAsset(key);
      syncManager.broadcastSound(key);
    }
  };

  const handleStopAll = () => {
    soundEffects.stopActiveMusic();
    setActivePlayingKey(null);
    syncManager.broadcastStopSound();
  };

  const configuredCount = Object.values(metadataMap).filter((m) => m.isConfigured).length;
  const missingCount = AUDIO_EVENT_DEFINITIONS.length - configuredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090e1c] border-2 border-amber-400/80 shadow-[0_0_60px_rgba(212,175,55,0.4)] overflow-hidden text-gray-100">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#111933] to-[#0a0f21] border-b border-amber-400/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
              <Music className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-team text-lg sm:text-xl uppercase tracking-wider text-white">
                Authentic Family Feud Audio Asset Mapping
              </h2>
              <p className="text-xs text-gray-400 font-sans">
                Upload and assign legally obtained audio files. Offline storage in browser IndexedDB.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATUS BANNER */}
        <div className="px-5 sm:px-6 py-3 bg-[#060a14] border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Asset Status:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {configuredCount} / {AUDIO_EVENT_DEFINITIONS.length} Ready
            </span>
            {missingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500 text-amber-300 text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {missingCount} Assets Missing
              </span>
            )}
          </div>

          {activePlayingKey && (
            <button
              onClick={handleStopAll}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop Audio
            </button>
          )}
        </div>

        {/* AUDIO ASSET LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          
          <div className="text-xs text-blue-200/70 p-3 rounded-xl bg-blue-950/30 border border-blue-900/60 mb-2">
            <strong>Compliance Note:</strong> Assign your locally owned sound files (.mp3, .wav, .ogg) below. Authentic tracks play automatically during live rounds once loaded. No copyrighted audio is downloaded without permission.
          </div>

          {AUDIO_EVENT_DEFINITIONS.map((def) => {
            const meta = metadataMap[def.key];
            const isConfigured = !!meta?.isConfigured;
            const isPlaying = activePlayingKey === def.key;

            return (
              <div
                key={def.key}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  isConfigured
                    ? 'bg-gradient-to-r from-emerald-950/20 via-black/40 to-black/60 border-emerald-500/50'
                    : 'bg-gradient-to-r from-amber-950/20 via-black/40 to-black/60 border-amber-500/40'
                }`}
              >
                {/* Left: Cue Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-team text-sm sm:text-base uppercase tracking-wide text-white">
                      {def.label}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/60 border border-white/10 text-gray-300">
                      {def.category.toUpperCase()}
                    </span>
                    {/* Status Badge */}
                    {isConfigured ? (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Configured & Ready
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/60 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Audio asset missing
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-300 font-sans leading-snug">
                    {def.description}
                  </p>

                  {/* File Metadata if Configured */}
                  {isConfigured && meta && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-1.5">
                      <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 truncate max-w-[220px]">
                        {meta.fileName}
                      </span>
                      <span>• {(meta.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions (Upload / Play / Remove) */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  
                  {/* File Upload Input */}
                  <label className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 border border-blue-500/60 text-blue-200 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:scale-105">
                    <Upload className="w-3.5 h-3.5" />
                    {loadingKey === def.key ? 'Saving...' : isConfigured ? 'Replace' : 'Upload File'}
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(def.key, file);
                        }
                      }}
                    />
                  </label>

                  {/* Play / Preview Button */}
                  <button
                    onClick={() => handleTogglePlay(def.key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase transition-all hover:scale-105 ${
                      isPlaying
                        ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_#f59e0b]'
                        : isConfigured
                        ? 'bg-emerald-600/30 hover:bg-emerald-600 border-emerald-500/60 text-emerald-200 hover:text-white'
                        : 'bg-white/10 hover:bg-white/20 border-white/20 text-gray-300 hover:text-white'
                    }`}
                    title={isPlaying ? 'Stop audio' : isConfigured ? 'Preview authentic track' : 'Preview placeholder cue'}
                  >
                    {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Stop' : isConfigured ? 'Play' : 'Preview'}
                  </button>

                  {/* Remove Button */}
                  {isConfigured && (
                    <button
                      onClick={() => handleRemoveAsset(def.key)}
                      className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 hover:text-white transition-all"
                      title="Remove audio file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                </div>

              </div>
            );
          })}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0c142b] to-[#060b1a] border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-400">
              Audio changes take effect immediately across all projector screens.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-team text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-transform hover:scale-105"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
