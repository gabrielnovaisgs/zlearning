import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HighlightMenu } from "../PdfViewer/PdfHighlightMenu";
import * as translationService from "@core/services/translation";

vi.mock("@core/services/translation");

const mockTranslateText = vi.fn();
const mockGetExamples = vi.fn();

vi.mocked(translationService.translateText).mockImplementation(mockTranslateText);
vi.mocked(translationService.getExamples).mockImplementation(mockGetExamples);

describe("HighlightMenu - Selection Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4 color buttons", () => {
    const { container } = render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        showLabel
        useMouseDownForColor
      />
    );
    const buttons = container.querySelectorAll("button");
    // 4 color buttons
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("calls onColorSelect with correct color when color button clicked", async () => {
    const user = userEvent.setup();
    const onColorSelect = vi.fn();
    const { container } = render(
      <HighlightMenu
        onColorSelect={onColorSelect}
        showLabel
        useMouseDownForColor
      />
    );

    const colorButtons = container.querySelectorAll(
      ".w-6.h-6.rounded-full"
    );
    expect(colorButtons.length).toBe(4);

    // Click first color (yellow) - using onMouseDown
    await user.pointer({ keys: "[MouseLeft]", target: colorButtons[0] as HTMLButtonElement });
    expect(onColorSelect).toHaveBeenCalledWith("yellow");
  });

  it("does not render translate button without textToTranslate", () => {
    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        showLabel
        useMouseDownForColor
      />
    );
    const translateBtn = screen.queryByText(/Traduzir/i);
    expect(translateBtn).not.toBeInTheDocument();
  });

  it("renders translate button when textToTranslate provided", () => {
    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );
    const translateBtn = screen.queryByText(/Traduzir/i);
    expect(translateBtn).toBeInTheDocument();
  });

  it("opens TranslationDialog when translate button clicked", async () => {
    const user = userEvent.setup();
    mockTranslateText.mockResolvedValue("Texto de amostra para traduzir");

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tradução/i)).toBeInTheDocument();
    });
  });

  it("shows loading spinner in TranslationDialog while translating", async () => {
    const user = userEvent.setup();
    const promise = new Promise((resolve) =>
      setTimeout(() => resolve("Translation"), 500)
    );
    mockTranslateText.mockReturnValue(promise);

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Traduzindo…/i)).toBeInTheDocument();
    });
  });

  it("shows translation after it resolves", async () => {
    const user = userEvent.setup();
    const translatedText = "Texto de amostra para traduzir";
    mockTranslateText.mockResolvedValue(translatedText);

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getByText(translatedText)).toBeInTheDocument();
    });
  });

  it("shows error message when translation fails", async () => {
    const user = userEvent.setup();
    const errorMsg = "API error";
    mockTranslateText.mockRejectedValue(new Error(errorMsg));

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  it("loads examples when Examples button clicked", async () => {
    const user = userEvent.setup();
    const examples = [
      { original: "Hello", translation: "Olá" },
      { original: "World", translation: "Mundo" },
    ];
    mockTranslateText.mockResolvedValue("Tradução");
    mockGetExamples.mockResolvedValue(examples);

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Tradução/i).length).toBeGreaterThan(0);
    });

    const examplesBtn = screen.getByText(/Exemplos/i);
    await user.click(examplesBtn);

    await waitFor(
      () => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
        expect(screen.getByText("Olá")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("shows examples loading state", async () => {
    const user = userEvent.setup();
    const promise = new Promise((resolve) =>
      setTimeout(() => resolve([]), 500)
    );
    mockTranslateText.mockResolvedValue("Tradução");
    mockGetExamples.mockReturnValue(promise);

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Tradução/i).length).toBeGreaterThan(0);
    });

    const examplesBtn = screen.getByText(/Exemplos/i);
    await user.click(examplesBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Buscando exemplos…/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("shows error when examples fetch fails", async () => {
    const user = userEvent.setup();
    const errorMsg = "Failed to fetch";
    mockTranslateText.mockResolvedValue("Tradução");
    mockGetExamples.mockRejectedValue(new Error(errorMsg));

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Tradução/i).length).toBeGreaterThan(0);
    });

    const examplesBtn = screen.getByText(/Exemplos/i);
    await user.click(examplesBtn);

    await waitFor(
      () => {
        expect(screen.getByText(errorMsg)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("closes TranslationDialog when close button clicked", async () => {
    const user = userEvent.setup();
    mockTranslateText.mockResolvedValue("Tradução");

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate="Sample text to translate"
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Tradução/i).length).toBeGreaterThan(0);
    });

    const closeBtn = screen.getByRole("button", { name: /Fechar/i });
    await user.click(closeBtn);

    await waitFor(
      () => {
        expect(screen.queryAllByText(/Tradução/i).length).toBe(0);
      },
      { timeout: 2000 }
    );
  });

  it("shows original text in TranslationDialog", async () => {
    const user = userEvent.setup();
    const originalText = "Sample text to translate";
    mockTranslateText.mockResolvedValue("Tradução");

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        textToTranslate={originalText}
        showLabel
        useMouseDownForColor
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(() => {
      expect(screen.getByText(originalText)).toBeInTheDocument();
    });
  });
});

