import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  foldGutter,
  indentOnInput,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
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
import type { CodeLanguage } from "@/types";

// Monokai Pro color palette
const monokaiColors = {
  background: "#2d2a2e",
  backgroundLight: "#403e41",
  foreground: "#fcfcfa",
  foregroundDim: "#939293",
  yellow: "#ffd866",
  pink: "#ff6188",
  green: "#a9dc76",
  orange: "#fc9867",
  purple: "#ab9df2",
  cyan: "#78dce8",
};

// Custom Monokai Pro syntax highlighting
const monokaiHighlightStyle = HighlightStyle.define([
  // Comments
  { tag: tags.comment, color: monokaiColors.foregroundDim, fontStyle: "italic" },
  { tag: tags.lineComment, color: monokaiColors.foregroundDim, fontStyle: "italic" },
  { tag: tags.blockComment, color: monokaiColors.foregroundDim, fontStyle: "italic" },
  { tag: tags.docComment, color: monokaiColors.foregroundDim, fontStyle: "italic" },

  // Strings
  { tag: tags.string, color: monokaiColors.yellow },
  { tag: tags.special(tags.string), color: monokaiColors.yellow },
  { tag: tags.character, color: monokaiColors.yellow },
  { tag: tags.docString, color: monokaiColors.yellow },

  // Numbers
  { tag: tags.number, color: monokaiColors.purple },
  { tag: tags.integer, color: monokaiColors.purple },
  { tag: tags.float, color: monokaiColors.purple },

  // Keywords
  { tag: tags.keyword, color: monokaiColors.pink },
  { tag: tags.self, color: monokaiColors.pink, fontStyle: "italic" },
  { tag: tags.null, color: monokaiColors.purple },
  { tag: tags.bool, color: monokaiColors.purple },
  { tag: tags.controlKeyword, color: monokaiColors.pink },
  { tag: tags.operatorKeyword, color: monokaiColors.pink },
  { tag: tags.definitionKeyword, color: monokaiColors.pink },
  { tag: tags.moduleKeyword, color: monokaiColors.pink },

  // Operators
  { tag: tags.operator, color: monokaiColors.pink },
  { tag: tags.derefOperator, color: monokaiColors.pink },
  { tag: tags.arithmeticOperator, color: monokaiColors.pink },
  { tag: tags.logicOperator, color: monokaiColors.pink },
  { tag: tags.bitwiseOperator, color: monokaiColors.pink },
  { tag: tags.compareOperator, color: monokaiColors.pink },
  { tag: tags.updateOperator, color: monokaiColors.pink },
  { tag: tags.typeOperator, color: monokaiColors.pink },

  // Functions
  { tag: tags.function(tags.variableName), color: monokaiColors.green },
  { tag: tags.function(tags.propertyName), color: monokaiColors.green },
  { tag: tags.definition(tags.function(tags.variableName)), color: monokaiColors.green },

  // Variables
  { tag: tags.variableName, color: monokaiColors.foreground },
  { tag: tags.definition(tags.variableName), color: monokaiColors.foreground },
  { tag: tags.local(tags.variableName), color: monokaiColors.foreground },
  { tag: tags.special(tags.variableName), color: monokaiColors.orange, fontStyle: "italic" },

  // Properties
  { tag: tags.propertyName, color: monokaiColors.foreground },
  { tag: tags.definition(tags.propertyName), color: monokaiColors.foreground },

  // Types and classes
  { tag: tags.typeName, color: monokaiColors.cyan, fontStyle: "italic" },
  { tag: tags.className, color: monokaiColors.cyan, fontStyle: "italic" },
  { tag: tags.namespace, color: monokaiColors.cyan },
  { tag: tags.macroName, color: monokaiColors.cyan },
  { tag: tags.labelName, color: monokaiColors.foreground },

  // Tags (HTML/XML)
  { tag: tags.tagName, color: monokaiColors.pink },
  { tag: tags.angleBracket, color: monokaiColors.foreground },
  { tag: tags.attributeName, color: monokaiColors.cyan, fontStyle: "italic" },
  { tag: tags.attributeValue, color: monokaiColors.yellow },

  // Punctuation
  { tag: tags.punctuation, color: monokaiColors.foreground },
  { tag: tags.separator, color: monokaiColors.foreground },
  { tag: tags.bracket, color: monokaiColors.foreground },
  { tag: tags.paren, color: monokaiColors.foreground },
  { tag: tags.brace, color: monokaiColors.foreground },
  { tag: tags.squareBracket, color: monokaiColors.foreground },

  // Meta
  { tag: tags.meta, color: monokaiColors.foreground },
  { tag: tags.annotation, color: monokaiColors.cyan },
  { tag: tags.processingInstruction, color: monokaiColors.foregroundDim },

  // Markdown specific
  { tag: tags.heading, color: monokaiColors.pink, fontWeight: "bold" },
  { tag: tags.heading1, color: monokaiColors.pink, fontWeight: "bold" },
  { tag: tags.heading2, color: monokaiColors.pink, fontWeight: "bold" },
  { tag: tags.heading3, color: monokaiColors.pink, fontWeight: "bold" },
  { tag: tags.quote, color: monokaiColors.yellow, fontStyle: "italic" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: monokaiColors.cyan, textDecoration: "underline" },
  { tag: tags.url, color: monokaiColors.cyan },
  { tag: tags.monospace, color: monokaiColors.green },

  // Regexp
  { tag: tags.regexp, color: monokaiColors.yellow },
  { tag: tags.escape, color: monokaiColors.purple },
  { tag: tags.special(tags.regexp), color: monokaiColors.orange },

  // Invalid
  { tag: tags.invalid, color: monokaiColors.pink, textDecoration: "underline wavy" },
]);

