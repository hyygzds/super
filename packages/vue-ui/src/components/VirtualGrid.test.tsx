import { beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { Tooltip } from "./Tooltip";
import { VirtualGrid } from "./VirtualGrid";
import type { VirtualGridColumn } from "./VirtualGrid";

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

describe("VirtualGrid (Vue)", () => {
  it("renders header titles and body cells for basic data", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(3) },
    });
    expect(wrapper.find('[role="columnheader"]').text()).toContain("标识");
    expect(wrapper.text()).toContain("Row 1");
    expect(wrapper.text()).toContain("Row 3");
    expect(wrapper.findAll('[role="row"]')).toHaveLength(1 + 3);
  });

  it("renders empty state text when data is empty", () => {
    const wrapper = mount(VirtualGrid, { props: { columns, data: [] } });
    expect(wrapper.text()).toContain("暂无数据");
  });

  it("applies stripe styling to alternate body rows", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(4), stripe: true },
    });
    const rows = wrapper.findAll('[role="row"]').slice(1);
    expect(rows[0].classes()).not.toContain("bg-slate-50");
    expect(rows[1].classes()).toContain("bg-slate-50");
  });

  it("renders sequential absolute row numbers when showRowNumber is set", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(3), showRowNumber: true },
    });
    const rows = wrapper.findAll('[role="row"]').slice(1);
    const firstCellOf = (row: (typeof rows)[number]) =>
      row.findAll('[role="cell"]')[0];
    expect(firstCellOf(rows[0]).text()).toBe("1");
    expect(firstCellOf(rows[2]).text()).toBe("3");
  });

  it("renders all rows when virtual is disabled, even with many rows", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(200) },
    });
    expect(wrapper.findAll('[role="row"]')).toHaveLength(1 + 200);
  });

  it("renders only a windowed subset when virtual + height are set, and updates on scroll", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(200),
        virtual: true,
        height: 100,
        rowHeight: 20,
        overscan: 1,
      },
    });
    const rowsBefore = wrapper.findAll('[role="row"]').slice(1);
    expect(rowsBefore.length).toBeLessThan(200);
    expect(wrapper.text()).not.toContain("Row 150");

    const scroller = wrapper.find('[role="rowgroup"]');
    // Header lives inside the scroller; effective row scrollTop = scrollTop - headerHeight.
    (scroller.element as HTMLElement).scrollTop = 20 * 149 + 80;
    await scroller.trigger("scroll");

    expect(wrapper.text()).toMatch(/Row 15\d/);
    const cellTexts = wrapper.findAll('[role="cell"]').map((c) => c.text());
    expect(cellTexts).not.toContain("Row 1");
  });

  it("renders custom cell and header templates via slots", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [{ field: "name", title: "名称" }],
        data: [{ id: "1", name: "Alpha" }],
      },
      slots: {
        "header-name": () => h("span", "自定义表头"),
        "cell-name": (ctx: { value: unknown }) =>
          h("strong", `Cell:${String(ctx.value)}`),
      },
    });
    expect(wrapper.text()).toContain("自定义表头");
    expect(wrapper.text()).toContain("Cell:Alpha");
  });

  it("falls back to #cell when #cell-{field} is absent", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [{ field: "name", title: "名称" }],
        data: [{ id: "1", name: "Alpha" }],
      },
      slots: {
        cell: (ctx: { value: unknown }) => `Cell:${String(ctx.value)}`,
      },
    });
    expect(wrapper.text()).toContain("Cell:Alpha");
  });

  it("applies sticky left style for fixed columns", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "ID", width: 80, fixed: "left" },
          { field: "name", title: "名称", width: 200 },
          { field: "note", title: "备注", width: 80, fixed: "right" },
        ],
        data: makeRows(2),
      },
    });
    const headers = wrapper.findAll('[role="columnheader"]');
    const idHeader = headers.find((el) => el.text() === "ID")!
      .element as HTMLElement;
    const noteHeader = headers.find((el) => el.text() === "备注")!
      .element as HTMLElement;
    expect(idHeader.style.position).toBe("sticky");
    expect(idHeader.style.left).toBe("0px");
    expect(noteHeader.style.position).toBe("sticky");
    expect(noteHeader.style.right).toBe("0px");
  });
});

