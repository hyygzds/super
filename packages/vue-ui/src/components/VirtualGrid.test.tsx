import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
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
