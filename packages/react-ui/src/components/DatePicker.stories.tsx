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
    defaultValue: "2026-09-12",
    placeholder: "请选择日期",
  },
};

export const Controlled: Story = {
  render: function Render() {
    const [value, setValue] = useState("2026-09-12");
    return (
      <div className="w-72 space-y-2">
        <DatePicker value={value} onChange={setValue} />
        <pre className="rounded bg-slate-100 p-2 text-xs">{value || "(空)"}</pre>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "2026-09-12",
  },
};

export const MinMax: Story = {
  args: {
    defaultValue: "2026-09-15",
    minDate: "2026-09-10",
    maxDate: "2026-09-20",
  },
};
