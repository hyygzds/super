import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "React/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    content: "完整内容提示",
    children: (
      <span className="inline-block max-w-[120px] truncate rounded border border-slate-200 px-2 py-1">
        这是一段会被截断的文本
      </span>
    ),
  },
};

export const Disabled: Story = {
  args: {
    content: "不会显示",
    disabled: true,
    children: <span>禁用提示</span>,
  },
};
