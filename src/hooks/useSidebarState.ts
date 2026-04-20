import { useState, useCallback, useEffect } from "react";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

interface SidebarState {
  collapsed: boolean;
  width: number;
}

interface UseSidebarStateOptions {
  /** Storage key for this sidebar instance */
  storageKey: string;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Default width in pixels */
  defaultWidth?: number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
}

interface UseSidebarStateReturn {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  /** Current sidebar width in pixels */
  width: number;
  /** Toggle collapsed state */
  toggle: () => void;
  /** Set collapsed state */
  setCollapsed: (collapsed: boolean) => void;
  /** Set sidebar width (will be clamped to min/max) */
  setWidth: (width: number) => void;
  /** Reset to default state */
  reset: () => void;
}

/**
 * Hook for managing sidebar state with localStorage persistence
 */
export function useSidebarState({
  storageKey,
  defaultCollapsed = false,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 400,
}: UseSidebarStateOptions): UseSidebarStateReturn {
  const fullKey = `sidebar-state-${storageKey}`;

  const [state, setState] = useState<SidebarState>(() => {
    const saved = loadFromStorage<SidebarState | null>(fullKey, null);
    if (saved) {
      return {
        collapsed: saved.collapsed,
        width: Math.max(minWidth, Math.min(maxWidth, saved.width)),
      };
    }
    return {
      collapsed: defaultCollapsed,
      width: defaultWidth,
    };
  });

  // Persist state changes
  useEffect(() => {
    saveToStorage(fullKey, state);
  }, [fullKey, state]);

  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, collapsed: !prev.collapsed }));
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setState((prev) => ({ ...prev, collapsed }));
  }, []);

  const setWidth = useCallback(
    (width: number) => {
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));
      setState((prev) => ({ ...prev, width: clampedWidth }));
    },
    [minWidth, maxWidth]
  );

  const reset = useCallback(() => {
    setState({
      collapsed: defaultCollapsed,
      width: defaultWidth,
    });
  }, [defaultCollapsed, defaultWidth]);

  return {
    isCollapsed: state.collapsed,
    width: state.width,
    toggle,
    setCollapsed,
    setWidth,
    reset,
  };
}