describe("HighlightMenu - Action Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4 color buttons", () => {
    const { container } = render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        selectedColor="yellow"
        onDelete={vi.fn()}
      />
    );
    const colorButtons = container.querySelectorAll(".w-6.h-6.rounded-full");
    expect(colorButtons.length).toBe(4);
  });

  it("highlights current color with ring", () => {
    const { container } = render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        selectedColor="green"
        onDelete={vi.fn()}
      />
    );

    const colorButtons = container.querySelectorAll(".w-6.h-6.rounded-full");
    let foundGreen = false;
    colorButtons.forEach((btn) => {
      if (btn.className.includes("ring-2")) {
        foundGreen = true;
      }
    });
    expect(foundGreen).toBe(true);
  });

  it("calls onColorSelect when different color clicked", async () => {
    const user = userEvent.setup();
    const onColorSelect = vi.fn();
    const { container } = render(
      <HighlightMenu
        onColorSelect={onColorSelect}
        selectedColor="yellow"
        onDelete={vi.fn()}
      />
    );

    const colorButtons = container.querySelectorAll(".w-6.h-6.rounded-full");
    await user.click(colorButtons[1] as HTMLButtonElement); // green
    expect(onColorSelect).toHaveBeenCalledWith("green");
  });

  it("calls onDelete when delete button clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const { container } = render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        selectedColor="yellow"
        onDelete={onDelete}
      />
    );

    const deleteBtn = container.querySelector(
      'button[title="Deletar marcação"]'
    );
    if (deleteBtn) {
      await user.click(deleteBtn);
    }
    expect(onDelete).toHaveBeenCalled();
  });

  it("does not render translate button without textToTranslate", () => {
    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        selectedColor="yellow"
        onDelete={vi.fn()}
      />
    );
    const translateBtn = screen.queryByText(/Traduzir/i);
    expect(translateBtn).not.toBeInTheDocument();
  });

  it("renders translate button when textToTranslate provided", () => {
    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        selectedColor="yellow"
        onDelete={vi.fn()}
        textToTranslate="Some highlight text"
      />
    );
    const translateBtn = screen.queryByText(/Traduzir/i);
    expect(translateBtn).toBeInTheDocument();
  });

  it("opens TranslationDialog when translate button clicked", async () => {
    const user = userEvent.setup();
    mockTranslateText.mockResolvedValue("Tradução");

    render(
      <HighlightMenu
        onColorSelect={vi.fn()}
        selectedColor="yellow"
        onDelete={vi.fn()}
        textToTranslate="Some highlight text"
      />
    );

    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(
      () => {
        expect(screen.getAllByText(/Tradução/i).length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );
  });

  it("closes TranslationDialog and allows color change after closing", async () => {
    const user = userEvent.setup();
    const onColorSelect = vi.fn();
    mockTranslateText.mockResolvedValue("Tradução");

    const { container } = render(
      <HighlightMenu
        onColorSelect={onColorSelect}
        selectedColor="yellow"
        onDelete={vi.fn()}
        textToTranslate="Some highlight text"
      />
    );

    // Open dialog
    const translateBtn = screen.getByText(/Traduzir/i);
    await user.click(translateBtn);

    await waitFor(
      () => {
        expect(screen.getAllByText(/Tradução/i).length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    // Close dialog
    const closeBtn = screen.getByRole("button", { name: /Fechar/i });
    await user.click(closeBtn);

    await waitFor(
      () => {
        expect(screen.queryAllByText(/Tradução/i).length).toBe(0);
      },
      { timeout: 2000 }
    );

    // Should still be able to change color
    const colorButtons = container.querySelectorAll(".w-6.h-6.rounded-full");
    await user.click(colorButtons[2] as HTMLButtonElement); // blue
    expect(onColorSelect).toHaveBeenCalledWith("blue");
  });
});
