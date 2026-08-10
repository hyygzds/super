import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { VirtualGrid } from "./VirtualGrid";
import type {
  VirtualGridCellContext,
  VirtualGridColumn,
  VirtualGridExpandContext,
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
  render: () => (
    <VirtualGrid
      columns={headGroupColumns}
      data={Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        code: String(i + 1).padStart(4, "0"),
        name: `Name ${i + 1}`,
        fullName: `Full Name ${i + 1}`,
        status: i % 2 === 0 ? "启用" : "停用",
      }))}
      height={320}
    />
  ),
};

export const GroupData: Story = {
  render: () => (
    <VirtualGrid
      columns={[
        { field: "id", title: "标识", width: 80 },
        { field: "dept", title: "部门", width: 100 },
        { field: "name", title: "名称", width: 120 },
        { field: "fullName", title: "全称" },
      ]}
      data={Array.from({ length: 20 }, (_, i) => ({
        id: String(i + 1),
        dept: ["研发", "设计", "产品"][i % 3],
        name: `Name ${i + 1}`,
        fullName: `Full Name ${i + 1}`,
      }))}
      groupBy="dept"
      height={360}
      selectable
    />
  ),
};

export const MergeCells: Story = {
  render: () => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      dept: i < 4 ? "研发" : i < 8 ? "设计" : "产品",
      name: `Name ${i + 1}`,
      note: `Note ${i + 1}`,
    }));
    return (
      <VirtualGrid
        columns={[
          { field: "dept", title: "部门", width: 120 },
          { field: "name", title: "名称", width: 140 },
          { field: "note", title: "备注" },
        ]}
        data={data}
        height={360}
        virtual
        spanMethod={({ row, column, rowIndex }) => {
          if (column.field !== "dept") return;
          let rowspan = 1;
          for (let i = rowIndex + 1; i < data.length; i++) {
            if (data[i]!.dept !== row.dept) break;
            rowspan++;
          }
          return { rowspan, colspan: 1 };
        }}
      />
    );
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
    name: "设计中心",
    children: [{ id: "2-1", name: "视觉" }],
  },
  { id: "3", name: "独立叶节点" },
];

export const Tree: Story = {
  render: () => (
    <VirtualGrid
      columns={[
        { field: "name", title: "名称", width: 240 },
        { field: "id", title: "标识", width: 100 },
      ]}
      data={treeStoryData}
      tree
      defaultExpandedKeys={["1"]}
      height={360}
    />
  ),
};

export const TreeSelection: Story = {
  render: () => (
    <VirtualGrid
      columns={[
        { field: "name", title: "名称", width: 240 },
        { field: "id", title: "标识", width: 100 },
      ]}
      data={treeStoryData}
      tree
      selectable
      cascadeChild
      cascadeParent
      defaultExpandedKeys={["1", "1-1"]}
      height={360}
    />
  ),
};

export const LoadAsync: Story = {
  render: () => {
    const loadData = async (row: Record<string, unknown>) => {
      await new Promise((r) => setTimeout(r, 400));
      const id = String(row.id);
      return [
        { id: `${id}-a`, name: `${String(row.name)} / 异步子节点 A` },
        { id: `${id}-b`, name: `${String(row.name)} / 异步子节点 B` },
      ];
    };
    return (
      <VirtualGrid
        columns={[
          { field: "name", title: "名称", width: 280 },
          { field: "id", title: "标识", width: 120 },
        ]}
        data={[
          { id: "lazy-1", name: "懒加载根 A", __hasChildren: true },
          { id: "lazy-2", name: "懒加载根 B", __hasChildren: true },
        ]}
        tree
        loadData={loadData}
        height={320}
      />
    );
  },
};

export const ExpandRow: Story = {
  render: () => (
    <VirtualGrid
      columns={columns}
      data={makeRows(8)}
      expandable
      height={360}
      v-slots={{
        expand: ({ row, rowIndex }: VirtualGridExpandContext) => (
          <div class="px-2 py-1 text-slate-600">
            详情 #{rowIndex + 1}：{String(row.fullName ?? row.name)}
          </div>
        ),
      }}
    />
  ),
};

export const EditCell: Story = {
  render: () => {
    const rows = ref(makeRows(8));
    return () => (
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80, editable: false },
          { field: "code", title: "编号", width: 100 },
          { field: "name", title: "名称", width: 140 },
          { field: "fullName", title: "全称" },
        ]}
        data={rows.value}
        editable
        editMode="cell"
        onCellChange={({ rowKey, field, value }) => {
          rows.value = rows.value.map((r) =>
            r.id === rowKey ? { ...r, [field]: value } : r,
          );
        }}
      />
    );
  },
};

export const EditRow: Story = {
  render: () => {
    const rows = ref(makeRows(6));
    const editingRowKey = ref<string | null>("1");
    return () => (
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80, editable: false },
          { field: "code", title: "编号", width: 100 },
          { field: "name", title: "名称", width: 140 },
          { field: "fullName", title: "全称" },
        ]}
        data={rows.value}
        editable
        editMode="row"
        editingRowKey={editingRowKey.value}
        onUpdate:editingRowKey={(key: string | null) => {
          editingRowKey.value = key;
        }}
        onRowSave={(row) => {
          rows.value = rows.value.map((r) =>
            r.id === String(row.id) ? { ...r, ...row } : r,
          );
        }}
      />
    );
  },
};

export const RemotePagination: Story = {
  render: () => {
    const all = makeRows(95);
    const pageSize = 10;
    const page = ref(1);
    const loading = ref(false);
    const slice = ref(all.slice(0, pageSize));
    return () => (
      <VirtualGrid
        columns={columns}
        data={slice.value}
        pagination
        remote
        total={all.length}
        page={page.value}
        pageSize={pageSize}
        loading={loading.value}
        onUpdate:page={async (next: number) => {
          loading.value = true;
          page.value = next;
          await new Promise((r) => setTimeout(r, 300));
          slice.value = all.slice((next - 1) * pageSize, next * pageSize);
          loading.value = false;
        }}
      />
    );
  },
};
