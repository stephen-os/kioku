import { useState } from "react";

interface DeleteConfirmButtonProps {
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmButton({ onConfirm, isDeleting }: DeleteConfirmButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (showConfirm) {
    return (
      <div className="flex gap-1">
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="px-2 py-2 bg-[#ff6188] text-[#2d2a2e] text-sm rounded-lg hover:bg-[#ff6188]/90 transition-colors disabled:opacity-50"
        >
          {isDeleting ? "..." : "Yes"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-2 py-2 bg-[#5b595c] text-[#fcfcfa] text-sm rounded-lg hover:bg-[#5b595c]/80 transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-3 py-2 text-[#ff6188] hover:bg-[#ff6188]/10 rounded-lg transition-colors"
      title="Delete"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  );
}
