import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { VirtualGrid, type VirtualGridColumn } from "./VirtualGrid";

type Row = {
  id: string;
  code: string;
  name: string;
  category?: string;
  owner?: string;
  status?: string;
  amount?: string;
  updatedAt?: string;
};

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

const selectionData: Row[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  code: String(i + 1).padStart(4, "0"),
  name: `User ${i + 1}`,
}));

const paginationLocalData: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  code: String(i + 1).padStart(4, "0"),
  name: `Item ${i + 1}`,
}));

const paginationRemoteAllData: Row[] = Array.from({ length: 47 }, (_, i) => ({
  id: String(i + 1),
  code: String(i + 1).padStart(4, "0"),
  name: `Remote ${i + 1}`,
}));

const fixedData: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  code: `P-${String(i + 1).padStart(4, "0")}`,
  name: `Product ${i + 1}`,
  category: ["Hardware", "Software", "Service"][i % 3],
  owner: ["Sagi", "Nancy", "Alice", "Bob"][i % 4],
  status: ["Draft", "Active", "Paused"][i % 3],
  amount: `$${(1200 + i * 137).toLocaleString()}`,
  updatedAt: `2026-07-${String((i % 28) + 1).padStart(2, "0")}`,
}));

const fixedColumns: VirtualGridColumn<Row>[] = [
  { field: "code", title: "编号", width: 120 },
  { field: "name", title: "名称", width: 180 },
  { field: "category", title: "分类", width: 160 },
  { field: "owner", title: "负责人", width: 140 },
  { field: "status", title: "状态", width: 140 },
  { field: "amount", title: "金额", width: 140 },
  { field: "updatedAt", title: "更新日期", width: 160 },
];

const meta = {
  title: "React/VirtualGrid",
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
      className="h-80"
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
      className="h-80"
    />
  ),
};

export const ShowRowNumber: Story = {
  render: () => (
    <VirtualGrid
      data={sampleData}
      columns={columns}
      showRowNumber
      className="h-80"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <VirtualGrid data={[]} columns={columns} className="h-80" />
  ),
};

export const Virtual: Story = {
  render: () => (
    <VirtualGrid
      data={virtualData}
      columns={columns}
      enableVirtual
      showRowNumber={false}
      className="h-80"
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
                <span className="font-medium text-sky-700">{row.name}</span>
              ),
            }
          : col,
      )}
      showRowNumber={false}
      className="h-80"
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
                <span className="text-sky-700">✦ {col.title}</span>
              ),
            }
          : col,
      )}
      showRowNumber={false}
      className="h-80"
    />
  ),
};

export const Selection: Story = {
  render: function Render() {
    const [selectedKeys, setSelectedKeys] = useState<string[]>(["1", "3"]);
    return (
      <VirtualGrid
        data={selectionData}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
        className="h-80"
      />
    );
  },
};

export const SelectionSingle: Story = {
  render: function Render() {
    const [selectedKeys, setSelectedKeys] = useState<string[]>(["2"]);
    return (
      <VirtualGrid
        data={selectionData}
        columns={columns}
        showRowNumber={false}
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
        className="h-80"
      />
    );
  },
};

export const FixedLeft: Story = {
  render: () => (
    <div className="h-80 w-[420px]">
      <VirtualGrid
        data={fixedData}
        columns={fixedColumns.map((col) =>
          col.field === "code" || col.field === "name"
            ? { ...col, fixed: "left" }
            : col,
        )}
        selectionMode="multiple"
        showRowNumber
      />
    </div>
  ),
};

export const FixedRight: Story = {
  render: () => (
    <div className="h-80 w-[420px]">
      <VirtualGrid
        data={fixedData}
        columns={fixedColumns.map((col) =>
          col.field === "updatedAt" ? { ...col, fixed: "right" } : col,
        )}
        showRowNumber={false}
      />
    </div>
  ),
};

export const FixedBoth: Story = {
  render: () => (
    <div className="h-80 w-[420px]">
      <VirtualGrid
        data={fixedData}
        columns={fixedColumns.map((col) => {
          if (col.field === "code") return { ...col, fixed: "left" };
          if (col.field === "updatedAt") return { ...col, fixed: "right" };
          return col;
        })}
        showRowNumber
      />
    </div>
  ),
};

export const PaginationLocal: Story = {
  render: () => (
    <VirtualGrid
      data={paginationLocalData}
      columns={columns}
      showRowNumber={false}
      pagination
      paginationMode="local"
      defaultPageSize={10}
      className="h-80"
    />
  ),
};

export const PaginationRemote: Story = {
  render: function Render() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const total = paginationRemoteAllData.length;
    const data = paginationRemoteAllData.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );
    return (
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        pagination
        paginationMode="remote"
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        className="h-80"
      />
    );
  },
};
