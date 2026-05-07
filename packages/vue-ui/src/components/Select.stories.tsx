import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, ref } from "vue";
import Select from "./Select";

const meta = {
  title: "Vue/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () =>
    defineComponent({
      setup() {
        const v = ref<string | undefined>();
        return () => (
          <div class="w-72">
            <Select
              options={[
                { value: "a", label: "选项 A" },
                { value: "b", label: "选项 B" },
              ]}
              modelValue={v.value}
              onUpdate:modelValue={(x: string | undefined) => {
                v.value = x;
              }}
              placeholder="请选择"
            />
          </div>
        );
      },
    }),
};
