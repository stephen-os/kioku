import { useState, useEffect } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, writeFile } from "@tauri-apps/plugin-fs";
import JSZip from "jszip";
import { getAllDecks, getAllQuizzes, exportDeck, exportQuiz } from "@/lib/db";
import { useToast } from "@/context/ToastContext";
import { getDeckFilename, getQuizFilename, getBulkExportFilename } from "@/lib/slug";
import type { Deck, Quiz } from "@/types";

export function Export() {
  const toast = useToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedDecks, setSelectedDecks] = useState<Set<string>>(new Set());
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [decksData, quizzesData] = await Promise.all([
          getAllDecks(),
          getAllQuizzes(),
        ]);
        setDecks(decksData);
        setQuizzes(quizzesData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleDeck = (id: string) => {
    setSelectedDecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleQuiz = (id: string) => {
    setSelectedQuizzes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllDecks = () => {
    if (selectedDecks.size === decks.length) {
      setSelectedDecks(new Set());
    } else {
      setSelectedDecks(new Set(decks.map((d) => d.id)));
    }
  };

  const selectAllQuizzes = () => {
    if (selectedQuizzes.size === quizzes.length) {
      setSelectedQuizzes(new Set());
    } else {
      setSelectedQuizzes(new Set(quizzes.map((q) => q.id)));
    }
  };

  const handleExportSingleDeck = async (deck: Deck) => {
    setExporting(true);

    try {
      const exportData = await exportDeck(deck.id);

      const filePath = await save({
        defaultPath: getDeckFilename(deck.name),
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      await writeTextFile(filePath, exportData);

      toast.success(`Exported "${deck.name}" successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingleQuiz = async (quiz: Quiz) => {
    setExporting(true);

    try {
      const exportData = await exportQuiz(quiz.id);

      const filePath = await save({
        defaultPath: getQuizFilename(quiz.name),
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      await writeTextFile(filePath, exportData);

      toast.success(`Exported "${quiz.name}" successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedDecks.size === 0 && selectedQuizzes.size === 0) {
      toast.error("No items selected for export");
      return;
    }

    // If only one item selected, export as single file
    const totalSelected = selectedDecks.size + selectedQuizzes.size;
    if (totalSelected === 1) {
      if (selectedDecks.size === 1) {
        const deckId = Array.from(selectedDecks)[0];
        const deck = decks.find((d) => d.id === deckId);
        if (deck) {
          await handleExportSingleDeck(deck);
          setSelectedDecks(new Set());
          return;
        }
      } else {
        const quizId = Array.from(selectedQuizzes)[0];
        const quiz = quizzes.find((q) => q.id === quizId);
        if (quiz) {
          await handleExportSingleQuiz(quiz);
          setSelectedQuizzes(new Set());
          return;
        }
      }
    }

    setExporting(true);

    try {
      const zip = new JSZip();

      // Export selected decks into decks/ folder
      const deckPromises = Array.from(selectedDecks).map(async (id) => {
        const deck = decks.find((d) => d.id === id);
        if (!deck) return;
        const data = await exportDeck(id);
        zip.file(`decks/${getDeckFilename(deck.name)}`, data);
      });

      // Export selected quizzes into quizzes/ folder
      const quizPromises = Array.from(selectedQuizzes).map(async (id) => {
        const quiz = quizzes.find((q) => q.id === id);
        if (!quiz) return;
        const data = await exportQuiz(id);
        zip.file(`quizzes/${getQuizFilename(quiz.name)}`, data);
      });

      await Promise.all([...deckPromises, ...quizPromises]);

      const filePath = await save({
        defaultPath: getBulkExportFilename(),
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      const zipData = await zip.generateAsync({ type: "uint8array" });
      await writeFile(filePath, zipData);

      toast.success(`Exported ${selectedDecks.size} deck(s) and ${selectedQuizzes.size} quiz(zes) successfully`);

      // Clear selection after successful export
      setSelectedDecks(new Set());
      setSelectedQuizzes(new Set());
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (decks.length === 0 && quizzes.length === 0) {
      toast.error("No items to export");
      return;
    }

    setExporting(true);

    try {
      const zip = new JSZip();

      // Export all decks into decks/ folder
      const deckPromises = decks.map(async (deck) => {
        const data = await exportDeck(deck.id);
        zip.file(`decks/${getDeckFilename(deck.name)}`, data);
      });

      // Export all quizzes into quizzes/ folder
      const quizPromises = quizzes.map(async (quiz) => {
        const data = await exportQuiz(quiz.id);
        zip.file(`quizzes/${getQuizFilename(quiz.name)}`, data);
      });

      await Promise.all([...deckPromises, ...quizPromises]);

      const filePath = await save({
        defaultPath: getBulkExportFilename(),
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      const zipData = await zip.generateAsync({ type: "uint8array" });
      await writeFile(filePath, zipData);

      toast.success(`Exported all ${decks.length} deck(s) and ${quizzes.length} quiz(zes) successfully`);

      setSelectedDecks(new Set());
      setSelectedQuizzes(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
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

  const totalSelected = selectedDecks.size + selectedQuizzes.size;

  return (
    <div className="min-h-full bg-[#2d2a2e]">
      <main className="max-w-4xl mx-auto py-6 px-6">
        <div className="fade-in">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#fcfcfa] font-mono">Export</h1>
            <div className="flex gap-3">
              {totalSelected > 0 && (
                <button
                  onClick={handleBulkExport}
                  disabled={exporting}
                  className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors disabled:opacity-50"
                >
                  {exporting ? "Exporting..." : `Export Selected (${totalSelected})`}
                </button>
              )}
              <button
                onClick={handleExportAll}
                disabled={exporting || (decks.length === 0 && quizzes.length === 0)}
                className="px-4 py-2 bg-[#a9dc76] text-[#2d2a2e] rounded-lg hover:bg-[#a9dc76]/90 font-medium transition-colors disabled:opacity-50"
              >
                Export All
              </button>
            </div>
          </div>

          {/* Decks Section */}
          <section className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#fcfcfa]">Decks</h2>
              {decks.length > 0 && (
                <button
                  onClick={selectAllDecks}
                  className="text-sm text-[#78dce8] hover:text-[#ffd866] transition-colors"
                >
                  {selectedDecks.size === decks.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {decks.length === 0 ? (
              <p className="text-[#939293] text-center py-4">No decks to export</p>
            ) : (
              <div className="space-y-2">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    className="flex items-center justify-between p-3 bg-[#2d2a2e] rounded-lg hover:bg-[#5b595c]/20 transition-colors"
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDecks.has(deck.id)}
                        onChange={() => toggleDeck(deck.id)}
                        className="w-4 h-4 rounded border-[#5b595c] text-[#ffd866] focus:ring-[#ffd866] bg-[#2d2a2e]"
                      />
                      <div>
                        <span className="text-[#fcfcfa]">{deck.name}</span>
                        <span className="text-xs text-[#939293] ml-2">
                          {deck.cardCount ?? 0} cards
                        </span>
                      </div>
                    </label>
                    <button
                      onClick={() => handleExportSingleDeck(deck)}
                      disabled={exporting}
                      className="px-3 py-1 text-sm text-[#78dce8] hover:text-[#ffd866] transition-colors disabled:opacity-50"
                    >
                      Export
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quizzes Section */}
          <section className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#fcfcfa]">Quizzes</h2>
              {quizzes.length > 0 && (
                <button
                  onClick={selectAllQuizzes}
                  className="text-sm text-[#78dce8] hover:text-[#ffd866] transition-colors"
                >
                  {selectedQuizzes.size === quizzes.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {quizzes.length === 0 ? (
              <p className="text-[#939293] text-center py-4">No quizzes to export</p>
            ) : (
              <div className="space-y-2">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-3 bg-[#2d2a2e] rounded-lg hover:bg-[#5b595c]/20 transition-colors"
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedQuizzes.has(quiz.id)}
                        onChange={() => toggleQuiz(quiz.id)}
                        className="w-4 h-4 rounded border-[#5b595c] text-[#ffd866] focus:ring-[#ffd866] bg-[#2d2a2e]"
                      />
                      <div>
                        <span className="text-[#fcfcfa]">{quiz.name}</span>
                        <span className="text-xs text-[#939293] ml-2">
                          {quiz.questionCount ?? 0} questions
                        </span>
                      </div>
                    </label>
                    <button
                      onClick={() => handleExportSingleQuiz(quiz)}
                      disabled={exporting}
                      className="px-3 py-1 text-sm text-[#78dce8] hover:text-[#ffd866] transition-colors disabled:opacity-50"
                    >
                      Export
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
