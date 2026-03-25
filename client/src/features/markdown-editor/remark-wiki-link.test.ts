import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkWikiLink } from "./remark-wiki-link";
import type { Root } from "mdast";

function parse(markdown: string): Root {
  return unified().use(remarkParse).use(remarkWikiLink).parse(markdown) as Root;
}

describe("remarkWikiLink", () => {
  it("converts [[note]] inside plain text to a wikiLink node", () => {
    const tree = parse("see [[my note]] for details");
    const paragraph = (tree.children[0] as any);
    const wikiNode = paragraph.children.find((n: any) => n.type === "wikiLink");
    expect(wikiNode).toBeDefined();
    expect(wikiNode.value).toBe("my note");
    expect(wikiNode.data.hName).toBe("span");
    expect(wikiNode.data.hProperties["data-wikilink"]).toBe("my note");
  });

  it("keeps surrounding text nodes intact", () => {
    const tree = parse("see [[my note]] for details");
    const children = (tree.children[0] as any).children;
    expect(children[0].type).toBe("text");
    expect(children[0].value).toBe("see ");
    expect(children[children.length - 1].type).toBe("text");
    expect(children[children.length - 1].value).toBe(" for details");
  });

  it("handles multiple wiki links in one paragraph", () => {
    const tree = parse("[[note a]] and [[note b]]");
    const children = (tree.children[0] as any).children;
    const wikiNodes = children.filter((n: any) => n.type === "wikiLink");
    expect(wikiNodes).toHaveLength(2);
    expect(wikiNodes[0].value).toBe("note a");
    expect(wikiNodes[1].value).toBe("note b");
  });

  it("leaves text without [[ alone", () => {
    const tree = parse("just plain text");
    const children = (tree.children[0] as any).children;
    expect(children).toHaveLength(1);
    expect(children[0].type).toBe("text");
  });
});
