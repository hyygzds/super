import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtualGrid, type VirtualGridColumn } from "./VirtualGrid";

const columns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "name", title: "名称" },
];

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${i + 1}`,
  }));
}

describe("VirtualGrid (React)", () => {
  it("renders header titles and body cells for basic data", () => {
    render(<VirtualGrid columns={columns} data={makeRows(3)} />);
    expect(
      screen.getByRole("columnheader", { name: "标识" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "名称" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("Row 3")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(1 + 3); // header + 3 rows
  });

  it("renders empty state text when data is empty", () => {
    render(<VirtualGrid columns={columns} data={[]} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("applies stripe styling to alternate body rows", () => {
    render(<VirtualGrid columns={columns} data={makeRows(4)} stripe />);
    const rows = screen.getAllByRole("row").slice(1); // drop header
    expect(rows[0].className).not.toMatch(/bg-slate-50/);
    expect(rows[1].className).toMatch(/bg-slate-50/);
  });

  it("renders sequential absolute row numbers when showRowNumber is set", () => {
    render(<VirtualGrid columns={columns} data={makeRows(3)} showRowNumber />);
    const rows = screen.getAllByRole("row").slice(1);
    const firstCellOf = (row: HTMLElement) =>
      within(row).getAllByRole("cell")[0];
    expect(firstCellOf(rows[0])).toHaveTextContent("1");
    expect(firstCellOf(rows[2])).toHaveTextContent("3");
  });

  it("renders all rows when virtual is disabled, even with many rows", () => {
    render(<VirtualGrid columns={columns} data={makeRows(200)} />);
    expect(screen.getAllByRole("row")).toHaveLength(1 + 200);
  });

  it("renders only a windowed subset when virtual + height are set, and updates on scroll", () => {
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(200)}
        virtual
        height={100}
        rowHeight={20}
        overscan={1}
      />,
    );
    const rowsBefore = screen.getAllByRole("row").slice(1);
    expect(rowsBefore.length).toBeLessThan(200);
    expect(screen.queryByText("Row 150")).not.toBeInTheDocument();

    const scroller = screen.getByRole("rowgroup");
    // Header lives inside the scroller; effective row scrollTop = scrollTop - headerHeight.
    fireEvent.scroll(scroller, { target: { scrollTop: 20 * 149 + 80 } });

    expect(screen.getAllByText(/Row 15\d/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Row 1")).not.toBeInTheDocument();
  });

  it("renders custom cell and header templates", () => {
    render(
      <VirtualGrid
        columns={[
          {
            field: "name",
            title: "名称",
            renderHeader: () => <span>自定义表头</span>,
            render: ({ value }) => <strong>Cell:{String(value)}</strong>,
          },
        ]}
        data={[{ id: "1", name: "Alpha" }]}
      />,
    );
    expect(screen.getByText("自定义表头")).toBeInTheDocument();
    expect(screen.getByText("Cell:Alpha")).toBeInTheDocument();
  });

  it("applies sticky left style for fixed columns", () => {
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "ID", width: 80, fixed: "left" },
          { field: "name", title: "名称", width: 200 },
          { field: "note", title: "备注", width: 80, fixed: "right" },
        ]}
        data={makeRows(2)}
      />,
    );
    const idHeader = screen.getByRole("columnheader", { name: "ID" });
    expect(idHeader).toHaveStyle({ position: "sticky", left: "0px" });
    const noteHeader = screen.getByRole("columnheader", { name: "备注" });
    expect(noteHeader).toHaveStyle({ position: "sticky", right: "0px" });
  });
});

describe("VirtualGrid (React) selection", () => {
  it("toggles a row's selection via its checkbox and reports the new key set", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(3)}
        selectable
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    const checkboxIn = (row: HTMLElement) =>
      within(row).getByRole("checkbox");

    await user.click(checkboxIn(rows[0]));
    expect(onSelectedKeysChange).toHaveBeenCalledWith(["1"]);
  });

  it("selects/clears all current-page rows via the header checkbox, with indeterminate in between", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(3)}
        selectable
        defaultSelectedKeys={["1"]}
      />,
    );
    const header = screen.getAllByRole("row")[0];
    const headerCheckbox = within(header).getByRole(
      "checkbox",
    ) as HTMLInputElement;
    expect(headerCheckbox.indeterminate).toBe(true);

    await user.click(headerCheckbox);
    const rows = screen.getAllByRole("row").slice(1);
    rows.forEach((row) => {
      expect(
        (within(row).getByRole("checkbox") as HTMLInputElement).checked,
      ).toBe(true);
    });

    await user.click(headerCheckbox);
    rows.forEach((row) => {
      expect(
        (within(row).getByRole("checkbox") as HTMLInputElement).checked,
      ).toBe(false);
    });
  });

  it("controlled selectedKeys renders checked rows without mutating on click", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(2)}
        selectable
        selectedKeys={["1"]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(
      (within(rows[0]).getByRole("checkbox") as HTMLInputElement).checked,
    ).toBe(true);

    await user.click(within(rows[0]).getByRole("checkbox"));
    expect(onSelectedKeysChange).toHaveBeenCalledWith([]);
    // controlled: prop 未变，视图仍保持父组件传入的值
    expect(
      (within(rows[0]).getByRole("checkbox") as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("single mode replaces the previous selection instead of accumulating", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(3)}
        selectable
        multiple={false}
        defaultSelectedKeys={["1"]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    await user.click(within(rows[1]).getByRole("checkbox"));
    expect(onSelectedKeysChange).toHaveBeenCalledWith(["2"]);
  });
});

describe("VirtualGrid (React) P3 group / span", () => {
  it("renders nested column parent title and leaf title", () => {
    render(
      <VirtualGrid
        columns={[
          {
            field: "info",
            title: "信息",
            children: [
              { field: "id", title: "标识", width: 80 },
              { field: "name", title: "名称", width: 120 },
            ],
          },
        ]}
        data={makeRows(2)}
      />,
    );
    expect(screen.getByText("信息")).toBeInTheDocument();
    expect(screen.getByText("标识")).toBeInTheDocument();
    expect(screen.getByText("Row 1")).toBeInTheDocument();
  });

  it("shows group label when groupBy is set", () => {
    render(
      <VirtualGrid
        columns={columns}
        data={[
          { id: "1", name: "Row 1", dept: "研发" },
          { id: "2", name: "Row 2", dept: "研发" },
          { id: "3", name: "Row 3", dept: "设计" },
        ]}
        groupBy="dept"
      />,
    );
    expect(screen.getByText("研发 (2)")).toBeInTheDocument();
    expect(screen.getByText("设计 (1)")).toBeInTheDocument();
  });

  it("renders all rows (not windowed) when spanMethod and virtual are both set", () => {
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(40)}
        virtual
        height={100}
        rowHeight={20}
        overscan={1}
        spanMethod={() => ({ rowspan: 1, colspan: 1 })}
      />,
    );
    expect(screen.getAllByRole("row")).toHaveLength(1 + 40);
    expect(screen.getByText("Row 40")).toBeInTheDocument();
  });
});

describe("VirtualGrid (React) pagination", () => {
  it("renders only pageSize rows per page and shows the full total in Pagination", () => {
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(25)}
        pagination
        pageSize={10}
      />,
    );
    expect(screen.getAllByRole("row")).toHaveLength(1 + 10);
    expect(screen.getByText("共 25 条")).toBeInTheDocument();
  });

  it("navigates to the next page and shows the next slice of data", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(25)}
        pagination
        pageSize={10}
      />,
    );
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.queryByText("Row 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一页" }));

    expect(screen.getByText("Row 11")).toBeInTheDocument();
    expect(screen.queryByText("Row 1")).not.toBeInTheDocument();
  });

  it("keeps selectedKeys across a page change", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(25)}
        selectable
        pagination
        pageSize={10}
      />,
    );
    const firstRow = screen.getAllByRole("row")[1];
    await user.click(within(firstRow).getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "下一页" }));
    await user.click(screen.getByRole("button", { name: "上一页" }));

    const firstRowAgain = screen.getAllByRole("row")[1];
    expect(
      (within(firstRowAgain).getByRole("checkbox") as HTMLInputElement)
        .checked,
    ).toBe(true);
  });
});

const treeData = [
  {
    id: "1",
    name: "Parent",
    children: [
      { id: "1-1", name: "Child A" },
      { id: "1-2", name: "Child B" },
    ],
  },
  { id: "2", name: "Leaf" },
];

describe("VirtualGrid (React) P4 tree / expandable", () => {
  it("expands a tree node to reveal children", async () => {
    const user = userEvent.setup();
    render(<VirtualGrid columns={columns} data={treeData} tree />);
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.queryByText("Child A")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开 Parent" }));

    expect(screen.getByText("Child A")).toBeInTheDocument();
    expect(screen.getByText("Child B")).toBeInTheDocument();
  });

  it("cascadeChild selects descendants when parent is checked", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        columns={columns}
        data={treeData}
        tree
        selectable
        cascadeChild
        defaultExpandedKeys={["1"]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );

    const parentRow = screen.getByText("Parent").closest('[role="row"]')!;
    await user.click(within(parentRow as HTMLElement).getByRole("checkbox"));

    expect(onSelectedKeysChange).toHaveBeenCalledWith(
      expect.arrayContaining(["1", "1-1", "1-2"]),
    );
  });

  it("expandable shows detail row via renderExpandedRow", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(2)}
        expandable
        renderExpandedRow={({ row }) => (
          <div>Detail:{String(row.name)}</div>
        )}
      />,
    );
    expect(screen.queryByText("Detail:Row 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开行 1" }));

    expect(screen.getByText("Detail:Row 1")).toBeInTheDocument();
  });

  it("loadData fills children when expanding a lazy node", async () => {
    const user = userEvent.setup();
    const loadData = vi.fn(async () => [
      { id: "lazy-1", name: "Loaded Child" },
    ]);
    render(
      <VirtualGrid
        columns={columns}
        data={[{ id: "root", name: "Lazy Root", __hasChildren: true }]}
        tree
        loadData={loadData}
      />,
    );
    expect(screen.queryByText("Loaded Child")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开 Lazy Root" }));

    expect(loadData).toHaveBeenCalled();
    expect(await screen.findByText("Loaded Child")).toBeInTheDocument();
  });
});

describe("VirtualGrid (React) P5 edit / remote", () => {
  it("double-click cell → type → Enter → onCellChange called", async () => {
    const user = userEvent.setup();
    const onCellChange = vi.fn();
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80, editable: false },
          { field: "name", title: "名称", editable: true },
        ]}
        data={[{ id: "1", name: "Alpha" }]}
        editable
        onCellChange={onCellChange}
      />,
    );

    await user.dblClick(screen.getByText("Alpha"));
    const input = screen.getByDisplayValue("Alpha");
    await user.clear(input);
    await user.type(input, "Beta{Enter}");

    expect(onCellChange).toHaveBeenCalledWith({
      rowKey: "1",
      field: "name",
      value: "Beta",
      row: { id: "1", name: "Alpha" },
    });
  });

  it("row edit save calls onRowSave with updated values", async () => {
    const user = userEvent.setup();
    const onRowSave = vi.fn();
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80, editable: false },
          { field: "name", title: "名称", editable: true },
        ]}
        data={[{ id: "1", name: "Alpha" }]}
        editable
        editMode="row"
        defaultEditingRowKey="1"
        onRowSave={onRowSave}
      />,
    );

    const input = screen.getByDisplayValue("Alpha");
    await user.clear(input);
    await user.type(input, "Gamma");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onRowSave).toHaveBeenCalledWith({ id: "1", name: "Gamma" });
  });

  it("exposes overflowing cell and header text via title so the full value can be read", () => {
    const longName =
      "这是一段会被列宽截断的超长单元格内容，需要通过悬停查看完整文本";
    const longHeader = "超长表头标题会被截断";
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80 },
          { field: "name", title: longHeader, width: 80 },
        ]}
        data={[{ id: "1", name: longName }]}
      />,
    );

    const nameCell = screen.getByText(longName).closest("[role='cell']");
    expect(nameCell).toHaveAttribute("title", longName);
    expect(
      screen.getByRole("columnheader", { name: longHeader }),
    ).toHaveAttribute("title", longHeader);
  });

  it("still exposes the raw cell value on title when a custom cell renderer is used", () => {
    const longName = "自定义渲染后仍然需要能读到被截断的原始值";
    render(
      <VirtualGrid
        columns={[
          {
            field: "name",
            title: "名称",
            width: 80,
            render: ({ value }) => <strong>{String(value)}</strong>,
          },
        ]}
        data={[{ id: "1", name: longName }]}
      />,
    );

    const nameCell = screen.getByText(longName).closest("[role='cell']");
    expect(nameCell).toHaveAttribute("title", longName);
  });

  it("remote+pagination does not slice and shows total", () => {
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(3)}
        pagination
        remote
        total={100}
        pageSize={2}
      />,
    );

    // remote: data is the current page — do not locally slice to pageSize
    expect(screen.getAllByRole("row")).toHaveLength(1 + 3);
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("Row 3")).toBeInTheDocument();
    expect(screen.getByText("共 100 条")).toBeInTheDocument();
  });
});

const sortColumns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "name", title: "名称", sortable: true },
  { field: "age", title: "年龄", sortable: true },
];

const sortRowsData = [
  { id: "1", name: "Charlie", age: 30 },
  { id: "2", name: "Alice", age: 20 },
  { id: "3", name: "Bob", age: 25 },
];

describe("VirtualGrid (React) sort", () => {
  it("cycles a sortable header none → asc → desc → none and reorders rows", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <VirtualGrid
        columns={sortColumns}
        data={sortRowsData}
        onSortChange={onSortChange}
      />,
    );

    const nameHeader = screen.getByRole("columnheader", { name: "名称" });
    expect(nameHeader).toHaveAttribute("aria-sort", "none");

    const names = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    expect(names()).toEqual(["Charlie", "Alice", "Bob"]);

    await user.click(within(nameHeader).getByRole("button", { name: "名称" }));
    expect(onSortChange).toHaveBeenLastCalledWith({
      field: "name",
      order: "asc",
    });
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["Alice", "Bob", "Charlie"]);

    await user.click(within(nameHeader).getByRole("button", { name: "名称" }));
    expect(onSortChange).toHaveBeenLastCalledWith({
      field: "name",
      order: "desc",
    });
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    expect(names()).toEqual(["Charlie", "Bob", "Alice"]);

    await user.click(within(nameHeader).getByRole("button", { name: "名称" }));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    expect(names()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("honors controlled sort and does not reorder when the parent ignores onSortChange", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <VirtualGrid
        columns={sortColumns}
        data={sortRowsData}
        sort={{ field: "name", order: "desc" }}
        onSortChange={onSortChange}
      />,
    );

    const names = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    expect(names()).toEqual(["Charlie", "Bob", "Alice"]);
    expect(screen.getByRole("columnheader", { name: "名称" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await user.click(
      within(screen.getByRole("columnheader", { name: "名称" })).getByRole(
        "button",
        { name: "名称" },
      ),
    );
    expect(onSortChange).toHaveBeenCalledWith(null);
    expect(names()).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("resets local pagination to page 1 when the sort field changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <VirtualGrid
        columns={sortColumns}
        data={[
          { id: "1", name: "Zed", age: 1 },
          { id: "2", name: "Yan", age: 2 },
          { id: "3", name: "Abe", age: 3 },
        ]}
        pagination
        pageSize={2}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByText("Abe")).toBeInTheDocument();
    expect(screen.queryByText("Zed")).not.toBeInTheDocument();

    await user.click(
      within(screen.getByRole("columnheader", { name: "名称" })).getByRole(
        "button",
        { name: "名称" },
      ),
    );

    expect(onPageChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByText("Abe")).toBeInTheDocument();
    expect(screen.getByText("Yan")).toBeInTheDocument();
    expect(screen.queryByText("Zed")).not.toBeInTheDocument();
  });

  it("does not reorder local rows when remote is enabled", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <VirtualGrid
        columns={sortColumns}
        data={sortRowsData}
        remote
        onSortChange={onSortChange}
      />,
    );

    const names = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    await user.click(
      within(screen.getByRole("columnheader", { name: "名称" })).getByRole(
        "button",
        { name: "名称" },
      ),
    );
    expect(onSortChange).toHaveBeenCalledWith({ field: "name", order: "asc" });
    expect(names()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("does not add a sort button on columns without sortable", () => {
    render(<VirtualGrid columns={sortColumns} data={sortRowsData} />);
    const idHeader = screen.getByRole("columnheader", { name: "标识" });
    expect(within(idHeader).queryByRole("button")).not.toBeInTheDocument();
    expect(idHeader).not.toHaveAttribute("aria-sort");
  });
});

const filterColumns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "name", title: "名称", filterable: true },
  { field: "city", title: "城市", filterable: true },
];

const filterRowsData = [
  { id: "1", name: "Charlie", city: "Paris" },
  { id: "2", name: "Alice", city: "London" },
  { id: "3", name: "Bob", city: "Paris" },
];

function filterNameCells() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1].textContent);
}

describe("VirtualGrid (React) filter", () => {
  it("filters rows as the header input changes and restores when cleared", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <VirtualGrid
        columns={filterColumns}
        data={filterRowsData}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(filterNameCells()).toEqual(["Charlie", "Alice", "Bob"]);
    const nameInput = screen.getByLabelText("筛选名称");
    await user.type(nameInput, "a");
    expect(onFiltersChange).toHaveBeenLastCalledWith({ name: "a" });
    expect(filterNameCells()).toEqual(["Charlie", "Alice"]);

    await user.clear(nameInput);
    expect(onFiltersChange).toHaveBeenLastCalledWith({});
    expect(filterNameCells()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("ANDs multiple column filters", async () => {
    const user = userEvent.setup();
    render(<VirtualGrid columns={filterColumns} data={filterRowsData} />);

    await user.type(screen.getByLabelText("筛选名称"), "a");
    await user.type(screen.getByLabelText("筛选城市"), "paris");
    expect(filterNameCells()).toEqual(["Charlie"]);
  });

  it("honors controlled filters and does not filter when the parent ignores onFiltersChange", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <VirtualGrid
        columns={filterColumns}
        data={filterRowsData}
        filters={{ name: "Alice" }}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(filterNameCells()).toEqual(["Alice"]);
    await user.type(screen.getByLabelText("筛选名称"), "x");
    expect(onFiltersChange).toHaveBeenCalled();
    expect(filterNameCells()).toEqual(["Alice"]);
  });

  it("resets local pagination to page 1 when a filter changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <VirtualGrid
        columns={filterColumns}
        data={[
          { id: "1", name: "Zed", city: "A" },
          { id: "2", name: "Yan", city: "B" },
          { id: "3", name: "Abe", city: "C" },
        ]}
        pagination
        pageSize={2}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByText("Abe")).toBeInTheDocument();
    expect(screen.queryByText("Zed")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("筛选名称"), "a");
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByText("Abe")).toBeInTheDocument();
    expect(screen.getByText("Yan")).toBeInTheDocument();
    expect(screen.queryByText("Zed")).not.toBeInTheDocument();
  });

  it("does not filter local rows when remote is enabled", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <VirtualGrid
        columns={filterColumns}
        data={filterRowsData}
        remote
        onFiltersChange={onFiltersChange}
      />,
    );

    await user.type(screen.getByLabelText("筛选名称"), "a");
    expect(onFiltersChange).toHaveBeenLastCalledWith({ name: "a" });
    expect(filterNameCells()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("does not add a filter input on columns without filterable", () => {
    render(<VirtualGrid columns={filterColumns} data={filterRowsData} />);
    expect(screen.queryByLabelText("筛选标识")).not.toBeInTheDocument();
  });
});

const freezeColumns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "name", title: "名称", width: 160, freezable: true },
  { field: "note", title: "备注", width: 240 },
];

describe("VirtualGrid (React) freeze", () => {
  it("cycles a freezable header none → left → right → none and updates sticky", async () => {
    const user = userEvent.setup();
    const onFrozenChange = vi.fn();
    render(
      <VirtualGrid
        columns={freezeColumns}
        data={makeRows(2)}
        onFrozenChange={onFrozenChange}
      />,
    );

    const nameHeader = screen.getByRole("columnheader", { name: /名称/ });
    expect(nameHeader).not.toHaveStyle({ position: "sticky" });

    await user.click(screen.getByRole("button", { name: "左侧冻结名称" }));
    expect(onFrozenChange).toHaveBeenLastCalledWith({ name: "left" });
    expect(nameHeader).toHaveStyle({ position: "sticky", left: "0px" });

    await user.click(screen.getByRole("button", { name: "右侧冻结名称" }));
    expect(onFrozenChange).toHaveBeenLastCalledWith({ name: "right" });
    expect(nameHeader).toHaveStyle({ position: "sticky", right: "0px" });

    await user.click(screen.getByRole("button", { name: "取消冻结名称" }));
    expect(onFrozenChange).toHaveBeenLastCalledWith({ name: null });
    expect(nameHeader).not.toHaveStyle({ position: "sticky" });
  });

  it("honors controlled frozen and does not update sticky when the parent ignores onFrozenChange", async () => {
    const user = userEvent.setup();
    const onFrozenChange = vi.fn();
    render(
      <VirtualGrid
        columns={freezeColumns}
        data={makeRows(2)}
        frozen={{ name: "left" }}
        onFrozenChange={onFrozenChange}
      />,
    );

    const nameHeader = screen.getByRole("columnheader", { name: /名称/ });
    expect(nameHeader).toHaveStyle({ position: "sticky", left: "0px" });

    await user.click(screen.getByRole("button", { name: "右侧冻结名称" }));
    expect(onFrozenChange).toHaveBeenCalled();
    expect(nameHeader).toHaveStyle({ position: "sticky", left: "0px" });
  });

  it("does not add a freeze button on columns without freezable", () => {
    render(<VirtualGrid columns={freezeColumns} data={makeRows(2)} />);
    expect(
      screen.queryByRole("button", { name: "左侧冻结标识" }),
    ).not.toBeInTheDocument();
  });

  it("offsets the virtual body with padding-top instead of transform", () => {
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80, fixed: "left" },
          { field: "name", title: "名称", width: 200 },
        ]}
        data={makeRows(80)}
        virtual
        height={160}
        rowHeight={20}
        overscan={1}
      />,
    );

    const scroller = screen.getByRole("rowgroup");
    fireEvent.scroll(scroller, { target: { scrollTop: 20 * 20 + 40 } });

    const body = document.querySelector("[data-vg-virtual-body]");
    expect(body).toBeTruthy();
    expect((body as HTMLElement).style.transform).toBe("");
    expect(Number.parseFloat((body as HTMLElement).style.paddingTop)).toBeGreaterThan(
      0,
    );
  });
});

describe("VirtualGrid (React) overflow tooltip", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return 240;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 80;
      },
    });
  });

  it("shows a tooltip with the full cell text when hovering a truncated cell", async () => {
    const user = userEvent.setup();
    const longNote = "这是一段很长的单元格内容，默认会被截断无法直接看完";
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 80 },
        ]}
        data={[{ id: "1", note: longNote }]}
      />,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.hover(screen.getByText(longNote));
    expect(screen.getByRole("tooltip")).toHaveTextContent(longNote);
  });

  it("does not show an overflow tooltip when showOverflowTooltip is false", async () => {
    const user = userEvent.setup();
    const longNote = "关闭溢出提示后不应弹出完整内容";
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 80 },
        ]}
        data={[{ id: "1", note: longNote }]}
        showOverflowTooltip={false}
      />,
    );

    await user.hover(screen.getByText(longNote));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not show an overflow tooltip when autoHeight wraps the cell", async () => {
    const user = userEvent.setup();
    const longNote = "自动行高时内容已完整展示，不必再弹出提示";
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 160 },
        ]}
        data={[{ id: "1", note: longNote }]}
        autoHeight
      />,
    );

    await user.hover(screen.getByText(longNote));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("honors a column-level showOverflowTooltip override", async () => {
    const user = userEvent.setup();
    const longNote = "列级关闭后这条备注不应弹出提示";
    render(
      <VirtualGrid
        columns={[
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 80, showOverflowTooltip: false },
        ]}
        data={[{ id: "1", note: longNote }]}
      />,
    );

    await user.hover(screen.getByText(longNote));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not wrap custom cell renders with an overflow tooltip", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid
        columns={[
          {
            field: "note",
            title: "备注",
            width: 80,
            render: ({ value }) => <button type="button">{String(value)}</button>,
          },
        ]}
        data={[{ id: "1", note: "自定义渲染" }]}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "自定义渲染" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
