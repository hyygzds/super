import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Input } from "./Input";

describe("Input (Vue)", () => {
  it("uses defaultModelValue and emits update:modelValue on input (uncontrolled)", async () => {
    const wrapper = mount(Input, {
      props: { defaultModelValue: "hello" },
    });
    const input = wrapper.find("input");
    expect((input.element as HTMLInputElement).value).toBe("hello");

    await input.setValue("world");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["world"]);
    expect((input.element as HTMLInputElement).value).toBe("world");
  });

  it("respects controlled modelValue and does not flip internally", async () => {
    const wrapper = mount(Input, {
      props: { modelValue: "locked" },
    });
    const input = wrapper.find("input");
    expect((input.element as HTMLInputElement).value).toBe("locked");

    await input.setValue("typed");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["typed"]);
    expect((input.element as HTMLInputElement).value).toBe("locked");
  });

  it("clears value when clearable button is clicked", async () => {
    const wrapper = mount(Input, {
      props: { defaultModelValue: "abc", clearable: true },
    });
    const clear = wrapper.find('button[aria-label="清除"]');
    expect(clear.exists()).toBe(true);
    expect((clear.element as HTMLButtonElement).type).toBe("button");

    await clear.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([""]);
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("");
  });

  it("emits blur", async () => {
    const wrapper = mount(Input, {
      props: { defaultModelValue: "" },
    });
    await wrapper.find("input").trigger("blur");
    expect(wrapper.emitted("blur")).toHaveLength(1);
  });

  it("supports type=password", () => {
    const wrapper = mount(Input, {
      props: { type: "password" },
    });
    expect(wrapper.find("input").attributes("type")).toBe("password");
  });

  it("disables interaction when disabled", async () => {
    const wrapper = mount(Input, {
      props: { disabled: true, defaultModelValue: "x", clearable: true },
    });
    const input = wrapper.find("input");
    expect((input.element as HTMLInputElement).disabled).toBe(true);
    await input.setValue("y");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.find('button[aria-label="清除"]').exists()).toBe(false);
  });
});
