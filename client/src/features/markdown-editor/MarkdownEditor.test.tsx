// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownEditor } from "./MarkdownEditor";

vi.mock("./setup", () => ({
  createEditor: vi.fn(() => ({
    setContent: vi.fn(),
    getContent: vi.fn().mockReturnValue("- [ ] task one\n- [x] task two"),
    destroy: vi.fn(),
  })),
}));

vi.mock("@shared/hooks/use-files", () => ({
  useFileContent: vi.fn(() => ({ content: "- [ ] task one\n- [x] task two", isLoading: false })),
}));

vi.mock("@shared/services/filesystem", () => ({
  fs: { writeFile: vi.fn(), readFile: vi.fn() },
}));

vi.mock("@shared/file.store", () => ({
  useFileStore: vi.fn(() => ({ actions: { renameFile: vi.fn() } })),
  resolveWikiLink: vi.fn(),
  resolveFileFromPath: vi.fn(),
}));

vi.mock("@features/theme/theme.store", () => ({
  useThemeStore: vi.fn((sel: any) => sel({ mode: "dark", theme: "indigo" })),
}));

vi.mock("./ViewToggle", () => ({
  ViewToggle: ({ mode, onChange }: any) => (
    <div data-testid="view-toggle" data-mode={mode}>
      <button onClick={() => onChange("read")}>Leitura</button>
      <button onClick={() => onChange("edit")}>Editar</button>
    </div>
  ),
}));

vi.mock("./MarkdownPreview", () => ({
  MarkdownPreview: ({ content, onCheckboxToggle }: any) => (
    <div data-testid="markdown-preview" data-content={content}>
      <button onClick={() => onCheckboxToggle(0, true)}>toggle cb</button>
    </div>
  ),
}));

describe("MarkdownEditor view mode", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders ViewToggle in edit mode by default", () => {
    render(<MarkdownEditor filePath="docs/note.md" />);
    expect(screen.getByTestId("view-toggle")).toHaveAttribute("data-mode", "edit");
  });

  it("shows MarkdownPreview when switched to read mode", async () => {
    render(<MarkdownEditor filePath="docs/note.md" />);
    await userEvent.click(screen.getByRole("button", { name: "Leitura" }));
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });

  it("resets to edit mode when filePath changes", async () => {
    const { rerender } = render(<MarkdownEditor filePath="docs/note.md" />);
    await userEvent.click(screen.getByRole("button", { name: "Leitura" }));
    expect(screen.getByTestId("view-toggle")).toHaveAttribute("data-mode", "read");
    rerender(<MarkdownEditor filePath="docs/other.md" />);
    expect(screen.getByTestId("view-toggle")).toHaveAttribute("data-mode", "edit");
  });

  it("passes snapshotted content to MarkdownPreview", async () => {
    render(<MarkdownEditor filePath="docs/note.md" />);
    await userEvent.click(screen.getByRole("button", { name: "Leitura" }));
    expect(screen.getByTestId("markdown-preview")).toHaveAttribute(
      "data-content",
      "- [ ] task one\n- [x] task two"
    );
  });

  it("calls fs.writeFile when checkbox is toggled in read mode", async () => {
    const { fs } = await import("@shared/services/filesystem");
    render(<MarkdownEditor filePath="docs/note.md" />);
    await userEvent.click(screen.getByRole("button", { name: "Leitura" }));
    await userEvent.click(screen.getByRole("button", { name: "toggle cb" }));
    expect(fs.writeFile).toHaveBeenCalledWith(
      "docs/note.md",
      "- [x] task one\n- [x] task two"  // index 0 toggled to checked
    );
  });
});
