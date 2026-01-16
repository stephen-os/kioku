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
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-6 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      {/* Message */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg ${
            message.type === "success"
              ? "bg-green/10 border border-green text-green"
              : "bg-pink/10 border border-pink text-pink"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Decks</h1>
          <p className="text-foreground-dim">
            {decks.length === 0
              ? "Create your first deck to get started"
              : `${decks.length} deck${decks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn btn-secondary"
          >
            {importing ? "Importing..." : "Import Deck"}
          </button>
          <Link to="/decks/new" className="btn btn-primary">
            + New Deck
          </Link>
        </div>
      </div>

      {/* Decks Grid */}
      {decks.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold mb-2">No decks yet</h2>
          <p className="text-foreground-dim mb-6">
            Create your first deck or import one to start studying
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn btn-secondary"
            >
              {importing ? "Importing..." : "Import Deck"}
            </button>
            <Link to="/decks/new" className="btn btn-primary inline-block">
              Create Deck
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckCard({ deck }: { deck: Deck }) {
  return (
    <div className="card hover:border-yellow transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg text-foreground group-hover:text-yellow transition-colors">
          {deck.name}
        </h3>
        {deck.syncStatus === "pending" && (
          <span className="text-xs text-orange bg-orange/10 px-2 py-0.5 rounded">
            Pending sync
          </span>
        )}
      </div>

      {deck.description && (
        <p className="text-foreground-dim text-sm mb-4 line-clamp-2">
          {deck.description}
        </p>
      )}

      <div className="flex gap-2 mt-auto">
        <Link
          to={`/decks/${deck.id}/study`}
          className="btn btn-primary flex-1 text-center text-sm"
        >
          Study
        </Link>
        <Link
          to={`/decks/${deck.id}`}
          className="btn btn-secondary flex-1 text-center text-sm"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}
