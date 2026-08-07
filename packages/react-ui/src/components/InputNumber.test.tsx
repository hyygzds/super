import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputNumber } from "./InputNumber";

describe("InputNumber (React)", () => {
  it("steps up/down from defaultValue (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InputNumber defaultValue={1} step={1} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "+" }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole("textbox")).toHaveValue("2");

    await user.click(screen.getByRole("button", { name: "−" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("emits null when input is cleared", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InputNumber defaultValue={5} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    expect(onChange).toHaveBeenCalledWith(null);
    expect(input).toHaveValue("");
  });

  it("respects controlled value and does not flip internal state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InputNumber value={10} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "+" }));
    expect(onChange).toHaveBeenCalledWith(11);
    expect(screen.getByRole("textbox")).toHaveValue("10");
  });

  it("clamps to min/max on step", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InputNumber defaultValue={5} min={0} max={5} step={1} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "+" }));
    expect(onChange).toHaveBeenLastCalledWith(5);

    await user.click(screen.getByRole("button", { name: "−" }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole("button", { name: "−" }));
    }
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("parses draft on blur and clamps to min/max", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InputNumber defaultValue={1} min={0} max={10} onChange={onChange} />,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "99");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(input).toHaveValue("10");
  });

  it("applies precision when committing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InputNumber defaultValue={1} step={0.1} precision={1} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "+" }));
    expect(onChange).toHaveBeenLastCalledWith(1.1);
    expect(screen.getByRole("textbox")).toHaveValue("1.1");
  });

  it("disables interaction when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InputNumber disabled defaultValue={3} onChange={onChange} />);

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "+" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "−" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "+" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
