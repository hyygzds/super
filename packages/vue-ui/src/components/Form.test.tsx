import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { Form, FormItem } from "./Form";

describe("Form (Vue)", () => {
  it("collects values and emits finish when valid", async () => {
    const onFinish = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form initialValues={{ email: "" }} onFinish={onFinish}>
              <FormItem
                name="email"
                label="邮箱"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="邮箱" />
              </FormItem>
              <button type="submit">提交</button>
            </Form>
          );
        },
      }),
    );
    const input = wrapper.find('input[aria-label="邮箱"]');
    await input.setValue("a@b.c");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinish).toHaveBeenCalledWith({ email: "a@b.c" });
  });

  it("validates on blur and shows error", async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form>
              <FormItem
                name="email"
                label="邮箱"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="邮箱" />
              </FormItem>
            </Form>
          );
        },
      }),
    );
    const input = wrapper.find('input[aria-label="邮箱"]');
    await input.trigger("focus");
    await input.trigger("blur");
    await flushPromises();
    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("必填");
    expect(input.attributes("aria-invalid")).toBe("true");
  });

  it("emits finishFailed when submit invalid", async () => {
    const onFinish = vi.fn();
    const onFinishFailed = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form onFinish={onFinish} onFinishFailed={onFinishFailed}>
              <FormItem
                name="email"
                label="邮箱"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="邮箱" />
              </FormItem>
              <button type="submit">提交</button>
            </Form>
          );
        },
      }),
    );
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinishFailed).toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("exposes imperative validate", async () => {
    const onFinish = vi.fn();
    const formRef = ref<{ validate: () => Promise<unknown> } | null>(null);
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form ref={formRef} onFinish={onFinish}>
              <FormItem
                name="n"
                label="N"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="N" />
              </FormItem>
            </Form>
          );
        },
      }),
    );
    await formRef.value!.validate();
    await flushPromises();
    await nextTick();
    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("必填");
    expect(onFinish).not.toHaveBeenCalled();
  });
});
