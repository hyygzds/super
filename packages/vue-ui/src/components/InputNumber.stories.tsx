import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { InputNumber } from "./InputNumber";

const meta = {
  title: "Vue/InputNumber",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <InputNumber defaultModelValue={1} />,
};

export const MinMax: Story = {
  render: () => (
    <InputNumber defaultModelValue={5} min={0} max={10} step={1} />
  ),
};

export const Precision: Story = {
  render: () => (
    <InputNumber defaultModelValue={1.5} step={0.1} precision={1} />
  ),
};

export const Controlled: Story = {
  render: () => {
    const value = ref<number | null>(3);
    return () => (
      <div class="flex flex-col gap-2">
        <InputNumber
          modelValue={value.value}
          onUpdate:modelValue={(v: number | null) => {
            value.value = v;
          }}
        />
        <span class="text-sm text-slate-600">
          当前：{value.value === null ? "null" : value.value}
        </span>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => <InputNumber disabled defaultModelValue={8} />,
};
