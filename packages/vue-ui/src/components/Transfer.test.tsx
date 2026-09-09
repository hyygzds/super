import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Transfer } from "./Transfer";

const ITEMS = [
  { key: "a", title: "Alpha" },
  { key: "b", title: "Beta" },
  { key: "c", title: "Gamma", disabled: true },
  { key: "d", title: "Delta" },
];

function checkboxByLabel(wrapper: ReturnType<typeof mount>, name: string) {
  const label = wrapper.findAll("label").find((node) => node.text().includes(name));
  if (!label) throw new Error(`checkbox label not found: ${name}`);
  return label.find("input");
}

describe("Transfer (Vue)", () => {
  it("puts defaultModelValue on the right panel", () => {
    const wrapper = mount(Transfer, {
      props: {
        dataSource: ITEMS,
        defaultModelValue: ["b"],
        titles: ["源", "目标"],
      },
    });
    const source = wrapper.find('[role="listbox"][aria-label="源"]');
    const target = wrapper.find('[role="listbox"][aria-label="目标"]');
    expect(source.text()).toContain("Alpha");
    expect(source.text()).not.toContain("Beta");
    expect(target.text()).toContain("Beta");
  });

  it("moves checked source items to the right and emits update:modelValue", async () => {
    const wrapper = mount(Transfer, {
      props: {
        dataSource: ITEMS,
        defaultModelValue: [],
        titles: ["源", "目标"],
      },
    });
    await checkboxByLabel(wrapper, "Alpha").setValue(true);
    await wrapper.find('[aria-label="移到右侧"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["a"]]);
    expect(wrapper.find('[role="listbox"][aria-label="目标"]').text()).toContain(
      "Alpha",
    );
  });

  it("does not move disabled items and keeps controlled modelValue", async () => {
    const wrapper = mount(Transfer, {
      props: {
        dataSource: ITEMS,
        modelValue: [],
        titles: ["源", "目标"],
      },
    });
    const gamma = checkboxByLabel(wrapper, "Gamma");
    expect((gamma.element as HTMLInputElement).disabled).toBe(true);
    await gamma.setValue(true);
    await wrapper.find('[aria-label="移到右侧"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.find('[role="listbox"][aria-label="源"]').text()).toContain(
      "Gamma",
    );
  });

  it("moves target items back to the left", async () => {
    const wrapper = mount(Transfer, {
      props: {
        dataSource: ITEMS,
        defaultModelValue: ["a", "b"],
        titles: ["源", "目标"],
      },
    });
    await checkboxByLabel(wrapper, "Alpha").setValue(true);
    await wrapper.find('[aria-label="移到左侧"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["b"]]);
    expect(wrapper.find('[role="listbox"][aria-label="源"]').text()).toContain(
      "Alpha",
    );
  });

  it("check-all selects enabled items in a panel", async () => {
    const wrapper = mount(Transfer, {
      props: {
        dataSource: ITEMS,
        defaultModelValue: [],
        titles: ["源", "目标"],
      },
    });
    await checkboxByLabel(wrapper, "源全选").setValue(true);
    expect(
      (checkboxByLabel(wrapper, "Alpha").element as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (checkboxByLabel(wrapper, "Gamma").element as HTMLInputElement).checked,
    ).toBe(false);
  });
});
