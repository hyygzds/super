import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Radio, RadioGroup } from "./Radio";

const meta = {
  title: "Vue/Radio",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <RadioGroup defaultModelValue="apple">
      <Radio value="apple">苹果</Radio>
      <Radio value="banana">香蕉</Radio>
      <Radio value="orange">橙子</Radio>
    </RadioGroup>
  ),
};

export const WithOptions: Story = {
  render: () => (
    <RadioGroup
      defaultModelValue="a"
      options={[
        { label: "选项 A", value: "a" },
        { label: "选项 B", value: "b" },
        { label: "选项 C（禁用）", value: "c", disabled: true },
      ]}
    />
  ),
};

export const Vertical: Story = {
  render: () => (
    <RadioGroup
      orientation="vertical"
      defaultModelValue="1"
      options={[
        { label: "第一项", value: "1" },
        { label: "第二项", value: "2" },
        { label: "第三项", value: "3" },
      ]}
    />
  ),
};

export const Controlled: Story = {
  render: () => {
    const value = ref("a");
    return () => (
      <div class="flex flex-col gap-2">
        <RadioGroup
          modelValue={value.value}
          onUpdate:modelValue={(v: string) => {
            value.value = v;
          }}
          options={[
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ]}
        />
        <span class="text-sm text-slate-600">当前：{value.value}</span>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup
      disabled
      defaultModelValue="a"
      options={[
        { label: "A", value: "a" },
        { label: "B", value: "b" },
      ]}
    />
  ),
};