describe("VirtualGrid (Vue) selection", () => {
  it("toggles a row's selection via its checkbox and emits the new key set", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(3), selectable: true },
    });
    const rows = wrapper.findAll('[role="row"]').slice(1);
    const checkboxIn = (row: (typeof rows)[number]) =>
      row.find('input[type="checkbox"]');

    await checkboxIn(rows[0]).setValue(true);
    expect(wrapper.emitted("update:selectedKeys")?.[0]).toEqual([["1"]]);
  });

  it("selects/clears all current-page rows via the header checkbox, with indeterminate in between", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(3),
        selectable: true,
        selectedKeys: ["1"],
      },
    });
    const header = wrapper.findAll('[role="row"]')[0];
    const headerCheckbox = header.find(
      'input[type="checkbox"]',
    ).element as HTMLInputElement;
    expect(headerCheckbox.indeterminate).toBe(true);

    await header.find('input[type="checkbox"]').setValue(true);
    const selectAllEvent = wrapper.emitted("update:selectedKeys")?.[0][0];
    expect(selectAllEvent).toEqual(["1", "2", "3"]);
  });

  it("controlled selectedKeys renders checked rows without mutating on click", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(2),
        selectable: true,
        selectedKeys: ["1"],
      },
    });
    const rows = wrapper.findAll('[role="row"]').slice(1);
    expect(
      (rows[0].find('input[type="checkbox"]').element as HTMLInputElement)
        .checked,
    ).toBe(true);

    await rows[0].find('input[type="checkbox"]').setValue(false);
    expect(wrapper.emitted("update:selectedKeys")?.[0]).toEqual([[]]);
    // controlled: prop 未变，视图仍保持父组件传入的值
    expect(
      (rows[0].find('input[type="checkbox"]').element as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("single mode replaces the previous selection instead of accumulating", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(3),
        selectable: true,
        multiple: false,
        selectedKeys: ["1"],
      },
    });
    const rows = wrapper.findAll('[role="row"]').slice(1);
    await rows[1].find('input[type="checkbox"]').setValue(true);
    expect(wrapper.emitted("update:selectedKeys")?.[0]).toEqual([["2"]]);
  });
});

describe("VirtualGrid (Vue) P3 group / span", () => {
  it("renders nested column parent title and leaf title", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          {
            field: "info",
            title: "信息",
            children: [
              { field: "id", title: "标识", width: 80 },
              { field: "name", title: "名称", width: 120 },
            ],
          },
        ],
        data: makeRows(2),
      },
    });
    expect(wrapper.text()).toContain("信息");
    expect(wrapper.text()).toContain("标识");
    expect(wrapper.text()).toContain("Row 1");
  });

  it("shows group label when groupBy is set", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: [
          { id: "1", name: "Row 1", dept: "研发" },
          { id: "2", name: "Row 2", dept: "研发" },
          { id: "3", name: "Row 3", dept: "设计" },
        ],
        groupBy: "dept",
      },
    });
    expect(wrapper.text()).toContain("研发 (2)");
    expect(wrapper.text()).toContain("设计 (1)");
  });

  it("renders all rows (not windowed) when spanMethod and virtual are both set", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(40),
        virtual: true,
        height: 100,
        rowHeight: 20,
        overscan: 1,
        spanMethod: () => ({ rowspan: 1, colspan: 1 }),
      },
    });
    expect(wrapper.findAll('[role="row"]')).toHaveLength(1 + 40);
    expect(wrapper.text()).toContain("Row 40");
  });
});

