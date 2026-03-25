import { visit } from "unist-util-visit";
import type { Root, Text, Parent } from "mdast";

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

export function remarkWikiLink() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;

      const matches: Array<{ value: string; start: number; end: number }> = [];
      let match: RegExpExecArray | null;
      WIKI_LINK_RE.lastIndex = 0;
      while ((match = WIKI_LINK_RE.exec(node.value)) !== null) {
        matches.push({ value: match[1], start: match.index, end: WIKI_LINK_RE.lastIndex });
      }

      if (matches.length === 0) return;

      const newNodes: any[] = [];
      let cursor = 0;

      for (const { value, start, end } of matches) {
        if (start > cursor) {
          newNodes.push({ type: "text", value: node.value.slice(cursor, start) });
        }
        newNodes.push({
          type: "wikiLink",
          value,
          data: {
            hName: "span",
            hProperties: { "data-wikilink": value },
          },
          children: [{ type: "text", value }],
        });
        cursor = end;
      }

      if (cursor < node.value.length) {
        newNodes.push({ type: "text", value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...newNodes);
    });
  };
}
