import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { todayIso } from "@component-ai/form-core";
import { DatePicker } from "./DatePicker";

function inputEl(wrapper: ReturnType<typeof mount>) {
  return wrapper.find("input").element as HTMLInputElement;
}

describe("DatePicker (Vue)", () => {
  it("shows defaultModelValue and commits a picked day (uncontrolled)", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-03-01" },
    });
    expect(inputEl(wrapper).value).toBe("2026-03-01");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await wrapper.find('button[aria-label="打开日历"]').trigger("click");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

    await wrapper.find('[role="gridcell"][aria-label="2026-03-15"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["2026-03-15"]);
    expect(inputEl(wrapper).value).toBe("2026-03-15");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it("respects controlled modelValue and does not flip internally", async () => {
    const wrapper = mount(DatePicker, {
      props: { modelValue: "2026-01-01" },
    });
    await wrapper.find('button[aria-label="打开日历"]').trigger("click");
    await wrapper.find('[role="gridcell"][aria-label="2026-01-15"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["2026-01-15"]);
    expect(inputEl(wrapper).value).toBe("2026-01-01");
  });

  it("does not select days outside min/max", async () => {
    const wrapper = mount(DatePicker, {
      props: {
        defaultModelValue: "2026-03-15",
        min: "2026-03-10",
        max: "2026-03-20",
      },
    });
    await wrapper.find('button[aria-label="打开日历"]').trigger("click");
    const out = wrapper.find('[role="gridcell"][aria-label="2026-03-09"]');
    expect((out.element as HTMLButtonElement).disabled).toBe(true);
    await out.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(inputEl(wrapper).value).toBe("2026-03-15");
  });

  it("disables interaction when disabled", async () => {
    const wrapper = mount(DatePicker, {
      props: { disabled: true, defaultModelValue: "2026-03-15" },
    });
    const toggle = wrapper.find('button[aria-label="打开日历"]');
    expect((toggle.element as HTMLButtonElement).disabled).toBe(true);
    await toggle.trigger("click");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(inputEl(wrapper).disabled).toBe(true);
  });

  it("clears value when clearable button is clicked", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-03-15", clearable: true },
    });
    await wrapper.find('button[aria-label="清除"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([""]);
    expect(inputEl(wrapper).value).toBe("");
  });

  it("selects today from the footer button", async () => {
    const wrapper = mount(DatePicker);
    await wrapper.find('button[aria-label="打开日历"]').trigger("click");
    await wrapper.find('button[aria-label="今天"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([todayIso()]);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it("emits blur", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-03-15" },
    });
    await wrapper.find("input").trigger("blur");
    expect(wrapper.emitted("blur")).toHaveLength(1);
  });
});
