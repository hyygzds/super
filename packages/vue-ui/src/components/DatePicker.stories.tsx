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
  args: {
    defaultModelValue: "2026-09-12",
    placeholder: "请选择日期",
  },
};

export const Controlled: Story = {
  args: {},
  render: () => {
    const value = ref("2026-09-12");
    return () => (
      <div class="w-72 space-y-2">
        <DatePicker
          modelValue={value.value}
          onUpdate:modelValue={(next: string) => {
            value.value = next;
          }}
        />
        <pre class="rounded bg-slate-100 p-2 text-xs">{value.value || "(空)"}</pre>
      </div>
    );
  },
};

export const WithRange: Story = {
  args: {
    defaultModelValue: "2026-09-12",
    minDate: "2026-09-10",
    maxDate: "2026-09-20",
  },
};

export const Disabled: Story = {
  args: {
    defaultModelValue: "2026-09-12",
    disabled: true,
  },
};
