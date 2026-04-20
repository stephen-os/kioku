/**
 * Utilities for parsing and handling internal wiki-style [[links]]
 */

export interface ParsedLink {
  /** Full match including brackets: [[Page Name]] */
  raw: string;
  /** The page title inside brackets */
  title: string;
  /** Display text if using pipe syntax: [[Page Name|Display]] */
  display: string;
  /** Start index in source string */
  start: number;
  /** End index in source string */
  end: number;
}

export interface ResolvedLink extends ParsedLink {
  /** Page ID if found */
  pageId: string | null;
  /** Notebook ID if found */
  notebookId: string | null;
  /** Whether the page exists */
  exists: boolean;
}

// Regex to match [[Page Name]] or [[Page Name|Display Text]]
const LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Parse all [[links]] from markdown content
 */
export function parseLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(content)) !== null) {
    const title = match[1].trim();
    const display = match[2]?.trim() || title;

    links.push({
      raw: match[0],
      title,
      display,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return links;
}

/**
 * Extract unique page titles from content
 */
export function extractLinkTitles(content: string): string[] {
  const links = parseLinks(content);
  const titles = new Set(links.map((link) => link.title));
  return Array.from(titles);
}

/**
 * Check if content contains any [[links]]
 */
export function hasLinks(content: string): boolean {
  LINK_PATTERN.lastIndex = 0;
  return LINK_PATTERN.test(content);
}

/**
 * Replace [[links]] with rendered HTML or markdown
 */
export function replaceLinks(
  content: string,
  replacer: (link: ParsedLink) => string
): string {
  const links = parseLinks(content);

  // Process in reverse order to preserve indices
  let result = content;
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i];
    const replacement = replacer(link);
    result = result.slice(0, link.start) + replacement + result.slice(link.end);
  }

  return result;
}

/**
 * Create a [[link]] from a page title
 */
export function createLink(title: string, displayText?: string): string {
  if (displayText && displayText !== title) {
    return `[[${title}|${displayText}]]`;
  }
  return `[[${title}]]`;
}

/**
 * Escape special characters in page title for use in link
 */
export function escapeTitle(title: string): string {
  // Remove brackets and pipes which would break the syntax
  return title.replace(/[\[\]|]/g, "");
}

/**
 * Check if a string is currently typing a link (cursor inside [[)
 * Returns the partial query if typing, null otherwise
 */
export function getPartialLink(
  content: string,
  cursorPosition: number
): string | null {
  // Look backwards from cursor for [[
  const before = content.slice(0, cursorPosition);

  // Find the last [[ that isn't closed
  const lastOpen = before.lastIndexOf("[[");
  if (lastOpen === -1) return null;

  // Check if there's a ]] between [[ and cursor
  const between = before.slice(lastOpen + 2);
  if (between.includes("]]")) return null;

  // Don't match if there's a newline (links shouldn't span lines)
  if (between.includes("\n")) return null;

  // Return the partial query (text after [[)
  // Handle pipe syntax - return text after | if present
  const pipeIndex = between.indexOf("|");
  if (pipeIndex !== -1) {
    return between.slice(pipeIndex + 1);
  }

  return between;
}

/**
 * Get autocomplete suggestions based on partial input
 */
export function filterSuggestions(
  pages: Array<{ id: string; title: string; notebookId: string }>,
  query: string,
  excludePageId?: string
): Array<{ id: string; title: string; notebookId: string }> {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    // Return all pages except current
    return pages.filter((p) => p.id !== excludePageId).slice(0, 10);
  }

  return pages
    .filter((page) => {
      if (page.id === excludePageId) return false;
      return page.title.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => {
      // Prioritize titles that start with the query
      const aStarts = a.title.toLowerCase().startsWith(normalizedQuery);
      const bStarts = b.title.toLowerCase().startsWith(normalizedQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 10);
}
