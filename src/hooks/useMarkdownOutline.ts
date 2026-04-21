import { useMemo } from "react";

export interface OutlineHeading {
  /** Heading level (1-6) */
  level: number;
  /** Heading text */
  text: string;
  /** Character position in the content (or block index for BlockNote) */
  position: number;
  /** Unique ID for this heading */
  id: string;
}

// BlockNote block content types
interface BlockNoteTextContent {
  type: "text";
  text: string;
  styles?: Record<string, boolean | string>;
}

interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: {
    level?: number;
    [key: string]: unknown;
  };
  content?: BlockNoteTextContent[] | string;
  children?: BlockNoteBlock[];
}

/**
 * Extract text content from BlockNote content array
 */
function extractBlockText(content: BlockNoteTextContent[] | string | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((item): item is BlockNoteTextContent => item.type === "text")
    .map((item) => item.text)
    .join("");
}

/**
 * Parse BlockNote JSON content to extract headings for outline
 */
export function parseBlockNoteHeadings(content: string): OutlineHeading[] {
  if (!content || content.trim() === "") return [];

  // Check if content is JSON (BlockNote format)
  const trimmed = content.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return []; // Not BlockNote JSON format
  }

  try {
    const blocks: BlockNoteBlock[] = JSON.parse(content);
    const headings: OutlineHeading[] = [];

    blocks.forEach((block, index) => {
      if (block.type === "heading") {
        const level = block.props?.level ?? 1;
        const text = extractBlockText(block.content);

        if (text.trim()) {
          const id =
            block.id ||
            `heading-${index}-${text
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-")
              .substring(0, 50)}`;

          headings.push({
            level,
            text: text.trim(),
            position: index,
            id,
          });
        }
      }
    });

    return headings;
  } catch {
    return [];
  }
}

/**
 * Hook to parse BlockNote JSON content for outline headings
 */
export function useBlockNoteOutline(content: string): OutlineHeading[] {
  return useMemo(() => parseBlockNoteHeadings(content), [content]);
}

/**
 * Extract headings from markdown content for outline generation
 */
export function useMarkdownOutline(content: string): OutlineHeading[] {
  return useMemo(() => {
    if (!content) return [];

    const headings: OutlineHeading[] = [];
    // Match ATX-style headings: # Heading, ## Heading, etc.
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;

    let match;
    let index = 0;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();

      // Generate a slug-like ID from the text
      const id = `heading-${index}-${text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 50)}`;

      headings.push({
        level,
        text,
        position: match.index,
        id,
      });
      index++;
    }

    return headings;
  }, [content]);
}

/**
 * Get word and character count from content
 */
export function useWordCount(content: string): { words: number; characters: number } {
  return useMemo(() => {
    if (!content) return { words: 0, characters: 0 };

    // Remove markdown syntax for more accurate word count
    const plainText = content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]+`/g, "")
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "");

    const words = plainText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    const characters = plainText.replace(/\s/g, "").length;

    return { words, characters };
  }, [content]);
}

/**
 * Format a date as relative time or absolute based on age
 */
export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
