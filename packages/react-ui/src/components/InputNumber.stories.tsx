import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { InputNumber } from "./InputNumber";

const meta = {
  title: "React/InputNumber",
  component: InputNumber,
  tags: ["autodocs"],
} satisfies Meta<typeof InputNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(1);
    return (
      <div className="w-56">
        <InputNumber value={value} onChange={setValue} />
      </div>
    );
  },
};

export const MinMax: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(5);
    return (
      <div className="w-56">
        <InputNumber
          value={value}
          onChange={setValue}
          min={0}
          max={10}
          step={1}
        />
      </div>
    );
  },
};
