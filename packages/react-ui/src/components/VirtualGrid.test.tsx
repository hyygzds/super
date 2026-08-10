import { describe, expect, it, vi } from "vitest";
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