describe("VirtualGrid (Vue) pagination", () => {
  it("renders only pageSize rows per page and shows the full total in Pagination", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(25), pagination: true, pageSize: 10 },
    });
    expect(wrapper.findAll('[role="row"]')).toHaveLength(1 + 10);
    expect(wrapper.text()).toContain("共 25 条");
  });

  it("navigates to the next page and shows the next slice of data", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(25), pagination: true, pageSize: 10 },
    });
    expect(wrapper.text()).toContain("Row 1");
    expect(wrapper.text()).not.toContain("Row 11");

    await wrapper.find('button[aria-label="下一页"]').trigger("click");

    expect(wrapper.text()).toContain("Row 11");
    expect(wrapper.text()).not.toContain("Row 1<");
  });

  it("keeps selectedKeys across a page change", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(25),
        selectable: true,
        pagination: true,
        pageSize: 10,
        selectedKeys: [] as string[],
      },
    });

    let selectedKeys: string[] = [];
    async function updateProps() {
      await wrapper.setProps({ selectedKeys });
    }

    const firstRow = wrapper.findAll('[role="row"]')[1];
    await firstRow.find('input[type="checkbox"]').setValue(true);
    selectedKeys = wrapper.emitted("update:selectedKeys")?.[0][0] as string[];
    await updateProps();

    await wrapper.find('button[aria-label="下一页"]').trigger("click");
    await wrapper.find('button[aria-label="上一页"]').trigger("click");

    const firstRowAgain = wrapper.findAll('[role="row"]')[1];
    expect(
      (
        firstRowAgain.find('input[type="checkbox"]')
          .element as HTMLInputElement
      ).checked,
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

describe("VirtualGrid (Vue) P4 tree / expandable", () => {
  it("expands a tree node to reveal children", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: treeData, tree: true },
    });
    expect(wrapper.text()).toContain("Parent");
    expect(wrapper.text()).not.toContain("Child A");

    await wrapper.find('button[aria-label="展开 Parent"]').trigger("click");

    expect(wrapper.text()).toContain("Child A");
    expect(wrapper.text()).toContain("Child B");
  });

  it("cascadeChild selects descendants when parent is checked", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: treeData,
        tree: true,
        selectable: true,
        cascadeChild: true,
        defaultExpandedKeys: ["1"],
      },
    });

    const parentRow = wrapper
      .findAll('[role="row"]')
      .find((row) => row.text().includes("Parent"))!;
    await parentRow.find('input[type="checkbox"]').setValue(true);

    const keys = wrapper.emitted("update:selectedKeys")?.[0][0] as string[];
    expect(keys).toEqual(expect.arrayContaining(["1", "1-1", "1-2"]));
  });

  it("expandable shows detail row via #expand slot", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(2),
        expandable: true,
      },
      slots: {
        expand: ({ row }: { row: Record<string, unknown> }) =>
          h("div", `Detail:${String(row.name)}`),
      },
    });
    expect(wrapper.text()).not.toContain("Detail:Row 1");

    await wrapper.find('button[aria-label="展开行 1"]').trigger("click");

    expect(wrapper.text()).toContain("Detail:Row 1");
  });

  it("loadData fills children when expanding a lazy node", async () => {
    const loadData = vi.fn(async () => [
      { id: "lazy-1", name: "Loaded Child" },
    ]);
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: [{ id: "root", name: "Lazy Root", __hasChildren: true }],
        tree: true,
        loadData,
      },
    });
    expect(wrapper.text()).not.toContain("Loaded Child");

    await wrapper.find('button[aria-label="展开 Lazy Root"]').trigger("click");
    await flushPromises();

    expect(loadData).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Loaded Child");
  });
});

