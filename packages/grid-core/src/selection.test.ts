import { describe, expect, it } from "vitest";
import {
  toggleKey,
  selectAllKeys,
  clearKeys,
  isAllSelected,
  isIndeterminate,
} from "./selection";

describe("selection", () => {
  const all = ["a", "b", "c"];

  it("toggleKey adds and removes in multiple mode", () => {
    expect(toggleKey([], "a", true)).toEqual(["a"]);
    expect(toggleKey(["a"], "a", true)).toEqual([]);
    expect(toggleKey(["a"], "b", true)).toEqual(["a", "b"]);
  });

  it("toggleKey replaces selection in single mode", () => {
    expect(toggleKey(["a"], "b", false)).toEqual(["b"]);
    expect(toggleKey(["b"], "b", false)).toEqual([]);
  });

  it("selectAllKeys and clearKeys", () => {
    expect(selectAllKeys(all)).toEqual(["a", "b", "c"]);
    expect(clearKeys()).toEqual([]);
  });

  it("isAllSelected and isIndeterminate", () => {
    expect(isAllSelected(["a", "b", "c"], all)).toBe(true);
    expect(isAllSelected(["a"], all)).toBe(false);
    expect(isIndeterminate(["a"], all)).toBe(true);
    expect(isIndeterminate([], all)).toBe(false);
    expect(isIndeterminate(["a", "b", "c"], all)).toBe(false);
  });
});
