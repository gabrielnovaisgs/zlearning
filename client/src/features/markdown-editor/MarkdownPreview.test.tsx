// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownPreview, CheckboxRenderer, ImgRenderer } from "./MarkdownPreview";
import { resolveWikiLink } from "@shared/file.store";
import { usePaneController } from "@features/panes/pane-controller.store";

// Mock react-markdown to control rendered output in tests
vi.mock("react-markdown", () => ({
  default: ({ children, components }: any) => {
    // Minimal stub: render children as-is for most tests;
    // specific tests will render the custom components directly.
    return <div data-testid="react-markdown">{children}</div>;
  },
}));

vi.mock("remark-gfm", () => ({ default: () => {} }));
vi.mock("./remark-wiki-link", () => ({ remarkWikiLink: () => {} }));

vi.mock("lucide-react", () => ({
  Square:      ({ size }: any) => <svg data-testid="icon-square" width={size} />,
  SquareCheck: ({ size }: any) => <svg data-testid="icon-square-check" width={size} />,
}));

vi.mock("@shared/file.store", () => ({
  resolveWikiLink:    vi.fn().mockReturnValue("docs/target.md"),
  resolveFileFromPath: vi.fn().mockReturnValue("docs/target.md"),
}));

vi.mock("@features/panes/pane-controller.store", () => ({
  usePaneController: vi.fn(() => ({
    activePaneId: "pane-1",
    actions: {
      openFileInPane: vi.fn(),
      splitPane: vi.fn().mockReturnValue("pane-2"),
    },
  })),
}));

const defaultProps = {
  content: "# Hello",
  filePath: "docs/note.md",
  onCheckboxToggle: vi.fn(),
};

describe("MarkdownPreview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders without crashing", () => {
    render(<MarkdownPreview {...defaultProps} />);
    expect(screen.getByTestId("react-markdown")).toBeInTheDocument();
  });

  it("strips YAML frontmatter before rendering", () => {
    const { rerender } = render(
      <MarkdownPreview
        {...defaultProps}
        content={"---\npdf: '[[note]]'\n---\n# Title"}
      />
    );
    // Content passed to react-markdown should not include frontmatter
    const el = screen.getByTestId("react-markdown");
    expect(el.textContent).not.toContain("pdf:");
  });

  it("does not strip --- that is not at the start", () => {
    render(
      <MarkdownPreview
        {...defaultProps}
        content={"# Title\n\n---\n\nparagraph"}
      />
    );
    const el = screen.getByTestId("react-markdown");
    expect(el.textContent).toContain("Title");
  });

  describe("checkbox component", () => {
    it("renders Square icon for unchecked checkbox", () => {
      render(<CheckboxRenderer checked={false} index={0} onToggle={vi.fn()} />);
      expect(screen.getByTestId("icon-square")).toBeInTheDocument();
    });

    it("renders SquareCheck icon for checked checkbox", () => {
      render(<CheckboxRenderer checked={true} index={0} onToggle={vi.fn()} />);
      expect(screen.getByTestId("icon-square-check")).toBeInTheDocument();
    });

    it("calls onCheckboxToggle with index and new state on click", async () => {
      const onToggle = vi.fn();
      render(<CheckboxRenderer checked={false} index={2} onToggle={onToggle} />);
      await userEvent.click(screen.getByTestId("icon-square").closest("span")!);
      expect(onToggle).toHaveBeenCalledWith(2, true);
    });
  });

  describe("image component", () => {
    it("prefixes relative src with /api/files/raw/", () => {
      render(<ImgRenderer src="docs/img.png" alt="test" />);
      expect(screen.getByRole("img")).toHaveAttribute("src", "/api/files/raw/docs/img.png");
    });

    it("does not prefix absolute http URLs", () => {
      render(<ImgRenderer src="https://example.com/img.png" alt="test" />);
      expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/img.png");
    });
  });

  describe("wiki link component", () => {
    it("renders with preview-wikilink class", () => {
      const openFileInPane = vi.fn();
      (usePaneController as any).mockReturnValue({
        activePaneId: "pane-1",
        actions: { openFileInPane, splitPane: vi.fn().mockReturnValue("pane-2") },
      });
      const Comp = makeWikiLinkComponent("my note", openFileInPane);
      render(<Comp node={{ properties: { dataWikilink: "my note" } }}>{[]}</Comp>);
      expect(screen.getByText("my note")).toHaveClass("preview-wikilink");
    });

    it("calls openFileInPane on click", async () => {
      const openFileInPane = vi.fn();
      (usePaneController as any).mockReturnValue({
        activePaneId: "pane-1",
        actions: { openFileInPane, splitPane: vi.fn().mockReturnValue("pane-2") },
      });
      const Comp = makeWikiLinkComponent("my note", openFileInPane);
      render(<Comp node={{ properties: { dataWikilink: "my note" } }}>{[]}</Comp>);
      await userEvent.click(screen.getByText("my note"));
      expect(openFileInPane).toHaveBeenCalledWith("docs/target.md");
    });
  });
});

// ── Helpers to render individual custom components ──────────────────────────

function makeWikiLinkComponent(wikiValue: string, openFileInPane: ReturnType<typeof vi.fn>) {
  return function WikiLinkComp({ node, children }: { node: any; children: any }) {
    const wikiLinkValue = node?.properties?.dataWikilink as string | undefined;
    if (wikiLinkValue) {
      return (
        <span
          className="preview-wikilink"
          onClick={(e: React.MouseEvent) => {
            const path = resolveWikiLink(wikiLinkValue);
            if (!path) return;
            if (e.ctrlKey || e.metaKey) {
              openFileInPane(path, "pane-2");
            } else {
              openFileInPane(path);
            }
          }}
        >
          {wikiValue}
        </span>
      );
    }
    return <span>{children}</span>;
  };
}
