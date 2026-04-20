import { useState, useRef, useEffect } from "react";

interface SidebarSearchProps {
  /** Current search query */
  value: string;
  /** Called when search query changes */
  onChange: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
}

export function SidebarSearch({
  value,
  onChange,
  placeholder = "Filter pages...",
}: SidebarSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocused) {
        onChange("");
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, onChange]);

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${
          isFocused
            ? "border-[#ffd866] bg-[#2d2a2e]"
            : "border-[#5b595c] bg-[#2d2a2e]/50 hover:border-[#939293]"
        }`}
      >
        <svg
          className="w-3.5 h-3.5 text-[#939293] flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-[#fcfcfa] placeholder-[#939293] outline-none min-w-0"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="text-[#939293] hover:text-[#fcfcfa] p-0.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
