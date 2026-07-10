import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Input } from "./Input";

describe("Input (Vue)", () => {
  it("emits update:modelValue on input", async () => {
    const wrapper = mount(Input, {
      props: { defaultValue: "", "aria-label": "名称" },
      attrs: { "aria-label": "名称" },
    });
    const input = wrapper.find("input");
    await input.setValue("ab");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["ab"]);
  });

  it("clears when clearable", async () => {
    const wrapper = mount(Input, {
      props: { defaultValue: "hello", clearable: true },
      attrs: { "aria-label": "B" },
    });
    await wrapper.find('button[aria-label="清除"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([""]);
  });

  it("toggles password visibility", async () => {
    const wrapper = mount(Input, {
      props: { type: "password", defaultValue: "secret" },
      attrs: { "aria-label": "密码" },
    });
    expect(wrapper.find("input").attributes("type")).toBe("password");
    await wrapper.find('button[aria-label="显示密码"]').trigger("click");
    expect(wrapper.find("input").attributes("type")).toBe("text");
  });

  it("emits string for number type", async () => {
    const wrapper = mount(Input, {
      props: { type: "number", defaultValue: "" },
      attrs: { "aria-label": "数量" },
    });
    await wrapper.find("input").setValue("12");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["12"]);
  });
});
