import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Input } from "./Input";

const meta = {
  title: "Vue/Input",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <Input defaultModelValue="" placeholder="请输入" />,
};

export const Clearable: Story = {
  render: () => (
    <Input defaultModelValue="可清除" clearable placeholder="请输入" />
  ),
};

export const Password: Story = {
  render: () => (
    <Input type="password" defaultModelValue="" placeholder="密码" />
  ),
};

export const Controlled: Story = {
  render: () => {
    const value = ref("受控");
    return () => (
      <div class="flex flex-col gap-2">
        <Input
          modelValue={value.value}
          onUpdate:modelValue={(v: string) => {
            value.value = v;
          }}
          clearable
        />
        <span class="text-sm text-slate-600">当前：{value.value}</span>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => <Input disabled defaultModelValue="禁用" />,
};
