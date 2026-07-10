import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, ref } from "vue";
import { Checkbox, CheckboxGroup } from "./Checkbox";

const meta = {
  title: "Vue/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () =>
    defineComponent({
      setup() {
        const checked = ref(false);
        return () => (
          <Checkbox
            checked={checked.value}
            onUpdate:checked={(next: boolean) => {
              checked.value = next;
            }}
          >
            同意条款
          </Checkbox>
        );
      },
    }),
};

export const Indeterminate: Story = {
  render: () =>
    defineComponent({
      setup() {
        const checked = ref(false);
        const indeterminate = ref(true);
        return () => (
          <Checkbox
            checked={checked.value}
            indeterminate={indeterminate.value}
            onUpdate:checked={(next: boolean) => {
              checked.value = next;
              indeterminate.value = false;
            }}
          >
            全选
          </Checkbox>
        );
      },
    }),
};

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true, label: "不可用" },
};

export const GroupVertical: Story = {
  render: () =>
    defineComponent({
      setup() {
        const value = ref<string[]>(["apple"]);
        return () => (
          <CheckboxGroup
            modelValue={value.value}
            onUpdate:modelValue={(next: string[]) => {
              value.value = next;
            }}
            aria-label="水果"
            orientation="vertical"
          >
            <Checkbox value="apple">苹果</Checkbox>
            <Checkbox value="banana">香蕉</Checkbox>
            <Checkbox value="orange">橙子</Checkbox>
          </CheckboxGroup>
        );
      },
    }),
};

export const GroupHorizontal: Story = {
  render: () =>
    defineComponent({
      setup() {
        const value = ref<string[]>([]);
        return () => (
          <CheckboxGroup
            modelValue={value.value}
            onUpdate:modelValue={(next: string[]) => {
              value.value = next;
            }}
            aria-label="标签"
            orientation="horizontal"
          >
            <Checkbox value="a">A</Checkbox>
            <Checkbox value="b">B</Checkbox>
            <Checkbox value="c">C</Checkbox>
          </CheckboxGroup>
        );
      },
    }),
};
