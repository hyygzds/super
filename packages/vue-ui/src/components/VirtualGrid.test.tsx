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
});
