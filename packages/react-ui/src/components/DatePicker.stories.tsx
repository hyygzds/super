import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DatePicker } from "./DatePicker";

const meta = {
  title: "React/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    defaultValue: "2026-03-15",
    placeholder: "请选择日期",
    clearable: true,
  },
};

export const Controlled: Story = {
  render: function Render() {
    const [value, setValue] = useState("2026-09-12");
    return (
      <div className="w-72 space-y-2">
        <DatePicker value={value} onChange={setValue} clearable />
        <p className="text-sm text-slate-600">当前：{value || "（空）"}</p>
      </div>
    );
  },
};

export const MinMax: Story = {
  args: {
    defaultValue: "2026-03-15",
    min: "2026-03-10",
    max: "2026-03-20",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "2026-03-15",
    disabled: true,
  },
};
