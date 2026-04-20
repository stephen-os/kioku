import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { PageSearchResult } from "@/types";
import { searchPages, getRecentPages } from "@/lib/db";
import { InlineShortcutHint } from "./shortcuts";

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSwitcher({ isOpen, onClose }: QuickSwitcherProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PageSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load recent pages when opened with no query
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    // Focus input when opened
    setTimeout(() => inputRef.current?.focus(), 0);

    // Load recent pages
    if (!query.trim()) {
      setLoading(true);
      getRecentPages(10)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, query]);

  // Search when query changes
  useEffect(() => {
    if (!isOpen || !query.trim()) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await searchPages(query, 20);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 150); // Debounce

    return () => clearTimeout(timeoutId);
  }, [isOpen, query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            navigateToPage(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const navigateToPage = (page: PageSearchResult) => {
    navigate(`/notes/${page.notebookId}/pages/${page.id}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-[#2d2a2e] border border-[#5b595c] rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#5b595c]">
          <svg
            className="w-5 h-5 text-[#939293] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-[#fcfcfa] placeholder-[#939293] outline-none text-base"
          />
          {loading && (
            <svg
              className="w-4 h-4 text-[#939293] animate-spin"
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
          )}
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto"
        >
          {results.length > 0 ? (
            <>
              {!query.trim() && (
                <div className="px-4 py-2 text-xs text-[#939293] uppercase tracking-wide">
                  Recent Pages
                </div>
              )}
              {results.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => navigateToPage(page)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-[#ffd866]/20"
                      : "hover:bg-[#5b595c]/30"
                  }`}
                >
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${
                      index === selectedIndex ? "text-[#ffd866]" : "text-[#939293]"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`truncate ${
                        index === selectedIndex ? "text-[#ffd866]" : "text-[#fcfcfa]"
                      }`}
                    >
                      {page.title}
                    </div>
                    <div className="text-xs text-[#939293] truncate">
                      {page.notebookName}
                    </div>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-8 text-center text-[#939293]">
              {query.trim() ? "No pages found" : "No recent pages"}
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#5b595c] bg-[#403e41]/50 text-xs text-[#939293]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <InlineShortcutHint keys={{ key: "ArrowUp" }} />
              <InlineShortcutHint keys={{ key: "ArrowDown" }} />
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <InlineShortcutHint keys={{ key: "Enter" }} />
              <span className="ml-1">Open</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <InlineShortcutHint keys={{ key: "Escape" }} />
            <span className="ml-1">Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
