import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea (React)", () => {
  it("renders empty by default and calls onChange with string (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} placeholder="备注" />);

    const area = screen.getByPlaceholderText("备注");
    expect(area).toHaveValue("");
    expect(area).toHaveAttribute("rows", "3");

    await user.type(area, "hi");
    expect(onChange).toHaveBeenLastCalledWith("hi");
    expect(area).toHaveValue("hi");
  });

  it("respects controlled value and does not flip internal state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea value="locked" onChange={onChange} />);

    const area = screen.getByDisplayValue("locked");
    await user.type(area, "x");
    expect(onChange).toHaveBeenCalled();
    expect(area).toHaveValue("locked");
  });

  it("shows character count when showCount is set", async () => {
    const user = userEvent.setup();
    render(<Textarea defaultValue="ab" maxLength={10} showCount />);

    expect(screen.getByText("2/10")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "c");
    expect(screen.getByText("3/10")).toBeInTheDocument();
  });

  it("respects maxLength", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea maxLength={3} onChange={onChange} />);

    const area = screen.getByRole("textbox");
    await user.type(area, "abcd");
    expect(area).toHaveValue("abc");
    expect(onChange).toHaveBeenLastCalledWith("abc");
  });

  it("disables interaction when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea disabled defaultValue="x" onChange={onChange} />);

    const area = screen.getByDisplayValue("x");
    expect(area).toBeDisabled();
    await user.type(area, "y");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onBlur", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(<Textarea onBlur={onBlur} />);
    await user.click(screen.getByRole("textbox"));
    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });
});
