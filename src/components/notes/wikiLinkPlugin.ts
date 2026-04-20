import { $prose } from "@milkdown/kit/utils";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import { Decoration, DecorationSet } from "@milkdown/prose/view";

export interface WikiLinkConfig {
  /** Called when a wiki link is clicked */
  onLinkClick?: (title: string) => void;
}

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Plugin to render [[wiki links]] as clickable elements
 */
export const wikiLinkPlugin = (config: WikiLinkConfig = {}) =>
  $prose(() => {
    const pluginKey = new PluginKey("wiki-link");

    return new Plugin({
      key: pluginKey,
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          const doc = state.doc;

          doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;

            const text = node.text;
            let match: RegExpExecArray | null;

            // Reset regex state
            WIKI_LINK_REGEX.lastIndex = 0;

            while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
              const start = pos + match.index;
              const end = start + match[0].length;
              const title = match[1].trim();
              const display = match[2]?.trim() || title;

              decorations.push(
                Decoration.inline(start, end, {
                  class: "wiki-link",
                  "data-title": title,
                  "data-display": display,
                })
              );
            }
          });

          return DecorationSet.create(doc, decorations);
        },
        handleClick(_view, _pos, event) {
          const target = event.target as HTMLElement;
          if (target.classList.contains("wiki-link")) {
            const title = target.getAttribute("data-title");
            if (title && config.onLinkClick) {
              config.onLinkClick(title);
              return true;
            }
          }
          return false;
        },
      },
    });
  });

/**
 * CSS styles for wiki links - add to milkdown-kioku.css
 */
export const wikiLinkStyles = `
.wiki-link {
  color: #ab9df2;
  text-decoration: none;
  background: rgba(171, 157, 242, 0.1);
  padding: 0 0.25em;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.wiki-link:hover {
  background: rgba(171, 157, 242, 0.2);
  text-decoration: underline;
}
`;
