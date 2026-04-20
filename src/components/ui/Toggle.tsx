interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  description?: string;
}

/**
 * Reusable toggle switch component
 * Styled consistently with Kioku's design system
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = "md",
  label,
  description,
}: ToggleProps) {
  const sizes = {
    sm: {
      track: "w-9 h-5",
      thumb: "w-3 h-3",
      translate: checked ? "translate-x-5" : "translate-x-1",
    },
    md: {
      track: "w-12 h-6",
      thumb: "w-4 h-4",
      translate: checked ? "translate-x-7" : "translate-x-1",
    },
  };

  const s = sizes[size];

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative ${s.track} rounded-full transition-colors
        ${checked ? "bg-[#a9dc76]" : "bg-[#5b595c]"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          absolute top-1 ${s.thumb} bg-white rounded-full transition-transform
          ${s.translate}
        `}
      />
    </button>
  );

  if (!label) {
    return toggle;
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[#fcfcfa] font-medium">{label}</p>
        {description && (
          <p className="text-xs text-[#939293]">{description}</p>
        )}
      </div>
      {toggle}
    </div>
  );
}
