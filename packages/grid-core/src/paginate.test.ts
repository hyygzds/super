import { describe, expect, it } from "vitest";
import { normalizePageSlice, slicePage } from "./paginate";

describe("normalizePageSlice", () => {
  it("clamps pageIndex into [1, pageCount]", () => {
    expect(
      normalizePageSlice({ pageIndex: 0, pageSize: 10, total: 25 }),
    ).toMatchObject({ pageIndex: 1, pageCount: 3, start: 0, end: 10 });

    expect(
      normalizePageSlice({ pageIndex: 99, pageSize: 10, total: 25 }),
    ).toMatchObject({ pageIndex: 3, pageCount: 3, start: 20, end: 25 });
  });

  it("handles total 0 as pageCount 1 and empty range", () => {
    expect(
      normalizePageSlice({ pageIndex: 1, pageSize: 10, total: 0 }),
    ).toEqual({
      pageIndex: 1,
      pageSize: 10,
      total: 0,
      pageCount: 1,
      start: 0,
      end: 0,
    });
  });
});

describe("slicePage", () => {
  it("returns the current page items", () => {
    const rows = [1, 2, 3, 4, 5, 6, 7];
    expect(slicePage(rows, { pageIndex: 2, pageSize: 3, total: rows.length })).toEqual([
      4, 5, 6,
    ]);
  });
});
