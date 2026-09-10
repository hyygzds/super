import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
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

export const OverflowTooltip: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 72 },
      { field: "name", title: "名称", width: 96 },
      {
        field: "note",
        title: "备注",
        width: 140,
      },
    ],
    data: [
      {
        id: "1",
        name: "超长名称会被截断显示",
        note: "单元格内容较多时，悬停可查看完整备注：项目验收纪要、待办事项与补充说明。",
      },
      {
        id: "2",
        name: "短名",
        note: "短备注",
      },
      {
        id: "3",
        name: "另一段很长的名称用于演示省略号",
        note: "关闭 showOverflowTooltip 后将无法通过悬停阅读完整内容。",
      },
    ],
  },
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

const sortDemoRows = [
  { id: "1", code: "0003", name: "Charlie", fullName: "Charlie Chen" },
  { id: "2", code: "0001", name: "Alice", fullName: "Alice Zhang" },
  { id: "3", code: "0010", name: "Bob", fullName: "Bob Li" },
  { id: "4", code: "0002", name: "Diana", fullName: "Diana Wang" },
  { id: "5", code: "0008", name: "Eve", fullName: "Eve Liu" },
];

export const Sort: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 80 },
      { field: "code", title: "编号", width: 100, sortable: true },
      { field: "name", title: "名称", width: 120, sortable: true },
      { field: "fullName", title: "全称", sortable: true },
    ],
    data: sortDemoRows,
    height: 280,
  },
};

const filterDemoRows = [
  { id: "1", name: "Charlie", city: "Paris" },
  { id: "2", name: "Alice", city: "London" },
  { id: "3", name: "Bob", city: "Paris" },
  { id: "4", name: "Diana", city: "Berlin" },
  { id: "5", name: "Eve", city: "London" },
  { id: "6", name: "Frank", city: "Paris" },
  { id: "7", name: "Grace", city: "Berlin" },
  { id: "8", name: "Hank", city: "London" },
];

export const Filter: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 80 },
      { field: "name", title: "名称", width: 140, filterable: true },
      { field: "city", title: "城市", width: 140, filterable: true },
    ],
    data: filterDemoRows,
    height: 320,
  },
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

export const OverflowTooltip: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 64 },
      { field: "name", title: "超长表头标题会被截断", width: 96 },
      {
        field: "remark",
        title: "备注",
        width: 140,
      },
    ],
    data: [
      {
        id: "1",
        name: "这是一段会被列宽截断的超长单元格内容，悬停单元格可查看完整文本",
        remark:
          "备注同样可能超出列宽：采购申请已提交财务复核，等待本周内完成审批并回写单号。",
      },
      {
        id: "2",
        name: "短文本",
        remark: "正常长度备注",
      },
    ],
    bordered: true,
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

const headGroupColumns: VirtualGridColumn[] = [
  {
    field: "info",
    title: "信息",
    children: [
      { field: "id", title: "标识", width: 80 },
      { field: "code", title: "编号", width: 100 },
      { field: "name", title: "名称", width: 120 },
    ],
  },
  { field: "fullName", title: "全称", width: 160 },
  { field: "status", title: "状态", width: 90 },
];

export const HeadGroup: Story = {
  args: {
    columns: headGroupColumns,
    data: Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      code: String(i + 1).padStart(4, "0"),
      name: `Name ${i + 1}`,
      fullName: `Full Name ${i + 1}`,
      status: i % 2 === 0 ? "启用" : "停用",
    })),
    height: 320,
  },
};

export const GroupData: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 80 },
      { field: "dept", title: "部门", width: 100 },
      { field: "name", title: "名称", width: 120 },
      { field: "fullName", title: "全称" },
    ],
    data: Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      dept: ["研发", "设计", "产品"][i % 3],
      name: `Name ${i + 1}`,
      fullName: `Full Name ${i + 1}`,
    })),
    groupBy: "dept",
    height: 360,
    selectable: true,
  },
};

const mergeCellsData = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  dept: i < 4 ? "研发" : i < 8 ? "设计" : "产品",
  name: `Name ${i + 1}`,
  note: `Note ${i + 1}`,
}));

export const MergeCells: Story = {
  args: {
    columns: [
      { field: "dept", title: "部门", width: 120 },
      { field: "name", title: "名称", width: 140 },
      { field: "note", title: "备注" },
    ],
    data: mergeCellsData,
    height: 360,
    virtual: true,
    spanMethod: ({ row, column, rowIndex }) => {
      if (column.field !== "dept") return;
      let rowspan = 1;
      for (let i = rowIndex + 1; i < mergeCellsData.length; i++) {
        if (mergeCellsData[i]!.dept !== row.dept) break;
        rowspan++;
      }
      return { rowspan, colspan: 1 };
    },
  },
};

