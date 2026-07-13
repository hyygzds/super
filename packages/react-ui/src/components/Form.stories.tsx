import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Form, FormItem } from "./Form";

const inputClass =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm";

const meta = {
  title: "React/Form",
  component: Form,
  tags: ["autodocs"],
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: function Render() {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <div className="max-w-md">
        <Form
          initialValues={{ email: "" }}
          onFinish={(values) => {
            setSubmitted(JSON.stringify(values, null, 2));
            alert(JSON.stringify(values));
          }}
        >
          <FormItem
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }]}
          >
            <input
              className={inputClass}
              type="email"
              placeholder="you@example.com"
            />
          </FormItem>
          <button
            type="submit"
            className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            提交
          </button>
        </Form>
        {submitted ? (
          <pre className="mt-4 rounded bg-slate-100 p-3 text-xs">{submitted}</pre>
        ) : null}
      </div>
    );
  },
};

export const Horizontal: Story = {
  render: function Render() {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <div className="max-w-lg">
        <Form
          layout="horizontal"
          labelWidth={80}
          initialValues={{ name: "", email: "" }}
          onFinish={(values) => {
            setSubmitted(JSON.stringify(values, null, 2));
          }}
        >
          <FormItem
            name="name"
            label="姓名"
            rules={[{ required: true, message: "请输入姓名" }]}
          >
            <input className={inputClass} placeholder="张三" />
          </FormItem>
          <FormItem
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }]}
          >
            <input
              className={inputClass}
              type="email"
              placeholder="you@example.com"
            />
          </FormItem>
          <button
            type="submit"
            className="ml-[92px] rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            提交
          </button>
        </Form>
        {submitted ? (
          <pre className="mt-4 rounded bg-slate-100 p-3 text-xs">{submitted}</pre>
        ) : null}
      </div>
    );
  },
};

export const BlurValidation: Story = {
  render: function Render() {
    return (
      <div className="max-w-md">
        <p className="mb-4 text-sm text-slate-600">
          离开「邮箱」输入框时会触发 blur 单字段校验；必填未填则显示错误。
        </p>
        <Form>
          <FormItem
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }]}
            help="失焦后校验"
          >
            <input
              className={inputClass}
              type="email"
              placeholder="失焦试试"
            />
          </FormItem>
        </Form>
      </div>
    );
  },
};
