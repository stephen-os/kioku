import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { markdown } from "@codemirror/lang-markdown";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import type { CodeLanguage } from "@/types";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeLanguage | null;
  readOnly?: boolean;
  className?: string;
  minHeight?: string;
}

function getLanguageExtension(language: CodeLanguage | null | undefined) {
  switch (language) {
    case "JAVASCRIPT":
      return javascript();
    case "TYPESCRIPT":
      return javascript({ typescript: true });
    case "PYTHON":
      return python();
    case "RUST":
      return rust();
    case "C":
    case "CPP":
      return cpp();
    case "JAVA":
    case "KOTLIN":
    case "SCALA":
      return java();
    case "HTML":
      return html();
    case "CSS":
      return css();
    case "JSON":
      return json();
    case "XML":
      return xml();
    case "MARKDOWN":
      return markdown();
    case "SQL":
      return sql();
    case "YAML":
    case "TOML":
      return yaml();
    case "GO":
    case "SWIFT":
    case "DART":
    case "CSHARP":
    case "FSHARP":
    case "HASKELL":
    case "ELIXIR":
    case "CLOJURE":
    case "GRAPHQL":
    case "R":
    case "RUBY":
    case "PHP":
    case "PERL":
    case "BASH":
    case "POWERSHELL":
    case "DOCKER":
    case "REGEX":
    case "PLAINTEXT":
    default:
      return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  className = "",
  minHeight = "100px",
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const languageExtension = getLanguageExtension(language);

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      oneDark,
      EditorView.theme({
        "&": {
          height: "100%",
          minHeight,
          fontSize: "13px",
          backgroundColor: "#1a1a2e",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        },
        ".cm-content": {
          padding: "8px 0",
        },
        ".cm-gutters": {
          backgroundColor: "#16161e",
          border: "none",
        },
      }),
      ...(Array.isArray(languageExtension) ? languageExtension : [languageExtension]),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
      extensions.push(EditorView.editable.of(false));
    }

    if (onChange) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        })
      );
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly, minHeight]);

  // Update content when value changes externally
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`rounded-lg overflow-hidden border border-[#5b595c] ${className}`}
    />
  );
}

// Read-only code display component
export function CodeBlock({
  code,
  language,
  className = "",
}: {
  code: string;
  language?: CodeLanguage | null;
  className?: string;
}) {
  return (
    <CodeEditor
      value={code}
      language={language}
      readOnly={true}
      className={className}
      minHeight="auto"
    />
  );
}
