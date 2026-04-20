import { useWordCount, formatTimestamp } from "@/hooks/useMarkdownOutline";
import type { SaveStatus as SaveStatusType } from "@/hooks/useAutoSave";
import { SaveStatus } from "@/components/ui/SaveStatus";

interface EditorFooterProps {
  /** Markdown content for word count */
  content: string;
  /** Page creation timestamp */
  createdAt: string;
  /** Page last updated timestamp */
  updatedAt: string;
  /** Current save status */
  saveStatus: SaveStatusType;
  /** Timestamp of last successful save */
  lastSavedAt: Date | null;
  /** Error message if save failed */
  saveError?: string | null;
  /** Whether to show outline toggle */
  showOutlineToggle?: boolean;
  /** Current outline panel state */
  outlineVisible?: boolean;
  /** Callback to toggle outline panel */
  onToggleOutline?: () => void;
}

export function EditorFooter({
  content,
  createdAt,
  updatedAt,
  saveStatus,
  lastSavedAt,
  saveError,
  showOutlineToggle = false,
  outlineVisible = false,
  onToggleOutline,
}: EditorFooterProps) {
  const { words, characters } = useWordCount(content);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-[#5b595c] bg-[#403e41]/50 text-xs text-[#939293]">
      {/* Left side: Word count and timestamps */}
      <div className="flex items-center gap-4">
        <span title={`${characters} characters`}>
          {words} {words === 1 ? "word" : "words"}
        </span>
        <span className="text-[#5b595c]">|</span>
        <span title={`Created: ${new Date(createdAt).toLocaleString()}`}>
          Created {formatTimestamp(createdAt)}
        </span>
        <span title={`Updated: ${new Date(updatedAt).toLocaleString()}`}>
          Updated {formatTimestamp(updatedAt)}
        </span>
      </div>

      {/* Right side: Save status and outline toggle */}
      <div className="flex items-center gap-3">
        <SaveStatus
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          error={saveError}
          size="sm"
        />

        {showOutlineToggle && onToggleOutline && (
          <>
            <span className="text-[#5b595c]">|</span>
            <button
              onClick={onToggleOutline}
              className={`flex items-center gap-1.5 hover:text-[#fcfcfa] transition-colors ${
                outlineVisible ? "text-[#ffd866]" : ""
              }`}
              title={outlineVisible ? "Hide outline" : "Show outline"}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <span>Outline</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
