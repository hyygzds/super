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
  args: { placeholder: "请输入" },
};

export const Clearable: Story = {
  render: function Render() {
    const [value, setValue] = useState("可清除");
    return (
      <div className="w-72">
        <Input value={value} onChange={setValue} clearable placeholder="请输入" />
      </div>
    );
  },
};

export const Password: Story = {
  args: {
    type: "password",
    defaultValue: "secret",
    placeholder: "密码",
  },
};
