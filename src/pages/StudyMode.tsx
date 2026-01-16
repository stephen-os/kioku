import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import type { Card } from "@/types";
import { getCardsForDeck } from "@/lib/db";
import { isTauri } from "@/lib/auth";

export function StudyMode() {
  const { id } = useParams<{ id: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          handleFlip();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="skeleton w-96 h-64 rounded-xl" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📭</div>
        <h1 className="text-xl font-semibold mb-2">No cards to study</h1>
        <p className="text-foreground-dim mb-6">
          Add some cards to this deck first
        </p>
        <Link to={`/decks/${id}`} className="btn btn-primary">
          Manage Deck
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-background-light">
        <div
          className="h-full bg-yellow transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          to={`/decks/${id}`}
          className="text-foreground-dim hover:text-foreground"
        >
          ← Back to Deck
        </Link>
        <span className="text-foreground-dim">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="card-flip w-full max-w-2xl h-80 cursor-pointer"
          onClick={handleFlip}
        >
          <div
            className={`card-flip-inner w-full h-full ${
              isFlipped ? "flipped" : ""
            }`}
          >
            {/* Front */}
            <div className="card-front absolute inset-0 card flex items-center justify-center glow-yellow">
              <div className="text-center" data-selectable="true">
                <p className="text-xl">{currentCard?.front}</p>
              </div>
            </div>

            {/* Back */}
            <div className="card-back absolute inset-0 card flex items-center justify-center bg-background-lighter glow-green">
              <div className="text-center" data-selectable="true">
                <p className="text-xl">{currentCard?.back}</p>
                {currentCard?.notes && (
                  <p className="text-foreground-dim text-sm mt-4">
                    {currentCard.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 pb-8">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="btn btn-secondary disabled:opacity-50"
        >
          ← Previous
        </button>
        <button onClick={handleFlip} className="btn btn-primary px-8">
          Flip
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="btn btn-secondary disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="text-center text-foreground-dim text-xs pb-4">
        <span className="bg-background-light px-2 py-1 rounded mr-2">Space</span>
        to flip
        <span className="bg-background-light px-2 py-1 rounded mx-2 ml-4">←</span>
        <span className="bg-background-light px-2 py-1 rounded mr-2">→</span>
        to navigate
      </div>
    </div>
  );
}
