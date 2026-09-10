import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Tooltip } from "./Tooltip";

describe("Tooltip (Vue)", () => {
  it("shows content on hover and hides on leave", async () => {
    const wrapper = mount(Tooltip, {
      props: { content: "完整内容" },
      slots: { default: () => "截断文本" },
      attachTo: document.body,
    });

    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    await wrapper.trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      "完整内容",
    );

    await wrapper.trigger("mouseleave");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    wrapper.unmount();
  });

  it("respects controlled open and reports update:open", async () => {
    const wrapper = mount(Tooltip, {
      props: { content: "提示", open: false },
      slots: { default: () => "触发" },
      attachTo: document.body,
    });

    await wrapper.trigger("mouseenter");
    expect(wrapper.emitted("update:open")?.[0]).toEqual([true]);
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    wrapper.unmount();
  });

  it("does not open when disabled", async () => {
    const wrapper = mount(Tooltip, {
      props: { content: "提示", disabled: true },
      slots: { default: () => "触发" },
      attachTo: document.body,
    });

    await wrapper.trigger("mouseenter");
    expect(wrapper.emitted("update:open")).toBeUndefined();
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    wrapper.unmount();
  });
});
