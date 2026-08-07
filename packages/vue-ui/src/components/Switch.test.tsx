import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Switch } from "./Switch";

describe("Switch (Vue)", () => {
  it("toggles in uncontrolled mode", async () => {
    const wrapper = mount(Switch, {
      props: { defaultModelValue: false },
    });
    const sw = wrapper.find('[role="switch"]');
    expect(sw.attributes("aria-checked")).toBe("false");

    await sw.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true]);
    expect(wrapper.emitted("change")?.[0]).toEqual([true]);
    expect(sw.attributes("aria-checked")).toBe("true");

    await sw.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([false]);
    expect(sw.attributes("aria-checked")).toBe("false");
  });

  it("respects controlled modelValue and does not flip internal state", async () => {
    const wrapper = mount(Switch, {
      props: { modelValue: true },
    });
    const sw = wrapper.find('[role="switch"]');
    expect(sw.attributes("aria-checked")).toBe("true");

    await sw.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
    expect(sw.attributes("aria-checked")).toBe("true");
  });

  it("disables interaction when disabled", async () => {
    const wrapper = mount(Switch, {
      props: { disabled: true, defaultModelValue: false },
    });
    const sw = wrapper.find('[role="switch"]');
    expect((sw.element as HTMLButtonElement).disabled).toBe(true);

    await sw.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("change")).toBeUndefined();
  });
});
