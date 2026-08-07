import { describe, expect, it } from "vitest";
import { buildGroupedRows } from "./group";
import { normalizeSpans } from "./span";
import type { GridColumn } from "./types";

const columns: GridColumn[] = [
  { field: "a", title: "A" },
  { field: "b", title: "B" },
];

describe("normalizeSpans", () => {
  it("applies colspan and marks covered cells", () => {
    const displayRows = buildGroupedRows([
      { a: "1", b: "x" },
      { a: "2", b: "y" },
    ]);
    const spans = normalizeSpans({
      displayRows,
      columns,
      spanMethod: ({ columnIndex, rowIndex }) =>
        rowIndex === 0 && columnIndex === 0 ? { colspan: 2 } : undefined,
    });
    expect(spans[0]![0]).toEqual({ rowspan: 1, colspan: 2 });
    expect(spans[0]![1]).toEqual({ rowspan: 0, colspan: 0 });
    expect(spans[1]![0]).toEqual({ rowspan: 1, colspan: 1 });
  });

  it("does not let rowspan cross group headers", () => {
    const displayRows = buildGroupedRows(
      [
        { dept: "A", a: "1", b: "x" },
        { dept: "B", a: "2", b: "y" },
      ],
      "dept",
    );
    // indices: 0 group A, 1 data, 2 group B, 3 data
    const spans = normalizeSpans({
      displayRows,
      columns,
      spanMethod: ({ rowIndex, columnIndex }) =>
        rowIndex === 1 && columnIndex === 0 ? { rowspan: 3 } : undefined,
    });
    expect(spans[1]![0]?.rowspan).toBe(1);
    expect(spans[2]![0]).toEqual({ rowspan: 0, colspan: 0 });
  });
});
