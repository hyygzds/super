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

  it("skips opening when onlyIfOverflow and the trigger is not overflowing", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return 40;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 80;
      },
    });
    const wrapper = mount(Tooltip, {
      props: { content: "完整内容", onlyIfOverflow: true },
      slots: { default: () => "短文本" },
      attachTo: document.body,
    });

    await wrapper.trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    wrapper.unmount();
  });

  it("closes on ancestor scroll so a fixed popup does not linger", async () => {
    const wrapper = mount(Tooltip, {
      props: { content: "完整内容" },
      slots: { default: () => "截断文本" },
      attachTo: document.body,
    });

    await wrapper.trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')).not.toBeNull();

    window.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    wrapper.unmount();
  });

  it("opens onlyIfOverflow when a nested truncated child overflows", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return (this as HTMLElement).dataset.overflow === "true" ? 240 : 80;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 80;
      },
    });
    const wrapper = mount(Tooltip, {
      props: { content: "完整内容", onlyIfOverflow: true },
      slots: {
        default: () => <span data-overflow="true">很长的嵌套文本</span>,
      },
      attachTo: document.body,
    });

    await wrapper.trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      "完整内容",
    );

    wrapper.unmount();
  });

  it("does not force block or truncate layout on the trigger", () => {
    const wrapper = mount(Tooltip, {
      props: { content: "提示" },
      slots: {
        default: () => <button type="button">按钮</button>,
      },
    });
    expect(wrapper.classes()).not.toContain("truncate");
    expect(wrapper.classes()).not.toContain("block");
    wrapper.unmount();
  });

  it("lets a caller block class replace the default trigger display", () => {
    const wrapper = mount(Tooltip, {
      props: { content: "提示", class: "block w-full truncate" },
      slots: { default: () => "文本" },
    });
    expect(wrapper.classes()).toContain("block");
    expect(wrapper.classes()).toContain("truncate");
    expect(wrapper.classes()).not.toContain("inline-flex");
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