describe("VirtualGrid (Vue) P5 edit / remote", () => {
  it("emits cellChange when an editable cell is edited and committed", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "标识", width: 80 },
          { field: "name", title: "名称", editable: true },
        ],
        data: makeRows(2),
        editable: true,
        editMode: "cell",
      },
    });

    const nameCell = wrapper
      .findAll('[role="row"]')[1]
      .findAll('[role="cell"]')
      .find((c) => c.text().includes("Row 1"))!;
    await nameCell.trigger("dblclick");

    const input = wrapper.find("input");
    expect(input.exists()).toBe(true);
    await input.setValue("Updated");
    await input.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("cellChange")?.[0]?.[0]).toEqual({
      rowKey: "1",
      field: "name",
      value: "Updated",
      row: { id: "1", name: "Row 1" },
    });
  });

  it("emits rowSave with draft values when saving a row edit", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "标识", width: 80, editable: false },
          { field: "name", title: "名称" },
        ],
        data: makeRows(2),
        editable: true,
        editMode: "row",
        defaultEditingRowKey: "1",
      },
    });

    const input = wrapper.find("input");
    expect(input.exists()).toBe(true);
    await input.setValue("Saved Name");

    await wrapper.find('button[aria-label="保存"]').trigger("click");

    expect(wrapper.emitted("rowSave")?.[0]?.[0]).toEqual({
      id: "1",
      name: "Saved Name",
    });
    expect(wrapper.emitted("update:editingRowKey")?.[0]).toEqual([null]);
  });

  it("exposes overflowing cell and header text via title so the full value can be read", () => {
    const longName =
      "这是一段会被列宽截断的超长单元格内容，需要通过悬停查看完整文本";
    const longHeader = "超长表头标题会被截断";
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "标识", width: 80 },
          { field: "name", title: longHeader, width: 80 },
        ],
        data: [{ id: "1", name: longName }],
      },
    });

    const nameCell = wrapper
      .findAll('[role="cell"]')
      .find((cell) => cell.text() === longName);
    expect(nameCell?.attributes("title")).toBe(longName);
    const header = wrapper
      .findAll('[role="columnheader"]')
      .find((cell) => cell.text() === longHeader);
    expect(header?.attributes("title")).toBe(longHeader);
  });

  it("still exposes the raw cell value on title when a custom cell slot is used", () => {
    const longName = "自定义渲染后仍然需要能读到被截断的原始值";
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [{ field: "name", title: "名称", width: 80 }],
        data: [{ id: "1", name: longName }],
      },
      slots: {
        cell: ({ value }: { value: unknown }) =>
          h("strong", String(value ?? "")),
      },
    });

    const nameCell = wrapper
      .findAll('[role="cell"]')
      .find((cell) => cell.text() === longName);
    expect(nameCell?.attributes("title")).toBe(longName);
  });

  it("does not slice data when remote pagination is enabled", () => {
    const pageData = makeRows(3).map((r, i) => ({
      ...r,
      id: String(i + 11),
      name: `Remote ${i + 11}`,
    }));
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: pageData,
        pagination: true,
        pageSize: 10,
        remote: true,
        total: 100,
      },
    });

    expect(wrapper.findAll('[role="row"]')).toHaveLength(1 + 3);
    expect(wrapper.text()).toContain("Remote 11");
    expect(wrapper.text()).toContain("共 100 条");
    expect(wrapper.text()).not.toContain("Row 1");
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

function nameCells(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('[role="row"]')
    .slice(1)
    .map((row) => row.findAll('[role="cell"]')[1]?.text());
}

function nameHeader(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('[role="columnheader"]')
    .find((h) => h.text().includes("名称"))!;
}

describe("VirtualGrid (Vue) sort", () => {
  it("cycles a sortable header none → asc → desc → none and reorders rows", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns: sortColumns, data: sortRowsData },
    });

    const header = nameHeader(wrapper);
    expect(header.attributes("aria-sort")).toBe("none");
    expect(nameCells(wrapper)).toEqual(["Charlie", "Alice", "Bob"]);

    await header.find("button").trigger("click");
    expect(wrapper.emitted("update:sort")?.[0]).toEqual([
      { field: "name", order: "asc" },
    ]);
    expect(header.attributes("aria-sort")).toBe("ascending");
    expect(nameCells(wrapper)).toEqual(["Alice", "Bob", "Charlie"]);

    await header.find("button").trigger("click");
    expect(wrapper.emitted("update:sort")?.[1]).toEqual([
      { field: "name", order: "desc" },
    ]);
    expect(header.attributes("aria-sort")).toBe("descending");
    expect(nameCells(wrapper)).toEqual(["Charlie", "Bob", "Alice"]);

    await header.find("button").trigger("click");
    expect(wrapper.emitted("update:sort")?.[2]).toEqual([null]);
    expect(header.attributes("aria-sort")).toBe("none");
    expect(nameCells(wrapper)).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("honors controlled sort and does not reorder when the parent ignores update:sort", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: sortColumns,
        data: sortRowsData,
        sort: { field: "name", order: "desc" },
      },
    });

    expect(nameCells(wrapper)).toEqual(["Charlie", "Bob", "Alice"]);
    expect(nameHeader(wrapper).attributes("aria-sort")).toBe("descending");

    await nameHeader(wrapper).find("button").trigger("click");
    expect(wrapper.emitted("update:sort")?.[0]).toEqual([null]);
    expect(nameCells(wrapper)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("resets local pagination to page 1 when the sort field changes", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: sortColumns,
        data: [
          { id: "1", name: "Zed", age: 1 },
          { id: "2", name: "Yan", age: 2 },
          { id: "3", name: "Abe", age: 3 },
        ],
        pagination: true,
        pageSize: 2,
      },
    });

    await wrapper.find('button[aria-label="下一页"]').trigger("click");
    expect(wrapper.text()).toContain("Abe");
    expect(wrapper.text()).not.toContain("Zed");

    await nameHeader(wrapper).find("button").trigger("click");
    expect(wrapper.emitted("update:page")?.at(-1)).toEqual([1]);
    expect(wrapper.text()).toContain("Abe");
    expect(wrapper.text()).toContain("Yan");
    expect(wrapper.text()).not.toContain("Zed");
  });

  it("does not reorder local rows when remote is enabled", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: sortColumns,
        data: sortRowsData,
        remote: true,
      },
    });

    await nameHeader(wrapper).find("button").trigger("click");
    expect(wrapper.emitted("update:sort")?.[0]).toEqual([
      { field: "name", order: "asc" },
    ]);
    expect(nameCells(wrapper)).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("does not add a sort button on columns without sortable", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns: sortColumns, data: sortRowsData },
    });
    const idHeader = wrapper
      .findAll('[role="columnheader"]')
      .find((h) => h.text().includes("标识"))!;
    expect(idHeader.find("button").exists()).toBe(false);
    expect(idHeader.attributes("aria-sort")).toBeUndefined();
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

