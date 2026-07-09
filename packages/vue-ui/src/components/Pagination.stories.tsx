import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, ref } from "vue";
import { Pagination } from "./Pagination";

const meta = {
  title: "Vue/Pagination",
  component: Pagination,
  tags: ["autodocs"],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () =>
    defineComponent({
      setup() {
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
    }),
};

export const ManyPages: Story = {
  args: { total: 500, defaultPage: 12, defaultPageSize: 10 },
};

export const Disabled: Story = {
  args: { total: 95, defaultPage: 2, disabled: true },
};
