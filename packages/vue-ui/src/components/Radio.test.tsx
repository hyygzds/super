import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { Radio, RadioGroup } from "./Radio";

describe("Radio / RadioGroup (Vue)", () => {
  it("selects via child Radio in uncontrolled mode", async () => {
    const wrapper = mount(RadioGroup, {
      props: { defaultModelValue: "a" },
      slots: {
        default: () => [
          h(Radio, { value: "a" }, () => "选项 A"),
          h(Radio, { value: "b" }, () => "选项 B"),
        ],
      },
    });

    const inputs = wrapper.findAll('input[type="radio"]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0].element as HTMLInputElement).checked).toBe(true);
    expect((inputs[1].element as HTMLInputElement).checked).toBe(false);

    await inputs[1].setValue(true);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["b"]);
    expect((inputs[0].element as HTMLInputElement).checked).toBe(false);
    expect((inputs[1].element as HTMLInputElement).checked).toBe(true);
  });

  it("respects controlled modelValue", async () => {
    const Host = defineComponent({
      setup() {
        const value = ref("a");
        return () =>
          h(
            RadioGroup,
            {
              modelValue: value.value,
              "onUpdate:modelValue": (v: string) => {
                // intentionally do not update — simulate parent ignoring
              },
            },
            () => [
              h(Radio, { value: "a" }, () => "A"),
              h(Radio, { value: "b" }, () => "B"),
            ],
          );
      },
    });

    const wrapper = mount(Host);
    const group = wrapper.findComponent(RadioGroup);
    const inputs = wrapper.findAll('input[type="radio"]');
    expect((inputs[0].element as HTMLInputElement).checked).toBe(true);

    await inputs[1].setValue(true);
    expect(group.emitted("update:modelValue")?.[0]).toEqual(["b"]);
    // controlled: prop 未变，仍保持 a
    expect((inputs[0].element as HTMLInputElement).checked).toBe(true);
    expect((inputs[1].element as HTMLInputElement).checked).toBe(false);
  });

  it("renders options shortcut", async () => {
    const wrapper = mount(RadioGroup, {
      props: {
        defaultModelValue: "x",
        options: [
          { label: "X", value: "x" },
          { label: "Y", value: "y", disabled: true },
        ],
      },
    });

    expect(wrapper.attributes("role")).toBe("radiogroup");
    const inputs = wrapper.findAll('input[type="radio"]');
    expect(inputs).toHaveLength(2);
    expect(wrapper.text()).toContain("X");
    expect(wrapper.text()).toContain("Y");
    expect((inputs[1].element as HTMLInputElement).disabled).toBe(true);

    await inputs[1].setValue(true);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("disables all radios when group disabled", async () => {
    const wrapper = mount(RadioGroup, {
      props: {
        disabled: true,
        defaultModelValue: "a",
        options: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
      },
    });

    const inputs = wrapper.findAll('input[type="radio"]');
    expect(inputs.every((i) => (i.element as HTMLInputElement).disabled)).toBe(
      true,
    );
    await inputs[1].setValue(true);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("applies vertical orientation class", () => {
    const wrapper = mount(RadioGroup, {
      props: {
        orientation: "vertical",
        options: [{ label: "A", value: "a" }],
      },
    });
    expect(wrapper.classes()).toContain("flex-col");
  });
});
