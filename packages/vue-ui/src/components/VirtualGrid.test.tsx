import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { VirtualGrid } from "./VirtualGrid";

const columns = [
  { field: "code", title: "编号", width: 120 },
  { field: "name", title: "名称", width: 120 },
];

const data = [
  { id: "1", code: "0001", name: "Sagi" },
  { id: "2", code: "0002", name: "Nancy" },
];

describe("VirtualGrid (Vue)", () => {
  it("renders headers and cell text", () => {
    const wrapper = mount(VirtualGrid, {
      props: { data, columns, showRowNumber: false },
    });
    expect(wrapper.text()).toContain("编号");
    expect(wrapper.text()).toContain("0001");
    expect(wrapper.text()).toContain("Nancy");
  });

  it("shows empty state", () => {
    const wrapper = mount(VirtualGrid, {
      props: { data: [], columns },
    });
    expect(wrapper.text()).toContain("暂无数据");
  });

  it("emits rowClick", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { data, columns, showRowNumber: false },
    });
    const cell = wrapper.findAll('[role="gridcell"]').find((c) =>
      c.text().includes("0001"),
    );
    await cell!.trigger("click");
    expect(wrapper.emitted("rowClick")?.[0]?.[0]).toMatchObject({
      id: "1",
      code: "0001",
    });
  });

  it("hides hidden columns", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns: [
          { field: "code", title: "编号" },
          { field: "name", title: "名称", hidden: true },
        ],
        showRowNumber: false,
      },
    });
    expect(wrapper.text()).toContain("编号");
    expect(wrapper.text()).not.toContain("名称");
  });

  it("shows row numbers when enabled", () => {
    const wrapper = mount(VirtualGrid, {
      props: { data, columns, showRowNumber: true },
    });
    const rowNumbers = wrapper
      .findAll('[data-row-index]')
      .map((row) => row.find('[role="gridcell"]').text());
    expect(rowNumbers).toContain("1");
    expect(rowNumbers).toContain("2");
  });

  it("uses column render for cells", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns: [
          {
            field: "name",
            title: "名称",
            render: ({ row }: { row: (typeof data)[number] }) =>
              `Hi-${String(row.name)}`,
          },
        ],
        showRowNumber: false,
      },
    });
    expect(wrapper.text()).toContain("Hi-Sagi");
  });

  it("virtual mode renders fewer DOM rows than data length", async () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      code: `c${i}`,
      name: `n${i}`,
    }));
    const parent = document.createElement("div");
    parent.style.height = "200px";
    document.body.appendChild(parent);

    const wrapper = mount(VirtualGrid, {
      props: {
        data: many,
        columns,
        enableVirtual: true,
        rowHeight: 36,
        showRowNumber: false,
        class: "h-[200px]",
      },
      attachTo: parent,
    });

    const body = wrapper.find('[data-testid="virtual-grid-body"]').element as HTMLElement;
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 200 });
    body.scrollTop = 0;
    body.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    const bodyRows = wrapper.findAll('[data-row-index]');
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(bodyRows.length).toBeLessThan(80);

    wrapper.unmount();
    parent.remove();
  });

  it("emits update:selectedKeys on row checkbox", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns,
        showRowNumber: false,
        selectionMode: "multiple",
        defaultSelectedKeys: [],
      },
    });
    const box = wrapper.find('input[aria-label="选择行 1"]');
    await box.setValue(true);
    expect(wrapper.emitted("update:selectedKeys")?.at(-1)).toEqual([["1"]]);
  });

  it("select-all uses full data in local pagination", async () => {
    const many = [
      { id: "1", code: "a", name: "A" },
      { id: "2", code: "b", name: "B" },
      { id: "3", code: "c", name: "C" },
    ];
    const wrapper = mount(VirtualGrid, {
      props: {
        data: many,
        columns,
        showRowNumber: false,
        selectionMode: "multiple",
        pagination: true,
        paginationMode: "local",
        defaultPageSize: 2,
        defaultSelectedKeys: [],
      },
    });
    expect(wrapper.text()).toContain("A");
    expect(wrapper.text()).not.toContain("C");
    await wrapper.find('input[aria-label="全选"]').setValue(true);
    expect(wrapper.emitted("update:selectedKeys")?.at(-1)).toEqual([
      ["1", "2", "3"],
    ]);
  });

  it("slices in local pagination", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    const wrapper = mount(VirtualGrid, {
      props: {
        data: many,
        columns,
        showRowNumber: false,
        pagination: true,
        paginationMode: "local",
        defaultPage: 1,
        defaultPageSize: 2,
      },
    });
    expect(wrapper.text()).toContain("n1");
    expect(wrapper.text()).not.toContain("n3");
    expect(wrapper.find('[data-testid="virtual-grid-pagination"]').exists()).toBe(
      true,
    );
  });

  it("remote page change emits update:page without slicing away rows", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns,
        showRowNumber: false,
        pagination: true,
        paginationMode: "remote",
        total: 50,
        page: 1,
        pageSize: 10,
      },
    });
    expect(wrapper.text()).toContain("Sagi");
    expect(wrapper.text()).toContain("Nancy");
    await wrapper
      .find('[data-testid="virtual-grid-pagination"] button[aria-label="下一页"]')
      .trigger("click");
    expect(wrapper.emitted("update:page")?.at(-1)).toEqual([2]);
  });

  it("single mode has no select-all checkbox", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns,
        showRowNumber: false,
        selectionMode: "single",
        defaultSelectedKeys: ["1"],
      },
    });
    expect(wrapper.find('input[aria-label="全选"]').exists()).toBe(false);
    expect(wrapper.find('input[aria-label="选择行 1"]').exists()).toBe(true);
  });

  it("does not emit rowClick when clicking row checkbox", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns,
        showRowNumber: false,
        selectionMode: "multiple",
      },
    });
    await wrapper.find('input[aria-label="选择行 1"]').setValue(true);
    expect(wrapper.emitted("update:selectedKeys")).toBeTruthy();
    expect(wrapper.emitted("rowClick")).toBeUndefined();
  });

  it("applies sticky left offsets for selection and fixed columns", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns: [
          { field: "code", title: "编号", width: 100, fixed: "left" },
          { field: "name", title: "名称", width: 200 },
        ],
        selectionMode: "multiple",
        showRowNumber: true,
      },
    });
    const leftStickies = wrapper.findAll('[data-sticky="left"]');
    expect(leftStickies.length).toBeGreaterThan(0);
    const selection = leftStickies[0]!;
    expect(selection.attributes("style") || "").toMatch(/left:\s*0px/);
    const code = leftStickies.find((n) => n.text().includes("编号"));
    expect(code?.attributes("style") || "").toMatch(new RegExp(`left:\\s*${48 + 56}px`));
  });

  it("applies sticky right for fixed right columns", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns: [
          { field: "code", title: "编号", width: 100 },
          { field: "name", title: "名称", width: 120, fixed: "right" },
        ],
        showRowNumber: false,
        selectionMode: "none",
      },
    });
    const name = wrapper.find('[data-sticky="right"]');
    expect(name.attributes("style") || "").toMatch(/right:\s*0px/);
  });
});
