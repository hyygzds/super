import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "React/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: { children: "记住我" },
};

export const Controlled: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(false);
    return (
      <Checkbox checked={checked} onCheckedChange={setChecked}>
        受控 checkbox（当前：{checked ? "选中" : "未选中"}）
      </Checkbox>
    );
  },
};

export const Indeterminate: Story = {
  args: { indeterminate: true, children: "部分选中" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true, children: "禁用（已选）" },
};
