import { describe, expect, it, vi } from "vitest";
import { createFormStore } from "./create-form-store";

describe("createFormStore", () => {
  it("uses initialValues and get/set field values", () => {
    const store = createFormStore({ initialValues: { name: "Ada" } });
    store.registerField("name");
    store.registerField("age");
    expect(store.getFieldValue("name")).toBe("Ada");
    expect(store.getFieldsValue()).toEqual({ name: "Ada" });
    store.setFieldValue("age", 1);
    expect(store.getFieldsValue()).toEqual({ name: "Ada", age: 1 });
  });

  it("validateField runs rules on blur path and stores errors", async () => {
    const store = createFormStore();
    store.registerField("email", {
      rules: [{ required: true, message: "必填" }],
    });
    expect(await store.validateField("email")).toBe(false);
    expect(store.getFieldErrors("email")).toEqual(["必填"]);
    store.setFieldValue("email", "a@b.c");
    expect(await store.validateField("email")).toBe(true);
    expect(store.getFieldErrors("email")).toEqual([]);
  });

  it("validate aggregates all registered fields", async () => {
    const store = createFormStore({
      initialValues: { a: "", b: "ok" },
    });
    store.registerField("a", { rules: [{ required: true, message: "a" }] });
    store.registerField("b", { rules: [{ required: true, message: "b" }] });
    const result = await store.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.a).toEqual(["a"]);
    expect(result.values.b).toBe("ok");
  });

  it("setFieldValue does not clear errors until revalidate", async () => {
    const store = createFormStore();
    store.registerField("x", { rules: [{ required: true, message: "必填" }] });
    await store.validateField("x");
    store.setFieldValue("x", "hi");
    expect(store.getFieldErrors("x")).toEqual(["必填"]);
  });

  it("resetFields restores initial and clears errors", async () => {
    const store = createFormStore({ initialValues: { n: "1" } });
    store.registerField("n", { rules: [{ required: true, message: "必填" }] });
    store.setFieldValue("n", "");
    await store.validateField("n");
    store.resetFields();
    expect(store.getFieldValue("n")).toBe("1");
    expect(store.getFieldErrors("n")).toEqual([]);
  });

  it("clearValidate clears errors without changing values", async () => {
    const store = createFormStore();
    store.registerField("n", { rules: [{ required: true, message: "必填" }] });
    await store.validateField("n");
    store.clearValidate();
    expect(store.getFieldErrors("n")).toEqual([]);
  });

  it("subscribe notifies on value and error changes", async () => {
    const store = createFormStore();
    store.registerField("n");
    const spy = vi.fn();
    const unsub = store.subscribe(spy);
    const before = store.getSnapshot();
    store.setFieldValue("n", 1);
    expect(spy).toHaveBeenCalled();
    expect(store.getSnapshot()).not.toBe(before);
    unsub();
    spy.mockClear();
    store.setFieldValue("n", 2);
    expect(spy).not.toHaveBeenCalled();
  });

  it("marks validating during async validator", async () => {
    let resolve!: (v: boolean | string) => void;
    const store = createFormStore();
    store.registerField("n", {
      rules: [
        {
          validator: () =>
            new Promise((r) => {
              resolve = r;
            }),
        },
      ],
    });
    const p = store.validateField("n");
    expect(store.isFieldValidating("n")).toBe(true);
    resolve(true);
    await p;
    expect(store.isFieldValidating("n")).toBe(false);
  });
});
