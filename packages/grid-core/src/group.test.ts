import { describe, expect, it } from "vitest";
import { buildGroupedRows } from "./group";

const data = [
  { id: "1", dept: "A", name: "n1" },
  { id: "2", dept: "B", name: "n2" },
  { id: "3", dept: "A", name: "n3" },
];

describe("buildGroupedRows", () => {
  it("returns plain data rows when groupBy is omitted", () => {
    const rows = buildGroupedRows(data);
    expect(rows).toEqual([
      { kind: "data", row: data[0], dataIndex: 0 },
      { kind: "data", row: data[1], dataIndex: 1 },
      { kind: "data", row: data[2], dataIndex: 2 },
    ]);
  });

  it("groups by a single field preserving first-seen order", () => {
    const rows = buildGroupedRows(data, "dept");
    expect(rows.map((r) => r.kind)).toEqual([
      "group",
      "data",
      "data",
      "group",
      "data",
    ]);
    expect(rows[0]).toMatchObject({ kind: "group", label: "A", count: 2 });
    expect(rows[3]).toMatchObject({ kind: "group", label: "B", count: 1 });
  });

  it("supports multi-field groupBy", () => {
    const multi = [
      { id: "1", dept: "A", city: "BJ" },
      { id: "2", dept: "A", city: "SH" },
      { id: "3", dept: "A", city: "BJ" },
    ];
    const rows = buildGroupedRows(multi, ["dept", "city"]);
    const groups = rows.filter((r) => r.kind === "group");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ label: "A / BJ", count: 2 });
    expect(groups[1]).toMatchObject({ label: "A / SH", count: 1 });
  });
});
