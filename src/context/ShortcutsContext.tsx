import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Shortcut, ShortcutKey, ShortcutScope, ShortcutGroup } from "@/types";
import { matchesShortcut } from "@/hooks/useKeyboardShortcuts";

interface ShortcutsContextType {
  /** Register a shortcut */
  register: (shortcut: Shortcut) => void;
  /** Unregister a shortcut by ID */
  unregister: (id: string) => void;
  /** Set the current active scope */
  setScope: (scope: ShortcutScope) => void;
  /** Get current scope */
  scope: ShortcutScope;
  /** Get all registered shortcuts grouped by scope */
  getShortcutGroups: () => ShortcutGroup[];
  /** Show/hide the shortcuts help modal */
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

const SCOPE_LABELS: Record<ShortcutScope, string> = {
  global: "Global",
  notes: "Notes",
  decks: "Decks",
  quizzes: "Quizzes",
  study: "Study Mode",
};

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Map<string, Shortcut>>(new Map());
  const [scope, setScope] = useState<ShortcutScope>("global");
  const [showHelp, setShowHelp] = useState(false);

  // Use ref to avoid stale closures in event handler
  const shortcutsRef = useRef(shortcuts);
  const scopeRef = useRef(scope);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  const register = useCallback((shortcut: Shortcut) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.set(shortcut.id, shortcut);
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getShortcutGroups = useCallback((): ShortcutGroup[] => {
    const groups = new Map<ShortcutScope, Shortcut[]>();

    shortcuts.forEach((shortcut) => {
      const existing = groups.get(shortcut.scope) || [];
      existing.push(shortcut);
      groups.set(shortcut.scope, existing);
    });

    // Convert to array and sort by scope priority
    const scopeOrder: ShortcutScope[] = ["global", "notes", "decks", "quizzes", "study"];
    const result: ShortcutGroup[] = [];

    for (const s of scopeOrder) {
      const groupShortcuts = groups.get(s);
      if (groupShortcuts && groupShortcuts.length > 0) {
        result.push({
          scope: s,
          label: SCOPE_LABELS[s],
          shortcuts: groupShortcuts,
        });
      }
    }

    return result;
  }, [shortcuts]);

  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentShortcuts = shortcutsRef.current;
      const currentScope = scopeRef.current;

      // Don't trigger shortcuts when typing in inputs/textareas
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Find matching shortcut
      for (const shortcut of currentShortcuts.values()) {
        // Check if shortcut is active in current scope
        if (shortcut.scope !== "global" && shortcut.scope !== currentScope) {
          continue;
        }

        // Allow certain shortcuts in inputs
        const allowInInput =
          shortcut.keys.key.toLowerCase() === "escape" ||
          (shortcut.keys.ctrl &&
            ["s", "k", "/", "n"].includes(shortcut.keys.key.toLowerCase()));

        if (isInput && !allowInInput) {
          continue;
        }

        if (matchesShortcut(event, shortcut.keys)) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ShortcutsContext.Provider
      value={{
        register,
        unregister,
        setScope,
        scope,
        getShortcutGroups,
        showHelp,
        setShowHelp,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error("useShortcuts must be used within a ShortcutsProvider");
  }
  return context;
}

/**
 * Hook to register a shortcut that auto-unregisters on unmount
 */
export function useRegisterShortcut(
  id: string,
  keys: ShortcutKey,
  action: () => void,
  options: {
    label: string;
    description?: string;
    scope?: ShortcutScope;
    enabled?: boolean;
  }
) {
  const { register, unregister } = useShortcuts();
  const { label, description, scope = "global", enabled = true } = options;

  // Use ref to keep action stable
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    if (!enabled) {
      unregister(id);
      return;
    }

    register({
      id,
      keys,
      label,
      description,
      scope,
      action: () => actionRef.current(),
    });

    return () => unregister(id);
  }, [id, keys, label, description, scope, enabled, register, unregister]);
}
