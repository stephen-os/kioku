import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { Deck, Card, Tag, CreateCardRequest, UpdateCardRequest } from "@/types";
import { CODE_LANGUAGE_LABELS } from "@/types";
import { getDeck, getCardsForDeck, getTagsForDeck, createCard, updateCard, deleteCard, deleteDeck } from "@/lib/db";
import { isTauri } from "@/lib/auth";
import { CardModal } from "@/components/CardModal";

type FilterLogic = "AND" | "OR";

export function DeckView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>("OR");
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Deck actions state
  const [showDeckMenu, setShowDeckMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  useEffect(() => {
    loadDeckData();
  }, [id]);

  const loadDeckData = async () => {
    if (!id) return;
    try {
      if (isTauri()) {
        const [deckData, cardsData, tagsData] = await Promise.all([
          getDeck(id),
          getCardsForDeck(id),
          getTagsForDeck(id),
        ]);
        setDeck(deckData);
        setCards(cardsData);
        setTags(tagsData);
      }
    } catch (error) {
      console.error("Failed to load deck:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter cards based on search and tags
  const filteredCards = useMemo(() => {
    let result = cards;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (card) =>
          card.front.toLowerCase().includes(query) ||
          card.back.toLowerCase().includes(query) ||
          (card.notes && card.notes.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter((card) => {
        const cardTagIds = card.tags.map((t) => t.id);
        if (filterLogic === "AND") {
          return selectedTags.every((tagId) => cardTagIds.includes(tagId));
        } else {
          return selectedTags.some((tagId) => cardTagIds.includes(tagId));
        }
      });
    }

    return result;
  }, [cards, searchQuery, selectedTags, filterLogic]);

  const handleCreateCard = () => {
    setSelectedCard(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleViewCard = (card: Card) => {
    setSelectedCard(card);
    setModalMode("view");
    setModalOpen(true);
  };

  const handleSaveCard = async (request: CreateCardRequest | UpdateCardRequest) => {
    if (!id) return;

    if (modalMode === "create") {
      const newCard = await createCard(id, request as CreateCardRequest);
      setCards((prev) => [...prev, newCard]);
    } else if (selectedCard) {
      const updatedCard = await updateCard(selectedCard.id, id, request as UpdateCardRequest);
      setCards((prev) =>
        prev.map((c) => (c.id === selectedCard.id ? updatedCard : c))
      );
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!id) return;
    await deleteCard(cardId, id);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleDeleteDeck = async () => {
    if (!id) return;
    setDeletingDeck(true);
    try {
      await deleteDeck(id);
      navigate("/");
    } catch (error) {
      console.error("Failed to delete deck:", error);
    } finally {
      setDeletingDeck(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-64 rounded mb-4" />
        <div className="skeleton h-4 w-48 rounded mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-semibold text-pink">Deck not found</h1>
        <Link to="/" className="text-cyan hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-foreground-dim mb-1">
            <Link to="/" className="hover:text-foreground">
              Decks
            </Link>
            <span>/</span>
            <span className="text-foreground">{deck.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && (
            <p className="text-foreground-dim mt-1">{deck.description}</p>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <Link to={`/decks/${id}/study`} className="btn btn-primary">
            Study
          </Link>

          {/* Deck menu */}
          <div className="relative">
            <button
              onClick={() => setShowDeckMenu(!showDeckMenu)}
              className="btn btn-secondary p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showDeckMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDeckMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-background-light border border-background-lighter rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      // TODO: Edit deck
                      setShowDeckMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-background-lighter"
                  >
                    Edit Deck
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowDeckMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-pink hover:bg-background-lighter"
                  >
                    Delete Deck
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-pink/10 border border-pink rounded-lg">
          <p className="text-pink font-medium mb-2">Delete this deck?</p>
          <p className="text-sm text-foreground-dim mb-4">
            This will permanently delete "{deck.name}" and all {cards.length} cards. This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteDeck}
              disabled={deletingDeck}
              className="btn btn-danger text-sm"
            >
              {deletingDeck ? "Deleting..." : "Yes, Delete Deck"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-dim"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="input pl-10 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          {tags.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters || selectedTags.length > 0 ? "btn-primary" : "btn-secondary"}`}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
              {selectedTags.length > 0 && (
                <span className="ml-1 bg-background text-xs px-1.5 py-0.5 rounded">
                  {selectedTags.length}
                </span>
              )}
            </button>
          )}

          {/* Add Card Button */}
          <button onClick={handleCreateCard} className="btn btn-primary">
            + Add Card
          </button>
        </div>

        {/* Tag Filters */}
        {showFilters && tags.length > 0 && (
          <div className="p-4 bg-background-light border border-background-lighter rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground-dim">Filter by tags:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground-dim">Match:</span>
                <button
                  onClick={() => setFilterLogic("OR")}
                  className={`text-xs px-2 py-1 rounded ${
                    filterLogic === "OR"
                      ? "bg-purple text-background"
                      : "bg-background-lighter text-foreground-dim"
                  }`}
                >
                  Any (OR)
                </button>
                <button
                  onClick={() => setFilterLogic("AND")}
                  className={`text-xs px-2 py-1 rounded ${
                    filterLogic === "AND"
                      ? "bg-purple text-background"
                      : "bg-background-lighter text-foreground-dim"
                  }`}
                >
                  All (AND)
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`text-sm px-3 py-1 rounded-full transition-colors ${
                    selectedTags.includes(tag.id)
                      ? "bg-purple text-background"
                      : "bg-purple/20 text-purple hover:bg-purple/30"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-sm text-foreground-dim hover:text-foreground"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cards Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {searchQuery || selectedTags.length > 0
            ? `${filteredCards.length} of ${cards.length} cards`
            : `${cards.length} cards`}
        </h2>
      </div>

      {/* Cards List */}
      {cards.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-foreground-dim mb-4">No cards in this deck yet</p>
          <button onClick={handleCreateCard} className="btn btn-primary">
            Add Your First Card
          </button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-foreground-dim mb-2">No cards match your search</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedTags([]);
            }}
            className="text-cyan hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onClick={() => handleViewCard(card)}
            />
          ))}
        </div>
      )}

      {/* Card Modal */}
      <CardModal
        card={selectedCard}
        deckId={id || ""}
        tags={tags}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        mode={modalMode}
      />
    </div>
  );
}

function CardRow({ card, onClick }: { card: Card; onClick: () => void }) {
  const isCodeFront = card.frontType === "CODE";
  const isCodeBack = card.backType === "CODE";

  return (
    <div
      className="card hover:border-yellow cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isCodeFront && (
              <span className="text-xs bg-cyan/20 text-cyan px-1.5 py-0.5 rounded">
                {CODE_LANGUAGE_LABELS[card.frontLanguage || "PLAINTEXT"]}
              </span>
            )}
          </div>
          <p className={`text-foreground truncate ${isCodeFront ? "font-mono text-sm" : ""}`}>
            {card.front}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {isCodeBack && (
              <span className="text-xs bg-green/20 text-green px-1.5 py-0.5 rounded">
                {CODE_LANGUAGE_LABELS[card.backLanguage || "PLAINTEXT"]}
              </span>
            )}
          </div>
          <p className={`text-foreground-dim text-sm truncate mt-1 ${isCodeBack ? "font-mono" : ""}`}>
            {card.back}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {card.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap justify-end">
              {card.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs bg-purple/20 text-purple px-2 py-0.5 rounded"
                >
                  {tag.name}
                </span>
              ))}
              {card.tags.length > 3 && (
                <span className="text-xs text-foreground-dim">
                  +{card.tags.length - 3}
                </span>
              )}
            </div>
          )}
          <svg
            className="w-5 h-5 text-foreground-dim"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
