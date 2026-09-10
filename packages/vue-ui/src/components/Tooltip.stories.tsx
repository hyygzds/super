import type { Meta, StoryObj } from "@storybook/vue3";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "Vue/Tooltip",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Tooltip content="完整内容提示">
      <span class="inline-block max-w-[120px] truncate rounded border border-slate-200 px-2 py-1">
        这是一段会被截断的文本
      </span>
    </Tooltip>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tooltip content="不会显示" disabled>
      <span>禁用提示</span>
    </Tooltip>
  ),
};
