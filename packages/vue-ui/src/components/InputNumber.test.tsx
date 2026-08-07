import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { InputNumber } from "./InputNumber";

describe("InputNumber (Vue)", () => {
  it("steps up/down from defaultModelValue (uncontrolled)", async () => {
    const wrapper = mount(InputNumber, {
      props: { defaultModelValue: 1, step: 1 },
    });
    const buttons = wrapper.findAll('button[type="button"]');
    expect(buttons).toHaveLength(2);

    await buttons[1].trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([2]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("2");

    await buttons[0].trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([1]);
  });

  it("emits null when input is cleared", async () => {
    const wrapper = mount(InputNumber, {
      props: { defaultModelValue: 5 },
    });
    const input = wrapper.find("input");
    await input.setValue("");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([null]);
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("respects controlled modelValue", async () => {
    const wrapper = mount(InputNumber, {
      props: { modelValue: 10 },
    });
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "10",
    );

    const buttons = wrapper.findAll('button[type="button"]');
    await buttons[1].trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([11]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "10",
    );
  });

  it("clamps to min/max on step", async () => {
    const wrapper = mount(InputNumber, {
      props: { defaultModelValue: 9, min: 0, max: 10, step: 2 },
    });
    const buttons = wrapper.findAll('button[type="button"]');
    await buttons[1].trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([10]);

    await wrapper.setProps({ defaultModelValue: 1 });
    const wrapper2 = mount(InputNumber, {
      props: { defaultModelValue: 1, min: 0, max: 10, step: 2 },
    });
    const minus = wrapper2.findAll('button[type="button"]')[0];
    await minus.trigger("click");
    expect(wrapper2.emitted("update:modelValue")?.[0]).toEqual([0]);
  });

  it("parses draft on blur and emits blur", async () => {
    const wrapper = mount(InputNumber, {
      props: { defaultModelValue: 1, precision: 1 },
    });
    const input = wrapper.find("input");
    await input.setValue("2.46");
    await input.trigger("blur");
    expect(wrapper.emitted("update:modelValue")).toContainEqual([2.5]);
    expect(wrapper.emitted("blur")).toHaveLength(1);
  });

  it("disables interaction when disabled", async () => {
    const wrapper = mount(InputNumber, {
      props: { disabled: true, defaultModelValue: 3 },
    });
    const input = wrapper.find("input");
    expect((input.element as HTMLInputElement).disabled).toBe(true);
    const buttons = wrapper.findAll('button[type="button"]');
    expect((buttons[0].element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1].element as HTMLButtonElement).disabled).toBe(true);
    await buttons[1].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
