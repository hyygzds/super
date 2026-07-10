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
});
