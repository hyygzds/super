import { describe, expect, it } from "vitest";
import { runRules } from "./run-rules";

describe("runRules", () => {
  it("returns empty when no rules", async () => {
    expect(await runRules("x", {}, [])).toEqual([]);
  });

  it("fails required on empty string / null / undefined", async () => {
    const rules = [{ required: true, message: "必填" }];
    expect(await runRules("", {}, rules)).toEqual(["必填"]);
    expect(await runRules(null, {}, rules)).toEqual(["必填"]);
    expect(await runRules(undefined, {}, rules)).toEqual(["必填"]);
  });

  it("passes required when value is present", async () => {
    expect(await runRules("a", {}, [{ required: true, message: "必填" }])).toEqual([]);
    expect(await runRules(0, {}, [{ required: true, message: "必填" }])).toEqual([]);
  });

  it("applies minLength / maxLength only for strings", async () => {
    expect(
      await runRules("ab", {}, [{ minLength: 3, message: "太短" }]),
    ).toEqual(["太短"]);
    expect(
      await runRules("abcd", {}, [{ maxLength: 3, message: "太长" }]),
    ).toEqual(["太长"]);
    expect(await runRules(12, {}, [{ minLength: 3, message: "太短" }])).toEqual([]);
  });

  it("applies min / max only for numbers", async () => {
    expect(await runRules(1, {}, [{ min: 2, message: "太小" }])).toEqual(["太小"]);
    expect(await runRules(5, {}, [{ max: 4, message: "太大" }])).toEqual(["太大"]);
    expect(await runRules("3", {}, [{ min: 2, message: "太小" }])).toEqual([]);
  });

  it("applies pattern for strings", async () => {
    expect(
      await runRules("abc", {}, [{ pattern: /^\d+$/, message: "数字" }]),
    ).toEqual(["数字"]);
  });

  it("stops at first failing rule", async () => {
    const errors = await runRules("", {}, [
      { required: true, message: "必填" },
      { minLength: 2, message: "太短" },
    ]);
    expect(errors).toEqual(["必填"]);
  });

  it("supports sync validator returning string / true", async () => {
    expect(
      await runRules("admin", { name: "admin" }, [
        {
          validator: (v) => (v === "admin" ? "不能用 admin" : true),
        },
      ]),
    ).toEqual(["不能用 admin"]);
  });

  it("supports async validator", async () => {
    expect(
      await runRules("x", {}, [
        {
          validator: async () => "异步失败",
        },
      ]),
    ).toEqual(["异步失败"]);
  });

  it("uses default message when rule fails without message", async () => {
    const errors = await runRules("", {}, [{ required: true }]);
    expect(errors[0]).toBeTruthy();
  });
});
