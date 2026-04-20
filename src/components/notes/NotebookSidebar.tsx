import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Page } from "@/types";
import { PageListItem } from "./PageListItem";
import { SidebarSearch } from "./SidebarSearch";
import { ResizablePanel } from "./ResizablePanel";

interface NotebookSidebarProps {
  /** List of pages to display */
  pages: Page[];
  /** Currently selected page ID */
  selectedPageId: string | null;
  /** Sidebar width in pixels */
  width: number;
  /** Whether sidebar is collapsed */
  isCollapsed: boolean;
  /** Called when a page is selected */
  onSelectPage: (page: Page) => void;
  /** Called when a page should be deleted */
  onDeletePage: (pageId: string) => void;
  /** Called when a page's pin state should toggle */
  onTogglePin: (page: Page) => void;
  /** Called when the new page button is clicked */
  onCreatePage: () => void;
  /** Called when collapse state changes */
  onCollapseChange: (collapsed: boolean) => void;
  /** Called when width changes */
  onWidthChange: (width: number) => void;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
}

export function NotebookSidebar({
  pages,
  selectedPageId,
  width,
  isCollapsed,
  onSelectPage,
  onDeletePage,
  onTogglePin,
  onCreatePage,
  onCollapseChange,
  onWidthChange,
  minWidth = 200,
  maxWidth = 400,
}: NotebookSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Sort pages: pinned first, then by position
  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.position - b.position;
    });
  }, [pages]);

  // Filter pages by search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return sortedPages;
    const query = searchQuery.toLowerCase();
    return sortedPages.filter((page) =>
      page.title.toLowerCase().includes(query)
    );
  }, [sortedPages, searchQuery]);

  const pinnedPages = filteredPages.filter((p) => p.isPinned);
  const regularPages = filteredPages.filter((p) => !p.isPinned);

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="w-12 flex-shrink-0 border-r border-[#5b595c] bg-[#403e41]">
        <div className="h-full flex flex-col">
          <div className="p-3 border-b border-[#5b595c]">
            <button
              onClick={() => onCollapseChange(false)}
              className="w-full p-1 text-[#939293] hover:text-[#fcfcfa]"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view with resize support
  return (
    <ResizablePanel
      width={width}
      onWidthChange={onWidthChange}
      minWidth={minWidth}
      maxWidth={maxWidth}
      resizeFrom="right"
      className="border-r border-[#5b595c] bg-[#403e41]"
    >
      <div className="h-full flex flex-col">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[#5b595c]">
          <div className="flex items-center justify-between mb-2">
            <Link
              to="/notes"
              className="text-[#939293] hover:text-[#fcfcfa] p-1"
              title="Back to notebooks"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <button
              onClick={onCreatePage}
              className="px-2 py-1 text-xs bg-[#ffd866] text-[#2d2a2e] rounded hover:bg-[#ffd866]/90"
            >
              + Page
            </button>
          </div>
          {/* Search */}
          <SidebarSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Filter pages..."
          />
        </div>

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto p-2">
          {pinnedPages.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-[#939293] px-2 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
                Pinned
              </div>
              {pinnedPages.map((page) => (
                <PageListItem
                  key={page.id}
                  page={page}
                  isSelected={selectedPageId === page.id}
                  onSelect={() => onSelectPage(page)}
                  onDelete={() => onDeletePage(page.id)}
                  onTogglePin={() => onTogglePin(page)}
                />
              ))}
            </div>
          )}

          {regularPages.length > 0 && (
            <div>
              {pinnedPages.length > 0 && (
                <div className="text-xs text-[#939293] px-2 mb-1">Pages</div>
              )}
              {regularPages.map((page) => (
                <PageListItem
                  key={page.id}
                  page={page}
                  isSelected={selectedPageId === page.id}
                  onSelect={() => onSelectPage(page)}
                  onDelete={() => onDeletePage(page.id)}
                  onTogglePin={() => onTogglePin(page)}
                />
              ))}
            </div>
          )}

          {pages.length === 0 && (
            <div className="text-center text-[#939293] text-sm py-4">
              No pages yet
            </div>
          )}

          {pages.length > 0 && filteredPages.length === 0 && (
            <div className="text-center text-[#939293] text-sm py-4">
              No matching pages
            </div>
          )}
        </div>

        {/* Sidebar Footer - Collapse Toggle */}
        <div className="p-2 border-t border-[#5b595c]">
          <button
            onClick={() => onCollapseChange(true)}
            className="w-full flex items-center justify-center gap-2 p-2 text-xs text-[#939293] hover:text-[#fcfcfa] hover:bg-[#5b595c]/30 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            Collapse
          </button>
        </div>
      </div>
    </ResizablePanel>
  );
}
