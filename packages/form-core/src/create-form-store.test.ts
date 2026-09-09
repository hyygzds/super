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

  it("reads and writes nested paths in values tree", async () => {
    const store = createFormStore({
      initialValues: { user: { email: "a@b.c" } },
    });
    store.registerField("user.email", {
      rules: [{ required: true, message: "必填" }],
    });
    expect(store.getFieldValue("user.email")).toBe("a@b.c");
    store.setFieldValue("user.email", "x@y.z");
    expect(store.getFieldsValue()).toEqual({ user: { email: "x@y.z" } });
    store.setFieldValue(["users", 0, "name"], "Ada");
    expect(store.getFieldValue("users.0.name")).toBe("Ada");
    expect(store.getFieldsValue()).toEqual({
      user: { email: "x@y.z" },
      users: [{ name: "Ada" }],
    });
    expect(await store.validateField("user.email")).toBe(true);
  });

  it("revalidates fields that list a changed dependency", async () => {
    const store = createFormStore({
      initialValues: { password: "secret", confirm: "nope" },
    });
    store.registerField("password");
    store.registerField("confirm", {
      dependencies: ["password"],
      rules: [
        {
          validator: (value, values) =>
            value === values.password ? true : "不一致",
        },
      ],
    });
    await store.validateField("confirm");
    expect(store.getFieldErrors("confirm")).toEqual(["不一致"]);
    store.setFieldValue("password", "nope");
    await vi.waitFor(() =>
      expect(store.getFieldErrors("confirm")).toEqual([]),
    );
  });

  it("setFieldsValue writes nested paths and revalidates dependents", async () => {
    const store = createFormStore({
      initialValues: {
        user: { email: "old@x.y" },
        password: "a",
        confirm: "b",
      },
    });
    store.registerField("user.email");
    store.registerField("password");
    store.registerField("confirm", {
      dependencies: ["password"],
      rules: [
        {
          validator: (value, values) =>
            value === values.password ? true : "不一致",
        },
      ],
    });
    await store.validateField("confirm");
    expect(store.getFieldErrors("confirm")).toEqual(["不一致"]);
    store.setFieldsValue({ password: "b" });
    await vi.waitFor(() =>
      expect(store.getFieldErrors("confirm")).toEqual([]),
    );
    store.setFieldsValue({ "user.email": "new@x.y" } as Record<string, unknown>);
    expect(store.getFieldValue("user.email")).toBe("new@x.y");
    expect(store.getFieldsValue()).toEqual({
      user: { email: "new@x.y" },
      password: "b",
      confirm: "b",
    });
  });

  it("preserves undefined and Date values through getFieldsValue", () => {
    const d = new Date("2020-01-01T00:00:00.000Z");
    const store = createFormStore({
      initialValues: { city: undefined, when: d },
    });
    const snapshot = store.getFieldsValue();
    expect(snapshot).toEqual({ city: undefined, when: d });
    expect(snapshot.when).toBeInstanceOf(Date);
  });

  it("ignores stale async validation results", async () => {
    let resolveFirst!: (v: boolean | string) => void;
    let resolveSecond!: (v: boolean | string) => void;
    let calls = 0;
    const store = createFormStore({ initialValues: { n: "ok" } });
    store.registerField("n", {
      rules: [
        {
          validator: () => {
            calls += 1;
            if (calls === 1) {
              return new Promise((resolve) => {
                resolveFirst = resolve;
              });
            }
            return new Promise((resolve) => {
              resolveSecond = resolve;
            });
          },
        },
      ],
    });
    const first = store.validateField("n");
    const second = store.validateField("n");
    resolveFirst("过期错误");
    await first;
    expect(store.getFieldErrors("n")).toEqual([]);
    expect(store.isFieldValidating("n")).toBe(true);
    resolveSecond(true);
    await second;
    expect(store.getFieldErrors("n")).toEqual([]);
    expect(store.isFieldValidating("n")).toBe(false);
  });
});
