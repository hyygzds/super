import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./DatePicker";

describe("DatePicker (React)", () => {
  it("shows defaultValue and opens a calendar", async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue="2026-09-12" />);

    const input = screen.getByDisplayValue("2026-09-12");
    expect(input).toHaveAttribute("readonly");
    await user.click(input);
    expect(screen.getByRole("dialog", { name: "日期选择" })).toBeInTheDocument();
    expect(screen.getByText("2026年9月")).toBeInTheDocument();
  });

  it("selects a day, calls onChange, and closes (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker defaultValue="2026-09-12" onChange={onChange} />,
    );

    await user.click(screen.getByDisplayValue("2026-09-12"));
    await user.click(screen.getByRole("gridcell", { name: "2026-09-15" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-15");
    expect(screen.getByDisplayValue("2026-09-15")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "日期选择" })).toBeNull();
  });

  it("keeps controlled value and still emits onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-12" onChange={onChange} />);

    await user.click(screen.getByDisplayValue("2026-09-12"));
    await user.click(screen.getByRole("gridcell", { name: "2026-09-15" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-15");
    expect(screen.getByDisplayValue("2026-09-12")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "日期选择" })).toBeNull();
  });

  it("clears to an empty string without opening the panel", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker defaultValue="2026-09-12" onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "清除" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByPlaceholderText("请选择日期")).toHaveValue("");
    expect(screen.queryByRole("dialog", { name: "日期选择" })).toBeNull();
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<DatePicker disabled defaultValue="2026-09-12" />);

    await user.click(screen.getByDisplayValue("2026-09-12"));
    expect(screen.queryByRole("dialog", { name: "日期选择" })).toBeNull();
    expect(screen.queryByRole("button", { name: "清除" })).toBeNull();
  });

  it("disables days before minDate and navigates months", async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue="2026-09-15" minDate="2026-09-10" />);

    await user.click(screen.getByDisplayValue("2026-09-15"));
    expect(screen.getByRole("gridcell", { name: "2026-09-09" })).toBeDisabled();
    expect(screen.getByRole("gridcell", { name: "2026-09-10" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "上个月" }));
    expect(screen.getByText("2026年8月")).toBeInTheDocument();
  });
});
