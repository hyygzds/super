import type { Meta, StoryObj } from "@storybook/react";
import { VirtualGrid, type VirtualGridColumn } from "./VirtualGrid";

const columns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "code", title: "编号", width: 100 },
  { field: "name", title: "名称", width: 120 },
  { field: "fullName", title: "全称" },
];

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    code: String(i + 1).padStart(4, "0"),
    name: `Name ${i + 1}`,
    fullName: `Full Name ${i + 1}`,
  }));
}

const meta = {
  title: "React/VirtualGrid",
  component: VirtualGrid,
  tags: ["autodocs"],
} satisfies Meta<typeof VirtualGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: { columns, data: makeRows(10) },
};

export const Stripe: Story = {
  args: { columns, data: makeRows(10), stripe: true },
};

export const ShowRowNumber: Story = {
  args: { columns, data: makeRows(10), showRowNumber: true },
};

export const Empty: Story = {
  args: { columns, data: [] },
};

export const Virtual: Story = {
  args: {
    columns,
    data: makeRows(5000),
    virtual: true,
    height: 400,
    rowHeight: 36,
  },
};

export const Selection: Story = {
  args: { columns, data: makeRows(10), selectable: true },
};

export const SelectionSingle: Story = {
  args: { columns, data: makeRows(10), selectable: true, multiple: false },
};

export const Pagination: Story = {
  args: { columns, data: makeRows(95), pagination: true, pageSize: 10 },
};

export const SelectionWithPagination: Story = {
  args: {
    columns,
    data: makeRows(95),
    selectable: true,
    pagination: true,
    pageSize: 10,
  },
};
