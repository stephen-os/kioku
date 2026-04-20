import { useState, useCallback, useEffect, type ReactNode } from "react";

interface ResizablePanelProps {
  /** Current width in pixels */
  width: number;
  /** Called when width changes during resize */
  onWidthChange: (width: number) => void;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Which side the resize handle is on */
  resizeFrom?: "left" | "right";
  /** Whether resizing is disabled */
  disabled?: boolean;
  /** Panel content */
  children: ReactNode;
  /** Additional class names for the panel */
  className?: string;
}

export function ResizablePanel({
  width,
  onWidthChange,
  minWidth = 200,
  maxWidth = 400,
  resizeFrom = "right",
  disabled = false,
  children,
  className = "",
}: ResizablePanelProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsResizing(true);
      setStartX(e.clientX);
      setStartWidth(width);
    },
    [disabled, width]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeFrom === "right"
        ? e.clientX - startX
        : startX - e.clientX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add cursor style to body during resize
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, startX, startWidth, minWidth, maxWidth, resizeFrom, onWidthChange]);

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}

      {/* Resize handle */}
      {!disabled && (
        <div
          className={`absolute top-0 bottom-0 w-1 cursor-col-resize group z-10 ${
            resizeFrom === "right" ? "right-0" : "left-0"
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator */}
          <div
            className={`absolute top-0 bottom-0 w-0.5 transition-colors ${
              resizeFrom === "right" ? "right-0" : "left-0"
            } ${
              isResizing
                ? "bg-[#ffd866]"
                : "bg-transparent group-hover:bg-[#5b595c]"
            }`}
          />
        </div>
      )}
    </div>
  );
}
