import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox, CheckboxGroup } from "./Checkbox";

describe("Checkbox (React)", () => {
  it("toggles uncontrolled and calls onCheckedChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox defaultChecked={false} onCheckedChange={onCheckedChange}>
        同意
      </Checkbox>,
    );
    const input = screen.getByRole("checkbox", { name: "同意" });
    expect(input).not.toBeChecked();
    await user.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(input).toBeChecked();
  });

  it("supports controlled checked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange}>
        A
      </Checkbox>,
    );
    const input = screen.getByRole("checkbox", { name: "A" });
    await user.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(input).not.toBeChecked();
    rerender(
      <Checkbox checked={true} onCheckedChange={onCheckedChange}>
        A
      </Checkbox>,
    );
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
  });

  it("exposes indeterminate as aria-checked mixed and still emits boolean on click", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        checked={false}
        indeterminate
        onCheckedChange={onCheckedChange}
      >
        全选
      </Checkbox>,
    );
    const input = screen.getByRole("checkbox", { name: "全选" });
    expect(input).toHaveAttribute("aria-checked", "mixed");
    expect((input as HTMLInputElement).indeterminate).toBe(true);
    await user.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox disabled onCheckedChange={onCheckedChange}>
        X
      </Checkbox>,
    );
    const input = screen.getByRole("checkbox", { name: "X" });
    expect(input).toBeDisabled();
    await user.click(input);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("CheckboxGroup (React)", () => {
  it("adds and removes values in the group", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup
        defaultValue={["a"]}
        onValueChange={onValueChange}
        aria-label="选项"
      >
        <Checkbox value="a">A</Checkbox>
        <Checkbox value="b">B</Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "B" })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "B" }));
    expect(onValueChange).toHaveBeenCalledWith(["a", "b"]);
    await user.click(screen.getByRole("checkbox", { name: "A" }));
    expect(onValueChange).toHaveBeenCalledWith(["b"]);
  });
});
