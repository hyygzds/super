import { describe, expect, it } from "vitest";
import { compareCellValues, nextSortState, sortRows } from "./sort";
import type { SortState } from "./types";

describe("nextSortState", () => {
  it("starts at asc for a new field, then desc, then clears", () => {
    expect(nextSortState(null, "name")).toEqual({ field: "name", order: "asc" });
    expect(nextSortState({ field: "name", order: "asc" }, "name")).toEqual({
      field: "name",
      order: "desc",
    });
    expect(nextSortState({ field: "name", order: "desc" }, "name")).toBeNull();
  });

  it("resets to asc when switching to a different field", () => {
    const current: SortState = { field: "name", order: "desc" };
    expect(nextSortState(current, "age")).toEqual({ field: "age", order: "asc" });
  });
});

describe("compareCellValues", () => {
  it("compares numbers numerically and strings with numeric locale", () => {
    expect(compareCellValues(2, 10)).toBeLessThan(0);
    expect(compareCellValues(10, 2)).toBeGreaterThan(0);
    expect(compareCellValues("Row 2", "Row 10")).toBeLessThan(0);
  });

  it("places null, undefined, and empty string after real values", () => {
    expect(compareCellValues(null, 1)).toBeGreaterThan(0);
    expect(compareCellValues(1, undefined)).toBeLessThan(0);
    expect(compareCellValues("", "a")).toBeGreaterThan(0);
    expect(compareCellValues(null, undefined)).toBe(0);
  });

  it("compares Date instances by timestamp", () => {
    const earlier = new Date("2026-01-01");
    const later = new Date("2026-06-01");
    expect(compareCellValues(earlier, later)).toBeLessThan(0);
  });
});

describe("sortRows", () => {
  const rows = [
    { id: "1", name: "Charlie", age: 30 },
    { id: "2", name: "Alice", age: 20 },
    { id: "3", name: "Bob", age: 20 },
  ];

  it("returns the same array reference when sort is empty", () => {
    expect(sortRows(rows, null)).toBe(rows);
    expect(sortRows(rows, undefined)).toBe(rows);
  });

  it("sorts ascending and descending by field without mutating input", () => {
    const original = rows.map((r) => r.id);
    expect(sortRows(rows, { field: "name", order: "asc" }).map((r) => r.name)).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ]);
    expect(sortRows(rows, { field: "name", order: "desc" }).map((r) => r.name)).toEqual([
      "Charlie",
      "Bob",
      "Alice",
    ]);
    expect(rows.map((r) => r.id)).toEqual(original);
  });

  it("keeps original relative order for equal keys (stable)", () => {
    const sorted = sortRows(rows, { field: "age", order: "asc" });
    expect(sorted.map((r) => r.id)).toEqual(["2", "3", "1"]);
  });

  it("uses a custom compare when provided", () => {
    const sorted = sortRows(rows, { field: "name", order: "asc" }, {
      compare: (a, b) => String(a).length - String(b).length,
    });
    expect(sorted.map((r) => r.name)).toEqual(["Bob", "Alice", "Charlie"]);
  });

  it("recursively sorts tree siblings when childrenField is set", () => {
    const tree = [
      {
        id: "p2",
        name: "Parent B",
        children: [
          { id: "c2", name: "Zed" },
          { id: "c1", name: "Amy" },
        ],
      },
      { id: "p1", name: "Parent A", children: [] },
    ];
    const sorted = sortRows(tree, { field: "name", order: "asc" }, {
      childrenField: "children",
    });
    expect(sorted.map((r) => r.id)).toEqual(["p1", "p2"]);
    expect((sorted[1]!.children as { id: string }[]).map((c) => c.id)).toEqual([
      "c1",
      "c2",
    ]);
    expect((tree[0]!.children as { id: string }[]).map((c) => c.id)).toEqual([
      "c2",
      "c1",
    ]);
  });
});
