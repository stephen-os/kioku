interface ProgressBarProps {
  percent: number;
  showComplete?: boolean;
}

export function ProgressBar({ percent, showComplete = true }: ProgressBarProps) {
  const isComplete = showComplete && percent === 100;

  return (
    <div className="h-1.5 bg-[#5b595c] rounded-full overflow-hidden">
      <div
        className={`h-full transition-all ${isComplete ? "bg-[#a9dc76]" : "bg-[#ab9df2]"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
