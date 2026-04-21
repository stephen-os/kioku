import { useState, useEffect } from "react";
import type { PageSearchResult } from "@/types";
import { getBacklinks } from "@/lib/db";

interface BacklinksPanelProps {
  /** Current page ID to find backlinks for */
  pageId: string;
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Called when panel is closed */
  onClose: () => void;
  /** Called when a backlink is clicked */
  onNavigate: (notebookId: string, pageId: string) => void;
}

export function BacklinksPanel({
  pageId,
  isVisible,
  onClose,
  onNavigate,
}: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<PageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible || !pageId) {
      setBacklinks([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    getBacklinks(pageId)
      .then(setBacklinks)
      .catch((err) => {
        console.error("Failed to load backlinks:", err);
        setError("Failed to load backlinks");
        setBacklinks([]);
      })
      .finally(() => setLoading(false));
  }, [pageId, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="w-64 flex-shrink-0 border-l border-[#5b595c] bg-[#403e41] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#5b595c] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#ab9df2]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span className="text-sm font-medium text-[#fcfcfa]">Backlinks</span>
          {backlinks.length > 0 && (
            <span className="text-xs text-[#939293] bg-[#5b595c]/50 px-1.5 py-0.5 rounded">
              {backlinks.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[#939293] hover:text-[#fcfcfa] rounded hover:bg-[#5b595c]/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {error ? (
          <div className="text-center py-8 text-[#ff6188]">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <svg
              className="w-5 h-5 text-[#939293] animate-spin"
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
        ) : backlinks.length > 0 ? (
          <div className="space-y-1">
            {backlinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.notebookId, link.id)}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#5b595c]/30 group"
              >
                <div className="text-sm text-[#fcfcfa] truncate group-hover:text-[#ffd866]">
                  {link.title}
                </div>
                <div className="text-xs text-[#939293] truncate">
                  {link.notebookName}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#939293]">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <p className="text-sm">No backlinks</p>
            <p className="text-xs mt-1">
              Pages linking to this page using [[{"{title}"}]] will appear here
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {backlinks.length > 0 && (
        <div className="px-4 py-2 border-t border-[#5b595c] text-xs text-[#939293]">
          {backlinks.length} {backlinks.length === 1 ? "page links" : "pages link"} to this page
        </div>
      )}
    </div>
  );
}
