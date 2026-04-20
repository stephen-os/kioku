import { useState, useEffect, useRef, useCallback } from "react";
import type { PageSearchResult } from "@/types";
import { getAllPageTitles } from "@/lib/db";
import { filterSuggestions } from "@/lib/linkParser";

interface LinkAutocompleteProps {
  /** Query text after [[ */
  query: string;
  /** Position to display the autocomplete */
  position: { top: number; left: number };
  /** Whether autocomplete is visible */
  isVisible: boolean;
  /** Current page ID to exclude from suggestions */
  excludePageId?: string;
  /** Called when a suggestion is selected */
  onSelect: (title: string) => void;
  /** Called when autocomplete is dismissed */
  onDismiss: () => void;
}

export function LinkAutocomplete({
  query,
  position,
  isVisible,
  excludePageId,
  onSelect,
  onDismiss,
}: LinkAutocompleteProps) {
  const [pages, setPages] = useState<PageSearchResult[]>([]);
  const [filteredPages, setFilteredPages] = useState<PageSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all page titles when autocomplete becomes visible
  useEffect(() => {
    if (!isVisible) {
      setPages([]);
      setFilteredPages([]);
      return;
    }

    setLoading(true);
    getAllPageTitles()
      .then((data) => {
        setPages(data);
        // Initial filter with empty query
        const filtered = filterSuggestions(
          data.map((p) => ({ id: p.id, title: p.title, notebookId: p.notebookId })),
          query,
          excludePageId
        );
        setFilteredPages(data.filter((p) => filtered.some((f) => f.id === p.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isVisible]);

  // Filter pages when query changes
  useEffect(() => {
    if (!isVisible || pages.length === 0) return;

    const filtered = filterSuggestions(
      pages.map((p) => ({ id: p.id, title: p.title, notebookId: p.notebookId })),
      query,
      excludePageId
    );
    setFilteredPages(pages.filter((p) => filtered.some((f) => f.id === p.id)));
    setSelectedIndex(0);
  }, [query, pages, excludePageId, isVisible]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredPages.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredPages[selectedIndex]) {
            onSelect(filteredPages[selectedIndex].title);
          }
          break;
        case "Escape":
          e.preventDefault();
          onDismiss();
          break;
        case "Tab":
          e.preventDefault();
          if (filteredPages[selectedIndex]) {
            onSelect(filteredPages[selectedIndex].title);
          }
          break;
      }
    },
    [isVisible, filteredPages, selectedIndex, onSelect, onDismiss]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (!containerRef.current) return;
    const selected = containerRef.current.querySelector("[data-selected=true]");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-64 max-h-64 bg-[#403e41] border border-[#5b595c] rounded-lg shadow-xl overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#5b595c] flex items-center gap-2">
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
        <span className="text-xs text-[#939293]">Link to page</span>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-48">
        {loading ? (
          <div className="flex items-center justify-center py-4">
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
        ) : filteredPages.length > 0 ? (
          filteredPages.map((page, index) => (
            <button
              key={page.id}
              data-selected={index === selectedIndex}
              onClick={() => onSelect(page.title)}
              className={`w-full text-left px-3 py-2 flex flex-col ${
                index === selectedIndex
                  ? "bg-[#ffd866]/20 text-[#ffd866]"
                  : "text-[#fcfcfa] hover:bg-[#5b595c]/30"
              }`}
            >
              <span className="text-sm truncate">{page.title}</span>
              <span className="text-xs text-[#939293] truncate">
                {page.notebookName}
              </span>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-center text-sm text-[#939293]">
            {query ? `No pages matching "${query}"` : "No pages available"}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-[#5b595c] text-xs text-[#939293] flex items-center gap-2">
        <span>↑↓ Navigate</span>
        <span>↵ Select</span>
        <span>Esc Dismiss</span>
      </div>
    </div>
  );
}
