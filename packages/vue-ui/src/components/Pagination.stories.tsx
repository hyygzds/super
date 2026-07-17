import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Pagination } from "./Pagination";

const meta = {
  title: "Vue/Pagination",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => {
    const page = ref(1);
    const pageSize = ref(10);
    return () => (
      <Pagination
        total={95}
        page={page.value}
        pageSize={pageSize.value}
        onUpdate:page={(p: number) => {
          page.value = p;
        }}
        onUpdate:pageSize={(s: number) => {
          pageSize.value = s;
        }}
      />
    );
  },
};

export const ManyPages: Story = {
  render: () => (
    <Pagination total={500} defaultPage={12} defaultPageSize={10} />
  ),
};

export const Disabled: Story = {
  render: () => <Pagination total={95} defaultPage={2} disabled />,
};
