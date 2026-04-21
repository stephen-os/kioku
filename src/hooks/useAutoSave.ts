import { useState, useEffect, useRef, useCallback } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  /** The data to auto-save */
  data: T;
  /** Function to perform the save */
  onSave: (data: T) => Promise<void>;
  /** Delay in ms before saving after changes stop (default: from settings or 2000) */
  delay?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when save completes successfully */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: SaveStatus;
  /** Timestamp of last successful save */
  lastSavedAt: Date | null;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Manually trigger a save */
  saveNow: () => Promise<void>;
  /** Clear the dirty state (e.g., after external save) */
  markClean: () => void;
  /** Error message if status is 'error' */
  error: string | null;
}

/**
 * Hook for auto-saving data with debouncing
 * Tracks save status and provides manual save trigger
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track current values without triggering effects
  const dataRef = useRef(data);
  const initialDataRef = useRef(data);
  const initialDataHashRef = useRef(() => JSON.stringify(data));
  const onSaveRef = useRef(onSave);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const lastDataHashRef = useRef<string | null>(null);

  // Update refs
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Perform the actual save
  const performSave = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setStatus("saving");
    setError(null);

    try {
      await onSaveRef.current(dataRef.current);
      setStatus("saved");
      setLastSavedAt(new Date());
      setIsDirty(false);
      initialDataRef.current = dataRef.current;
      const newHash = JSON.stringify(dataRef.current);
      initialDataHashRef.current = () => newHash;
      lastDataHashRef.current = newHash;
      onSaveSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Save failed";
      setStatus("error");
      setError(errorMessage);
      onSaveError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      isSavingRef.current = false;
    }
  }, [onSaveSuccess, onSaveError]);

  // Manual save function
  const saveNow = useCallback(async () => {
    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Mark as clean (e.g., after loading new data)
  const markClean = useCallback(() => {
    setIsDirty(false);
    setStatus("idle");
    initialDataRef.current = dataRef.current;
    const newHash = JSON.stringify(dataRef.current);
    initialDataHashRef.current = () => newHash;
    lastDataHashRef.current = newHash;
  }, []);

  // Detect changes and schedule auto-save
  useEffect(() => {
    // Compute hash only when data reference changes (more efficient than every render)
    const currentHash = JSON.stringify(data);

    // Skip if hash is same as last computed (no change since last effect run)
    if (currentHash === lastDataHashRef.current) {
      return;
    }
    lastDataHashRef.current = currentHash;

    // Check against initial data hash
    const initialHash = initialDataHashRef.current();
    if (currentHash === initialHash) {
      return;
    }

    setIsDirty(true);

    if (!enabled) {
      setStatus("pending");
      return;
    }

    setStatus("pending");

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule new save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSavedAt,
    isDirty,
    saveNow,
    markClean,
    error,
  };
}
