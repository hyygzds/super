import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, ref } from "vue";
import { Input } from "./Input";

const meta = {
  title: "Vue/Input",
  component: Input,
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () =>
    defineComponent({
      setup() {
        const value = ref("");
        return () => (
          <Input
            modelValue={value.value}
            onUpdate:modelValue={(next: string) => {
              value.value = next;
            }}
            placeholder="请输入"
            aria-label="名称"
          />
        );
      },
    }),
};

export const Password: Story = {
  render: () =>
    defineComponent({
      setup() {
        return () => (
          <Input type="password" defaultValue="secret" aria-label="密码" />
        );
      },
    }),
};

export const Number: Story = {
  render: () =>
    defineComponent({
      setup() {
        const value = ref("");
        return () => (
          <Input
            type="number"
            modelValue={value.value}
            onUpdate:modelValue={(next: string) => {
              value.value = next;
            }}
            aria-label="数量"
            placeholder="0"
          />
        );
      },
    }),
};

export const Clearable: Story = {
  render: () =>
    defineComponent({
      setup() {
        return () => (
          <Input
            defaultValue="可清除"
            clearable
            aria-label="可清除输入"
          />
        );
      },
    }),
};

export const Disabled: Story = {
  render: () =>
    defineComponent({
      setup() {
        return () => (
          <Input defaultValue="不可用" disabled aria-label="禁用" />
        );
      },
    }),
};

export const Sizes: Story = {
  render: () =>
    defineComponent({
      setup() {
        return () => (
          <div class="flex flex-col gap-3">
            <Input size="sm" defaultValue="sm" aria-label="小号" />
            <Input size="md" defaultValue="md" aria-label="中号" />
          </div>
        );
      },
    }),
};
