import type { Meta, StoryObj } from "@storybook/vue3";
import { VirtualGrid } from "./VirtualGrid";
import type {
  VirtualGridCellContext,
  VirtualGridColumn,
} from "./VirtualGrid";

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

export const ColumnTemplate: Story = {
  render: () => (
    <VirtualGrid
      columns={[
        { field: "id", title: "标识", width: 80 },
        { field: "name", title: "名称", width: 160 },
        { field: "fullName", title: "全称" },
      ]}
      data={makeRows(8)}
      v-slots={{
        "header-name": () => (
          <span class="text-sky-700">名称（自定义表头）</span>
        ),
        "cell-name": ({ value }: VirtualGridCellContext) => (
          <span class="font-semibold text-sky-800">{String(value)}</span>
        ),
      }}
    />
  ),
};

export const CellTemplate: Story = {
  render: () => (
    <VirtualGrid
      columns={[
        { field: "id", title: "标识", width: 80 },
        { field: "name", title: "名称", width: 120 },
        { field: "code", title: "编号", width: 100 },
      ]}
      data={makeRows(8)}
      v-slots={{
        cell: ({ column, value }: VirtualGridCellContext) =>
          column.field === "code" ? (
            <code class="rounded bg-slate-100 px-1">{String(value)}</code>
          ) : (
            String(value ?? "")
          ),
      }}
    />
  ),
};

export const AutoHeight: Story = {
  render: () => (
    <VirtualGrid
      columns={[
        { field: "id", title: "标识", width: 80 },
        { field: "name", title: "多行内容", width: 280 },
      ]}
      data={makeRows(80)}
      virtual
      autoHeight
      height={360}
      rowHeight={40}
      v-slots={{
        "cell-name": ({ rowIndex }: VirtualGridCellContext) => (
          <span>
            {"段落 ".repeat((rowIndex % 4) + 1)}
            自动行高示例 #{rowIndex + 1}
          </span>
        ),
      }}
    />
  ),
};

export const FixedColumns: Story = {
  render: () => (
    <VirtualGrid
      columns={[
        { field: "id", title: "ID", width: 72, fixed: "left" },
        { field: "code", title: "编号", width: 100, fixed: "left" },
        { field: "name", title: "名称", width: 160 },
        { field: "fullName", title: "全称", width: 220 },
        { field: "extra1", title: "扩展一", width: 140 },
        { field: "extra2", title: "扩展二", width: 140 },
        { field: "status", title: "状态", width: 90, fixed: "right" },
      ]}
      data={Array.from({ length: 20 }, (_, i) => ({
        ...makeRows(1)[0],
        id: String(i + 1),
        code: String(i + 1).padStart(4, "0"),
        name: `Name ${i + 1}`,
        fullName: `Full Name ${i + 1}`,
        extra1: `E1-${i + 1}`,
        extra2: `E2-${i + 1}`,
        status: i % 2 === 0 ? "启用" : "停用",
      }))}
      height={320}
      showRowNumber
    />
  ),
};
