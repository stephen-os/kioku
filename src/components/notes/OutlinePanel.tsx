import type { OutlineHeading } from "@/hooks/useMarkdownOutline";

interface OutlinePanelProps {
  /** List of headings extracted from content */
  headings: OutlineHeading[];
  /** Callback when a heading is clicked */
  onHeadingClick: (heading: OutlineHeading) => void;
  /** Currently active heading ID */
  activeHeadingId?: string;
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Callback to close the panel */
  onClose: () => void;
}

export function OutlinePanel({
  headings,
  onHeadingClick,
  activeHeadingId,
  isVisible,
  onClose,
}: OutlinePanelProps) {
  if (!isVisible) return null;

  // Calculate indentation based on heading level
  const getIndent = (level: number) => {
    const baseIndent = 12; // px
    return `${(level - 1) * baseIndent}px`;
  };

  return (
    <div className="w-56 flex-shrink-0 border-l border-[#5b595c] bg-[#403e41] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#5b595c]">
        <span className="text-xs font-medium text-[#939293] uppercase tracking-wide">
          Outline
        </span>
        <button
          onClick={onClose}
          className="p-1 text-[#939293] hover:text-[#fcfcfa] rounded"
          title="Close outline"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {headings.length > 0 ? (
          <nav className="space-y-0.5">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => onHeadingClick(heading)}
                style={{ paddingLeft: getIndent(heading.level) }}
                className={`w-full text-left px-3 py-1.5 text-sm truncate transition-colors ${
                  activeHeadingId === heading.id
                    ? "text-[#ffd866] bg-[#ffd866]/10"
                    : "text-[#fcfcfa] hover:bg-[#5b595c]/30"
                }`}
                title={heading.text}
              >
                <span
                  className={`${
                    heading.level === 1
                      ? "font-medium"
                      : heading.level === 2
                      ? "font-normal"
                      : "font-light text-[#939293]"
                  }`}
                >
                  {heading.text}
                </span>
              </button>
            ))}
          </nav>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-[#939293]">
            <p className="mb-2">No headings found</p>
            <p className="text-xs">
              Add headings using # syntax
              <br />
              (e.g., # Title, ## Section)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
