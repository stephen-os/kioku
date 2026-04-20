import { useState, useEffect } from "react";
import type { SaveStatus as SaveStatusType } from "@/hooks/useAutoSave";

interface SaveStatusProps {
  /** Current save status */
  status: SaveStatusType;
  /** Timestamp of last successful save */
  lastSavedAt: Date | null;
  /** Error message if status is 'error' */
  error?: string | null;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Format a date as relative time (e.g., "2m ago", "just now")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 5) {
    return "just now";
  }
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Display auto-save status with relative time
 */
export function SaveStatus({
  status,
  lastSavedAt,
  error,
  size = "sm",
}: SaveStatusProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");

  // Update relative time every 10 seconds
  useEffect(() => {
    if (!lastSavedAt) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(lastSavedAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  const baseClasses = `flex items-center gap-1.5 ${sizeClasses[size]}`;

  switch (status) {
    case "idle":
      return null;

    case "pending":
      return (
        <div className={`${baseClasses} text-[#939293]`}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffd866]" />
          <span>Unsaved changes</span>
        </div>
      );

    case "saving":
      return (
        <div className={`${baseClasses} text-[#939293]`}>
          <svg
            className="w-3.5 h-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Saving...</span>
        </div>
      );

    case "saved":
      return (
        <div className={`${baseClasses} text-[#a9dc76]`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Saved {relativeTime}</span>
        </div>
      );

    case "error":
      return (
        <div className={`${baseClasses} text-[#ff6188]`} title={error || "Save failed"}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Save failed</span>
        </div>
      );

    default:
      return null;
  }
}
