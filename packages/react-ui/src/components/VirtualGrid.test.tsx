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
    fireEvent.scroll(scroller, { target: { scrollTop: 20 * 149 } });

    expect(screen.getByText("Row 150")).toBeInTheDocument();
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
