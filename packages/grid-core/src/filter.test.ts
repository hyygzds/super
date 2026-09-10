import { describe, expect, it } from "vitest";
import {
  activeFilterEntries,
  cellContains,
  filterRows,
  setFilterValue,
} from "./filter";
import type { FilterState } from "./types";

describe("cellContains", () => {
  it("matches case-insensitively and treats blank query as pass", () => {
    expect(cellContains("Alice", "ali")).toBe(true);
    expect(cellContains("Alice", "ALICE")).toBe(true);
    expect(cellContains("Alice", "bob")).toBe(false);
    expect(cellContains("Alice", "   ")).toBe(true);
    expect(cellContains("Alice", "")).toBe(true);
  });

  it("does not match null or undefined against a real query", () => {
    expect(cellContains(null, "a")).toBe(false);
    expect(cellContains(undefined, "a")).toBe(false);
    expect(cellContains(20, "2")).toBe(true);
  });
});

describe("setFilterValue / activeFilterEntries", () => {
  it("writes a field and removes it when cleared", () => {
    const next = setFilterValue(undefined, "name", "Al");
    expect(next).toEqual({ name: "Al" });
    expect(setFilterValue(next, "name", "")).toEqual({});
    expect(activeFilterEntries({ name: "Al", city: "  " })).toEqual([
      ["name", "Al"],
    ]);
  });
});

describe("filterRows", () => {
  const rows = [
    { id: "1", name: "Charlie", city: "Paris" },
    { id: "2", name: "Alice", city: "London" },
    { id: "3", name: "Bob", city: "Paris" },
  ];

  it("returns the same array reference when no filter is active", () => {
    expect(filterRows(rows, null)).toBe(rows);
    expect(filterRows(rows, {})).toBe(rows);
    expect(filterRows(rows, { name: "  " })).toBe(rows);
  });

  it("filters by contains and ANDs multiple fields without mutating input", () => {
    const original = rows.map((r) => r.id);
    expect(
      filterRows(rows, { name: "a" }).map((r) => r.name),
    ).toEqual(["Charlie", "Alice"]);
    expect(
      filterRows(rows, { name: "a", city: "paris" }).map((r) => r.id),
    ).toEqual(["1"]);
    expect(rows.map((r) => r.id)).toEqual(original);
  });

  it("uses a custom predicate when provided", () => {
    const predicates = {
      name: (value: unknown) => String(value).length === 3,
    };
    expect(
      filterRows(rows, { name: "ignored" }, { predicates }).map((r) => r.name),
    ).toEqual(["Bob"]);
  });

  it("keeps ancestors of matching tree nodes and drops unmatched siblings", () => {
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
    const filtered = filterRows(tree, { name: "amy" }, { childrenField: "children" });
    expect(filtered.map((r) => r.id)).toEqual(["p2"]);
    expect((filtered[0]!.children as { id: string }[]).map((c) => c.id)).toEqual([
      "c1",
    ]);
    expect((tree[0]!.children as { id: string }[]).map((c) => c.id)).toEqual([
      "c2",
      "c1",
    ]);
  });
});

describe("FilterState typing smoke", () => {
  it("accepts a record of field queries", () => {
    const filters: FilterState = { name: "Al" };
    expect(activeFilterEntries(filters)).toHaveLength(1);
  });
});
