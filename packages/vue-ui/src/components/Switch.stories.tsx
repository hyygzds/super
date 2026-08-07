import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Switch } from "./Switch";

const meta = {
  title: "Vue/Switch",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <Switch defaultModelValue={false} />,
};

export const DefaultOn: Story = {
  render: () => <Switch defaultModelValue />,
};

export const Controlled: Story = {
  render: () => {
    const on = ref(false);
    return () => (
      <div class="flex items-center gap-3">
        <Switch
          modelValue={on.value}
          onUpdate:modelValue={(v: boolean) => {
            on.value = v;
          }}
        />
        <span class="text-sm text-slate-600">
          {on.value ? "开启" : "关闭"}
        </span>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div class="flex items-center gap-4">
      <Switch disabled defaultModelValue={false} />
      <Switch disabled defaultModelValue />
    </div>
  ),
};
