import { useEffect, useCallback } from "react";
import { useBlocker, type Location } from "react-router-dom";

interface UseUnsavedChangesOptions {
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Message to show in the confirmation dialog */
  message?: string;
  /** Callback before navigation is blocked (can be used to save) */
  onBeforeUnload?: () => void;
}

/**
 * Hook to warn users before leaving a page with unsaved changes
 * Handles both browser navigation (refresh, close) and React Router navigation
 */
export function useUnsavedChanges({
  isDirty,
  message = "You have unsaved changes. Are you sure you want to leave?",
  onBeforeUnload,
}: UseUnsavedChangesOptions) {
  // Handle browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      onBeforeUnload?.();
      e.preventDefault();
      // Modern browsers ignore custom messages, but we still need to set returnValue
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, message, onBeforeUnload]);

  // Handle React Router navigation
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) => {
        // Only block if dirty and actually navigating to a different page
        return isDirty && currentLocation.pathname !== nextLocation.pathname;
      },
      [isDirty]
    )
  );

  // Return blocker state for custom UI handling
  return {
    /** Whether navigation is currently blocked */
    isBlocked: blocker.state === "blocked",
    /** Proceed with navigation (discard changes) */
    proceed: blocker.proceed,
    /** Cancel navigation (stay on page) */
    cancel: blocker.reset,
    /** The blocker object for advanced use */
    blocker,
  };
}

/**
 * Simple confirmation dialog component for unsaved changes
 */
export function UnsavedChangesDialog({
  isOpen,
  onConfirm,
  onCancel,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-[#403e41] border border-[#5b595c] rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-[#fcfcfa] mb-2">
          Unsaved Changes
        </h2>
        <p className="text-[#939293] mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/30 transition-colors"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#ff6188] text-[#2d2a2e] rounded-lg hover:bg-[#ff6188]/90 font-medium transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
