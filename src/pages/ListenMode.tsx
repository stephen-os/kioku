import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import type { Card, Deck } from "@/types";
import { CODE_LANGUAGE_LABELS } from "@/types";
import { getCardsForDeck, getDeck } from "@/lib/db";
import { isTauri } from "@/lib/auth";
import { CodeBlock } from "@/components/CodeEditor";
import { ListenModeControls } from "@/components/ListenModeControls";
import { ListenModePhaseBar } from "@/components/ListenModePhaseBar";
import { useListenMode } from "@/hooks/useListenMode";

type FilterLogic = "any" | "all";

export function ListenMode() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // URL filter params
  const urlFrontSearch = searchParams.get("front") || "";
  const urlBackSearch = searchParams.get("back") || "";
  const urlTagsRaw = searchParams.get("tags") || "";
  const urlTagMode = (searchParams.get("tagMode") as FilterLogic) || "any";
  const hasUrlFilters = urlFrontSearch || urlBackSearch || urlTagsRaw.length > 0;

  const urlTagIds = useMemo(() =>
    urlTagsRaw ? urlTagsRaw.split(",").filter(Boolean) : [],
    [urlTagsRaw]
  );

  // Load deck and cards
  useEffect(() => {
    async function loadDeckAndCards() {
      if (!id) return;
      try {
        if (isTauri()) {
          const [deckData, cardsData] = await Promise.all([
            getDeck(id),
            getCardsForDeck(id),
          ]);
          setDeck(deckData);

          // Apply filters if present
          let filteredCards = cardsData;

          if (hasUrlFilters) {
            if (urlFrontSearch) {
              const term = urlFrontSearch.toLowerCase();
              filteredCards = filteredCards.filter((card) =>
                card.front.toLowerCase().includes(term)
              );
            }
            if (urlBackSearch) {
              const term = urlBackSearch.toLowerCase();
              filteredCards = filteredCards.filter((card) =>
                card.back.toLowerCase().includes(term)
              );
            }
            if (urlTagIds.length > 0) {
              filteredCards = filteredCards.filter((card) => {
                const cardTagIds = card.tags.map((t) => t.id);
                if (urlTagMode === "all") {
                  return urlTagIds.every((tagId) => cardTagIds.includes(tagId));
                } else {
                  return urlTagIds.some((tagId) => cardTagIds.includes(tagId));
                }
              });
            }
          }

          setCards(filteredCards);
        }
      } catch (error) {
        console.error("Failed to load cards:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDeckAndCards();
  }, [id, hasUrlFilters, urlFrontSearch, urlBackSearch, urlTagsRaw, urlTagMode]);

  // Listen mode hook
  const listenMode = useListenMode({
    cards,
    onComplete: () => {
      // Optional: do something when complete
    },
  });

  const {
    currentCard,
    phase,
    isPlaying,
    isSpeaking,
    pauseTimeRemaining,
    voice,
    pauseDuration,
    volume,
    loopMode,
    isShuffled,
    play,
    pause,
    next,
    previous,
    skipToPhase,
    setVoice,
    setPauseDuration,
    setVolume,
    setLoopMode,
    toggleShuffle,
    restart,
    progress,
    isComplete,
    error,
    clearError,
    currentIndex,
  } = listenMode;

  // Determine if can navigate
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < cards.length - 1;

  // Card is flipped when showing the back
  const isFlipped = phase === "back";

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#2d2a2e]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#ffd866] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#939293]">Loading...</p>
        </div>
      </div>
    );
  }

  // No cards state
  if (cards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#2d2a2e]">
        <div className="text-6xl mb-4">📭</div>
        <h1 className="text-xl font-semibold text-[#fcfcfa] mb-2">No cards to listen</h1>
        <p className="text-[#939293] mb-6">
          Add some cards to this deck first
        </p>
        <Link
          to={`/decks/${id}`}
          className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
        >
          Manage Deck
        </Link>
      </div>
    );
  }

  const isCodeFront = currentCard?.frontType === "CODE";
  const isCodeBack = currentCard?.backType === "CODE";

  // Get status text for the header
  const getStatusText = () => {
    if (phase === "pause") {
      return `Thinking... ${pauseTimeRemaining}s`;
    }
    if (isSpeaking) {
      return phase === "front" ? "Reading front..." : "Reading back...";
    }
    if (phase === "transition") {
      return "Next card...";
    }
    return `Card ${currentIndex + 1} of ${cards.length}`;
  };

  return (
    <div className="h-full bg-[#2d2a2e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#403e41] border-b border-[#5b595c] flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link
              to={`/decks/${id}`}
              className="text-[#78dce8] hover:text-[#ffd866] flex items-center transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Deck
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-bold text-[#fcfcfa] font-mono truncate max-w-[300px]">
                {deck?.name}
              </h1>
              <p className="text-sm text-[#939293] flex items-center justify-center gap-2">
                {isSpeaking && (
                  <span className="flex gap-0.5">
                    <span className="w-1 h-3 bg-[#ffd866] rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-3 bg-[#ffd866] rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-3 bg-[#ffd866] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
                {isComplete ? "Complete!" : getStatusText()}
              </p>
            </div>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-[#ff6188]/20 border-b border-[#ff6188]/30 px-6 py-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-[#ff6188] text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-[#ff6188] hover:text-[#ff6188]/80 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto px-6 py-8 w-full overflow-hidden">
        {isComplete ? (
          /* Completion Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-[#403e41] rounded-2xl border border-[#5b595c] p-12 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-20 w-20 text-[#a9dc76]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#fcfcfa] font-mono mb-2">
                Great Job!
              </h2>
              <p className="text-[#939293] mb-8">
                You've listened to all {cards.length} cards in this deck.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    restart();
                    play();
                  }}
                  className="px-6 py-3 bg-[#a9dc76] text-[#2d2a2e] rounded-lg hover:bg-[#a9dc76]/90 font-medium transition-colors"
                >
                  Listen Again
                </button>
                <Link
                  to={`/decks/${id}`}
                  className="px-6 py-3 border border-[#5b595c] rounded-lg text-[#fcfcfa] hover:bg-[#5b595c]/30 font-medium transition-colors"
                >
                  Back to Deck
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Card Display */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Progress Bar */}
            <div className="mb-6 flex-shrink-0">
              <div className="bg-[#5b595c] rounded-full h-2">
                <div
                  className="bg-[#ffd866] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Card Container with Flip Animation */}
            <div
              className="flex-1 min-h-0 overflow-hidden"
              style={{ perspective: "1000px" }}
            >
              <div
                className="w-full h-full"
              >
                {/* 3D Flip Card */}
                <div
                  className="relative w-full h-full transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Front Face */}
                  <div
                    className="absolute inset-0 bg-[#403e41] rounded-2xl border border-[#5b595c] p-12 flex flex-col items-center justify-center overflow-auto"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="text-center w-full max-w-2xl" data-selectable="true">
                      <div className="text-sm text-[#939293] uppercase tracking-wider mb-4">
                        Front
                      </div>
                      {isCodeFront && (
                        <div className="flex items-center justify-center mb-3">
                          <span className="text-xs bg-[#78dce8]/20 text-[#78dce8] px-2 py-0.5 rounded">
                            {CODE_LANGUAGE_LABELS[currentCard?.frontLanguage || "PLAINTEXT"]}
                          </span>
                        </div>
                      )}
                      <div className="mb-6">
                        {isCodeFront ? (
                          <div className="w-full">
                            <CodeBlock
                              code={currentCard?.front || ""}
                              language={currentCard?.frontLanguage}
                            />
                          </div>
                        ) : (
                          <p className="text-2xl text-center whitespace-pre-wrap text-[#fcfcfa]">
                            {currentCard?.front}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Back Face */}
                  <div
                    className="absolute inset-0 bg-[#403e41] rounded-2xl border border-[#5b595c] p-12 flex flex-col items-center justify-center overflow-auto"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="text-center w-full max-w-2xl" data-selectable="true">
                      <div className="text-sm text-[#939293] uppercase tracking-wider mb-4">
                        Back
                      </div>
                      {isCodeBack && (
                        <div className="flex items-center justify-center mb-3">
                          <span className="text-xs bg-[#78dce8]/20 text-[#78dce8] px-2 py-0.5 rounded">
                            {CODE_LANGUAGE_LABELS[currentCard?.backLanguage || "PLAINTEXT"]}
                          </span>
                        </div>
                      )}
                      <div className="mb-6">
                        {isCodeBack ? (
                          <div className="w-full">
                            <CodeBlock
                              code={currentCard?.back || ""}
                              language={currentCard?.backLanguage}
                            />
                          </div>
                        ) : (
                          <p className="text-2xl text-center whitespace-pre-wrap text-[#fcfcfa]">
                            {currentCard?.back}
                          </p>
                        )}
                      </div>
                      {currentCard?.notes && (
                        <div className="mt-8 pt-6 border-t border-[#5b595c]">
                          <div className="text-sm text-[#939293] uppercase tracking-wider mb-2">
                            Notes
                          </div>
                          <div className="text-[#939293] text-base">{currentCard.notes}</div>
                        </div>
                      )}
                      {currentCard?.tags && currentCard.tags.length > 0 && (
                        <div className="mt-4 flex justify-center gap-2 flex-wrap">
                          {currentCard.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ab9df2]/20 text-[#ab9df2]"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase Progress Bar */}
            <div className="mt-6 flex-shrink-0">
              <ListenModePhaseBar
                phase={phase}
                pauseDuration={pauseDuration}
                pauseTimeRemaining={pauseTimeRemaining}
                onSkipToPhase={skipToPhase}
                disabled={isComplete}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!isComplete && (
        <ListenModeControls
          isPlaying={isPlaying}
          isComplete={isComplete}
          voice={voice}
          pauseDuration={pauseDuration}
          volume={volume}
          loopMode={loopMode}
          isShuffled={isShuffled}
          onPlay={play}
          onPause={pause}
          onNext={next}
          onPrevious={previous}
          onVoiceChange={setVoice}
          onPauseDurationChange={setPauseDuration}
          onVolumeChange={setVolume}
          onLoopModeChange={setLoopMode}
          onShuffleToggle={toggleShuffle}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
        />
      )}
    </div>
  );
}