const treeStoryData = [
  {
    id: "1",
    name: "研发中心",
    children: [
      {
        id: "1-1",
        name: "前端组",
        children: [
          { id: "1-1-1", name: "React" },
          { id: "1-1-2", name: "Vue" },
        ],
      },
      { id: "1-2", name: "后端组" },
    ],
  },
  {
    id: "2",
    name: "产品中心",
    children: [{ id: "2-1", name: "设计" }],
  },
];

export const Tree: Story = {
  args: {
    columns: [
      { field: "name", title: "名称", width: 220 },
      { field: "id", title: "标识", width: 100 },
    ],
    data: treeStoryData,
    tree: true,
    defaultExpandedKeys: ["1"],
    height: 360,
  },
};

export const TreeSelection: Story = {
  args: {
    columns: [
      { field: "name", title: "名称", width: 220 },
      { field: "id", title: "标识", width: 100 },
    ],
    data: treeStoryData,
    tree: true,
    selectable: true,
    cascadeChild: true,
    cascadeParent: true,
    defaultExpandedKeys: ["1", "1-1"],
    height: 360,
  },
};

export const LoadAsync: Story = {
  args: {
    columns: [
      { field: "name", title: "名称", width: 220 },
      { field: "id", title: "标识", width: 100 },
    ],
    data: [
      { id: "a", name: "异步节点 A", __hasChildren: true },
      { id: "b", name: "异步节点 B", __hasChildren: true },
    ],
    tree: true,
    height: 360,
    loadData: async (row) => {
      await new Promise((r) => setTimeout(r, 400));
      const id = String(row.id);
      return [
        { id: `${id}-1`, name: `${row.name} / 子项 1` },
        { id: `${id}-2`, name: `${row.name} / 子项 2` },
      ];
    },
  },
};

export const ExpandRow: Story = {
  args: {
    columns: [
      { field: "id", title: "标识", width: 80 },
      { field: "name", title: "名称", width: 120 },
      { field: "fullName", title: "全称" },
    ],
    data: makeRows(8),
    expandable: true,
    height: 400,
    renderExpandedRow: ({ row }) => (
      <div className="space-y-1 text-slate-600">
        <div>详情：{String(row.fullName)}</div>
        <div className="text-xs text-slate-400">id = {String(row.id)}</div>
      </div>
    ),
  },
};

const editColumns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80, editable: false },
  { field: "name", title: "名称", width: 140, editable: true },
  { field: "fullName", title: "全称", editable: true },
];

export const EditCell: Story = {
  args: {
    columns: editColumns,
    data: makeRows(8),
    editable: true,
    editMode: "cell",
    height: 360,
  },
  render: function EditCellStory(args) {
    const [rows, setRows] = useState(args.data);
    return (
      <VirtualGrid
        {...args}
        data={rows}
        onCellChange={({ rowKey, field, value }) => {
          setRows((prev) =>
            prev.map((row) =>
              String(row.id) === rowKey ? { ...row, [field]: value } : row,
            ),
          );
        }}
      />
    );
  },
};

export const EditRow: Story = {
  args: {
    columns: editColumns,
    data: makeRows(8),
    editable: true,
    editMode: "row",
    height: 360,
  },
  render: function EditRowStory(args) {
    const [rows, setRows] = useState(args.data);
    const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
    return (
      <VirtualGrid
        {...args}
        data={rows}
        editingRowKey={editingRowKey}
        onEditingRowKeyChange={setEditingRowKey}
        onRowSave={(row) => {
          setRows((prev) =>
            prev.map((r) =>
              String(r.id) === String(row.id) ? { ...r, ...row } : r,
            ),
          );
          setEditingRowKey(null);
        }}
        onRowCancel={() => setEditingRowKey(null)}
      />
    );
  },
};

export const RemotePagination: Story = {
  args: {
    columns,
    data: makeRows(10),
    pagination: true,
    remote: true,
    total: 95,
    pageSize: 10,
    height: 360,
  },
  render: function RemotePaginationStory(args) {
    const pageSize = args.pageSize ?? 10;
    const total = args.total ?? 95;
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState(() => makeRows(pageSize));

    function loadPage(nextPage: number) {
      setLoading(true);
      setPage(nextPage);
      window.setTimeout(() => {
        const start = (nextPage - 1) * pageSize;
        setRows(
          Array.from({ length: pageSize }, (_, i) => {
            const n = start + i + 1;
            return {
              id: String(n),
              code: String(n).padStart(4, "0"),
              name: `Name ${n}`,
              fullName: `Full Name ${n}`,
            };
          }),
        );
        setLoading(false);
      }, 350);
    }

    return (
      <VirtualGrid
        {...args}
        data={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={loadPage}
      />
    );
  },
};
