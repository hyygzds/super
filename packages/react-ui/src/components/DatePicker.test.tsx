import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./DatePicker";

describe("DatePicker (React)", () => {
  it("selects a day in uncontrolled mode and calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        defaultValue="2026-09-12"
        onChange={onChange}
        placeholder="请选择日期"
      />,
    );

    expect(screen.getByPlaceholderText("请选择日期")).toHaveValue("2026-09-12");
    await user.click(screen.getByRole("button", { name: "打开日历" }));
    expect(screen.getByRole("dialog", { name: "选择日期" })).toBeInTheDocument();
    expect(screen.getByText("2026年9月")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2026-09-15" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-15");
    expect(screen.getByPlaceholderText("请选择日期")).toHaveValue("2026-09-15");
    expect(screen.queryByRole("dialog", { name: "选择日期" })).toBeNull();
  });

  it("keeps controlled value and still emits onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-12" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "打开日历" }));
    await user.click(screen.getByRole("button", { name: "2026-09-15" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-15");
    expect(screen.getByDisplayValue("2026-09-12")).toBeInTheDocument();
  });

  it("clears the value with the Input clear button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker defaultValue="2026-09-12" clearable onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "清除" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("does not select dates outside minDate and maxDate", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        defaultValue="2026-09-12"
        minDate="2026-09-10"
        maxDate="2026-09-20"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "打开日历" }));
    const outOfRange = screen.getByRole("button", { name: "2026-09-01" });
    expect(outOfRange).toBeDisabled();
    await user.click(outOfRange);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("2026-09-12")).toBeInTheDocument();
  });

  it("closes the panel on Escape", async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue="2026-09-12" />);

    await user.click(screen.getByRole("button", { name: "打开日历" }));
    expect(screen.getByRole("dialog", { name: "选择日期" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "选择日期" })).toBeNull();
  });
});
