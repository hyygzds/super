import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtualGrid } from "./VirtualGrid";

const columns = [
  { field: "code", title: "编号", width: 120 },
  { field: "name", title: "名称", width: 120 },
];

const data = [
  { id: "1", code: "0001", name: "Sagi" },
  { id: "2", code: "0002", name: "Nancy" },
];

describe("VirtualGrid (React)", () => {
  it("renders headers and cell text", () => {
    render(<VirtualGrid data={data} columns={columns} showRowNumber={false} />);
    expect(screen.getByText("编号")).toBeInTheDocument();
    expect(screen.getByText("名称")).toBeInTheDocument();
    expect(screen.getByText("0001")).toBeInTheDocument();
    expect(screen.getByText("Nancy")).toBeInTheDocument();
  });

  it("hides hidden columns", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          { field: "code", title: "编号" },
          { field: "name", title: "名称", hidden: true },
        ]}
        showRowNumber={false}
      />,
    );
    expect(screen.getByText("编号")).toBeInTheDocument();
    expect(screen.queryByText("名称")).not.toBeInTheDocument();
    expect(screen.queryByText("Sagi")).not.toBeInTheDocument();
  });

  it("shows empty state when data is empty", () => {
    render(<VirtualGrid data={[]} columns={columns} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("shows row numbers when enabled", () => {
    render(<VirtualGrid data={data} columns={columns} showRowNumber />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("uses column render for cells", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          {
            field: "name",
            title: "名称",
            render: ({ row }) => <span>Hi-{String(row.name)}</span>,
          },
        ]}
        showRowNumber={false}
      />,
    );
    expect(screen.getByText("Hi-Sagi")).toBeInTheDocument();
  });

  it("calls onRowClick with row data", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        onRowClick={onRowClick}
      />,
    );
    await user.click(screen.getByText("0001"));
    expect(onRowClick).toHaveBeenCalled();
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: "1", code: "0001" });
  });

  it("virtual mode renders fewer DOM rows than data length", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      code: `c${i}`,
      name: `n${i}`,
    }));
    const { container } = render(
      <div style={{ height: 200 }}>
        <VirtualGrid
          data={many}
          columns={columns}
          enableVirtual
          rowHeight={36}
          showRowNumber={false}
          className="h-[200px]"
        />
      </div>,
    );
    const body = container.querySelector(
      '[data-testid="virtual-grid-body"]',
    ) as HTMLElement;
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 200 });
    body.scrollTop = 0;
    body.dispatchEvent(new Event("scroll"));
    const grid = container.querySelector('[data-testid="virtual-grid"]') as HTMLElement;
    const bodyRows = within(grid).queryAllByRole("row").filter((r) =>
      r.hasAttribute("data-row-index"),
    );
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(bodyRows.length).toBeLessThan(80);
  });

  it("toggles multiple selection via row checkbox", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        defaultSelectedKeys={[]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "选择行 1" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["1"]);
  });

  it("replaces selection in single mode", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="single"
        defaultSelectedKeys={["1"]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    expect(screen.queryByRole("checkbox", { name: "全选" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "选择行 2" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["2"]);
  });

  it("select-all uses full data in local pagination", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    const many = [
      { id: "1", code: "a", name: "A" },
      { id: "2", code: "b", name: "B" },
      { id: "3", code: "c", name: "C" },
    ];
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        pagination
        paginationMode="local"
        defaultPageSize={2}
        defaultSelectedKeys={[]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "全选" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["1", "2", "3"]);
  });

  it("select-all uses current page data in remote mode", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        pagination
        paginationMode="remote"
        total={100}
        page={1}
        pageSize={10}
        defaultSelectedKeys={[]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "全选" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["1", "2"]);
  });

  it("keeps selectedKeys across local page change", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        pagination
        paginationMode="local"
        defaultPage={1}
        defaultPageSize={2}
        defaultSelectedKeys={["1"]}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "选择行 1" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.queryByRole("checkbox", { name: "选择行 1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "上一页" }));
    expect(screen.getByRole("checkbox", { name: "选择行 1" })).toBeChecked();
  });

  it("slices rows in local pagination", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        pagination
        paginationMode="local"
        defaultPage={1}
        defaultPageSize={2}
      />,
    );
    expect(screen.getByText("n1")).toBeInTheDocument();
    expect(screen.getByText("n2")).toBeInTheDocument();
    expect(screen.queryByText("n3")).not.toBeInTheDocument();
    expect(screen.getByTestId("virtual-grid-pagination")).toBeInTheDocument();
  });

  it("does not slice in remote mode and emits page change", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        pagination
        paginationMode="remote"
        total={50}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText("Sagi")).toBeInTheDocument();
    expect(screen.getByText("Nancy")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("resets to page 1 when pageSize changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        pagination
        paginationMode="local"
        defaultPage={2}
        defaultPageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    const select = within(screen.getByTestId("virtual-grid-pagination")).getByLabelText(
      "每页条数",
    );
    await user.selectOptions(select, "20");
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("does not fire onRowClick when clicking row checkbox", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        onRowClick={onRowClick}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "选择行 1" }));
    expect(onSelectedKeysChange).toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("applies sticky left to selection, row number, and fixed left columns", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          { field: "code", title: "编号", width: 100, fixed: "left" },
          { field: "name", title: "名称", width: 200 },
        ]}
        selectionMode="multiple"
        showRowNumber
      />,
    );
    const selection = screen.getByRole("checkbox", { name: "全选" }).closest(
      '[data-sticky="left"]',
    );
    expect(selection).toHaveStyle({ position: "sticky", left: "0px" });

    const rowNumberHeader = screen.getByText("#").closest('[data-sticky="left"]');
    expect(rowNumberHeader).toHaveStyle({ position: "sticky", left: "48px" });

    const codeHeader = screen.getByText("编号").closest('[data-sticky="left"]');
    expect(codeHeader).toHaveStyle({
      position: "sticky",
      left: `${48 + 56}px`,
    });
  });

  it("applies sticky right to fixed right columns", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          { field: "code", title: "编号", width: 100 },
          { field: "name", title: "名称", width: 120, fixed: "right" },
        ]}
        showRowNumber={false}
        selectionMode="none"
      />,
    );
    const nameHeader = screen.getByText("名称").closest('[data-sticky="right"]');
    expect(nameHeader).toHaveStyle({ position: "sticky", right: "0px" });
  });

  it("renders data columns in left-mid-right order", () => {
    render(
      <VirtualGrid
        data={[{ id: "1", a: "A", b: "B", c: "C" }]}
        columns={[
          { field: "a", title: "A", width: 80, fixed: "left" },
          { field: "b", title: "B", width: 80 },
          { field: "c", title: "C", width: 80, fixed: "right" },
        ]}
        showRowNumber={false}
      />,
    );
    const headers = screen.getAllByRole("columnheader").map((el) => el.textContent);
    expect(headers).toEqual(["A", "B", "C"]);
  });
});
