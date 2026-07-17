import type { Meta, StoryObj } from "@storybook/vue3";
import { VirtualGrid } from "./VirtualGrid";
import type { VirtualGridColumn } from "./VirtualGrid";

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
  title: "Vue/VirtualGrid",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <VirtualGrid columns={columns} data={makeRows(10)} />,
};

export const Stripe: Story = {
  render: () => <VirtualGrid columns={columns} data={makeRows(10)} stripe />,
};

export const ShowRowNumber: Story = {
  render: () => (
    <VirtualGrid columns={columns} data={makeRows(10)} showRowNumber />
  ),
};

export const Empty: Story = {
  render: () => <VirtualGrid columns={columns} data={[]} />,
};

export const Virtual: Story = {
  render: () => (
    <VirtualGrid
      columns={columns}
      data={makeRows(5000)}
      virtual
      height={400}
      rowHeight={36}
    />
  ),
};

export const Selection: Story = {
  render: () => <VirtualGrid columns={columns} data={makeRows(10)} selectable />,
};

export const SelectionSingle: Story = {
  render: () => (
    <VirtualGrid
      columns={columns}
      data={makeRows(10)}
      selectable
      multiple={false}
    />
  ),
};

export const Pagination: Story = {
  render: () => (
    <VirtualGrid
      columns={columns}
      data={makeRows(95)}
      pagination
      pageSize={10}
    />
  ),
};

export const SelectionWithPagination: Story = {
  render: () => (
    <VirtualGrid
      columns={columns}
      data={makeRows(95)}
      selectable
      pagination
      pageSize={10}
    />
  ),
};
