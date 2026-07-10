import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Checkbox, CheckboxGroup } from "./Checkbox";

describe("Checkbox (Vue)", () => {
  it("emits update:checked on click when uncontrolled", async () => {
    const wrapper = mount(Checkbox, {
      props: { defaultChecked: false },
      slots: { default: "同意" },
    });
    const input = wrapper.find('input[type="checkbox"]');
    expect((input.element as HTMLInputElement).checked).toBe(false);
    await input.setValue(true);
    expect(wrapper.emitted("update:checked")?.[0]).toEqual([true]);
  });

  it("supports indeterminate via aria-checked mixed", async () => {
    const wrapper = mount(Checkbox, {
      props: {
        checked: false,
        indeterminate: true,
      },
      slots: { default: "全选" },
    });
    const input = wrapper.find('input[type="checkbox"]');
    expect(input.attributes("aria-checked")).toBe("mixed");
    expect((input.element as HTMLInputElement).indeterminate).toBe(true);
    await input.setValue(true);
    expect(wrapper.emitted("update:checked")?.[0]).toEqual([true]);
  });
});

describe("CheckboxGroup (Vue)", () => {
  it("emits update:modelValue when a child is toggled", async () => {
    const wrapper = mount(CheckboxGroup, {
      props: {
        modelValue: ["a"],
        "aria-label": "选项",
      },
      slots: {
        default: () => (
          <>
            <Checkbox value="a">A</Checkbox>
            <Checkbox value="b">B</Checkbox>
          </>
        ),
      },
    });
    const inputs = wrapper.findAll('input[type="checkbox"]');
    expect((inputs[0].element as HTMLInputElement).checked).toBe(true);
    await inputs[1].setValue(true);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["a", "b"]]);
  });
});
