import { useState } from "react";
import type { Page } from "@/types";

interface PageListItemProps {
  page: Page;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export function PageListItem({
  page,
  isSelected,
  onSelect,
  onDelete,
  onTogglePin,
}: PageListItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
        isSelected
          ? "bg-[#ffd866]/20 text-[#ffd866]"
          : "text-[#fcfcfa] hover:bg-[#5b595c]/30"
      }`}
      onClick={onSelect}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="flex-1 text-sm truncate">{page.title}</span>

      {/* Context menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#5b595c]/50 rounded"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-32 bg-[#403e41] border border-[#5b595c] rounded shadow-lg z-20 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30"
            >
              {page.isPinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#ff6188] hover:bg-[#5b595c]/30"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
