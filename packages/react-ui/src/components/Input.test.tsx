import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input (React)", () => {
  it("renders empty by default and calls onChange with string (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="请输入" />);

    const input = screen.getByPlaceholderText("请输入");
    expect(input).toHaveValue("");

    await user.type(input, "hello");
    expect(onChange).toHaveBeenLastCalledWith("hello");
    expect(input).toHaveValue("hello");
  });

  it("respects controlled value and does not flip internal state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input value="fixed" onChange={onChange} />);

    const input = screen.getByDisplayValue("fixed");
    await user.type(input, "x");
    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveValue("fixed");
  });

  it("clears value when clearable button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input defaultValue="abc" clearable onChange={onChange} />);

    const clear = screen.getByRole("button", { name: "清除" });
    expect(clear).toHaveAttribute("type", "button");
    await user.click(clear);
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("disables interaction when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input disabled defaultValue="x" onChange={onChange} clearable />);

    const input = screen.getByDisplayValue("x");
    expect(input).toBeDisabled();
    await user.type(input, "y");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "清除" })).toBeNull();
  });

  it("supports type=password", () => {
    render(<Input type="password" defaultValue="secret" />);
    const input = screen.getByDisplayValue("secret");
    expect(input).toHaveAttribute("type", "password");
  });

  it("does not change value when readOnly", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input defaultValue="keep" readOnly onChange={onChange} />);

    const input = screen.getByDisplayValue("keep");
    expect(input).toHaveAttribute("readonly");
    await user.type(input, "x");
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("keep");
  });

  it("calls onBlur", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(<Input onBlur={onBlur} />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });
});