function filterHeader(wrapper: ReturnType<typeof mount>, title: string) {
  return wrapper
    .findAll('[role="columnheader"]')
    .find((h) => h.text().includes(title))!;
}

function filterInput(wrapper: ReturnType<typeof mount>, title: string) {
  return filterHeader(wrapper, title).find("input");
}

describe("VirtualGrid (Vue) filter", () => {
  it("filters rows as the header input changes and restores when cleared", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns: filterColumns, data: filterRowsData },
    });

    expect(nameCells(wrapper)).toEqual(["Charlie", "Alice", "Bob"]);
    await filterInput(wrapper, "名称").setValue("a");
    expect(wrapper.emitted("update:filters")?.at(-1)).toEqual([{ name: "a" }]);
    expect(nameCells(wrapper)).toEqual(["Charlie", "Alice"]);

    await filterInput(wrapper, "名称").setValue("");
    expect(wrapper.emitted("update:filters")?.at(-1)).toEqual([{}]);
    expect(nameCells(wrapper)).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("ANDs multiple column filters", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns: filterColumns, data: filterRowsData },
    });

    await filterInput(wrapper, "名称").setValue("a");
    await filterInput(wrapper, "城市").setValue("paris");
    expect(nameCells(wrapper)).toEqual(["Charlie"]);
  });

  it("honors controlled filters and does not filter when the parent ignores update:filters", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: filterColumns,
        data: filterRowsData,
        filters: { name: "Alice" },
      },
    });

    expect(nameCells(wrapper)).toEqual(["Alice"]);
    await filterInput(wrapper, "名称").setValue("Alicex");
    expect(wrapper.emitted("update:filters")?.[0]).toEqual([{ name: "Alicex" }]);
    expect(nameCells(wrapper)).toEqual(["Alice"]);
  });

  it("resets local pagination to page 1 when a filter changes", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: filterColumns,
        data: [
          { id: "1", name: "Zed", city: "A" },
          { id: "2", name: "Yan", city: "B" },
          { id: "3", name: "Abe", city: "C" },
        ],
        pagination: true,
        pageSize: 2,
      },
    });

    await wrapper.find('button[aria-label="下一页"]').trigger("click");
    expect(wrapper.text()).toContain("Abe");
    expect(wrapper.text()).not.toContain("Zed");

    await filterInput(wrapper, "名称").setValue("a");
    expect(wrapper.emitted("update:page")?.at(-1)).toEqual([1]);
    expect(wrapper.text()).toContain("Abe");
    expect(wrapper.text()).toContain("Yan");
    expect(wrapper.text()).not.toContain("Zed");
  });

  it("does not filter local rows when remote is enabled", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: filterColumns,
        data: filterRowsData,
        remote: true,
      },
    });

    await filterInput(wrapper, "名称").setValue("a");
    expect(wrapper.emitted("update:filters")?.at(-1)).toEqual([{ name: "a" }]);
    expect(nameCells(wrapper)).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("does not add a filter input on columns without filterable", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns: filterColumns, data: filterRowsData },
    });
    expect(filterHeader(wrapper, "标识").find("input").exists()).toBe(false);
  });

  it("reveals matching tree descendants even when parents start collapsed", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns: filterColumns, data: treeData, tree: true },
    });

    expect(wrapper.text()).toContain("Parent");
    expect(wrapper.text()).not.toContain("Child A");

    await filterInput(wrapper, "名称").setValue("Child A");
    expect(wrapper.text()).toContain("Parent");
    expect(wrapper.text()).toContain("Child A");
    expect(wrapper.text()).not.toContain("Child B");
    expect(wrapper.text()).not.toContain("Leaf");
    expect(wrapper.emitted("update:expandedKeys")).toBeUndefined();
  });

  it("does not persist expand state when collapsing during a local filter", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns: filterColumns, data: treeData, tree: true },
    });

    await filterInput(wrapper, "名称").setValue("Child A");
    expect(wrapper.text()).toContain("Child A");

    await wrapper.find('button[aria-label="折叠 Parent"]').trigger("click");
    expect(wrapper.text()).toContain("Child A");
    expect(wrapper.emitted("update:expandedKeys")).toBeUndefined();

    await filterInput(wrapper, "名称").setValue("");
    expect(wrapper.text()).not.toContain("Child A");
    expect(wrapper.find('button[aria-label="展开 Parent"]').exists()).toBe(true);
  });
});

