import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio, RadioGroup } from "./Radio";

describe("RadioGroup / Radio (React)", () => {
  it("selects a radio in uncontrolled mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup defaultValue="a" name="fruit" onChange={onChange}>
        <Radio value="a">Apple</Radio>
        <Radio value="b">Banana</Radio>
      </RadioGroup>,
    );

    const group = screen.getByRole("radiogroup");
    expect(group).toBeInTheDocument();

    const apple = screen.getByRole("radio", { name: "Apple" });
    const banana = screen.getByRole("radio", { name: "Banana" });
    expect(apple).toBeChecked();
    expect(banana).not.toBeChecked();

    await user.click(banana);
    expect(onChange).toHaveBeenCalledWith("b");
    expect(banana).toBeChecked();
    expect(apple).not.toBeChecked();
  });

  it("respects controlled value and does not flip internal state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup value="a" name="fruit" onChange={onChange}>
        <Radio value="a">Apple</Radio>
        <Radio value="b">Banana</Radio>
      </RadioGroup>,
    );

    const banana = screen.getByRole("radio", { name: "Banana" });
    await user.click(banana);
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("radio", { name: "Apple" })).toBeChecked();
    expect(banana).not.toBeChecked();
  });

  it("renders options as radios and can mix with children", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup
        defaultValue="x"
        name="mix"
        onChange={onChange}
        options={[
          { label: "X", value: "x" },
          { label: "Y", value: "y", disabled: true },
        ]}
      >
        <Radio value="z">Z</Radio>
      </RadioGroup>,
    );

    expect(screen.getByRole("radio", { name: "X" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Y" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Z" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Z" }));
    expect(onChange).toHaveBeenCalledWith("z");
  });

  it("disables all radios when group is disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup disabled defaultValue="a" name="fruit" onChange={onChange}>
        <Radio value="a">Apple</Radio>
        <Radio value="b">Banana</Radio>
      </RadioGroup>,
    );

    const apple = screen.getByRole("radio", { name: "Apple" });
    const banana = screen.getByRole("radio", { name: "Banana" });
    expect(apple).toBeDisabled();
    expect(banana).toBeDisabled();

    await user.click(banana);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies vertical orientation class", () => {
    const { container } = render(
      <RadioGroup orientation="vertical" name="fruit">
        <Radio value="a">Apple</Radio>
      </RadioGroup>,
    );
    const group = container.querySelector('[role="radiogroup"]');
    expect(group?.className).toContain("flex-col");
  });
});
