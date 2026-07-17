import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";

describe("Checkbox (React)", () => {
  it("renders unchecked by default and toggles on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox onCheckedChange={onCheckedChange}>记住我</Checkbox>,
    );

    const box = screen.getByRole("checkbox", { name: "记住我" });
    expect(box).not.toBeChecked();

    await user.click(box);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(box).toBeChecked();

    await user.click(box);
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    expect(box).not.toBeChecked();
  });

  it("respects controlled checked and does not flip internal state on click", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox checked={true} onCheckedChange={onCheckedChange}>
        全选
      </Checkbox>,
    );
    const box = screen.getByRole("checkbox", { name: "全选" });
    expect(box).toBeChecked();

    await user.click(box);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    // controlled: prop 未变，视图仍应保持父组件传入的值
    expect(box).toBeChecked();
  });

  it("sets the indeterminate DOM property and aria-checked=mixed", () => {
    render(<Checkbox indeterminate>部分选中</Checkbox>);
    const box = screen.getByRole("checkbox", {
      name: "部分选中",
    }) as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box).toHaveAttribute("aria-checked", "mixed");
  });

  it("disables interaction when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox disabled onCheckedChange={onCheckedChange}>
        禁用项
      </Checkbox>,
    );
    const box = screen.getByRole("checkbox", { name: "禁用项" });
    expect(box).toBeDisabled();
    await user.click(box);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("supports name/value for form submission", () => {
    render(
      <Checkbox name="agree" value="yes" defaultChecked>
        同意条款
      </Checkbox>,
    );
    const box = screen.getByRole("checkbox", {
      name: "同意条款",
    }) as HTMLInputElement;
    expect(box.name).toBe("agree");
    expect(box.value).toBe("yes");
  });
});
