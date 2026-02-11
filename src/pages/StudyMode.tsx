import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import type { Card, Deck, Tag } from "@/types";
import { CODE_LANGUAGE_LABELS } from "@/types";
import { getCardsForDeck, getDeck, getTagsForDeck, startStudySession, endStudySession } from "@/lib/db";
import { isTauri } from "@/lib/auth";
import { CodeBlock } from "@/components/CodeEditor";

type FilterLogic = "any" | "all";

export function StudyMode() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyComplete, setStudyComplete] = useState(false);

  // URL filter params
  const urlSearchTerm = searchParams.get("q") || "";
  const urlTagIds = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const urlTagMode = (searchParams.get("tagMode") as FilterLogic) || "any";
  const hasUrlFilters = urlSearchTerm || urlTagIds.length > 0;

  // Tag filter state
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>(urlTagIds);
  const [tagFilterMode, setTagFilterMode] = useState<FilterLogic>(urlTagMode);
  const [studyStarted, setStudyStarted] = useState(false);

  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [exitTransform, setExitTransform] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(true);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Touch handling for swipe gestures
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // Study session tracking
  const sessionIdRef = useRef<string | null>(null);
  const cardsViewedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    async function loadDeckAndCards() {
      if (!id) return;
      try {
        if (isTauri()) {
          const [deckData, cardsData, tagsData] = await Promise.all([
            getDeck(id),
            getCardsForDeck(id),
            getTagsForDeck(id),
          ]);
          setDeck(deckData);
          setAllCards(cardsData);
          setTags(tagsData);

          // If URL has filters, apply them directly and skip the filter screen
          if (hasUrlFilters) {
            let filteredCards = cardsData;

            // Apply text search from URL
            if (urlSearchTerm) {
              const term = urlSearchTerm.toLowerCase();
              filteredCards = filteredCards.filter(
                (card) =>
                  card.front.toLowerCase().includes(term) ||
                  card.back.toLowerCase().includes(term) ||
                  (card.notes && card.notes.toLowerCase().includes(term))
              );
            }

            // Apply tag filters from URL
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

            const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
            setCards(shuffled);
            setStudyStarted(true);
          } else if (tagsData.length > 0) {
            // No URL filters, but has tags - show filter screen
            setShowTagFilter(true);
          } else {
            // No tags, start studying immediately
            const shuffled = [...cardsData].sort(() => Math.random() - 0.5);
            setCards(shuffled);
            setStudyStarted(true);
          }
        }
      } catch (error) {
        console.error("Failed to load cards:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDeckAndCards();
  }, [id, hasUrlFilters, urlSearchTerm, urlTagIds, urlTagMode]);

  // Start study session when studying begins
  useEffect(() => {
    if (studyStarted && id && cards.length > 0 && !sessionIdRef.current) {
      startStudySession(id)
        .then((session) => {
          sessionIdRef.current = session.id;
          cardsViewedRef.current = new Set([0]); // First card is viewed
        })
        .catch((err) => console.error("Failed to start study session:", err));
    }
  }, [studyStarted, id, cards.length]);

  // End study session on unmount or when navigating away
  useEffect(() => {
    return () => {
      if (sessionIdRef.current && id) {
        const cardsStudied = cardsViewedRef.current.size;
        endStudySession(sessionIdRef.current, cardsStudied).catch((err) =>
          console.error("Failed to end study session:", err)
        );
        sessionIdRef.current = null;
      }
    };
  }, [id]);

  // Track cards viewed
  useEffect(() => {
    if (studyStarted && cards.length > 0) {
      cardsViewedRef.current.add(currentIndex);
    }
  }, [currentIndex, studyStarted, cards.length]);

  // Filter cards based on selected tags
  const filteredCards = useMemo(() => {
    if (selectedTagFilters.length === 0) return allCards;

    return allCards.filter((card) => {
      const cardTagIds = card.tags.map((t) => t.id);
      if (tagFilterMode === "all") {
        return selectedTagFilters.every((tagId) => cardTagIds.includes(tagId));
      } else {
        return selectedTagFilters.some((tagId) => cardTagIds.includes(tagId));
      }
    });
  }, [allCards, selectedTagFilters, tagFilterMode]);

  const handleToggleTagFilter = (tagId: string) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleStartStudy = () => {
    const cardsToStudy = selectedTagFilters.length > 0 ? filteredCards : allCards;
    const shuffled = [...cardsToStudy].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setShowTagFilter(false);
    setStudyStarted(true);
  };

  const handleClearFilters = () => {
    setSelectedTagFilters([]);
    setTagFilterMode("any");
  };

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const handleFlip = useCallback(() => {
    if (!isAnimating) {
      setIsFlipped((f) => !f);
    }
  }, [isAnimating]);

  const animateToNext = useCallback(() => {
    if (isAnimating) return;

    if (currentIndex < cards.length - 1) {
      setIsAnimating(true);
      setIsFlipped(false);
      setExitTransform("translateX(-120%) rotate(-10deg)");

      setTimeout(() => {
        setShowCard(false);
        setCurrentIndex((prev) => prev + 1);
        setSwipeOffset(0);
        setExitTransform(null);

        requestAnimationFrame(() => {
          setShowCard(true);
          setIsAnimating(false);
        });
      }, 280);
    } else {
      setStudyComplete(true);
    }
  }, [currentIndex, cards.length, isAnimating]);

  const animateToPrevious = useCallback(() => {
    if (isAnimating) return;

    if (currentIndex > 0) {
      setIsAnimating(true);
      setIsFlipped(false);
      setExitTransform("translateX(120%) rotate(10deg)");

      setTimeout(() => {
        setShowCard(false);
        setCurrentIndex((prev) => prev - 1);
        setSwipeOffset(0);
        setExitTransform(null);

        requestAnimationFrame(() => {
          setShowCard(true);
          setIsAnimating(false);
        });
      }, 280);
    }
  }, [currentIndex, isAnimating]);

  const handleNext = useCallback(() => {
    animateToNext();
  }, [animateToNext]);

  const handlePrev = useCallback(() => {
    animateToPrevious();
  }, [animateToPrevious]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyComplete(false);
    setExitTransform(null);
    setSwipeOffset(0);
    setShowCard(true);
    // Reshuffle
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, [cards]);

  const handleChangeFilters = useCallback(() => {
    setStudyComplete(false);
    setStudyStarted(false);
    setShowTagFilter(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (studyComplete) return;
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
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handlePrev();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, studyComplete]);

  // Touch gesture handling
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isAnimating) return;
      touchCurrentX.current = null;
      touchStartX.current = e.targetTouches[0].clientX;
    },
    [isAnimating]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isAnimating || !touchStartX.current) return;
      touchCurrentX.current = e.targetTouches[0].clientX;
      const diff = touchCurrentX.current - touchStartX.current;
      setSwipeOffset(diff);
    },
    [isAnimating]
  );

  const onTouchEnd = useCallback(() => {
    if (!touchStartX.current || isAnimating) {
      setSwipeOffset(0);
      return;
    }

    const distance = swipeOffset;
    const isLeftSwipe = distance < -minSwipeDistance;
    const isRightSwipe = distance > minSwipeDistance;

    touchStartX.current = null;
    touchCurrentX.current = null;

    if (studyComplete) {
      setSwipeOffset(0);
      return;
    }

    if (isLeftSwipe && currentIndex < cards.length - 1) {
      animateToNext();
    } else if (isRightSwipe && currentIndex > 0) {
      animateToPrevious();
    } else {
      setSwipeOffset(0);
    }
  }, [studyComplete, currentIndex, cards.length, swipeOffset, isAnimating, animateToNext, animateToPrevious]);

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

  // Tag filter screen
  if (showTagFilter && !studyStarted) {
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
              <h1 className="text-xl font-bold text-[#fcfcfa] font-mono truncate max-w-[300px]">
                {deck?.name}
              </h1>
              <div className="w-24" />
            </div>
          </div>
        </div>

        {/* Tag Filter Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#403e41] rounded-2xl border border-[#5b595c] p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-[#fcfcfa] text-center mb-2">
              Study Session
            </h2>
            <p className="text-[#939293] text-center mb-6">
              Select tags to filter cards, or study all {allCards.length} cards
            </p>

            {/* Tag Filter Mode */}
            {selectedTagFilters.length > 1 && (
              <div className="flex justify-center mb-4">
                <div className="flex items-center bg-[#2d2a2e] rounded-lg p-0.5">
                  <button
                    onClick={() => setTagFilterMode("any")}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      tagFilterMode === "any"
                        ? "bg-[#ab9df2] text-[#2d2a2e] font-medium"
                        : "text-[#939293] hover:text-[#fcfcfa]"
                    }`}
                  >
                    Match Any
                  </button>
                  <button
                    onClick={() => setTagFilterMode("all")}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      tagFilterMode === "all"
                        ? "bg-[#ab9df2] text-[#2d2a2e] font-medium"
                        : "text-[#939293] hover:text-[#fcfcfa]"
                    }`}
                  >
                    Match All
                  </button>
                </div>
              </div>
            )}

            {/* Tag Chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTagFilter(tag.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTagFilters.includes(tag.id)
                      ? "bg-[#ab9df2] text-[#2d2a2e]"
                      : "bg-[#ab9df2]/20 text-[#ab9df2] hover:bg-[#ab9df2]/30"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>

            {/* Card count */}
            <p className="text-center text-[#939293] mb-6">
              {selectedTagFilters.length > 0 ? (
                <>
                  <span className="text-[#ffd866] font-semibold">{filteredCards.length}</span> cards match your filters
                </>
              ) : (
                <>
                  <span className="text-[#ffd866] font-semibold">{allCards.length}</span> cards total
                </>
              )}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartStudy}
                disabled={selectedTagFilters.length > 0 && filteredCards.length === 0}
                className="w-full px-6 py-3 bg-[#a9dc76] text-[#2d2a2e] rounded-lg hover:bg-[#a9dc76]/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedTagFilters.length > 0
                  ? `Study ${filteredCards.length} Cards`
                  : `Study All ${allCards.length} Cards`}
              </button>
              {selectedTagFilters.length > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="w-full px-6 py-3 border border-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/30 font-medium transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0 && studyStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#2d2a2e]">
        <div className="text-6xl mb-4">📭</div>
        <h1 className="text-xl font-semibold text-[#fcfcfa] mb-2">No cards to study</h1>
        <p className="text-[#939293] mb-6">
          {selectedTagFilters.length > 0
            ? "No cards match your selected tags"
            : "Add some cards to this deck first"}
        </p>
        <div className="flex gap-4">
          {selectedTagFilters.length > 0 && (
            <button
              onClick={handleChangeFilters}
              className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
            >
              Change Filters
            </button>
          )}
          <Link
            to={`/decks/${id}`}
            className="px-4 py-2 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 font-medium transition-colors"
          >
            Manage Deck
          </Link>
        </div>
      </div>
    );
  }

  if (allCards.length === 0) {
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
    <div
      className="h-full bg-[#2d2a2e] flex flex-col overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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
              <p className="text-sm text-[#939293]">
                {studyComplete ? "Complete!" : `Card ${currentIndex + 1} of ${cards.length}`}
              </p>
            </div>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Study Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto px-6 py-8 w-full overflow-hidden">
        {studyComplete ? (
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
                You've completed all {cards.length} cards{selectedTagFilters.length > 0 ? " matching your filters" : ""}.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
                >
                  Study Again
                </button>
                {tags.length > 0 && (
                  <button
                    onClick={handleChangeFilters}
                    className="px-6 py-3 bg-[#ab9df2] text-[#2d2a2e] rounded-lg hover:bg-[#ab9df2]/90 font-medium transition-colors"
                  >
                    Change Filters
                  </button>
                )}
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
          /* Flashcard */
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

            {/* Card Container with Swipe Animation */}
            <div
              className="flex-1 min-h-0 overflow-hidden"
              style={{ perspective: "1000px" }}
            >
              <div
                onClick={handleFlip}
                className={`w-full h-full cursor-pointer ${
                  showCard && !exitTransform && !swipeOffset ? "animate-slide-in" : ""
                }`}
                style={{
                  transform:
                    exitTransform ||
                    (swipeOffset
                      ? `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.02}deg)`
                      : undefined),
                  transition:
                    swipeOffset && !exitTransform
                      ? "none"
                      : "transform 0.28s ease-out, opacity 0.28s ease-out",
                  opacity: showCard ? 1 : 0,
                }}
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
                    <div className="mt-8 text-sm text-[#939293]">
                      Click or press Space to flip
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

            {/* Navigation */}
            <div className="mt-6 flex justify-between items-center flex-shrink-0">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-6 py-3 bg-[#403e41] border border-[#5b595c] rounded-lg hover:bg-[#5b595c]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-[#fcfcfa] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <button
                onClick={handleFlip}
                className="px-8 py-3 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
              >
                {isFlipped ? "Hide" : "Show"} Answer
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-3 bg-[#403e41] border border-[#5b595c] rounded-lg hover:bg-[#5b595c]/30 flex items-center gap-2 font-medium text-[#fcfcfa] transition-colors"
              >
                {currentIndex === cards.length - 1 ? "Finish" : "Next"}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Keyboard hints */}
            <div className="mt-8 text-center text-sm text-[#939293] flex-shrink-0">
              <div className="inline-flex items-center gap-6">
                <span>
                  <kbd className="px-2 py-1 bg-[#5b595c]/50 rounded text-xs text-[#fcfcfa]">Space</kbd> Flip
                </span>
                <span>
                  <kbd className="px-2 py-1 bg-[#5b595c]/50 rounded text-xs text-[#fcfcfa]">←</kbd> Previous
                </span>
                <span>
                  <kbd className="px-2 py-1 bg-[#5b595c]/50 rounded text-xs text-[#fcfcfa]">→</kbd> Next
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
