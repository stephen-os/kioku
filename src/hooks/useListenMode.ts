import { useState, useEffect, useCallback, useRef } from "react";
import type { Card, LoopMode, ListenPhase, ContentType } from "@/types";
import { speak, stopSpeaking, initializeVoices, DEFAULT_VOICE, RECOMMENDED_VOICES } from "@/lib/tts";

// localStorage keys
const STORAGE_KEYS = {
  voice: "kioku-listen-voice",
  pauseDuration: "kioku-listen-pause",
  volume: "kioku-listen-volume",
} as const;

// Load persisted value from localStorage
function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Failed to load setting ${key}:`, e);
  }
  return defaultValue;
}

// Save value to localStorage
function saveSetting(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save setting ${key}:`, e);
  }
}

// Prepare text for TTS (handle CODE content)
function prepareTextForTTS(content: string, contentType: ContentType): string {
  if (contentType === "CODE") {
    return "Code snippet. See screen for details.";
  }
  return content;
}

interface UseListenModeOptions {
  cards: Card[];
  onComplete?: () => void;
}

interface UseListenModeReturn {
  // Current state
  currentIndex: number;
  currentCard: Card | null;
  phase: ListenPhase;
  isPlaying: boolean;
  isSpeaking: boolean;
  pauseTimeRemaining: number;

  // Settings
  voice: string;
  pauseDuration: number;
  volume: number;
  loopMode: LoopMode;
  isShuffled: boolean;

  // Actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  skipToPhase: (phase: "front" | "pause" | "back") => void;
  setVoice: (voice: string) => void;
  setPauseDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setLoopMode: (mode: LoopMode) => void;
  toggleShuffle: () => void;
  restart: () => void;

  // Progress
  progress: number;
  isComplete: boolean;

  // Error state
  error: string | null;
  clearError: () => void;

  // Voices
  voicesLoaded: boolean;
}