describe("VirtualGrid (Vue) overflow tooltip", () => {
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
    const longNote = "这是一段很长的单元格内容，默认会被截断无法直接看完";
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 80 },
        ],
        data: [{ id: "1", note: longNote }],
      },
      attachTo: document.body,
    });

    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    const cell = wrapper
      .findAll('[role="cell"]')
      .find((item) => item.text().includes(longNote));
    expect(cell).toBeTruthy();
    await cell!.findComponent(Tooltip).trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      longNote,
    );

    wrapper.unmount();
  });

  it("does not show an overflow tooltip when showOverflowTooltip is false", async () => {
    const longNote = "关闭溢出提示后不应弹出完整内容";
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 80 },
        ],
        data: [{ id: "1", note: longNote }],
        showOverflowTooltip: false,
      },
      attachTo: document.body,
    });

    const cell = wrapper
      .findAll('[role="cell"]')
      .find((item) => item.text().includes(longNote));
    await cell!.trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    wrapper.unmount();
  });

  it("does not show an overflow tooltip when autoHeight wraps the cell", async () => {
    const longNote = "自动行高时内容已完整展示，不必再弹出提示";
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 160 },
        ],
        data: [{ id: "1", note: longNote }],
        autoHeight: true,
      },
      attachTo: document.body,
    });

    const cell = wrapper
      .findAll('[role="cell"]')
      .find((item) => item.text().includes(longNote));
    await cell!.trigger("mouseenter");
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    wrapper.unmount();
  });

  it("honors a column-level showOverflowTooltip override", async () => {
    const longNote = "列级关闭后这条备注不应弹出提示";
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [
          { field: "id", title: "标识", width: 80 },
          { field: "note", title: "备注", width: 80, showOverflowTooltip: false },
        ],
        data: [{ id: "1", note: longNote }],
      },
      attachTo: document.body,
    });

    const cell = wrapper
      .findAll('[role="cell"]')
      .find((item) => item.text().includes(longNote));
    expect(cell!.findComponent(Tooltip).exists()).toBe(false);

    wrapper.unmount();
  });

  it("does not wrap custom cell slots with an overflow tooltip", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns: [{ field: "note", title: "备注", width: 80 }],
        data: [{ id: "1", note: "自定义渲染" }],
      },
      slots: {
        "cell-note": () => h("button", { type: "button" }, "自定义渲染"),
      },
      attachTo: document.body,
    });

    const cell = wrapper
      .findAll('[role="cell"]')
      .find((item) => item.text().includes("自定义渲染"));
    expect(cell!.findComponent(Tooltip).exists()).toBe(false);

    wrapper.unmount();
  });
});
