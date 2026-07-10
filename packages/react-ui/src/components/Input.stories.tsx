import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Input } from "./Input";

const meta = {
  title: "React/Input",
  component: Input,
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <Input
        value={value}
        onValueChange={setValue}
        placeholder="请输入"
        aria-label="名称"
      />
    );
  },
};

export const Password: Story = {
  args: {
    type: "password",
    defaultValue: "secret",
    "aria-label": "密码",
  },
};

export const Number: Story = {
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <Input
        type="number"
        value={value}
        onValueChange={setValue}
        aria-label="数量"
        placeholder="0"
      />
    );
  },
};

export const Clearable: Story = {
  args: {
    defaultValue: "可清除",
    clearable: true,
    "aria-label": "可清除输入",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "不可用",
    disabled: true,
    "aria-label": "禁用",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input size="sm" defaultValue="sm" aria-label="小号" />
      <Input size="md" defaultValue="md" aria-label="中号" />
    </div>
  ),
};
