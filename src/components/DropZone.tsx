import { useState, useEffect, useRef, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface DropZoneProps {
  children: ReactNode;
  onFileDrop: (filePath: string) => void;
  accept?: string; // File extension without dot, e.g., "json"
  disabled?: boolean;
  label?: string;
}

export function DropZone({
  children,
  onFileDrop,
  accept = "json",
  disabled = false,
  label = "Drop file here to import",
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  // Track if an internal (non-file) drag is happening
  const isInternalDragRef = useRef(false);

  // Detect internal drags (UI elements, not files) via browser events
  useEffect(() => {
    if (disabled) return;

    const handleDragStart = () => {
      // If drag starts within the app, it's an internal drag (not a file from OS)
      isInternalDragRef.current = true;
    };

    const handleDragEnd = () => {
      isInternalDragRef.current = false;
    };

    // Listen for drag start/end on the document to detect internal drags
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragend", handleDragEnd);

    return () => {
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("dragend", handleDragEnd);
    };
  }, [disabled]);

  // Handle Tauri drag-drop events (only fires for external file drags)
  useEffect(() => {
    if (disabled) return;

    const appWindow = getCurrentWindow();

    const unlistenPromise = appWindow.onDragDropEvent((event) => {
      const eventType = event.payload.type;

      if (eventType === "enter" || eventType === "over") {
        // Only show overlay if this is NOT an internal drag
        if (!isInternalDragRef.current) {
          setIsDragging(true);
        }
      } else if (eventType === "leave") {
        setIsDragging(false);
      } else if (eventType === "drop") {
        setIsDragging(false);
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          const filePath = paths[0];
          // Check file extension
          if (accept && !filePath.toLowerCase().endsWith(`.${accept}`)) {
            console.warn(`Invalid file type. Expected .${accept}`);
            return;
          }
          onFileDrop(filePath);
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [disabled, accept, onFileDrop]);

  return (
    <div className="relative min-h-full">
      {children}

      {/* Drag overlay */}
      {isDragging && !disabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d2a2e]/90 backdrop-blur-sm">
          <div className="border-4 border-dashed border-[#ffd866] rounded-2xl p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-[#ffd866] mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-xl font-medium text-[#ffd866]">{label}</p>
            <p className="text-sm text-[#939293] mt-2">.{accept} files only</p>
          </div>
        </div>
      )}
    </div>
  );
}
