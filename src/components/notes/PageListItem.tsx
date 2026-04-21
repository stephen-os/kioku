import { useState } from "react";
import type { Page } from "@/types";

interface PageListItemProps {
  page: Page;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onMove: () => void;
}

export function PageListItem({
  page,
  isSelected,
  onSelect,
  onDelete,
  onTogglePin,
  onDuplicate,
  onMove,
}: PageListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
          <div className="fixed inset-0 z-10" onClick={() => { setShowMenu(false); setShowDeleteConfirm(false); }} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-[#403e41] border border-[#5b595c] rounded shadow-lg z-20 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
              {page.isPinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Duplicate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              Move to...
            </button>
            <div className="border-t border-[#5b595c] my-1" />
            {showDeleteConfirm ? (
              <div className="px-3 py-1.5">
                <p className="text-xs text-[#ff6188] mb-2">Delete this page?</p>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-[#ff6188] text-[#2d2a2e] rounded hover:bg-[#ff6188]/90"
                  >
                    Yes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-[#5b595c] text-[#fcfcfa] rounded hover:bg-[#5b595c]/80"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-[#ff6188] hover:bg-[#5b595c]/30 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
