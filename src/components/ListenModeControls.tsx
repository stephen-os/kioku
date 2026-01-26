import { useState, useEffect } from "react";
import type { LoopMode, TTSVoice } from "@/types";
import { getAvailableVoices, getVoiceDisplayName } from "@/lib/tts";

interface ListenModeControlsProps {
  // Playback state
  isPlaying: boolean;
  isComplete: boolean;

  // Settings
  voice: string;
  pauseDuration: number;
  volume: number;
  loopMode: LoopMode;
  isShuffled: boolean;

  // Actions
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVoiceChange: (voice: string) => void;
  onPauseDurationChange: (duration: number) => void;
  onVolumeChange: (volume: number) => void;
  onLoopModeChange: (mode: LoopMode) => void;
  onShuffleToggle: () => void;

  // Navigation state
  canGoNext: boolean;
  canGoPrevious: boolean;

  // Settings panel visibility
  showSettings: boolean;
  onToggleSettings: () => void;
}

export function ListenModeControls({
  isPlaying,
  isComplete,
  voice,
  pauseDuration,
  volume,
  loopMode,
  isShuffled,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onVoiceChange,
  onPauseDurationChange,
  onVolumeChange,
  onLoopModeChange,
  onShuffleToggle,
  canGoNext,
  canGoPrevious,
  showSettings,
  onToggleSettings,
}: ListenModeControlsProps) {
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);

  // Load voices on mount
  useEffect(() => {
    getAvailableVoices().then((availableVoices) => {
      setVoices(availableVoices);
      setLoadingVoices(false);
    });
  }, []);
  // Loop mode icon and label
  const getLoopIcon = () => {
    switch (loopMode) {
      case "single":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            <text x="12" y="14" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">1</text>
          </svg>
        );
      case "all":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  const cycleLoopMode = () => {
    const modes: LoopMode[] = ["none", "all", "single"];
    const currentIdx = modes.indexOf(loopMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    onLoopModeChange(modes[nextIdx]);
  };

  return (
    <div className="bg-[#403e41] border-t border-[#5b595c]">
      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-[#5b595c] p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Voice Selection */}
            <div>
              <label className="block text-xs text-[#939293] uppercase tracking-wider mb-2">
                Voice
              </label>
              <select
                value={voice}
                onChange={(e) => onVoiceChange(e.target.value)}
                disabled={loadingVoices}
                className="w-full bg-[#2d2a2e] border border-[#5b595c] rounded-lg px-3 py-2 text-[#fcfcfa] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 disabled:opacity-50"
              >
                {loadingVoices ? (
                  <option>Loading voices...</option>
                ) : voices.length === 0 ? (
                  <option>No voices available</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {getVoiceDisplayName(v.id)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Pause Duration */}
            <div>
              <label className="block text-xs text-[#939293] uppercase tracking-wider mb-2">
                Pause Duration: {pauseDuration}s
              </label>
              <input
                type="range"
                min="5"
                max="60"
                value={pauseDuration}
                onChange={(e) => onPauseDurationChange(Number(e.target.value))}
                className="w-full h-2 bg-[#5b595c] rounded-lg appearance-none cursor-pointer accent-[#ffd866]"
              />
              <div className="flex justify-between text-xs text-[#939293] mt-1">
                <span>5s</span>
                <span>60s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Left: Shuffle & Loop */}
          <div className="flex items-center gap-2">
            <button
              onClick={onShuffleToggle}
              className={`p-2 rounded-lg transition-colors ${
                isShuffled
                  ? "bg-[#ffd866] text-[#2d2a2e]"
                  : "text-[#939293] hover:text-[#fcfcfa] hover:bg-[#5b595c]/30"
              }`}
              title={isShuffled ? "Shuffle on" : "Shuffle off"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <button
              onClick={cycleLoopMode}
              className={`p-2 rounded-lg transition-colors ${
                loopMode !== "none"
                  ? "bg-[#ffd866] text-[#2d2a2e]"
                  : "text-[#939293] hover:text-[#fcfcfa] hover:bg-[#5b595c]/30"
              }`}
              title={
                loopMode === "none"
                  ? "Loop off"
                  : loopMode === "all"
                  ? "Loop all"
                  : "Loop single"
              }
            >
              {getLoopIcon()}
            </button>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className="p-2 rounded-lg text-[#fcfcfa] hover:bg-[#5b595c]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous card"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={isPlaying ? onPause : onPlay}
              className="p-4 rounded-full bg-[#a9dc76] text-[#2d2a2e] hover:bg-[#a9dc76]/90 transition-colors"
              title={isPlaying ? "Pause" : isComplete ? "Play again" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={onNext}
              disabled={!canGoNext && loopMode === "none"}
              className="p-2 rounded-lg text-[#fcfcfa] hover:bg-[#5b595c]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next card"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Right: Volume & Settings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
                className="p-2 rounded-lg text-[#939293] hover:text-[#fcfcfa] hover:bg-[#5b595c]/30 transition-colors"
                title={volume === 0 ? "Unmute" : "Mute"}
              >
                {volume === 0 ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-20 h-2 bg-[#5b595c] rounded-lg appearance-none cursor-pointer accent-[#ffd866]"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>

            <button
              onClick={onToggleSettings}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? "bg-[#ffd866] text-[#2d2a2e]"
                  : "text-[#939293] hover:text-[#fcfcfa] hover:bg-[#5b595c]/30"
              }`}
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
