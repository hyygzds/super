import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Transfer } from "./Transfer";

const dataSource = [
  { key: "a", title: "Alpha" },
  { key: "b", title: "Beta" },
  { key: "c", title: "Gamma", disabled: true },
  { key: "d", title: "Delta" },
  { key: "e", title: "Epsilon" },
];

const meta = {
  title: "Vue/Transfer",
  component: Transfer,
  tags: ["autodocs"],
} satisfies Meta<typeof Transfer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    dataSource,
    defaultModelValue: ["b"],
  },
};

export const Controlled: Story = {
  args: { dataSource },
  render: () => {
    const targetKeys = ref<string[]>(["b", "d"]);
    return () => (
      <div class="space-y-2">
        <Transfer
          dataSource={dataSource}
          modelValue={targetKeys.value}
          onUpdate:modelValue={(next: string[]) => {
            targetKeys.value = next;
          }}
        />
        <pre class="rounded bg-slate-100 p-2 text-xs">
          {JSON.stringify(targetKeys.value)}
        </pre>
      </div>
    );
  },
};

export const DisabledItems: Story = {
  args: {
    dataSource,
    defaultModelValue: ["c"],
  },
};
