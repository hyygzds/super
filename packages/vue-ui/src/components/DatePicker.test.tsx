import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { DatePicker } from "./DatePicker";

describe("DatePicker (Vue)", () => {
  it("shows defaultModelValue and opens a calendar", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-09-12" },
    });
    const input = wrapper.find("input");
    expect((input.element as HTMLInputElement).value).toBe("2026-09-12");
    expect(input.attributes("readonly")).toBeDefined();

    await input.trigger("click");
    expect(wrapper.find('[role="dialog"][aria-label="日期选择"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("2026年9月");
  });

  it("selects a day, emits update:modelValue, and closes (uncontrolled)", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-09-12" },
    });
    await wrapper.find("input").trigger("click");
    await wrapper.find('[aria-label="2026-09-15"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["2026-09-15"]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "2026-09-15",
    );
    expect(wrapper.find('[role="dialog"][aria-label="日期选择"]').exists()).toBe(
      false,
    );
  });

  it("keeps controlled modelValue and still emits", async () => {
    const wrapper = mount(DatePicker, {
      props: { modelValue: "2026-09-12" },
    });
    await wrapper.find("input").trigger("click");
    await wrapper.find('[aria-label="2026-09-15"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["2026-09-15"]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
      "2026-09-12",
    );
    expect(wrapper.find('[role="dialog"][aria-label="日期选择"]').exists()).toBe(
      false,
    );
  });

  it("clears to an empty string without opening the panel", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-09-12" },
    });
    await wrapper.find('button[aria-label="清除"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([""]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("");
    expect(wrapper.find('[role="dialog"][aria-label="日期选择"]').exists()).toBe(
      false,
    );
  });

  it("does not open when disabled", async () => {
    const wrapper = mount(DatePicker, {
      props: { disabled: true, defaultModelValue: "2026-09-12" },
    });
    await wrapper.find("input").trigger("click");
    expect(wrapper.find('[role="dialog"][aria-label="日期选择"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('button[aria-label="清除"]').exists()).toBe(false);
  });

  it("disables days before minDate and navigates months", async () => {
    const wrapper = mount(DatePicker, {
      props: { defaultModelValue: "2026-09-15", minDate: "2026-09-10" },
    });
    await wrapper.find("input").trigger("click");
    expect(
      (wrapper.find('[aria-label="2026-09-09"]').element as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (wrapper.find('[aria-label="2026-09-10"]').element as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    await wrapper.find('[aria-label="上个月"]').trigger("click");
    expect(wrapper.text()).toContain("2026年8月");
  });
});
