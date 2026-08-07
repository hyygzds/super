import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Textarea } from "./Textarea";

const meta = {
  title: "React/Textarea",
  component: Textarea,
  tags: ["autodocs"],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: { placeholder: "请输入备注", rows: 3 },
};

export const WithCount: Story = {
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <div className="w-80">
        <Textarea
          value={value}
          onChange={setValue}
          maxLength={100}
          showCount
          placeholder="最多 100 字"
        />
      </div>
    );
  },
};
