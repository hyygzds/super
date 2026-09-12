import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { DatePicker } from "./DatePicker";

describe("DatePicker (Vue)", () => {
  it("selects a day in uncontrolled mode and emits update:modelValue", async () => {
    const wrapper = mount(DatePicker, {
      props: {
        defaultModelValue: "2026-09-12",
        placeholder: "请选择日期",
      },
      attachTo: document.body,
    });

    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "2026-09-12",
    );
    await wrapper.find('[aria-label="打开日历"]').trigger("click");
    expect(wrapper.find('[role="dialog"][aria-label="选择日期"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("2026年9月");

    await wrapper.find('[aria-label="2026-09-15"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["2026-09-15"]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "2026-09-15",
    );
    expect(wrapper.find('[role="dialog"][aria-label="选择日期"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });

  it("keeps controlled modelValue and still emits update:modelValue", async () => {
    const wrapper = mount(DatePicker, {
      props: { modelValue: "2026-09-12" },
      attachTo: document.body,
    });

    await wrapper.find('[aria-label="打开日历"]').trigger("click");
    await wrapper.find('[aria-label="2026-09-15"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["2026-09-15"]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "2026-09-12",
    );
    wrapper.unmount();
  });

  it("clears the value with the Input clear button", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-09-12", clearable: true },
    });

    await wrapper.find('[aria-label="清除"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([""]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("");
  });

  it("does not select dates outside minDate and maxDate", async () => {
    const wrapper = mount(DatePicker, {
      props: {
        defaultModelValue: "2026-09-12",
        minDate: "2026-09-10",
        maxDate: "2026-09-20",
      },
      attachTo: document.body,
    });

    await wrapper.find('[aria-label="打开日历"]').trigger("click");
    const outOfRange = wrapper.find('[aria-label="2026-09-01"]');
    expect((outOfRange.element as HTMLButtonElement).disabled).toBe(true);
    await outOfRange.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "2026-09-12",
    );
    wrapper.unmount();
  });

  it("closes the panel on Escape", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-09-12" },
      attachTo: document.body,
    });

    await wrapper.find('[aria-label="打开日历"]').trigger("click");
    expect(wrapper.find('[role="dialog"][aria-label="选择日期"]').exists()).toBe(
      true,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="dialog"][aria-label="选择日期"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });
});
