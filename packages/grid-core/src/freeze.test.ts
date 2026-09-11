import { describe, expect, it } from "vitest";
import {
  nextFrozenState,
  resolveColumnFixed,
  setColumnFrozen,
} from "./freeze";
import type { FrozenState } from "./types";

describe("resolveColumnFixed", () => {
  it("falls back to the column fixed side when frozen has no key", () => {
    expect(resolveColumnFixed("name", "left", undefined)).toBe("left");
    expect(resolveColumnFixed("name", "right", {})).toBe("right");
    expect(resolveColumnFixed("name", undefined, {})).toBeUndefined();
  });

  it("lets an explicit null override column.fixed", () => {
    const frozen: FrozenState = { name: null };
    expect(resolveColumnFixed("name", "left", frozen)).toBeUndefined();
  });

  it("uses the frozen side when the key is present", () => {
    expect(resolveColumnFixed("name", "left", { name: "right" })).toBe("right");
    expect(resolveColumnFixed("name", undefined, { name: "left" })).toBe("left");
  });
});

describe("nextFrozenState", () => {
  it("cycles none → left → right → none for a field", () => {
    expect(nextFrozenState(undefined, "name")).toEqual({ name: "left" });
    expect(nextFrozenState({ name: "left" }, "name")).toEqual({ name: "right" });
    expect(nextFrozenState({ name: "right" }, "name")).toEqual({ name: null });
    expect(nextFrozenState({ name: null }, "name")).toEqual({ name: "left" });
  });

  it("starts from the column fixed side when frozen has no key", () => {
    expect(nextFrozenState({}, "name", "left")).toEqual({ name: "right" });
    expect(nextFrozenState({}, "name", "right")).toEqual({ name: null });
  });

  it("does not drop other fields when cycling one column", () => {
    const current: FrozenState = { id: "left", name: "left" };
    expect(nextFrozenState(current, "name")).toEqual({
      id: "left",
      name: "right",
    });
  });
});

describe("setColumnFrozen", () => {
  it("writes a side and records null when clearing", () => {
    expect(setColumnFrozen({}, "name", "left")).toEqual({ name: "left" });
    expect(setColumnFrozen({ name: "left" }, "name", null)).toEqual({
      name: null,
    });
  });
});