export function useListenMode({ cards, onComplete }: UseListenModeOptions): UseListenModeReturn {
  // Card order (indices into cards array)
  const [cardOrder, setCardOrder] = useState<number[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);

  // Playback state
  const [phase, setPhase] = useState<ListenPhase>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Settings (persisted)
  const [voice, setVoiceState] = useState(() => loadSetting(STORAGE_KEYS.voice, ""));
  const [pauseDuration, setPauseDurationState] = useState(() => loadSetting(STORAGE_KEYS.pauseDuration, 15));
  const [volume, setVolumeState] = useState(() => loadSetting(STORAGE_KEYS.volume, 0.8));
  const [loopMode, setLoopMode] = useState<LoopMode>("none");
  const [isShuffled, setIsShuffled] = useState(false);

  // Refs
  const pauseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  const cardsRef = useRef(cards);
  const cardOrderRef = useRef(cardOrder);
  const currentOrderIndexRef = useRef(currentOrderIndex);
  const voiceRef = useRef(voice);
  const volumeRef = useRef(volume);
  const pauseDurationRef = useRef(pauseDuration);
  const loopModeRef = useRef(loopMode);
  const onCompleteRef = useRef(onComplete);
  const skipToPhaseRef = useRef<"front" | "pause" | "back" | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    cardsRef.current = cards;
    cardOrderRef.current = cardOrder;
  }, [cards, cardOrder]);

  useEffect(() => {
    currentOrderIndexRef.current = currentOrderIndex;
  }, [currentOrderIndex]);

  useEffect(() => {
    voiceRef.current = voice;
    volumeRef.current = volume;
    pauseDurationRef.current = pauseDuration;
    loopModeRef.current = loopMode;
  }, [voice, volume, pauseDuration, loopMode]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initialize voices on mount
  useEffect(() => {
    initializeVoices().then(() => {
      setVoicesLoaded(true);
      // Set default voice if not already set
      if (!voice && DEFAULT_VOICE) {
        setVoiceState(DEFAULT_VOICE);
      } else if (!voice && RECOMMENDED_VOICES.length > 0) {
        setVoiceState(RECOMMENDED_VOICES[0].id);
      }
    });

    return () => {
      stopSpeaking();
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
      }
    };
  }, []);

  // Initialize card order when cards change
  useEffect(() => {
    if (cards.length > 0) {
      const order = cards.map((_, i) => i);
      if (isShuffled) {
        // Fisher-Yates shuffle
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
      }
      setCardOrder(order);
      setCurrentOrderIndex(0);
      setIsComplete(false);
    }
  }, [cards, isShuffled]);

  // Current card based on order
  const currentIndex = cardOrder[currentOrderIndex] ?? 0;
  const currentCard = cards[currentIndex] ?? null;
  const progress = cards.length > 0 ? ((currentOrderIndex + 1) / cards.length) * 100 : 0;

  // Stop all playback
  const stopPlayback = useCallback(() => {
    // Stop TTS
    stopSpeaking();

    // Clear pause timer
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    setIsSpeakingState(false);
    setPauseTimeRemaining(0);
  }, []);

  // Main playback loop - uses refs to avoid restarting on every state change
  useEffect(() => {
    console.log("[ListenMode] Playback effect triggered", { isPlaying, isComplete });
    if (!isPlaying || isComplete) {
      console.log("[ListenMode] Playback effect early exit - not playing or complete");
      return;
    }

    let isCancelled = false;

    const getCurrentCard = () => {
      const order = cardOrderRef.current;
      const idx = currentOrderIndexRef.current;
      const cards = cardsRef.current;
      const cardIdx = order[idx] ?? 0;
      return cards[cardIdx] ?? null;
    };

    const speakTextAsync = async (text: string): Promise<void> => {
      if (!text.trim()) return;
      setIsSpeakingState(true);
      setError(null);
      try {
        await speak(text, {
          voice: voiceRef.current,
          rate: 1,
          pitch: 1,
          volume: volumeRef.current
        });
      } finally {
        setIsSpeakingState(false);
      }
    };

    const startPauseTimerAsync = (): Promise<void> => {
      return new Promise((resolve) => {
        let remaining = pauseDurationRef.current;
        setPauseTimeRemaining(remaining);

        pauseTimerRef.current = setInterval(() => {
          if (isCancelled || !isPlayingRef.current) {
            if (pauseTimerRef.current) {
              clearInterval(pauseTimerRef.current);
              pauseTimerRef.current = null;
            }
            resolve();
            return;
          }

          remaining -= 1;
          setPauseTimeRemaining(remaining);

          if (remaining <= 0) {
            if (pauseTimerRef.current) {
              clearInterval(pauseTimerRef.current);
              pauseTimerRef.current = null;
            }
            resolve();
          }
        }, 1000);
      });
    };

    const playCardCycleAsync = async (): Promise<boolean> => {
      const card = getCurrentCard();
      const skipTo = skipToPhaseRef.current;
      skipToPhaseRef.current = null; // Clear after reading

      console.log("[ListenMode] playCardCycle started", { hasCard: !!card, isPlaying: isPlayingRef.current, skipTo });

      if (!card || !isPlayingRef.current) {
        console.log("[ListenMode] playCardCycle early exit - no card or not playing");
        return false;
      }

      try {
        // Skip to specific phase if requested
        const skipFront = skipTo === "pause" || skipTo === "back";
        const skipPause = skipTo === "back";

        // Speak front (unless skipping)
        if (!skipFront) {
          console.log("[ListenMode] Starting front phase");
          setPhase("front");
          const frontText = prepareTextForTTS(card.front, card.frontType);
          console.log("[ListenMode] Front text:", frontText.substring(0, 50));
          await speakTextAsync(frontText);

          if (isCancelled || !isPlayingRef.current) return false;
        }

        // Pause (unless skipping)
        if (!skipPause) {
          setPhase("pause");
          await startPauseTimerAsync();

          if (isCancelled || !isPlayingRef.current) return false;
        }

        // Speak back
        setPhase("back");
        const backText = prepareTextForTTS(card.back, card.backType);
        await speakTextAsync(backText);

        if (isCancelled || !isPlayingRef.current) return false;

        // Transition
        setPhase("transition");
        return true;
      } catch (err) {
        console.error("Error during card playback:", err);
        setError(err instanceof Error ? err.message : "Playback error");
        return false;
      }
    };

    const moveToNextCard = (): boolean => {
      const loopMode = loopModeRef.current;
      const orderLength = cardOrderRef.current.length;
      const currentIdx = currentOrderIndexRef.current;

      if (loopMode === "single") {
        // Stay on same card
        return true;
      }

      if (currentIdx < orderLength - 1) {
        const newIdx = currentIdx + 1;
        currentOrderIndexRef.current = newIdx;
        setCurrentOrderIndex(newIdx);
        return true;
      }

      // At end of deck
      if (loopMode === "all") {
        currentOrderIndexRef.current = 0;
        setCurrentOrderIndex(0);
        return true;
      }

      // No loop - complete
      return false;
    };

    const runPlayback = async () => {
      console.log("[ListenMode] runPlayback started");

      while (!isCancelled && isPlayingRef.current) {
        const success = await playCardCycleAsync();

        if (isCancelled || !isPlayingRef.current) break;

        if (!success) {
          // Error occurred, stop playback
          setIsPlaying(false);
          break;
        }

        // Brief pause before next card
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (isCancelled || !isPlayingRef.current) break;

        const hasNext = moveToNextCard();
        if (!hasNext) {
          setIsComplete(true);
          setIsPlaying(false);
          setPhase("idle");
          onCompleteRef.current?.();
          break;
        }
      }

      console.log("[ListenMode] runPlayback ended", { isCancelled, isPlaying: isPlayingRef.current });
    };

    runPlayback();

    return () => {
      console.log("[ListenMode] Playback effect cleanup");
      isCancelled = true;
      stopSpeaking();
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    };
  }, [isPlaying, isComplete]); // Only restart when play state or completion changes

  // Actions
  const play = useCallback(() => {
    console.log("[ListenMode] play() called", { isComplete, currentCard: currentCard?.front?.substring(0, 30), voice, voicesLoaded });
    if (isComplete) {
      // Restart if complete
      setCurrentOrderIndex(0);
      setIsComplete(false);
    }
    setError(null);
    setIsPlaying(true);
  }, [isComplete, currentCard, voice, voicesLoaded]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
    setPhase("idle");
  }, [stopPlayback]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
    setPhase("idle");
    setCurrentOrderIndex(0);
  }, [stopPlayback]);

  const next = useCallback(() => {
    stopPlayback();

    if (currentOrderIndex < cardOrder.length - 1) {
      setCurrentOrderIndex((prev) => prev + 1);
    } else if (loopMode === "all") {
      setCurrentOrderIndex(0);
    }

    // Restart playback if was playing
    if (isPlaying) {
      setPhase("front");
    }
  }, [stopPlayback, currentOrderIndex, cardOrder.length, loopMode, isPlaying]);

  const previous = useCallback(() => {
    stopPlayback();

    if (currentOrderIndex > 0) {
      setCurrentOrderIndex((prev) => prev - 1);
    }

    // Restart playback if was playing
    if (isPlaying) {
      setPhase("front");
    }
  }, [stopPlayback, currentOrderIndex, isPlaying]);

  const setVoice = useCallback((newVoice: string) => {
    setVoiceState(newVoice);
    saveSetting(STORAGE_KEYS.voice, newVoice);
  }, []);

  const setPauseDuration = useCallback((duration: number) => {
    const clamped = Math.max(5, Math.min(60, duration));
    setPauseDurationState(clamped);
    saveSetting(STORAGE_KEYS.pauseDuration, clamped);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    saveSetting(STORAGE_KEYS.volume, clamped);
  }, []);

  const toggleShuffle = useCallback(() => {
    const newShuffled = !isShuffled;
    setIsShuffled(newShuffled);

    // Re-shuffle or restore order
    const order = cards.map((_, i) => i);
    if (newShuffled) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    setCardOrder(order);
    setCurrentOrderIndex(0);
  }, [isShuffled, cards]);

  const restart = useCallback(() => {
    stopPlayback();
    setCurrentOrderIndex(0);
    setIsComplete(false);
    setPhase("idle");
    setIsPlaying(false);
  }, [stopPlayback]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Skip to a specific phase (front, pause, or back)
  const skipToPhase = useCallback((targetPhase: "front" | "pause" | "back") => {
    console.log("[ListenMode] skipToPhase called:", targetPhase);

    // Stop current playback
    stopSpeaking();
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setIsSpeakingState(false);
    setPauseTimeRemaining(0);

    // Set the skip target
    skipToPhaseRef.current = targetPhase;

    // If not playing, start playing
    if (!isPlaying) {
      setIsPlaying(true);
    } else {
      // If already playing, we need to restart the effect
      // Toggle isPlaying off then on to trigger effect restart
      setIsPlaying(false);
      // Use setTimeout to ensure state updates before restarting
      setTimeout(() => {
        skipToPhaseRef.current = targetPhase; // Re-set in case it was cleared
        setIsPlaying(true);
      }, 50);
    }
  }, [isPlaying]);

  return {
    // Current state
    currentIndex,
    currentCard,
    phase,
    isPlaying,
    isSpeaking: isSpeakingState,
    pauseTimeRemaining,

    // Settings
    voice,
    pauseDuration,
    volume,
    loopMode,
    isShuffled,

    // Actions
    play,
    pause,
    stop,
    next,
    previous,
    skipToPhase,
    setVoice,
    setPauseDuration,
    setVolume,
    setLoopMode,
    toggleShuffle,
    restart,

    // Progress
    progress,
    isComplete,

    // Error state
    error,
    clearError,

    // Voices
    voicesLoaded,
  };
}
