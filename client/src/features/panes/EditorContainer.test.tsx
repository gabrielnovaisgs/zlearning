import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorContainer, EditorType } from "./EditorContainer";

vi.mock("./NewTabScreen", () => ({
  NewTabScreen: () => <div data-testid="new-tab-screen" />,
}));

vi.mock("@features/markdown-editor/MarkdownEditor", () => ({
  MarkdownEditor: ({ filePath }: { filePath: string }) => (
    <div data-testid="markdown-editor" data-filepath={filePath} />
  ),
}));

vi.mock("@features/pdf-viewer/PdfViewer", () => ({
  PdfViewer: ({ pdfPath }: { pdfPath: string }) => (
    <div data-testid="pdf-viewer" data-pdfpath={pdfPath} />
  ),
}));

const defaultProps = {
  filePath: null,
  paneId: "pane-1",
  isFocused: false,
};

describe("EditorContainer", () => {
  it("renders NewTabScreen when type is NewTab", () => {
    render(<EditorContainer {...defaultProps} type={EditorType.NewTab} />);
    expect(screen.getByTestId("new-tab-screen")).toBeInTheDocument();
  });

  it("renders MarkdownEditor when type is Markdown", () => {
    render(
      <EditorContainer
        {...defaultProps}
        type={EditorType.Markdown}
        filePath="notes/foo.md"
      />
    );
    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
  });

  it("renders PdfViewer when type is Pdf", () => {
    render(
      <EditorContainer
        {...defaultProps}
        type={EditorType.Pdf}
        filePath="docs/bar.pdf"
      />
    );
    expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
  });

  it("passes filePath to MarkdownEditor", () => {
    render(
      <EditorContainer
        {...defaultProps}
        type={EditorType.Markdown}
        filePath="notes/foo.md"
      />
    );
    expect(screen.getByTestId("markdown-editor")).toHaveAttribute(
      "data-filepath",
      "notes/foo.md"
    );
  });

  it("passes filePath to PdfViewer", () => {
    render(
      <EditorContainer
        {...defaultProps}
        type={EditorType.Pdf}
        filePath="docs/bar.pdf"
      />
    );
    expect(screen.getByTestId("pdf-viewer")).toHaveAttribute(
      "data-pdfpath",
      "docs/bar.pdf"
    );
  });

  it("renders only one component at a time", () => {
    const { rerender } = render(
      <EditorContainer {...defaultProps} type={EditorType.NewTab} />
    );
    expect(screen.getByTestId("new-tab-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pdf-viewer")).not.toBeInTheDocument();

    rerender(
      <EditorContainer
        {...defaultProps}
        type={EditorType.Markdown}
        filePath="notes/foo.md"
      />
    );
    expect(screen.queryByTestId("new-tab-screen")).not.toBeInTheDocument();
    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-viewer")).not.toBeInTheDocument();
  });

  it("wraps content in a container div with correct classes", () => {
    const { container } = render(
      <EditorContainer {...defaultProps} type={EditorType.NewTab} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("relative");
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("bg-bg-primary");
  });
});
