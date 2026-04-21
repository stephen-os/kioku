import { useEffect } from "react";

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
 * Handles browser navigation (refresh, close tab)
 * Note: In-app navigation blocking requires a data router which is not currently used
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

  // Note: useBlocker requires a data router (createBrowserRouter) which is not used
  // For now, only browser navigation is blocked, not in-app React Router navigation
  return {
    /** Whether navigation is currently blocked */
    isBlocked: false,
    /** Proceed with navigation (no-op without data router) */
    proceed: () => {},
    /** Cancel navigation (no-op without data router) */
    cancel: () => {},
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
