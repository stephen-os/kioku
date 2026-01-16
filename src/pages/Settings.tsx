import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useAuth } from "@/context/AuthContext";
import { importDeck, exportDeck, getAllDecks } from "@/lib/db";
import type { Deck } from "@/types";

export function Settings() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadDecks();
  }, []);

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

      setMessage({
        type: "success",
        text: `Imported "${result.deck.name}" with ${result.cardsImported} cards`,
      });
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

  return (
    <div className="min-h-full bg-[#2d2a2e]">
      <main className="max-w-3xl mx-auto py-6 px-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold text-[#fcfcfa] font-mono mb-6">Settings</h1>

          {message && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg ${
                message.type === "success"
                  ? "bg-[#a9dc76]/10 border border-[#a9dc76]/30 text-[#a9dc76]"
                  : "bg-[#ff6188]/10 border border-[#ff6188]/30 text-[#ff6188]"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Account Section */}
          <section className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#fcfcfa] mb-4">Account</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#a9dc76]/10 border border-[#a9dc76]/30 rounded-lg">
                <div>
                  <p className="font-medium text-[#a9dc76]">Signed In</p>
                  <p className="text-sm text-[#939293]">{session?.email}</p>
                </div>
                <div className="w-3 h-3 bg-[#a9dc76] rounded-full" />
              </div>

              <div className="pt-4 border-t border-[#5b595c]">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#ff6188] text-[#2d2a2e] rounded-lg hover:bg-[#ff6188]/90 font-medium transition-colors disabled:opacity-50"
                  disabled={loggingOut}
                >
                  {loggingOut ? "Signing out..." : "Sign Out"}
                </button>
                <p className="text-xs text-[#939293] mt-2">
                  This will clear your local session. Your data remains on the
                  server.
                </p>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#fcfcfa] mb-4">Data Management</h2>

            <div className="space-y-4">
              <div>
                <button
                  onClick={handleImport}
                  className="w-full px-4 py-2.5 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 font-medium transition-colors disabled:opacity-50"
                  disabled={importing}
                >
                  {importing ? "Importing..." : "Import Deck"}
                </button>
                <p className="text-xs text-[#939293] mt-2">
                  Import a deck from a JSON file.
                </p>
              </div>

              {decks.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[#939293] mb-2">Export a deck:</p>
                  <div className="space-y-2">
                    {decks.map((deck) => (
                      <button
                        key={deck.id}
                        onClick={() => handleExport(deck)}
                        className="w-full px-4 py-2.5 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 transition-colors disabled:opacity-50 flex items-center justify-between"
                        disabled={exporting}
                      >
                        <span>{deck.name}</span>
                        <span className="text-xs text-[#939293]">Export</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* About */}
          <section className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6">
            <h2 className="text-lg font-semibold text-[#fcfcfa] mb-2">About Kioku Desktop</h2>
            <p className="text-[#939293] text-sm">Version 0.1.0</p>
            <p className="text-[#939293] text-sm mt-2">
              A flashcard study app. Your decks sync with your Kioku account.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
