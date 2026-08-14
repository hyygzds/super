import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { Checkbox } from "./Checkbox";
import { Form, FormItem } from "./Form";
import { Switch } from "./Switch";

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

  it("collects values from input events without waiting for change", async () => {
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
    const el = input.element as HTMLInputElement;
    el.value = "typed@ex.com";
    await input.trigger("input");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinish).toHaveBeenCalledWith({ email: "typed@ex.com" });
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

  it("wires Checkbox and Switch via valuePropName checked", async () => {
    const onFinish = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form
              initialValues={{ agree: false, notify: false }}
              onFinish={onFinish}
            >
              <FormItem name="agree" valuePropName="checked">
                <Checkbox>同意</Checkbox>
              </FormItem>
              <FormItem name="notify" label="通知" valuePropName="checked">
                <Switch />
              </FormItem>
              <button type="submit">提交</button>
            </Form>
          );
        },
      }),
    );
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('[role="switch"]').trigger("click");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinish).toHaveBeenCalledWith({ agree: true, notify: true });
  });

  it("submits nested name paths as a nested values tree", async () => {
    const onFinish = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form
              initialValues={{ user: { email: "" } }}
              onFinish={onFinish}
            >
              <FormItem
                name="user.email"
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
    await wrapper.find('input[aria-label="邮箱"]').setValue("a@b.c");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinish).toHaveBeenCalledWith({ user: { email: "a@b.c" } });
  });

  it("validates on change when validateTrigger includes change", async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form>
              <FormItem
                name="email"
                label="邮箱"
                validateTrigger="change"
                rules={[{ minLength: 3, message: "太短" }]}
              >
                <input aria-label="邮箱" />
              </FormItem>
            </Form>
          );
        },
      }),
    );
    const input = wrapper.find('input[aria-label="邮箱"]');
    await input.setValue("ab");
    await flushPromises();
    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("太短");
  });

  it("revalidates when a dependency field changes", async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form initialValues={{ password: "secret", confirm: "nope" }}>
              <FormItem name="password" label="密码">
                <input aria-label="密码" />
              </FormItem>
              <FormItem
                name="confirm"
                label="确认"
                dependencies={["password"]}
                rules={[
                  {
                    validator: (value, values) =>
                      value === values.password ? true : "不一致",
                  },
                ]}
              >
                <input aria-label="确认" />
              </FormItem>
            </Form>
          );
        },
      }),
    );
    const confirm = wrapper.find('input[aria-label="确认"]');
    await confirm.trigger("focus");
    await confirm.trigger("blur");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain("不一致");
    await wrapper.find('input[aria-label="密码"]').setValue("nope");
    await flushPromises();
    await nextTick();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("Form.List add/remove manages array fields", async () => {
    const onFinish = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form
              initialValues={{ users: [{ name: "Ada" }] }}
              onFinish={onFinish}
            >
              <Form.List name="users">
                {({
                  fields,
                  add,
                  remove,
                }: {
                  fields: { key: number; name: number }[];
                  add: (v?: unknown) => void;
                  remove: (i: number) => void;
                }) => (
                  <>
                    {fields.map((field) => (
                      <div key={field.key}>
                        <FormItem name={[field.name, "name"]} label="姓名">
                          <input aria-label={`姓名-${field.name}`} />
                        </FormItem>
                        <button
                          type="button"
                          onClick={() => remove(field.name)}
                        >
                          删除-{field.name}
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => add({ name: "" })}>
                      添加
                    </button>
                  </>
                )}
              </Form.List>
              <button type="submit">提交</button>
            </Form>
          );
        },
      }),
    );
    expect(
      (wrapper.find('input[aria-label="姓名-0"]').element as HTMLInputElement)
        .value,
    ).toBe("Ada");
    const addBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "添加")!;
    await addBtn.trigger("click");
    await nextTick();
    expect(wrapper.find('input[aria-label="姓名-1"]').exists()).toBe(true);
    await wrapper.find('input[aria-label="姓名-1"]').setValue("Grace");
    const remove0 = wrapper
      .findAll("button")
      .find((b) => b.text() === "删除-0")!;
    await remove0.trigger("click");
    await nextTick();
    expect(wrapper.find('input[aria-label="姓名-1"]').exists()).toBe(false);
    expect(
      (wrapper.find('input[aria-label="姓名-0"]').element as HTMLInputElement)
        .value,
    ).toBe("Grace");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinish).toHaveBeenCalledWith({ users: [{ name: "Grace" }] });
  });
});
