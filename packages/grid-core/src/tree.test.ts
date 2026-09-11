import { describe, expect, it } from "vitest";
import {
  cascadeToggleKey,
  collectDescendantKeys,
  collectExpandableKeys,
  flattenTree,
  isTreeIndeterminate,
  toggleExpandKey,
} from "./tree";

const tree = [
  {
    id: "1",
    name: "Root",
    children: [
      { id: "1-1", name: "Child A" },
      {
        id: "1-2",
        name: "Child B",
        children: [{ id: "1-2-1", name: "Grand" }],
      },
    ],
  },
  { id: "2", name: "Other" },
];

describe("flattenTree", () => {
  it("shows only roots when nothing expanded", () => {
    const rows = flattenTree({ data: tree });
    expect(rows.map((r) => r.key)).toEqual(["1", "2"]);
    expect(rows[0]?.hasChildren).toBe(true);
    expect(rows[0]?.expanded).toBe(false);
  });

  it("includes children when parent expanded", () => {
    const rows = flattenTree({ data: tree, expandedKeys: ["1"] });
    expect(rows.map((r) => r.key)).toEqual(["1", "1-1", "1-2", "2"]);
    expect(rows[2]?.depth).toBe(1);
  });

  it("respects nested expand", () => {
    const rows = flattenTree({
      data: tree,
      expandedKeys: ["1", "1-2"],
    });
    expect(rows.map((r) => r.key)).toEqual([
      "1",
      "1-1",
      "1-2",
      "1-2-1",
      "2",
    ]);
    expect(rows[3]?.depth).toBe(2);
  });

  it("treats __hasChildren as hasChildren for lazy nodes", () => {
    const rows = flattenTree({
      data: [{ id: "L", name: "Lazy", __hasChildren: true }],
    });
    expect(rows[0]?.hasChildren).toBe(true);
  });
});

describe("collectExpandableKeys", () => {
  it("returns keys of nodes that still have children", () => {
    expect(collectExpandableKeys(tree)).toEqual(["1", "1-2"]);
  });
});

describe("toggleExpandKey", () => {
  it("adds and removes keys", () => {
    expect(toggleExpandKey([], "1")).toEqual(["1"]);
    expect(toggleExpandKey(["1", "2"], "1")).toEqual(["2"]);
  });
});

describe("cascadeToggleKey", () => {
  it("cascadeChild selects descendants", () => {
    const next = cascadeToggleKey({
      selectedKeys: [],
      key: "1",
      data: tree,
      cascadeChild: true,
    });
    expect(next.sort()).toEqual(["1", "1-1", "1-2", "1-2-1"].sort());
  });

  it("cascadeParent selects parent when all children selected", () => {
    let keys = cascadeToggleKey({
      selectedKeys: [],
      key: "1-1",
      data: tree,
      cascadeParent: true,
    });
    keys = cascadeToggleKey({
      selectedKeys: keys,
      key: "1-2",
      data: tree,
      cascadeChild: true,
      cascadeParent: true,
    });
    expect(keys).toContain("1");
  });
});

describe("isTreeIndeterminate", () => {
  it("is true when some descendants selected", () => {
    expect(isTreeIndeterminate(["1-1"], "1", tree)).toBe(true);
    expect(isTreeIndeterminate(["1", "1-1", "1-2", "1-2-1"], "1", tree)).toBe(
      false,
    );
  });
});

describe("collectDescendantKeys", () => {
  it("includes self and nested", () => {
    expect(collectDescendantKeys(tree[0]!).sort()).toEqual(
      ["1", "1-1", "1-2", "1-2-1"].sort(),
    );
  });
});
