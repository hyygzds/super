import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

describe("Switch (React)", () => {
  it("toggles in uncontrolled mode", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch defaultChecked={false} onCheckedChange={onCheckedChange} />);

    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");

    await user.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(sw).toHaveAttribute("aria-checked", "true");

    await user.click(sw);
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("respects controlled checked and does not flip internal state", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch checked={true} onCheckedChange={onCheckedChange} />);

    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");

    await user.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("toggles with Space key", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch defaultChecked={false} onCheckedChange={onCheckedChange} />);

    const sw = screen.getByRole("switch");
    sw.focus();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("disables interaction when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch disabled defaultChecked={false} onCheckedChange={onCheckedChange} />,
    );

    const sw = screen.getByRole("switch");
    expect(sw).toBeDisabled();
    await user.click(sw);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
