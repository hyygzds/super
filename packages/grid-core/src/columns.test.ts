import { describe, expect, it } from "vitest";
import { buildHeaderRows, flattenLeafColumns } from "./columns";
import type { GridColumn } from "./types";

const nested: GridColumn[] = [
  {
    field: "info",
    title: "信息",
    children: [
      { field: "id", title: "标识", width: 80 },
      { field: "name", title: "名称", width: 120 },
    ],
  },
  { field: "status", title: "状态", width: 90 },
];

describe("flattenLeafColumns", () => {
  it("returns depth-first leaves and skips hidden", () => {
    const cols: GridColumn[] = [
      ...nested,
      {
        field: "hiddenGroup",
        title: "隐",
        hidden: true,
        children: [{ field: "x", title: "X" }],
      },
    ];
    expect(flattenLeafColumns(cols).map((c) => c.field)).toEqual([
      "id",
      "name",
      "status",
    ]);
  });
});

describe("buildHeaderRows", () => {
  it("builds parent colspan and leaf rowspan", () => {
    const rows = buildHeaderRows(nested);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual([
      { title: "信息", colspan: 2, rowspan: 1 },
      { title: "状态", colspan: 1, rowspan: 2, column: nested[1] },
    ]);
    expect(rows[1]?.map((c) => ({ title: c.title, colspan: c.colspan }))).toEqual([
      { title: "标识", colspan: 1 },
      { title: "名称", colspan: 1 },
    ]);
    expect(rows[1]?.[0]?.rowspan).toBe(1);
    expect(rows[1]?.[0]?.column?.field).toBe("id");
  });
});