// Monokai Pro editor theme
const monokaiTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: monokaiColors.background,
      color: monokaiColors.foreground,
    },
    ".cm-content": {
      caretColor: monokaiColors.yellow,
      padding: "8px 0",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontSize: "13px",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: monokaiColors.yellow,
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#49483e",
      },
    ".cm-panels": {
      backgroundColor: monokaiColors.backgroundLight,
      color: monokaiColors.foreground,
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: `1px solid ${monokaiColors.backgroundLight}`,
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: `1px solid ${monokaiColors.backgroundLight}`,
    },
    ".cm-searchMatch": {
      backgroundColor: "#49483e",
      outline: `1px solid ${monokaiColors.yellow}`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: monokaiColors.yellow + "40",
    },
    ".cm-activeLine": {
      backgroundColor: "#3e3d32",
    },
    ".cm-selectionMatch": {
      backgroundColor: "#49483e",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#49483e",
      outline: `1px solid ${monokaiColors.foregroundDim}`,
    },
    ".cm-gutters": {
      backgroundColor: monokaiColors.background,
      color: monokaiColors.foregroundDim,
      border: "none",
      borderRight: `1px solid ${monokaiColors.backgroundLight}`,
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#3e3d32",
      color: monokaiColors.foreground,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: monokaiColors.foregroundDim,
    },
    ".cm-tooltip": {
      border: "none",
      backgroundColor: monokaiColors.backgroundLight,
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: monokaiColors.backgroundLight,
      borderBottomColor: monokaiColors.backgroundLight,
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: monokaiColors.backgroundLight,
        color: monokaiColors.foreground,
      },
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    },
    ".cm-line": {
      padding: "0 8px",
    },
  },
  { dark: true }
);

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
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
      // Apply Monokai Pro theme and syntax highlighting
      monokaiTheme,
      syntaxHighlighting(monokaiHighlightStyle),
      // Custom min-height
      EditorView.theme({
        "&": {
          minHeight,
        },
      }),
      ...(Array.isArray(languageExtension)
        ? languageExtension
        : [languageExtension]),
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
