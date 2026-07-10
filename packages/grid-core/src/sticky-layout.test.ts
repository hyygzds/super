import { describe, expect, it } from "vitest";
import { computeStickyLayout } from "./sticky-layout";

describe("computeStickyLayout", () => {
  it("orders left, scrollable, then right and computes offsets", () => {
    const layout = computeStickyLayout({
      columns: [
        { field: "a", title: "A", width: 100, fixed: "left" },
        { field: "b", title: "B", width: 110 },
        { field: "c", title: "C", width: 120, fixed: "right" },
        { field: "d", title: "D", width: 130, fixed: "left" },
      ],
      showSelection: true,
      showRowNumber: true,
    });

    expect(layout.dataFields).toEqual(["a", "d", "b", "c"]);
    expect(layout.selection?.left).toBe(0);
    expect(layout.rowNumber?.left).toBe(48);
    expect(layout.byField.a).toEqual({
      sticky: "left",
      offset: 48 + 56,
      isEdge: false,
    });
    expect(layout.byField.d).toEqual({
      sticky: "left",
      offset: 48 + 56 + 100,
      isEdge: true,
    });
    expect(layout.byField.b).toEqual({ sticky: false });
    expect(layout.byField.c).toEqual({
      sticky: "right",
      offset: 0,
      isEdge: true,
    });
  });

  it("skips hidden columns", () => {
    const layout = computeStickyLayout({
      columns: [
        { field: "a", title: "A", width: 100, fixed: "left", hidden: true },
        { field: "b", title: "B", width: 110, fixed: "left" },
      ],
      showSelection: false,
      showRowNumber: false,
    });
    expect(layout.dataFields).toEqual(["b"]);
    expect(layout.byField.b).toMatchObject({ sticky: "left", offset: 0 });
    expect(layout.byField.a).toBeUndefined();
  });

  it("supports selection-only left sticky", () => {
    const layout = computeStickyLayout({
      columns: [{ field: "a", title: "A", width: 100 }],
      showSelection: true,
      showRowNumber: false,
    });
    expect(layout.selection?.left).toBe(0);
    expect(layout.rowNumber).toBeUndefined();
    expect(layout.byField.a).toEqual({ sticky: false });
  });
});
