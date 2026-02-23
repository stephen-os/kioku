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
  // Track if the drag contains actual files (not UI elements)
  const isFileDragRef = useRef(false);

  // Use browser drag events to detect if files are being dragged
  useEffect(() => {
    if (disabled) return;

    const handleDragEnter = (e: DragEvent) => {
      // Check if the drag contains files
      if (e.dataTransfer?.types.includes("Files")) {
        isFileDragRef.current = true;
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only reset when leaving the window entirely
      if (e.relatedTarget === null) {
        isFileDragRef.current = false;
      }
    };

    const handleDrop = () => {
      isFileDragRef.current = false;
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [disabled]);

  // Handle Tauri drag-drop events
  useEffect(() => {
    if (disabled) return;

    const appWindow = getCurrentWindow();

    const unlistenPromise = appWindow.onDragDropEvent((event) => {
      const eventType = event.payload.type;

      if (eventType === "enter" || eventType === "over") {
        // Only show overlay if we detected a file drag
        if (isFileDragRef.current) {
          setIsDragging(true);
        }
      } else if (eventType === "leave") {
        setIsDragging(false);
      } else if (eventType === "drop") {
        setIsDragging(false);
        isFileDragRef.current = false;
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
