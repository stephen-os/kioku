import type { ListenPhase } from "@/types";

interface ListenModePhaseBarProps {
  phase: ListenPhase;
  pauseDuration: number;
  pauseTimeRemaining: number;
  onSkipToPhase: (phase: "front" | "pause" | "back") => void;
  disabled?: boolean;
}

export function ListenModePhaseBar({
  phase,
  pauseDuration,
  pauseTimeRemaining,
  onSkipToPhase,
  disabled = false,
}: ListenModePhaseBarProps) {
  // Calculate pause progress (0-100%)
  const pauseProgress = pauseDuration > 0
    ? ((pauseDuration - pauseTimeRemaining) / pauseDuration) * 100
    : 0;

  // Determine which phase is active
  const isFrontActive = phase === "front";
  const isPauseActive = phase === "pause";
  const isBackActive = phase === "back" || phase === "transition";
  const isIdle = phase === "idle";

  // Phase that has been completed
  const frontComplete = isPauseActive || isBackActive;
  const pauseComplete = isBackActive;

  return (
    <div className="w-full">
      {/* Phase Labels */}
      <div className="flex justify-between text-xs text-[#939293] mb-1">
        <span className={isFrontActive ? "text-[#78dce8]" : ""}>Front</span>
        <span className={isPauseActive ? "text-[#ffd866]" : ""}>
          {isPauseActive ? `Thinking... ${pauseTimeRemaining}s` : "Think"}
        </span>
        <span className={isBackActive ? "text-[#a9dc76]" : ""}>Back</span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-[#2d2a2e] border border-[#5b595c]">
        {/* Front Section - 25% */}
        <button
          onClick={() => onSkipToPhase("front")}
          disabled={disabled}
          className={`relative w-[25%] transition-colors ${
            disabled ? "cursor-not-allowed" : "cursor-pointer hover:brightness-110"
          } ${
            isFrontActive
              ? "bg-[#78dce8]"
              : frontComplete
              ? "bg-[#78dce8]/50"
              : "bg-[#5b595c]/30"
          }`}
          title="Jump to Front"
        >
          {isFrontActive && (
            <div className="absolute inset-0 bg-[#78dce8] animate-pulse" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px bg-[#5b595c]" />

        {/* Pause Section - 50% */}
        <button
          onClick={() => onSkipToPhase("pause")}
          disabled={disabled}
          className={`relative w-[50%] transition-colors ${
            disabled ? "cursor-not-allowed" : "cursor-pointer hover:brightness-110"
          } ${
            isPauseActive || pauseComplete
              ? "bg-[#5b595c]/50"
              : "bg-[#5b595c]/30"
          }`}
          title="Jump to Thinking Phase"
        >
          {/* Pause progress fill */}
          {isPauseActive && (
            <div
              className="absolute inset-y-0 left-0 bg-[#ffd866] transition-all duration-1000"
              style={{ width: `${pauseProgress}%` }}
            />
          )}
          {pauseComplete && (
            <div className="absolute inset-0 bg-[#ffd866]/50" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px bg-[#5b595c]" />

        {/* Back Section - 25% */}
        <button
          onClick={() => onSkipToPhase("back")}
          disabled={disabled}
          className={`relative w-[25%] transition-colors ${
            disabled ? "cursor-not-allowed" : "cursor-pointer hover:brightness-110"
          } ${
            isBackActive
              ? "bg-[#a9dc76]"
              : "bg-[#5b595c]/30"
          }`}
          title="Jump to Back"
        >
          {isBackActive && phase === "back" && (
            <div className="absolute inset-0 bg-[#a9dc76] animate-pulse" />
          )}
          {phase === "transition" && (
            <div className="absolute inset-0 bg-[#a9dc76]/50" />
          )}
        </button>
      </div>

      {/* Idle state hint */}
      {isIdle && (
        <p className="text-xs text-[#939293] text-center mt-2">
          Press play to start
        </p>
      )}
    </div>
  );
}
