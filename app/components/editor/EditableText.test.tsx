// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditableText from "./EditableText";

afterEach(cleanup);

describe("EditableText - read-only (no onCommit)", () => {
  it("renders the value as plain text, no input on click", () => {
    render(<EditableText value="Hello" />);
    fireEvent.click(screen.getByText("Hello"));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("preserves className and style exactly", () => {
    render(<EditableText value="Hello" className="text-xl" style={{ color: "red" }} />);
    const el = screen.getByText("Hello");
    expect(el.className).toContain("text-xl");
    expect(el.style.color).toBe("red");
  });

  it("renders the given tag", () => {
    render(<EditableText value="Heading" as="h1" />);
    expect(screen.getByText("Heading").tagName).toBe("H1");
  });
});

describe("EditableText - editable (onCommit provided)", () => {
  it("click enters edit mode with an input pre-filled with the current value", () => {
    render(<EditableText value="Hello" onCommit={vi.fn()} />);
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("Hello");
  });

  it("Enter commits the new value and exits edit mode", () => {
    const onCommit = vi.fn();
    render(<EditableText value="Hello" onCommit={onCommit} />);
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Goodbye" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith("Goodbye");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("blur also commits", () => {
    const onCommit = vi.fn();
    render(<EditableText value="Hello" onCommit={onCommit} />);
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Goodbye" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith("Goodbye");
  });

  it("Escape reverts without committing", () => {
    const onCommit = vi.fn();
    render(<EditableText value="Hello" onCommit={onCommit} />);
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Goodbye" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("does not call onCommit when the value is unchanged", () => {
    const onCommit = vi.fn();
    render(<EditableText value="Hello" onCommit={onCommit} />);
    fireEvent.click(screen.getByText("Hello"));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not commit an empty/whitespace-only value", () => {
    const onCommit = vi.fn();
    render(<EditableText value="Hello" onCommit={onCommit} />);
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("clicking to edit does not propagate to a parent click handler", () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <EditableText value="Hello" onCommit={vi.fn()} />
      </div>
    );
    fireEvent.click(screen.getByText("Hello"));
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe("EditableText - multiline", () => {
  it("renders a textarea in edit mode", () => {
    render(<EditableText value="Hello" onCommit={vi.fn()} multiline />);
    fireEvent.click(screen.getByText("Hello"));
    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
  });

  it("plain Enter does not commit", () => {
    const onCommit = vi.fn();
    render(<EditableText value="Hello" onCommit={onCommit} multiline />);
    fireEvent.click(screen.getByText("Hello"));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello\nWorld" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("Ctrl+Enter commits", () => {
    const onCommit = vi.fn();
    render(<EditableText value="Hello" onCommit={onCommit} multiline />);
    fireEvent.click(screen.getByText("Hello"));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello World" } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    expect(onCommit).toHaveBeenCalledWith("Hello World");
  });
});
