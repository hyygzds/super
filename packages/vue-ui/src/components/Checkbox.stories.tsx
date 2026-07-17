import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Vue/Checkbox",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <Checkbox>记住我</Checkbox>,
};

export const Controlled: Story = {
  render: () => {
    const checked = ref(false);
    return () => (
      <Checkbox
        modelValue={checked.value}
        onUpdate:modelValue={(v: boolean) => {
          checked.value = v;
        }}
      >
        受控 checkbox（当前：{checked.value ? "选中" : "未选中"}）
      </Checkbox>
    );
  },
};

export const Indeterminate: Story = {
  render: () => <Checkbox indeterminate>部分选中</Checkbox>,
};

export const Disabled: Story = {
  render: () => (
    <Checkbox disabled defaultModelValue>
      禁用（已选）
    </Checkbox>
  ),
};
