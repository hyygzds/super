import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { Form, FormItem, type FormHandle } from "./Form";

describe("Form (React)", () => {
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
    expect(await screen.findByText("必填")).toBeInTheDocument();
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
    expect(await screen.findByText("必填")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
