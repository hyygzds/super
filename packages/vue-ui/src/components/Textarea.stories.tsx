import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Textarea } from "./Textarea";

const meta = {
  title: "Vue/Textarea",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Textarea defaultModelValue="" placeholder="多行文本" />
  ),
};

export const WithCount: Story = {
  render: () => (
    <Textarea
      defaultModelValue="你好"
      showCount
      maxLength={100}
      placeholder="带字数统计"
    />
  ),
};

export const Controlled: Story = {
  render: () => {
    const value = ref("受控文本");
    return () => (
      <div class="flex flex-col gap-2">
        <Textarea
          modelValue={value.value}
          onUpdate:modelValue={(v: string) => {
            value.value = v;
          }}
          showCount
          maxLength={50}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => <Textarea disabled defaultModelValue="禁用" />,
};
