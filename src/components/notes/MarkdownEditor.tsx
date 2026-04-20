import { useEffect, useRef, useCallback } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { cursor } from "@milkdown/kit/plugin/cursor";
import { indent } from "@milkdown/kit/plugin/indent";
import { trailing } from "@milkdown/kit/plugin/trailing";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { wikiLinkPlugin } from "./wikiLinkPlugin";
import "@milkdown/theme-nord/style.css";
import "./milkdown-kioku.css";

interface MarkdownEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  onSave?: () => void;
  /** Called when a [[wiki link]] is clicked */
  onLinkClick?: (title: string) => void;
}

export function MarkdownEditor({ initialContent, onChange, onSave, onLinkClick }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const initialContentRef = useRef(initialContent);
  const onLinkClickRef = useRef(onLinkClick);

  // Keep callback ref updated
  useEffect(() => {
    onLinkClickRef.current = onLinkClick;
  }, [onLinkClick]);

  const handleLinkClick = useCallback((title: string) => {
    onLinkClickRef.current?.(title);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const initEditor = async () => {
      // Destroy previous instance if exists
      if (editorInstanceRef.current) {
        await editorInstanceRef.current.destroy();
      }

      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, editorRef.current);
          ctx.set(defaultValueCtx, initialContentRef.current);

          // Set up listener for content changes
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            onChange(markdown);
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(cursor)
        .use(indent)
        .use(trailing)
        .use(listener)
        .use(wikiLinkPlugin({ onLinkClick: handleLinkClick }))
        .create();

      editorInstanceRef.current = editor;
    };

    initEditor();

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
      }
    };
  }, [handleLinkClick]); // Include handleLinkClick in deps

  // Handle Ctrl+S for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  return (
    <div className="milkdown-editor-wrapper h-full overflow-auto">
      <div ref={editorRef} className="milkdown-editor" />
    </div>
  );
}
