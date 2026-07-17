import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
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
    (scroller.element as HTMLElement).scrollTop = 20 * 149;
    await scroller.trigger("scroll");

    expect(wrapper.text()).toContain("Row 150");
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
