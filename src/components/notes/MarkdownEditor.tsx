import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { cursor } from "@milkdown/kit/plugin/cursor";
import { indent } from "@milkdown/kit/plugin/indent";
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

  // Use refs to always have latest callbacks without triggering re-init
  const onChangeRef = useRef(onChange);
  const onLinkClickRef = useRef(onLinkClick);
  const onSaveRef = useRef(onSave);

  // Keep callback refs updated
  useEffect(() => {
    onChangeRef.current = onChange;
    onLinkClickRef.current = onLinkClick;
    onSaveRef.current = onSave;
  }, [onChange, onLinkClick, onSave]);

  // Initialize editor once on mount (parent uses key prop to remount for new pages)
  useEffect(() => {
    if (!editorRef.current) return;

    const initEditor = async () => {
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, editorRef.current);
          ctx.set(defaultValueCtx, initialContent);

          // Set up listener for content changes - use ref to avoid stale closure
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            onChangeRef.current(markdown);
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(cursor)
        .use(indent)
        .use(listener)
        .use(wikiLinkPlugin({ onLinkClick: (title) => onLinkClickRef.current?.(title) }))
        .create();

      editorInstanceRef.current = editor;
    };

    initEditor();

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
    // Only run on mount - parent handles remounting via key prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Ctrl+S for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSaveRef.current?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="milkdown-editor-wrapper h-full overflow-auto">
      <div ref={editorRef} className="milkdown-editor" />
    </div>
  );
}
