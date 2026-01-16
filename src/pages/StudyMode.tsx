import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import type { Card } from "@/types";
import { CODE_LANGUAGE_LABELS } from "@/types";
import { getCardsForDeck } from "@/lib/db";
import { isTauri } from "@/lib/auth";
import { CodeBlock } from "@/components/CodeEditor";

export function StudyMode() {
  const { id } = useParams<{ id: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shuffled, setShuffled] = useState(false);

  // Touch handling for swipe gestures
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCards() {
      if (!id) return;
      try {
        if (isTauri()) {
          const data = await getCardsForDeck(id);
          setCards(data);
        }
      } catch (error) {
        console.error("Failed to load cards:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, [id]);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, cards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleShuffle = useCallback(() => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffledCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShuffled(true);
  }, [cards]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          handleFlip();
          break;
        case "ArrowRight":
        case "j":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
        case "k":
          e.preventDefault();
          handlePrev();
          break;
        case "r":
          e.preventDefault();
          handleReset();
          break;
        case "s":
          e.preventDefault();
          handleShuffle();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleReset, handleShuffle]);

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;

    // Minimum swipe distance threshold
    const minSwipeDistance = 50;

    // Determine if swipe is more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > minSwipeDistance) {
        // Swipe right - previous card
        handlePrev();
      } else if (deltaX < -minSwipeDistance) {
        // Swipe left - next card
        handleNext();
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        // Vertical swipe - flip card
        handleFlip();
      }
    }

    touchStartRef.current = null;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#2d2a2e]">
        <div className="w-96 h-64 rounded-xl bg-[#403e41] animate-pulse" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#2d2a2e]">
        <div className="text-6xl mb-4">📭</div>
        <h1 className="text-xl font-semibold text-[#fcfcfa] mb-2">No cards to study</h1>
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

  return (
    <div className="h-full flex flex-col bg-[#2d2a2e]">
      {/* Progress bar */}
      <div className="h-1 bg-[#403e41]">
        <div
          className="h-full bg-[#ffd866] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          to={`/decks/${id}`}
          className="text-[#939293] hover:text-[#fcfcfa] transition-colors"
        >
          ← Back to Deck
        </Link>
        <div className="flex items-center gap-4">
          {shuffled && (
            <span className="text-xs text-[#ab9df2] bg-[#ab9df2]/20 px-2 py-1 rounded">
              Shuffled
            </span>
          )}
          <span className="text-[#939293]">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Card Area */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={cardRef}
          className="card-flip w-full max-w-3xl min-h-[300px] cursor-pointer"
          onClick={handleFlip}
          style={{ perspective: "1000px" }}
        >
          <div
            className={`card-flip-inner w-full h-full transition-transform duration-500 ${
              isFlipped ? "flipped" : ""
            }`}
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="card-front absolute inset-0 bg-[#403e41] border border-[#5b595c] rounded-xl p-6 shadow-lg shadow-[#ffd866]/10 overflow-auto"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <div className="min-h-[280px] flex flex-col">
                {isCodeFront && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#ffd866]">Question (Code)</span>
                    <span className="text-xs bg-[#78dce8]/20 text-[#78dce8] px-2 py-0.5 rounded">
                      {CODE_LANGUAGE_LABELS[currentCard?.frontLanguage || "PLAINTEXT"]}
                    </span>
                  </div>
                )}
                <div className="flex-1 flex items-center justify-center" data-selectable="true">
                  {isCodeFront ? (
                    <div className="w-full">
                      <CodeBlock
                        code={currentCard?.front || ""}
                        language={currentCard?.frontLanguage}
                      />
                    </div>
                  ) : (
                    <p className="text-xl text-center whitespace-pre-wrap text-[#fcfcfa]">
                      {currentCard?.front}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Back */}
            <div
              className="card-back absolute inset-0 bg-[#403e41] border border-[#5b595c] rounded-xl p-6 shadow-lg shadow-[#a9dc76]/10 overflow-auto"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="min-h-[280px] flex flex-col">
                {isCodeBack && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#a9dc76]">Answer (Code)</span>
                    <span className="text-xs bg-[#78dce8]/20 text-[#78dce8] px-2 py-0.5 rounded">
                      {CODE_LANGUAGE_LABELS[currentCard?.backLanguage || "PLAINTEXT"]}
                    </span>
                  </div>
                )}
                <div className="flex-1 flex flex-col items-center justify-center" data-selectable="true">
                  {isCodeBack ? (
                    <div className="w-full">
                      <CodeBlock
                        code={currentCard?.back || ""}
                        language={currentCard?.backLanguage}
                      />
                    </div>
                  ) : (
                    <p className="text-xl text-center whitespace-pre-wrap text-[#fcfcfa]">
                      {currentCard?.back}
                    </p>
                  )}
                  {currentCard?.notes && (
                    <p className="text-[#939293] text-sm mt-6 text-center border-t border-[#5b595c] pt-4 w-full">
                      {currentCard.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 pb-6">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 transition-colors disabled:opacity-50"
        >
          ← Previous
        </button>
        <button
          onClick={handleFlip}
          className="px-8 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
        >
          Flip
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="px-4 py-2 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 transition-colors disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {/* Extra Actions */}
      <div className="flex items-center justify-center gap-4 pb-4">
        <button
          onClick={handleShuffle}
          className="text-sm text-[#939293] hover:text-[#fcfcfa] transition-colors"
        >
          🔀 Shuffle
        </button>
        <span className="text-[#939293]">•</span>
        <button
          onClick={handleReset}
          className="text-sm text-[#939293] hover:text-[#fcfcfa] transition-colors"
        >
          ↺ Restart
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="text-center text-[#939293] text-xs pb-4">
        <span className="bg-[#403e41] px-2 py-1 rounded mr-2">Space</span>
        flip
        <span className="bg-[#403e41] px-2 py-1 rounded mx-2 ml-4">←</span>
        <span className="bg-[#403e41] px-2 py-1 rounded mr-2">→</span>
        navigate
        <span className="bg-[#403e41] px-2 py-1 rounded mx-2 ml-4">S</span>
        shuffle
        <span className="bg-[#403e41] px-2 py-1 rounded mx-2 ml-4">R</span>
        restart
      </div>
    </div>
  );
}
