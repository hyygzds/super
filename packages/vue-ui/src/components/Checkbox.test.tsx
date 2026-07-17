import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Checkbox } from "./Checkbox";

describe("Checkbox (Vue)", () => {
  it("toggles and emits update:modelValue on click (uncontrolled)", async () => {
    const wrapper = mount(Checkbox, {
      slots: { default: "记住我" },
    });
    const input = wrapper.find('input[type="checkbox"]');
    expect((input.element as HTMLInputElement).checked).toBe(false);

    await input.setValue(true);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true]);
    expect(wrapper.emitted("change")?.[0]).toEqual([true]);
  });

  it("respects controlled modelValue", async () => {
    const wrapper = mount(Checkbox, {
      props: { modelValue: true },
      slots: { default: "全选" },
    });
    const input = wrapper.find('input[type="checkbox"]');
    expect((input.element as HTMLInputElement).checked).toBe(true);

    await input.setValue(false);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
    // controlled: prop 未变，DOM 值仍应保持父组件传入的值
    expect((input.element as HTMLInputElement).checked).toBe(true);
  });

  it("sets the indeterminate DOM property and aria-checked=mixed", () => {
    const wrapper = mount(Checkbox, {
      props: { indeterminate: true },
      slots: { default: "部分选中" },
    });
    const input = wrapper.find('input[type="checkbox"]')
      .element as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute("aria-checked")).toBe("mixed");
  });

  it("disables interaction when disabled", async () => {
    const wrapper = mount(Checkbox, {
      props: { disabled: true },
      slots: { default: "禁用项" },
    });
    const input = wrapper.find('input[type="checkbox"]');
    expect((input.element as HTMLInputElement).disabled).toBe(true);
    await input.setValue(true);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
