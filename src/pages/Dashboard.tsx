import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import type { Deck } from "@/types";
import { getAllDecks, importDeck } from "@/lib/db";
import { isTauri } from "@/lib/auth";

export function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      if (isTauri()) {
        const data = await getAllDecks();
        setDecks(data);
      }
    } catch (error) {
      console.error("Failed to load decks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setMessage(null);
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

      if (result.synced) {
        setMessage({
          type: "success",
          text: `Imported "${result.deck.name}" with ${result.cardsImported} cards`,
        });
      } else {
        setMessage({
          type: "success",
          text: `Imported "${result.deck.name}" with ${result.cardsImported} cards (pending sync)`,
        });
      }
      loadDecks();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Import failed",
      });
    } finally {
      setImporting(false);
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
    <div className="min-h-full bg-[#2d2a2e]">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 fade-in">
          {/* Message */}
          {message && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg ${
                message.type === "success"
                  ? "bg-[#a9dc76]/10 border border-[#a9dc76]/30 text-[#a9dc76]"
                  : "bg-[#ff6188]/10 border border-[#ff6188]/30 text-[#ff6188]"
              }`}
            >
              {message.text}
              <button
                onClick={() => setMessage(null)}
                className="float-right opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          )}

          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#fcfcfa] font-mono">My Decks</h2>
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
            <div className="text-center py-12">
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
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-xs mx-auto">
                <Link
                  to="/decks/new"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#2d2a2e] bg-[#ffd866] hover:bg-[#ffd866]/90 transition-colors"
                >
                  + New Deck
                </Link>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#fcfcfa] bg-[#5b595c] hover:bg-[#5b595c]/80 transition-colors disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import Deck"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => (
                <DeckCard key={deck.id} deck={deck} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DeckCard({ deck }: { deck: Deck }) {
  return (
    <div className="block bg-[#403e41] overflow-hidden rounded-xl border border-[#5b595c] hover:border-[#939293] transition-colors">
      <Link to={`/decks/${deck.id}`} className="block px-5 py-4">
        <div className="flex items-start justify-between mb-2">
          <div className="w-2 h-2 rounded-full bg-[#ffd866]" />
          {deck.syncStatus === "pending" ? (
            <span className="text-xs text-[#fc9867] font-mono">Pending sync</span>
          ) : (
            <span className="text-xs text-[#939293] font-mono">
              {new Date(deck.createdAt).toLocaleDateString()}
            </span>
          )}
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
      </div>
    </div>
  );
}
