import type { ShortcutKey } from "@/types";
import { formatShortcut } from "@/hooks/useKeyboardShortcuts";

interface ShortcutHintProps {
  /** The key combination to display */
  keys: ShortcutKey;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Display a keyboard shortcut hint
 * Shows platform-appropriate symbols (Cmd on Mac, Ctrl on Windows)
 */
export function ShortcutHint({ keys, size = "sm", className = "" }: ShortcutHintProps) {
  const formatted = formatShortcut(keys);

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
  };

  return (
    <kbd
      className={`
        inline-flex items-center gap-0.5
        bg-[#2d2a2e] border border-[#5b595c] rounded
        text-[#939293] font-mono
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {formatted}
    </kbd>
  );
}

/**
 * Inline shortcut hint for use in buttons or labels
 */
export function InlineShortcutHint({ keys }: { keys: ShortcutKey }) {
  const formatted = formatShortcut(keys);

  return (
    <span className="text-[#939293] text-xs font-mono ml-2">
      {formatted}
    </span>
  );
}
