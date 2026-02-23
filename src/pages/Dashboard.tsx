import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import type { Deck } from "@/types";
import { getAllDecks, importDeck, deleteDeck } from "@/lib/db";
import { DropZone } from "@/components/DropZone";
import { useToast } from "@/context/ToastContext";

export function Dashboard() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const loadDecks = useCallback(async (): Promise<void> => {
    try {
      const data = await getAllDecks();
      setDecks(data);
    } catch (error) {
      console.error("Failed to load decks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleImport = async (): Promise<void> => {
    setImporting(true);

    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!filePath) {
        setImporting(false);
        return;
      }

      const result = await importDeck(filePath as string);
      toast.success(`Imported "${result.deck.name}" with ${result.cardsImported} cards`);
      navigate(`/decks/${result.deck.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleFileDrop = useCallback(async (filePath: string): Promise<void> => {
    setImporting(true);

    try {
      const result = await importDeck(filePath);
      toast.success(`Imported "${result.deck.name}" with ${result.cardsImported} cards`);
      navigate(`/decks/${result.deck.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [navigate, toast]);

  const handleDelete = async (deckId: string): Promise<void> => {
    setDeletingId(deckId);
    try {
      await deleteDeck(deckId);
      toast.success("Deck deleted");
      loadDecks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete deck");
    } finally {
      setDeletingId(null);
    }
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

  return (
    <DropZone
      onFileDrop={handleFileDrop}
      disabled={importing}
      label="Drop deck file to import"
    >
      <div className="min-h-full bg-[#2d2a2e]">
        <main className="max-w-7xl mx-auto py-6 px-6">
          <div className="fade-in">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#fcfcfa] font-mono">Decks</h2>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:min-w-[300px]">
              <button
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#fcfcfa] bg-[#5b595c] hover:bg-[#5b595c]/80 transition-colors disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import Deck"}
              </button>
              <Link
                to="/decks/new"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#2d2a2e] bg-[#ffd866] hover:bg-[#ffd866]/90 transition-colors"
              >
                + New Deck
              </Link>
            </div>
          </div>

          {/* Decks Grid */}
          {decks.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
              <div className="text-center">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-[#fcfcfa]">No decks</h3>
                <p className="mt-1 text-sm text-[#939293]">
                  Get started by creating a new deck or importing one.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onDelete={() => handleDelete(deck.id)}
                  isDeleting={deletingId === deck.id}
                />
              ))}
            </div>
          )}
          </div>
        </main>
      </div>
    </DropZone>
  );
}

interface DeckCardProps {
  deck: Deck;
  onDelete: () => void;
  isDeleting: boolean;
}

function DeckCard({ deck, onDelete, isDeleting }: DeckCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="block bg-[#403e41] overflow-hidden rounded-xl border border-[#5b595c] hover:border-[#939293] transition-colors">
      <Link to={`/decks/${deck.id}`} className="block px-5 py-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-[#78dce8]/20 text-[#78dce8]">
              {deck.cardCount ?? 0} cards
            </span>
            {deck.shuffleCards && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#ab9df2]/20 text-[#ab9df2]">
                Shuffle
              </span>
            )}
          </div>
          <span className="text-xs text-[#939293] font-mono">
            {new Date(deck.createdAt).toLocaleDateString()}
          </span>
        </div>
        <h3 className="text-base font-medium text-[#fcfcfa] truncate">
          {deck.name}
        </h3>
        <p className="mt-1 text-sm text-[#939293] line-clamp-2">
          {deck.description || "No description"}
        </p>
      </Link>
      <div className="px-5 pb-4 flex gap-2">
        <Link
          to={`/decks/${deck.id}/study`}
          className="flex-1 text-center px-3 py-2 bg-[#a9dc76]/20 text-[#a9dc76] text-sm rounded-lg hover:bg-[#a9dc76]/30 transition-colors font-medium"
        >
          Study
        </Link>
        <Link
          to={`/decks/${deck.id}`}
          className="flex-1 text-center px-3 py-2 bg-[#ffd866]/20 text-[#ffd866] text-sm rounded-lg hover:bg-[#ffd866]/30 transition-colors font-medium"
        >
          Manage
        </Link>
        {showDeleteConfirm ? (
          <div className="flex gap-1">
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="px-2 py-2 bg-[#ff6188] text-[#2d2a2e] text-sm rounded-lg hover:bg-[#ff6188]/90 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "..." : "Yes"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-2 bg-[#5b595c] text-[#fcfcfa] text-sm rounded-lg hover:bg-[#5b595c]/80 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 text-[#ff6188] hover:bg-[#ff6188]/10 rounded-lg transition-colors"
            title="Delete deck"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
