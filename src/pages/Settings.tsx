import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useAuth } from "@/context/AuthContext";
import { importDeck, exportDeck, syncPending, getPendingCount, getAllDecks } from "@/lib/db";
import type { Deck } from "@/types";

export function Settings() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadPendingCount();
    loadDecks();
  }, []);

  const loadPendingCount = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error("Failed to get pending count:", error);
    }
  };

  const loadDecks = async () => {
    try {
      const data = await getAllDecks();
      setDecks(data);
    } catch (error) {
      console.error("Failed to load decks:", error);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
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
          text: `Imported "${result.deck.name}" with ${result.cardsImported} cards (synced to server)`,
        });
      } else {
        setMessage({
          type: "success",
          text: `Imported "${result.deck.name}" with ${result.cardsImported} cards (pending sync)`,
        });
        loadPendingCount();
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

  const handleExport = async (deck: Deck) => {
    setMessage(null);
    setExporting(true);

    try {
      const exportData = await exportDeck(deck.id);

      const filePath = await save({
        defaultPath: `${deck.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      await writeTextFile(filePath, JSON.stringify(exportData, null, 2));

      setMessage({
        type: "success",
        text: `Exported "${deck.name}" successfully`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSync = async () => {
    setMessage(null);
    setSyncing(true);

    try {
      const syncedCount = await syncPending();
      setMessage({
        type: "success",
        text: `Synced ${syncedCount} items to server`,
      });
      loadPendingCount();
      loadDecks();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto fade-in">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg ${
            message.type === "success"
              ? "bg-green/10 border border-green text-green"
              : "bg-pink/10 border border-pink text-pink"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Account Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green/10 border border-green/30 rounded-lg">
            <div>
              <p className="font-medium text-green">Signed In</p>
              <p className="text-sm text-foreground-dim">{session?.email}</p>
            </div>
            <div className="w-3 h-3 bg-green rounded-full" />
          </div>

          <div className="pt-4 border-t border-background-lighter">
            <button
              onClick={handleLogout}
              className="btn btn-danger"
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
            <p className="text-xs text-foreground-dim mt-2">
              This will clear your local session. Your data remains on the
              server.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {pendingCount > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Sync Status</h2>

          <div className="flex items-center justify-between p-4 bg-orange/10 border border-orange/30 rounded-lg">
            <div>
              <p className="font-medium text-orange">Pending Changes</p>
              <p className="text-sm text-foreground-dim">
                {pendingCount} {pendingCount === 1 ? "item" : "items"} waiting to sync
              </p>
            </div>
            <button
              onClick={handleSync}
              className="btn btn-primary"
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
      )}

      {/* Data Management */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>

        <div className="space-y-4">
          <div>
            <button
              onClick={handleImport}
              className="btn btn-secondary w-full"
              disabled={importing}
            >
              {importing ? "Importing..." : "Import Deck"}
            </button>
            <p className="text-xs text-foreground-dim mt-2">
              Import a deck from a JSON file. Works offline - will sync when connected.
            </p>
          </div>

          {decks.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground-dim mb-2">Export a deck:</p>
              <div className="space-y-2">
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => handleExport(deck)}
                    className="btn btn-secondary w-full text-left flex items-center justify-between"
                    disabled={exporting}
                  >
                    <span>{deck.name}</span>
                    <span className="text-xs text-foreground-dim">Export</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">About Kioku Desktop</h2>
        <p className="text-foreground-dim text-sm">Version 0.1.0</p>
        <p className="text-foreground-dim text-sm mt-2">
          A flashcard study app with offline support. Your decks sync with your
          Kioku account and are cached locally for offline studying.
        </p>
      </div>
    </div>
  );
}
