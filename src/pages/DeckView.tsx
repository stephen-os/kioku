import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { Deck, Card, Tag, CreateCardRequest, UpdateCardRequest } from "@/types";
import { CODE_LANGUAGE_LABELS } from "@/types";
import { getDeck, getCardsForDeck, getTagsForDeck, createCard, updateCard, deleteCard, deleteDeck } from "@/lib/db";
import { isTauri } from "@/lib/auth";
import { CardModal } from "@/components/CardModal";
import { CodeBlock } from "@/components/CodeEditor";

type FilterLogic = "any" | "all";

export function DeckView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<FilterLogic>("any");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Add card form visibility
  const [showAddCard, setShowAddCard] = useState(false);

  // Deck actions state
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
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (card) =>
          card.front.toLowerCase().includes(term) ||
          card.back.toLowerCase().includes(term) ||
          (card.notes && card.notes.toLowerCase().includes(term))
      );
    }

    // Tag filter
    if (selectedTagFilters.length > 0) {
      result = result.filter((card) => {
        const cardTagIds = card.tags.map((t) => t.id);
        if (tagFilterMode === "all") {
          return selectedTagFilters.every((tagId) => cardTagIds.includes(tagId));
        } else {
          return selectedTagFilters.some((tagId) => cardTagIds.includes(tagId));
        }
      });
    }

    return result;
  }, [cards, searchTerm, selectedTagFilters, tagFilterMode]);

  const hasActiveFilters = searchTerm.trim() !== "" || selectedTagFilters.length > 0;

  const handleEditCard = (card: Card) => {
    setSelectedCard(card);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleSaveCard = async (request: CreateCardRequest | UpdateCardRequest) => {
    if (!id) return;

    if (modalMode === "create") {
      const newCard = await createCard(id, request as CreateCardRequest);
      setCards((prev) => [...prev, newCard]);
      setShowAddCard(false);
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

  const handleToggleTagFilter = (tagId: string) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTagFilters([]);
    setTagFilterMode("any");
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#2d2a2e]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#ffd866] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#939293]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#2d2a2e]">
        <p className="text-[#939293]">Deck not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#2d2a2e]">
      <main className="max-w-7xl mx-auto py-6 px-6">
        <div className="fade-in">
          {/* Deck Header */}
          <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#fcfcfa] font-mono mb-2">{deck.name}</h1>
                <p className="text-[#939293]">{deck.description || "No description"}</p>
                <div className="mt-4 flex items-center space-x-4 text-sm text-[#939293]">
                  <span className="text-[#ffd866]">{cards.length} cards</span>
                  <span>Created {new Date(deck.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:w-auto">
                <Link
                  to={`/decks/${id}/study`}
                  className="px-4 py-2 bg-[#a9dc76] text-[#2d2a2e] rounded-lg hover:bg-[#a9dc76]/90 font-medium text-sm transition-colors text-center"
                >
                  Study
                </Link>
                <button
                  onClick={() => setShowAddCard(!showAddCard)}
                  className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium text-sm transition-colors text-center"
                >
                  + Add Card
                </button>
                <Link
                  to={`/decks/${id}/edit`}
                  className="px-4 py-2 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 font-medium text-sm transition-colors text-center"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-[#ff6188] text-[#2d2a2e] rounded-lg hover:bg-[#ff6188]/90 font-medium text-sm transition-colors text-center"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="mb-6 bg-[#ff6188]/10 border border-[#ff6188]/30 rounded-lg p-4">
              <p className="text-[#ff6188] font-medium mb-2">Delete this deck?</p>
              <p className="text-sm text-[#939293] mb-4">
                This will permanently delete "{deck.name}" and all {cards.length} cards. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteDeck}
                  disabled={deletingDeck}
                  className="px-4 py-2 bg-[#ff6188] text-[#2d2a2e] rounded-lg hover:bg-[#ff6188]/90 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {deletingDeck ? "Deleting..." : "Yes, Delete Deck"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/30 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-4 mb-6">
            {/* Search Input */}
            <div>
              <input
                type="text"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors"
              />
            </div>

            {/* Filter Action Buttons */}
            {hasActiveFilters && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={clearFilters}
                  className="w-40 px-3 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium text-sm transition-colors text-center"
                >
                  Clear
                </button>
                <Link
                  to={`/decks/${id}/study`}
                  className="w-40 px-3 py-2 bg-[#a9dc76] text-[#2d2a2e] rounded-lg hover:bg-[#a9dc76]/90 font-medium text-sm transition-colors text-center"
                >
                  Study Filtered ({filteredCards.length})
                </Link>
              </div>
            )}

            {/* Tag Filter Section */}
            {tags.length > 0 && (
              <div className="pt-4 mt-4 border-t border-[#5b595c]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#939293]">Tags:</span>

                  {/* Tag Mode Toggle - only show when 2+ tags selected */}
                  {selectedTagFilters.length > 1 && (
                    <div className="flex items-center bg-[#2d2a2e] rounded-lg p-0.5 mr-2">
                      <button
                        onClick={() => setTagFilterMode("any")}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          tagFilterMode === "any"
                            ? "bg-[#ab9df2] text-[#2d2a2e] font-medium"
                            : "text-[#939293] hover:text-[#fcfcfa]"
                        }`}
                      >
                        Any
                      </button>
                      <button
                        onClick={() => setTagFilterMode("all")}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          tagFilterMode === "all"
                            ? "bg-[#ab9df2] text-[#2d2a2e] font-medium"
                            : "text-[#939293] hover:text-[#fcfcfa]"
                        }`}
                      >
                        All
                      </button>
                    </div>
                  )}

                  {/* Tag Chips */}
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTagFilter(tag.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedTagFilters.includes(tag.id)
                          ? "bg-[#ab9df2] text-[#2d2a2e]"
                          : "bg-[#ab9df2]/20 text-[#ab9df2] hover:bg-[#ab9df2]/30"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add Card Form */}
          {showAddCard && (
            <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 mb-6">
              <h2 className="text-lg font-semibold text-[#fcfcfa] mb-4">Add New Card</h2>
              <AddCardForm
                onSave={handleSaveCard}
                onCancel={() => setShowAddCard(false)}
              />
            </div>
          )}

          {/* Cards List */}
          {filteredCards.length === 0 ? (
            <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-[#5b595c]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-[#fcfcfa]">
                {hasActiveFilters ? "No cards found" : "No cards yet"}
              </h3>
              <p className="mt-1 text-sm text-[#939293]">
                {hasActiveFilters
                  ? "Try adjusting your search or filter"
                  : "Get started by adding your first flashcard"}
              </p>
              {!hasActiveFilters && (
                <button
                  onClick={() => setShowAddCard(true)}
                  className="mt-4 px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
                >
                  + Add Card
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#403e41] rounded-xl border border-[#5b595c] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#5b595c]">
                <h2 className="text-lg font-semibold text-[#fcfcfa]">
                  Cards ({filteredCards.length}{hasActiveFilters ? ` of ${cards.length}` : ""})
                  {searchTerm && (
                    <span className="text-sm font-normal text-[#939293] ml-2">
                      matching "{searchTerm}"
                    </span>
                  )}
                  {selectedTagFilters.length > 0 && (
                    <span className="text-sm font-normal text-[#939293] ml-2">
                      {selectedTagFilters.length === 1
                        ? `tagged "${tags.find((t) => t.id === selectedTagFilters[0])?.name}"`
                        : `${selectedTagFilters.length} tags (${tagFilterMode})`}
                    </span>
                  )}
                </h2>
              </div>
              <div className="divide-y divide-[#5b595c]">
                {filteredCards.map((card) => (
                  <CardRow
                    key={card.id}
                    card={card}
                    onEdit={() => handleEditCard(card)}
                    onDelete={() => handleDeleteCard(card.id)}
                  />
                ))}
              </div>
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
      </main>
    </div>
  );
}

function CardRow({
  card,
  onEdit,
  onDelete,
}: {
  card: Card;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isCodeFront = card.frontType === "CODE";
  const isCodeBack = card.backType === "CODE";

  // Truncate code to first few lines for preview
  const truncateCode = (code: string, maxLines: number = 3) => {
    const lines = code.split("\n");
    if (lines.length <= maxLines) return code;
    return lines.slice(0, maxLines).join("\n") + "\n...";
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="px-6 py-4 hover:bg-[#5b595c]/10 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Front */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[#939293] uppercase tracking-wider">Front</span>
                {isCodeFront && (
                  <span className="text-xs bg-[#78dce8]/20 text-[#78dce8] px-1.5 py-0.5 rounded">
                    {CODE_LANGUAGE_LABELS[card.frontLanguage || "PLAINTEXT"]}
                  </span>
                )}
              </div>
              {isCodeFront ? (
                <div className="max-h-24 overflow-hidden rounded-lg">
                  <CodeBlock
                    code={truncateCode(card.front)}
                    language={card.frontLanguage}
                  />
                </div>
              ) : (
                <div className="text-[#fcfcfa] line-clamp-3 whitespace-pre-wrap">
                  {card.front}
                </div>
              )}
            </div>

            {/* Back */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[#939293] uppercase tracking-wider">Back</span>
                {isCodeBack && (
                  <span className="text-xs bg-[#78dce8]/20 text-[#78dce8] px-1.5 py-0.5 rounded">
                    {CODE_LANGUAGE_LABELS[card.backLanguage || "PLAINTEXT"]}
                  </span>
                )}
              </div>
              {isCodeBack ? (
                <div className="max-h-24 overflow-hidden rounded-lg">
                  <CodeBlock
                    code={truncateCode(card.back)}
                    language={card.backLanguage}
                  />
                </div>
              ) : (
                <div className="text-[#fcfcfa] line-clamp-3 whitespace-pre-wrap">
                  {card.back}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {card.notes && (
            <div className="mt-3">
              <div className="text-xs text-[#939293] uppercase tracking-wider mb-1">Notes</div>
              <div className="text-sm text-[#939293] line-clamp-1">{card.notes}</div>
            </div>
          )}

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ab9df2]/20 text-[#ab9df2]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="mt-3 p-3 bg-[#ff6188]/10 border border-[#ff6188]/30 rounded-lg">
              <p className="text-sm text-[#ff6188] mb-2">Delete this card?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 bg-[#ff6188] text-[#2d2a2e] rounded text-sm font-medium hover:bg-[#ff6188]/90 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 border border-[#5b595c] text-[#fcfcfa] rounded text-sm hover:bg-[#5b595c]/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="ml-4 flex-shrink-0 flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-[#78dce8] hover:text-[#ffd866] transition-colors p-1.5"
            title="Edit card"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[#ff6188] hover:text-[#ff6188]/80 transition-colors p-1.5"
            title="Delete card"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCardForm({
  onSave,
  onCancel,
}: {
  onSave: (request: CreateCardRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    setSaving(true);
    try {
      await onSave({
        front: front.trim(),
        back: back.trim(),
        frontType: "TEXT",
        backType: "TEXT",
        notes: notes.trim() || undefined,
      });
      setFront("");
      setBack("");
      setNotes("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#939293] uppercase tracking-wider mb-1.5">
          Front
        </label>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="e.g., What is the syntax for...?"
          required
          rows={3}
          className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#939293] uppercase tracking-wider mb-1.5">
          Back
        </label>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="e.g., The answer or code example"
          required
          rows={3}
          className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#939293] uppercase tracking-wider mb-1.5">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes or hints"
          rows={2}
          className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors resize-none"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-[#5b595c] rounded-lg text-[#fcfcfa] hover:bg-[#5b595c]/30 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 disabled:opacity-50 font-medium transition-colors"
        >
          {saving ? "Adding..." : "Add Card"}
        </button>
      </div>
    </form>
  );
}
