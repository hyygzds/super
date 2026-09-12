import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { DatePicker } from "./DatePicker";

const meta = {
  title: "Vue/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <DatePicker defaultModelValue="2026-03-15" placeholder="请选择日期" clearable />
  ),
};

export const Controlled: Story = {
  render: () => {
    const value = ref("2026-09-12");
    return () => (
      <div class="w-72 space-y-2">
        <DatePicker
          modelValue={value.value}
          clearable
          onUpdate:modelValue={(next: string) => {
            value.value = next;
          }}
        />
        <p class="text-sm text-slate-600">当前：{value.value || "（空）"}</p>
      </div>
    );
  },
};

export const MinMax: Story = {
  render: () => (
    <DatePicker
      defaultModelValue="2026-03-15"
      min="2026-03-10"
      max="2026-03-20"
    />
  ),
};

export const Disabled: Story = {
  render: () => <DatePicker disabled defaultModelValue="2026-03-15" />,
};
