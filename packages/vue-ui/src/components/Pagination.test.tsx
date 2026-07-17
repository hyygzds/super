import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Pagination } from "./Pagination";

describe("Pagination (Vue)", () => {
  it("emits update:page on next click", async () => {
    const wrapper = mount(Pagination, {
      props: {
        total: 95,
        page: 1,
        pageSize: 10,
      },
    });
    expect(wrapper.text()).toContain("共 95 条");
    const next = wrapper.find('button[aria-label="下一页"]');
    expect((next.element as HTMLButtonElement).disabled).toBe(false);
    await next.trigger("click");
    expect(wrapper.emitted("update:page")?.[0]).toEqual([2]);
  });

  it("emits page size change and resets page to 1", async () => {
    const wrapper = mount(Pagination, {
      props: {
        total: 100,
        page: 3,
        pageSize: 10,
        pageSizeOptions: [10, 20],
      },
    });
    const select = wrapper.find('select[aria-label="每页条数"]');
    await select.setValue("20");
    expect(wrapper.emitted("update:pageSize")?.[0]).toEqual([20]);
    expect(wrapper.emitted("update:page")?.[0]).toEqual([1]);
  });
});
