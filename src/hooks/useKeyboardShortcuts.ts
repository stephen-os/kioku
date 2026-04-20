import { useEffect, useCallback } from "react";
import type { ShortcutKey } from "@/types";

/**
 * Detect if running on macOS
 */
export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Check if a keyboard event matches a shortcut key combination
 */
export function matchesShortcut(event: KeyboardEvent, keys: ShortcutKey): boolean {
  // On Mac, ctrl in shortcuts means Cmd (metaKey)
  // On Windows/Linux, ctrl means ctrlKey
  const mac = isMac();
  const ctrlOrCmd = mac ? event.metaKey : event.ctrlKey;

  // Check modifiers
  const ctrlMatch = keys.ctrl ? ctrlOrCmd : !ctrlOrCmd;
  const altMatch = keys.alt ? event.altKey : !event.altKey;
  const shiftMatch = keys.shift ? event.shiftKey : !event.shiftKey;

  // Handle explicit meta key (rare, usually for Windows key)
  const metaMatch = keys.meta ? event.metaKey : true;

  // Check the key itself (case-insensitive)
  const keyMatch = event.key.toLowerCase() === keys.key.toLowerCase();

  return ctrlMatch && altMatch && shiftMatch && metaMatch && keyMatch;
}

/**
 * Format a shortcut key combination for display
 */
export function formatShortcut(keys: ShortcutKey): string {
  const mac = isMac();
  const parts: string[] = [];

  if (keys.ctrl) {
    parts.push(mac ? "⌘" : "Ctrl");
  }
  if (keys.alt) {
    parts.push(mac ? "⌥" : "Alt");
  }
  if (keys.shift) {
    parts.push(mac ? "⇧" : "Shift");
  }
  if (keys.meta && !keys.ctrl) {
    parts.push(mac ? "⌘" : "Win");
  }

  // Format the key nicely
  const keyDisplay = formatKey(keys.key);
  parts.push(keyDisplay);

  return mac ? parts.join("") : parts.join("+");
}

/**
 * Format a single key for display
 */
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    " ": "Space",
    "arrowup": "↑",
    "arrowdown": "↓",
    "arrowleft": "←",
    "arrowright": "→",
    "enter": "↵",
    "escape": "Esc",
    "backspace": "⌫",
    "delete": "Del",
    "tab": "Tab",
  };

  const lower = key.toLowerCase();
  if (keyMap[lower]) {
    return keyMap[lower];
  }

  // Single character keys should be uppercase
  if (key.length === 1) {
    return key.toUpperCase();
  }

  // Capitalize first letter for other keys
  return key.charAt(0).toUpperCase() + key.slice(1);
}

interface UseKeyboardShortcutOptions {
  /** The key combination to listen for */
  keys: ShortcutKey;
  /** Callback to execute when shortcut is triggered */
  onTrigger: () => void;
  /** Whether the shortcut is currently enabled */
  enabled?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
}

/**
 * Hook to register a single keyboard shortcut
 * Use this for component-specific shortcuts
 */
export function useKeyboardShortcut({
  keys,
  onTrigger,
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs/textareas
      // unless it's a global shortcut like Escape
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" ||
                      target.tagName === "TEXTAREA" ||
                      target.isContentEditable;

      // Allow Escape and some ctrl shortcuts in inputs
      const allowInInput = keys.key.toLowerCase() === "escape" ||
                          (keys.ctrl && ["s", "k", "/"].includes(keys.key.toLowerCase()));

      if (isInput && !allowInInput) {
        return;
      }

      if (matchesShortcut(event, keys)) {
        if (preventDefault) {
          event.preventDefault();
        }
        onTrigger();
      }
    },
    [keys, onTrigger, enabled, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}
