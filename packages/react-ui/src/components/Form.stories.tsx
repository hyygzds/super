import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox } from "./Checkbox";
import { Form, FormItem } from "./Form";
import { Input } from "./Input";
import { InputNumber } from "./InputNumber";
import { RadioGroup } from "./Radio";
import { Select } from "./Select";
import { Switch } from "./Switch";
import { Textarea } from "./Textarea";

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
      <div className="max-w-md space-y-2">
        <Form
          initialValues={{ email: "", age: null, bio: "" }}
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
            <Input placeholder="you@example.com" clearable />
          </FormItem>
          <FormItem
            name="age"
            label="年龄"
            rules={[{ required: true, message: "请输入年龄" }]}
          >
            <InputNumber min={0} max={120} placeholder="可选数字" />
          </FormItem>
          <FormItem name="bio" label="简介">
            <Textarea rows={3} showCount maxLength={100} placeholder="一句话介绍" />
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
            <Input placeholder="张三" />
          </FormItem>
          <FormItem
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }]}
          >
            <Input placeholder="you@example.com" />
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
            <Input placeholder="失焦试试" />
          </FormItem>
        </Form>
      </div>
    );
  },
};

export const WithChoices: Story = {
  render: function Render() {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <div className="max-w-md">
        <Form
          initialValues={{
            role: "dev",
            notify: true,
            agree: false,
            city: undefined,
          }}
          onFinish={(values) => {
            setSubmitted(JSON.stringify(values, null, 2));
          }}
        >
          <FormItem
            name="role"
            label="角色"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <RadioGroup
              options={[
                { label: "开发", value: "dev" },
                { label: "设计", value: "design" },
                { label: "产品", value: "pm" },
              ]}
            />
          </FormItem>
          <FormItem
            name="notify"
            label="消息通知"
            valuePropName="checked"
            trigger="onCheckedChange"
          >
            <Switch />
          </FormItem>
          <FormItem
            name="agree"
            valuePropName="checked"
            trigger="onCheckedChange"
            rules={[
              {
                validator: (v) => v === true || "请勾选同意",
              },
            ]}
          >
            <Checkbox>同意服务条款</Checkbox>
          </FormItem>
          <FormItem
            name="city"
            label="城市"
            rules={[{ required: true, message: "请选择城市" }]}
          >
            <Select
              options={[
                { label: "北京", value: "bj" },
                { label: "上海", value: "sh" },
                { label: "深圳", value: "sz" },
              ]}
              placeholder="请选择"
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

export const NestedAndList: Story = {
  render: function Render() {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <div className="max-w-md space-y-2">
        <Form
          initialValues={{
            user: { email: "" },
            password: "",
            confirm: "",
            users: [{ name: "" }],
          }}
          onFinish={(values) => {
            setSubmitted(JSON.stringify(values, null, 2));
          }}
        >
          <FormItem
            name="user.email"
            label="邮箱"
            validateTrigger="change"
            rules={[{ required: true, message: "请输入邮箱" }]}
          >
            <Input placeholder="nested path + change trigger" />
          </FormItem>
          <FormItem name="password" label="密码">
            <Input type="password" />
          </FormItem>
          <FormItem
            name="confirm"
            label="确认密码"
            dependencies={["password"]}
            rules={[
              {
                validator: (value, values) =>
                  value === values.password ? true : "两次密码不一致",
              },
            ]}
          >
            <Input type="password" />
          </FormItem>
          <Form.List name="users">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                {fields.map((field) => (
                  <div key={field.key} className="flex items-end gap-2">
                    <FormItem
                      name={[field.name, "name"]}
                      label={`成员 ${field.name + 1}`}
                      className="flex-1"
                    >
                      <Input placeholder="姓名" />
                    </FormItem>
                    <button
                      type="button"
                      className="mb-1 rounded border px-2 py-1 text-sm"
                      onClick={() => remove(field.name)}
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => add({ name: "" })}
                >
                  添加成员
                </button>
              </div>
            )}
          </Form.List>
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
