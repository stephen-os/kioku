import { useState, useEffect } from "react";
import type { Notebook, Page } from "@/types";
import { getAllNotebooks } from "@/lib/db";

interface MovePageModalProps {
  /** The page being moved */
  page: Page;
  /** Current notebook ID (to exclude from list) */
  currentNotebookId: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when modal is closed */
  onClose: () => void;
  /** Called when a notebook is selected */
  onMove: (targetNotebookId: string) => void;
}

export function MovePageModal({
  page,
  currentNotebookId,
  isOpen,
  onClose,
  onMove,
}: MovePageModalProps) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);

  // Load notebooks when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedNotebookId(null);
      return;
    }

    setLoading(true);
    getAllNotebooks()
      .then((data) => {
        // Filter out current notebook
        const otherNotebooks = data.filter((n) => n.id !== currentNotebookId);
        setNotebooks(otherNotebooks);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, currentNotebookId]);

  const handleMove = () => {
    if (selectedNotebookId) {
      onMove(selectedNotebookId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#403e41] border border-[#5b595c] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#5b595c]">
          <h2 className="text-lg font-semibold text-[#fcfcfa]">Move Page</h2>
          <p className="text-sm text-[#939293] mt-1">
            Move "{page.title}" to another notebook
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="w-6 h-6 text-[#939293] animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : notebooks.length > 0 ? (
            <div className="space-y-1">
              {notebooks.map((notebook) => (
                <button
                  key={notebook.id}
                  onClick={() => setSelectedNotebookId(notebook.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedNotebookId === notebook.id
                      ? "bg-[#ffd866]/20 text-[#ffd866]"
                      : "text-[#fcfcfa] hover:bg-[#5b595c]/30"
                  }`}
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{notebook.name}</div>
                    {notebook.pageCount !== undefined && (
                      <div className="text-xs text-[#939293]">
                        {notebook.pageCount} {notebook.pageCount === 1 ? "page" : "pages"}
                      </div>
                    )}
                  </div>
                  {selectedNotebookId === notebook.id && (
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#939293]">
              <p>No other notebooks available</p>
              <p className="text-sm mt-1">Create another notebook first</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#5b595c] bg-[#2d2a2e]/50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedNotebookId}
            className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
