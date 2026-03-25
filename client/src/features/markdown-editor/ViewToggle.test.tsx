// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggle } from "./ViewToggle";

vi.mock("lucide-react", () => ({
  Pencil: () => <svg data-testid="icon-pencil" />,
  Eye:    () => <svg data-testid="icon-eye" />,
}));

describe("ViewToggle", () => {
  it("renders Editar and Leitura buttons", () => {
    render(<ViewToggle mode="edit" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leitura/i })).toBeInTheDocument();
  });

  it("marks the active mode button as pressed", () => {
    render(<ViewToggle mode="read" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /leitura/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /editar/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with 'read' when Leitura is clicked while in edit mode", async () => {
    const onChange = vi.fn();
    render(<ViewToggle mode="edit" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /leitura/i }));
    expect(onChange).toHaveBeenCalledWith("read");
  });

  it("calls onChange with 'edit' when Editar is clicked while in read mode", async () => {
    const onChange = vi.fn();
    render(<ViewToggle mode="read" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    expect(onChange).toHaveBeenCalledWith("edit");
  });

  it("has correct group ARIA label", () => {
    render(<ViewToggle mode="edit" onChange={vi.fn()} />);
    expect(screen.getByRole("group")).toHaveAttribute("aria-label", "Modo de visualização");
  });
});
