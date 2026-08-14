import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { Checkbox } from "./Checkbox";
import { Form, FormItem, type FormHandle } from "./Form";
import { Input } from "./Input";
import { InputNumber } from "./InputNumber";
import { Switch } from "./Switch";

describe("Form (React)", () => {
  it("wires library Input and InputNumber into onFinish", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <Form
        initialValues={{ email: "", age: null }}
        onFinish={onFinish}
      >
        <FormItem
          name="email"
          label="邮箱"
          rules={[{ required: true, message: "必填" }]}
        >
          <Input aria-label="邮箱" />
        </FormItem>
        <FormItem
          name="age"
          label="年龄"
          rules={[{ required: true, message: "必填" }]}
        >
          <InputNumber aria-label="年龄" />
        </FormItem>
        <button type="submit">提交</button>
      </Form>,
    );
    await user.type(screen.getByLabelText(/邮箱/), "a@b.c");
    await user.type(screen.getByLabelText(/年龄/), "18");
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() =>
      expect(onFinish).toHaveBeenCalledWith({ email: "a@b.c", age: 18 }),
    );
  });

  it("collects values and calls onFinish when valid", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <Form initialValues={{ email: "" }} onFinish={onFinish}>
        <FormItem name="email" label="邮箱" rules={[{ required: true, message: "必填" }]}>
          <input aria-label="邮箱" />
        </FormItem>
        <button type="submit">提交</button>
      </Form>,
    );
    await user.type(screen.getByLabelText("邮箱"), "a@b.c");
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() =>
      expect(onFinish).toHaveBeenCalledWith({ email: "a@b.c" }),
    );
  });

  it("wires Checkbox and Switch via valuePropName checked", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <Form
        initialValues={{ agree: false, notify: false }}
        onFinish={onFinish}
      >
        <FormItem name="agree" valuePropName="checked" trigger="onCheckedChange">
          <Checkbox>同意</Checkbox>
        </FormItem>
        <FormItem
          name="notify"
          label="通知"
          valuePropName="checked"
          trigger="onCheckedChange"
        >
          <Switch />
        </FormItem>
        <button type="submit">提交</button>
      </Form>,
    );
    await user.click(screen.getByRole("checkbox", { name: "同意" }));
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() =>
      expect(onFinish).toHaveBeenCalledWith({ agree: true, notify: true }),
    );
  });

  it("validates on blur and shows error", async () => {
    const user = userEvent.setup();
    render(
      <Form>
        <FormItem name="email" label="邮箱" rules={[{ required: true, message: "必填" }]}>
          <input aria-label="邮箱" />
        </FormItem>
      </Form>,
    );
    const input = screen.getByLabelText("邮箱");
    await user.click(input);
    await user.tab();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("必填");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("calls onFinishFailed when submit invalid", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const onFinishFailed = vi.fn();
    render(
      <Form onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <FormItem name="email" label="邮箱" rules={[{ required: true, message: "必填" }]}>
          <input aria-label="邮箱" />
        </FormItem>
        <button type="submit">提交</button>
      </Form>,
    );
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() => expect(onFinishFailed).toHaveBeenCalled());
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("exposes imperative validate via ref", async () => {
    const onFinish = vi.fn();
    function Harness() {
      const ref = useRef<FormHandle>(null);
      return (
        <Form ref={ref} onFinish={onFinish}>
          <FormItem name="n" label="N" rules={[{ required: true, message: "必填" }]}>
            <input aria-label="N" />
          </FormItem>
          <button type="button" onClick={() => void ref.current?.validate()}>
            校验
          </button>
        </Form>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "校验" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("必填");
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("submits nested name paths as a nested values tree", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
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
      </Form>,
    );
    await user.type(screen.getByLabelText("邮箱"), "a@b.c");
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() =>
      expect(onFinish).toHaveBeenCalledWith({ user: { email: "a@b.c" } }),
    );
  });

  it("validates on change when validateTrigger includes change", async () => {
    const user = userEvent.setup();
    render(
      <Form>
        <FormItem
          name="email"
          label="邮箱"
          validateTrigger="change"
          rules={[{ minLength: 3, message: "太短" }]}
        >
          <input aria-label="邮箱" />
        </FormItem>
      </Form>,
    );
    await user.type(screen.getByLabelText("邮箱"), "ab");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("太短");
  });

  it("revalidates when a dependency field changes", async () => {
    const user = userEvent.setup();
    render(
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
      </Form>,
    );
    const confirm = screen.getByLabelText("确认");
    await user.click(confirm);
    await user.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("不一致");
    await user.clear(screen.getByLabelText("密码"));
    await user.type(screen.getByLabelText("密码"), "nope");
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });

  it("Form.List add/remove manages array fields", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <Form initialValues={{ users: [{ name: "Ada" }] }} onFinish={onFinish}>
        <Form.List name="users">
          {(fields, { add, remove }) => (
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
      </Form>,
    );
    expect(screen.getByLabelText("姓名-0")).toHaveValue("Ada");
    await user.click(screen.getByRole("button", { name: "添加" }));
    expect(screen.getByLabelText("姓名-1")).toBeInTheDocument();
    await user.type(screen.getByLabelText("姓名-1"), "Grace");
    await user.click(screen.getByRole("button", { name: "删除-0" }));
    expect(screen.queryByLabelText("姓名-1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("姓名-0")).toHaveValue("Grace");
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() =>
      expect(onFinish).toHaveBeenCalledWith({ users: [{ name: "Grace" }] }),
    );
  });
});
