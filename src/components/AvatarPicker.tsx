import { AVATARS, type AvatarId } from "@/types";

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatar: AvatarId) => void;
  size?: "sm" | "md" | "lg";
}

export function AvatarPicker({ selected, onSelect, size = "md" }: AvatarPickerProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {AVATARS.map((avatar) => (
        <button
          key={avatar}
          type="button"
          onClick={() => onSelect(avatar)}
          className={`${sizeClasses[size]} rounded-full transition-all hover:scale-110 ${
            selected === avatar
              ? "ring-3 ring-[#ffd866] ring-offset-2 ring-offset-[#403e41] scale-110"
              : "hover:ring-2 hover:ring-[#5b595c]"
          }`}
        >
          <img
            src={`/avatars/${avatar}.svg`}
            alt={avatar}
            className="w-full h-full"
          />
        </button>
      ))}
    </div>
  );
}

interface AvatarDisplayProps {
  avatar: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function AvatarDisplay({ avatar, size = "md", className = "" }: AvatarDisplayProps) {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  // SVGs are already circular, no need for overflow-hidden clipping
  return (
    <img
      src={`/avatars/${avatar}.svg`}
      alt="User avatar"
      className={`${sizeClasses[size]} flex-shrink-0 ${className}`}
    />
  );
}
