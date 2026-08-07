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

export const ColumnTemplate: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 80 },
      {
        field: "name",
        title: "名称",
        width: 160,
        renderHeader: () => (
          <span className="text-sky-700">名称（自定义表头）</span>
        ),
        render: ({ value }) => (
          <span className="font-semibold text-sky-800">{String(value)}</span>
        ),
      },
      { field: "fullName", title: "全称" },
    ],
    data: makeRows(8),
  },
};

export const CellTemplate: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 80 },
      { field: "name", title: "名称", width: 120 },
      { field: "code", title: "编号", width: 100 },
    ],
    data: makeRows(8),
    renderCell: ({ column, value }) =>
      column.field === "code" ? (
        <code className="rounded bg-slate-100 px-1">{String(value)}</code>
      ) : (
        String(value ?? "")
      ),
  },
};

export const AutoHeight: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 80 },
      {
        field: "name",
        title: "多行内容",
        width: 280,
        render: ({ rowIndex }) => (
          <span>
            {"段落 ".repeat((rowIndex % 4) + 1)}
            自动行高示例 #{rowIndex + 1}
          </span>
        ),
      },
    ],
    data: makeRows(80),
    virtual: true,
    autoHeight: true,
    height: 360,
    rowHeight: 40,
  },
};

export const FixedColumns: Story = {
  args: {
    columns: [
      { field: "id", title: "ID", width: 72, fixed: "left" },
      { field: "code", title: "编号", width: 100, fixed: "left" },
      { field: "name", title: "名称", width: 160 },
      { field: "fullName", title: "全称", width: 220 },
      { field: "extra1", title: "扩展一", width: 140 },
      { field: "extra2", title: "扩展二", width: 140 },
      { field: "status", title: "状态", width: 90, fixed: "right" },
    ],
    data: Array.from({ length: 20 }, (_, i) => ({
      ...makeRows(1)[0],
      id: String(i + 1),
      code: String(i + 1).padStart(4, "0"),
      name: `Name ${i + 1}`,
      fullName: `Full Name ${i + 1}`,
      extra1: `E1-${i + 1}`,
      extra2: `E2-${i + 1}`,
      status: i % 2 === 0 ? "启用" : "停用",
    })),
    height: 320,
    showRowNumber: true,
  },
};
