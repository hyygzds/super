import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
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
