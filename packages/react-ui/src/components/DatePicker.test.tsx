import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { todayIso } from "@component-ai/form-core";
import { DatePicker } from "./DatePicker";

async function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "打开日历" }));
}

describe("DatePicker (React)", () => {
  it("shows defaultValue and commits a picked day (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker defaultValue="2026-03-01" onChange={onChange} />,
    );

    expect(screen.getByDisplayValue("2026-03-01")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "选择日期" })).toBeNull();

    await openCalendar(user);
    expect(screen.getByRole("dialog", { name: "选择日期" })).toBeInTheDocument();

    await user.click(screen.getByRole("gridcell", { name: "2026-03-15" }));
    expect(onChange).toHaveBeenCalledWith("2026-03-15");
    expect(screen.getByDisplayValue("2026-03-15")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "选择日期" })).toBeNull();
  });

  it("respects controlled value and does not flip internal state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker value="2026-01-01" onChange={onChange} />);

    await openCalendar(user);
    await user.click(screen.getByRole("gridcell", { name: "2026-01-15" }));
    expect(onChange).toHaveBeenCalledWith("2026-01-15");
    expect(screen.getByDisplayValue("2026-01-01")).toBeInTheDocument();
  });

  it("does not select days outside min/max", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        defaultValue="2026-03-15"
        min="2026-03-10"
        max="2026-03-20"
        onChange={onChange}
      />,
    );

    await openCalendar(user);
    const out = screen.getByRole("gridcell", { name: "2026-03-09" });
    expect(out).toBeDisabled();
    await user.click(out);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("2026-03-15")).toBeInTheDocument();
  });

  it("disables interaction when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker disabled defaultValue="2026-03-15" onChange={onChange} />,
    );

    const toggle = screen.getByRole("button", { name: "打开日历" });
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(screen.queryByRole("dialog", { name: "选择日期" })).toBeNull();
    expect(screen.getByDisplayValue("2026-03-15")).toBeDisabled();
  });

  it("clears value when clearable button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker defaultValue="2026-03-15" clearable onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "清除" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("selects today from the footer button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker onChange={onChange} />);

    await openCalendar(user);
    await user.click(screen.getByRole("button", { name: "今天" }));
    expect(onChange).toHaveBeenCalledWith(todayIso());
    expect(screen.queryByRole("dialog", { name: "选择日期" })).toBeNull();
  });
});
