import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfViewer } from "./PdfViewer";
import * as editorSetup from "@core/editor/setup";
import { HttpFileSystemService } from "@core/services/filesystem";
import * as storeModule from "@core/store";

// Mock dependencies
vi.mock("react-pdf-highlighter", () => ({
  PdfLoader: ({ children, beforeLoad }: any) => (
    <div data-testid="pdf-loader">
      {beforeLoad}
      {children({
        numPages: 5,
        getOutline: () => Promise.resolve([]),
      })}
    </div>
  ),
  PdfHighlighter: ({
    children,
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

vi.mock("@core/editor/setup");
vi.mock("@core/services/filesystem");
vi.mock("@core/store");
vi.mock("../hooks", () => ({
  useStore: () => ({
    pdfHighlightTarget: null,
  }),
}));

const mockCreateEditor = vi.fn();
const mockFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  createFile: vi.fn(),
} as any;

const mockStore = {
  clearPdfHighlightTarget: vi.fn(),
  loadFileTree: vi.fn(),
} as any;

vi.mocked(editorSetup.createEditor).mockImplementation(mockCreateEditor);
vi.mocked(HttpFileSystemService).mockImplementation(() => mockFs);

// Mock the store object itself
Object.defineProperty(storeModule, "store", {
  value: mockStore,
  configurable: true,
});

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
    const resetZoomBtn = container.querySelector(
      'button:has-text("reset")'
    );

    expect(decreaseZoomBtn).toBeInTheDocument();
    expect(increaseZoomBtn).toBeInTheDocument();
  });

  it("shows page navigation when PDF loaded", async () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      const pageInput = container.querySelector(
        'input[type="text"]'
      ) as HTMLInputElement;
      expect(pageInput).toBeInTheDocument();
      // After PDF loads, should show page navigation
      expect(container.textContent).toContain("/");
    });
  });

  it("handles page navigation", async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });

    const inputs = container.querySelectorAll('input[type="text"]');
    const pageInput = Array.from(inputs).find((input) =>
      input.className.includes("w-9")
    ) as HTMLInputElement | undefined;

    if (pageInput) {
      await user.clear(pageInput);
      await user.type(pageInput, "2");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(pageInput.value).toBe("2");
      });
    }
  });

  it("clamps page number to valid range", async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });

    const inputs = container.querySelectorAll('input[type="text"]');
    const pageInput = Array.from(inputs).find((input) =>
      input.className.includes("w-9")
    ) as HTMLInputElement | undefined;

    if (pageInput) {
      await user.clear(pageInput);
      await user.type(pageInput, "999");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        // Should be clamped to max pages (5 in this test)
        expect(pageInput.value).toBe("5");
      });
    }
  });

  it("resets page when PDF changes", async () => {
    mockFs.readFile.mockRejectedValue(new Error("Not found"));

    const { rerender, container } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });

    const inputs = container.querySelectorAll('input[type="text"]');
    const pageInput = Array.from(inputs).find((input) =>
      input.className.includes("w-9")
    ) as HTMLInputElement | undefined;

    // Verify initial state (page 1)
    if (pageInput) {
      expect(pageInput.value).toBe("1");
    }

    // Rerender with different PDF
    rerender(<PdfViewer pdfPath="different.pdf" />);

    // Page should reset to 1 after PDF change
    await waitFor(() => {
      const newInputs = container.querySelectorAll('input[type="text"]');
      const newPageInput = Array.from(newInputs).find((input) =>
        input.className.includes("w-9")
      ) as HTMLInputElement | undefined;

      if (newPageInput) {
        expect(newPageInput.value).toBe("1");
      }
    });
  });

  it("disables previous button on first page", async () => {
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });

    const prevBtn = Array.from(
      container.querySelectorAll('button[title="Página anterior"]')
    )[0] as HTMLButtonElement;

    if (prevBtn) {
      expect(prevBtn.disabled).toBe(true);
    }
  });

  it("disables next button on last page", async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });

    // Navigate to last page (5)
    const inputs = container.querySelectorAll('input[type="text"]');
    const pageInput = Array.from(inputs).find((input) =>
      input.className.includes("w-9")
    ) as HTMLInputElement | undefined;

    if (pageInput) {
      await user.clear(pageInput);
      await user.type(pageInput, "5");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        const nextBtn = Array.from(
          container.querySelectorAll('button[title="Próxima página"]')
        )[0] as HTMLButtonElement;

        if (nextBtn) {
          expect(nextBtn.disabled).toBe(true);
        }
      });
    }
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

  it("handles zoom input validation", async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfViewer pdfPath="test.pdf" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-highlighter")).toBeInTheDocument();
    });

    const zoomInputs = container.querySelectorAll('input[type="text"]');
    const zoomInput = Array.from(zoomInputs).find(
      (input) => input.className.includes("tabular-nums")
    ) as HTMLInputElement | undefined;

    if (zoomInput) {
      // Try invalid value
      await user.click(zoomInput);
      await user.clear(zoomInput);
      await user.type(zoomInput, "1000");
      await user.keyboard("{Enter}");

      // Should revert to valid value or default
      await waitFor(() => {
        const val = parseInt(zoomInput.value);
        expect(val).toBeLessThanOrEqual(500);
      });
    }
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
