import type { Meta, StoryObj } from "@storybook/vue3";
import { VirtualGrid, type VirtualGridColumn } from "./VirtualGrid";

type Row = { id: string; code: string; name: string };

const columns: VirtualGridColumn<Row>[] = [
  { field: "code", title: "编号", width: 120 },
  { field: "name", title: "名称", width: 160 },
];

const sampleData: Row[] = [
  { id: "1", code: "0001", name: "Sagi" },
  { id: "2", code: "0002", name: "Nancy" },
  { id: "3", code: "0003", name: "Alice" },
  { id: "4", code: "0004", name: "Bob" },
  { id: "5", code: "0005", name: "Charlie" },
];

const virtualData: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: String(i + 1),
  code: String(i + 1).padStart(4, "0"),
  name: `Item ${i + 1}`,
}));

const meta = {
  title: "Vue/VirtualGrid",
  component: VirtualGrid,
  tags: ["autodocs"],
} satisfies Meta<typeof VirtualGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <VirtualGrid
      data={sampleData}
      columns={columns}
      showRowNumber={false}
      class="h-80"
    />
  ),
};

export const Stripe: Story = {
  render: () => (
    <VirtualGrid
      data={sampleData}
      columns={columns}
      stripe
      showRowNumber={false}
      class="h-80"
    />
  ),
};

export const ShowRowNumber: Story = {
  render: () => (
    <VirtualGrid
      data={sampleData}
      columns={columns}
      showRowNumber
      class="h-80"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <VirtualGrid data={[]} columns={columns} class="h-80" />
  ),
};

export const Virtual: Story = {
  render: () => (
    <VirtualGrid
      data={virtualData}
      columns={columns}
      enableVirtual
      showRowNumber={false}
      class="h-80"
    />
  ),
};

export const CellTemplate: Story = {
  render: () => (
    <VirtualGrid
      data={sampleData}
      columns={columns.map((col) =>
        col.field === "name"
          ? {
              ...col,
              render: ({ row }) => (
                <span class="font-medium text-sky-700">{row.name}</span>
              ),
            }
          : col,
      )}
      showRowNumber={false}
      class="h-80"
    />
  ),
};

export const HeaderTemplate: Story = {
  render: () => (
    <VirtualGrid
      data={sampleData}
      columns={columns.map((col) =>
        col.field === "name"
          ? {
              ...col,
              renderHeader: () => (
                <span class="text-sky-700">✦ {col.title}</span>
              ),
            }
          : col,
      )}
      showRowNumber={false}
      class="h-80"
    />
  ),
};
