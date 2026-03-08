import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewTabScreen } from "./NewTabScreen";
import * as registryModule from "@core/commands/CommandRegistry";
import * as fileStoreModule from "@core/use-file-store";

// Mock dependencies
vi.mock("@core/commands/CommandRegistry", () => ({
  registry: {
    execute: vi.fn(),
  },
}));

vi.mock("@core/use-file-store", () => ({
  createUntitledFile: vi.fn(),
}));

describe("NewTabScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders welcome message", () => {
    render(<NewTabScreen />);
    expect(screen.getByText("O que deseja fazer?")).toBeInTheDocument();
  });

  it("renders open file button with correct text", () => {
    render(<NewTabScreen />);
    expect(screen.getByText("Abrir arquivo")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+O")).toBeInTheDocument();
  });

  it("renders new file button with correct text", () => {
    render(<NewTabScreen />);
    expect(screen.getByText("Novo arquivo")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+N")).toBeInTheDocument();
  });

  it("displays open file button icon", () => {
    const { container } = render(<NewTabScreen />);
    const icons = container.querySelectorAll(".text-3xl");
    expect(icons[0]).toHaveTextContent("📂");
  });

  it("displays new file button icon", () => {
    const { container } = render(<NewTabScreen />);
    const icons = container.querySelectorAll(".text-3xl");
    expect(icons[1]).toHaveTextContent("✏️");
  });

  it("calls registry.execute when open file button is clicked", async () => {
    const user = userEvent.setup();
    render(<NewTabScreen />);

    const openFileBtn = screen.getByText("Abrir arquivo");
    await user.click(openFileBtn);

    expect(registryModule.registry.execute).toHaveBeenCalledWith("open-file");
  });

  it("calls createUntitledFile when new file button is clicked", async () => {
    const user = userEvent.setup();
    render(<NewTabScreen />);

    const newFileBtn = screen.getByText("Novo arquivo");
    await user.click(newFileBtn);

    expect(fileStoreModule.createUntitledFile).toHaveBeenCalledWith("");
  });

  it("has two buttons for actions", () => {
    const { container } = render(<NewTabScreen />);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
  });

  it("buttons have proper styling classes", () => {
    const { container } = render(<NewTabScreen />);
    const buttons = container.querySelectorAll("button");

    buttons.forEach((btn) => {
      expect(btn.className).toContain("rounded-xl");
      expect(btn.className).toContain("border");
      expect(btn.className).toContain("px-8");
      expect(btn.className).toContain("py-6");
    });
  });

  it("renders centered layout", () => {
    const { container } = render(<NewTabScreen />);
    const wrapper = container.querySelector(".flex.flex-1.items-center.justify-center");
    expect(wrapper).toBeInTheDocument();
  });
});
