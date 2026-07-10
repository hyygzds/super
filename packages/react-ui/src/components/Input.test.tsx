import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input (React)", () => {
  it("updates uncontrolled value and calls onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Input defaultValue="" onValueChange={onValueChange} aria-label="名称" />);
    const input = screen.getByRole("textbox", { name: "名称" });
    await user.type(input, "ab");
    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenLastCalledWith("ab");
    expect(input).toHaveValue("ab");
  });

  it("supports controlled value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Input value="" onValueChange={onValueChange} aria-label="A" />,
    );
    const input = screen.getByRole("textbox", { name: "A" });
    await user.type(input, "x");
    expect(onValueChange).toHaveBeenCalledWith("x");
    expect(input).toHaveValue("");
    rerender(<Input value="x" onValueChange={onValueChange} aria-label="A" />);
    expect(screen.getByRole("textbox", { name: "A" })).toHaveValue("x");
  });

  it("clears value when clearable button is clicked", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Input defaultValue="hello" clearable onValueChange={onValueChange} aria-label="B" />,
    );
    await user.click(screen.getByRole("button", { name: "清除" }));
    expect(onValueChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("textbox", { name: "B" })).toHaveValue("");
  });

  it("does not show clear button when readOnly", () => {
    render(<Input defaultValue="hi" clearable readOnly aria-label="C" />);
    expect(screen.queryByRole("button", { name: "清除" })).not.toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<Input type="password" defaultValue="secret" aria-label="密码" />);
    const input = screen.getByLabelText("密码");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "显示密码" }));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("emits string for number type", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Input type="number" defaultValue="" onValueChange={onValueChange} aria-label="数量" />,
    );
    const input = screen.getByLabelText("数量");
    await user.type(input, "12");
    expect(onValueChange).toHaveBeenLastCalledWith("12");
  });

  it("does not accept input when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Input disabled defaultValue="" onValueChange={onValueChange} aria-label="D" />);
    const input = screen.getByRole("textbox", { name: "D" });
    expect(input).toBeDisabled();
    await user.type(input, "z");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
