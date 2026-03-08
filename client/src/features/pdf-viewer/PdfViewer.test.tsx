import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfViewer } from "./PdfViewer";
import * as editorSetup from "@features/markdown-editor/setup";

// Mock dependencies
vi.mock("react-pdf-highlighter", () => ({
  PdfLoader: ({ beforeLoad }: any) => (
    <div data-testid="pdf-loader">
      {beforeLoad}
      <div data-testid="pdf-highlighter" />
    </div>
  ),
  PdfHighlighter: ({
    highlightTransform,
    highlights,
    ref,
  }: any) => {
    if (ref) {
      ref.current = {
        viewer: {
          currentScale: 1.0,
          currentScaleValue: "1",
          scrollPageIntoView: vi.fn(),
        },
      };
    }
    return (
      <div data-testid="pdf-highlighter">
        {highlights.map((h: any, i: number) =>
          highlightTransform(h, i, vi.fn(), vi.fn(), vi.fn(), vi.fn(), false)
        )}
      </div>
    );
  },
}));

const mockFs = vi.hoisted(() => ({
  listFiles: vi.fn().mockResolvedValue([]),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  createFile: vi.fn(),
  createDirectory: vi.fn(),
  renameFile: vi.fn(),
  moveFile: vi.fn(),
  duplicateFile: vi.fn(),
  createUntitled: vi.fn(),
  deleteFile: vi.fn(),
} as any));

vi.mock("@features/markdown-editor/setup");
vi.mock("@shared/services/filesystem", () => ({
  HttpFileSystemService: vi.fn().mockImplementation(() => mockFs),
  fs: mockFs,
}));
vi.mock("./pdf.store", () => ({
  pdfStore: {
    getState: vi.fn(() => null),
    subscribe: vi.fn(() => () => {}),
    clearTarget: vi.fn(),
  },
}));

const mockCreateEditor = vi.fn();

vi.mocked(editorSetup.createEditor).mockImplementation(mockCreateEditor);

describe("PdfViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const defaultMockEditor = {
      destroy: vi.fn(),
      setContent: vi.fn(),
      view: {
        state: { doc: { length: 0 } },
        dispatch: vi.fn(),
      },
    };

    mockCreateEditor.mockReturnValue(defaultMockEditor);
    mockFs.readFile.mockRejectedValue(new Error("Not found"));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.createFile.mockResolvedValue(undefined);
  });

  it("renders PDF viewer container", () => {
    render(<PdfViewer pdfPath="test.pdf" />);
    expect(screen.getByTestId("pdf-loader")).toBeInTheDocument();
  });

  it("renders toolbar with TOC button", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);
    const tocBtn = container.querySelector('button[title="Índice"]');
    expect(tocBtn).toBeInTheDocument();
  });

  it("toggles TOC sidebar when TOC button clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    const tocBtn = container.querySelector('button[title="Índice"]');
    if (tocBtn) {
      expect(container.querySelector(".w-56")).not.toBeInTheDocument();

      await user.click(tocBtn);
      await waitFor(() => {
        expect(container.querySelector(".w-56")).toBeInTheDocument();
      });

      await user.click(tocBtn);
      await waitFor(() => {
        expect(container.querySelector(".w-56")).not.toBeInTheDocument();
      });
    }
  });

  it("initializes with PDF path prop", () => {
    render(<PdfViewer pdfPath="test.pdf" />);
    expect(screen.getByTestId("pdf-loader")).toBeInTheDocument();
  });

  it("renders editor container for notes", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);
    const notesPanel = container.querySelector(
      ".flex-1.overflow-y-auto"
    );
    expect(notesPanel).toBeInTheDocument();
  });

  it("initializes highlights as empty", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);
    expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
  });

  it("renders zoom controls", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    const decreaseZoomBtn = container.querySelector(
      'button[title="Diminuir zoom"]'
    );
    const increaseZoomBtn = container.querySelector(
      'button[title="Aumentar zoom"]'
    );

    expect(decreaseZoomBtn).toBeInTheDocument();
    expect(increaseZoomBtn).toBeInTheDocument();
  });

  it("initializes PDF viewer with path", () => {
    render(<PdfViewer pdfPath="test.pdf" />);
    expect(screen.getByTestId("pdf-loader")).toBeInTheDocument();
  });

  it("accepts page input in the toolbar", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    const inputs = container.querySelectorAll('input[type="text"]');
    const pageInput = Array.from(inputs).find((input) =>
      input.className.includes("w-9")
    );

    expect(pageInput).toBeInTheDocument();
  });

  it("supports PDF rerendering with new path", async () => {
    mockFs.readFile.mockRejectedValue(new Error("Not found"));

    const { rerender } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });

    // Rerender with different PDF
    rerender(<PdfViewer pdfPath="different.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });
  });

  it("renders toolbar with controls", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    // Toolbar should be present
    const toolbar = container.querySelector(".flex.items-center.px-2.py-1");
    expect(toolbar).toBeInTheDocument();
  });

  it("destroys editor on unmount", async () => {
    const mockEditor = {
      destroy: vi.fn(),
      setContent: vi.fn(),
      view: {
        state: { doc: { length: 0 } },
        dispatch: vi.fn(),
      },
    };
    mockCreateEditor.mockReturnValue(mockEditor);

    const { unmount } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(mockEditor.destroy).not.toHaveBeenCalled();
    });

    unmount();

    expect(mockEditor.destroy).toHaveBeenCalled();
  });

  it("renders zoom controls and input", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    const zoomInputs = container.querySelectorAll('input[type="text"]');
    const zoomInput = Array.from(zoomInputs).find(
      (input) => input.className.includes("tabular-nums")
    );

    expect(zoomInput).toBeInTheDocument();
  });

  it("shows loading message before PDF loads", () => {
    render(<PdfViewer pdfPath="test.pdf" />);
    expect(screen.getByText(/Carregando PDF…/i)).toBeInTheDocument();
  });

  it("has notes panel on the right", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);
    const notesPanel = container.querySelector(
      ".flex-1.overflow-y-auto"
    );
    expect(notesPanel).toBeInTheDocument();
  });

  it("renders resize handle for notes panel", () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);
    const resizeHandle = container.querySelector(".cursor-col-resize");
    expect(resizeHandle).toBeInTheDocument();
  });

  it("creates editor with save callback", async () => {
    const mockEditor = {
      destroy: vi.fn(),
      setContent: vi.fn(),
      view: {
        state: { doc: { length: 100 } },
        dispatch: vi.fn(),
      },
    };
    mockCreateEditor.mockReturnValue(mockEditor);
    mockFs.readFile.mockResolvedValue({ content: "---\npdf: test\n---\n" });

    render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(mockCreateEditor).toHaveBeenCalled();
      // Verify that createEditor was called with a DOM node and a callback
      expect(mockCreateEditor.mock.calls[0]?.length).toBe(2);
    });
  });
});
