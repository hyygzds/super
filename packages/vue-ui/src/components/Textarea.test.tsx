import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Textarea } from "./Textarea";

describe("Textarea (Vue)", () => {
  it("uses defaultModelValue and emits update:modelValue (uncontrolled)", async () => {
    const wrapper = mount(Textarea, {
      props: { defaultModelValue: "hello" },
    });
    const ta = wrapper.find("textarea");
    expect((ta.element as HTMLTextAreaElement).value).toBe("hello");

    await ta.setValue("world");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["world"]);
    expect((ta.element as HTMLTextAreaElement).value).toBe("world");
  });

  it("respects controlled modelValue", async () => {
    const wrapper = mount(Textarea, {
      props: { modelValue: "locked" },
    });
    const ta = wrapper.find("textarea");
    expect((ta.element as HTMLTextAreaElement).value).toBe("locked");

    await ta.setValue("typed");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["typed"]);
    expect((ta.element as HTMLTextAreaElement).value).toBe("locked");
  });

  it("defaults rows to 3 and shows count when showCount", () => {
    const wrapper = mount(Textarea, {
      props: {
        defaultModelValue: "ab",
        showCount: true,
        maxLength: 10,
      },
    });
    expect(wrapper.find("textarea").attributes("rows")).toBe("3");
    expect(wrapper.text()).toContain("2/10");
  });

  it("emits blur", async () => {
    const wrapper = mount(Textarea, {
      props: { defaultModelValue: "" },
    });
    await wrapper.find("textarea").trigger("blur");
    expect(wrapper.emitted("blur")).toHaveLength(1);
  });

  it("disables interaction when disabled", async () => {
    const wrapper = mount(Textarea, {
      props: { disabled: true, defaultModelValue: "x" },
    });
    const ta = wrapper.find("textarea");
    expect((ta.element as HTMLTextAreaElement).disabled).toBe(true);
    await ta.setValue("y");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
