import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  compareIsoDate,
  formatIsoDate,
  isIsoDateInRange,
  parseIsoDate,
  shiftMonth,
} from "./date";

describe("date helpers", () => {
  it("parses and formats valid ISO dates", () => {
    expect(parseIsoDate("2026-09-12")).toEqual({
      year: 2026,
      month: 9,
      day: 12,
    });
    expect(formatIsoDate(2026, 9, 12)).toBe("2026-09-12");
  });

  it("rejects invalid ISO dates", () => {
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("2026-2-1")).toBeNull();
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("not-a-date")).toBeNull();
  });

  it("builds a Monday-start 6x7 grid for September 2026", () => {
    const cells = buildMonthGrid(2026, 9);
    expect(cells).toHaveLength(42);
    expect(cells[0]).toEqual({
      iso: "2026-08-31",
      day: 31,
      inCurrentMonth: false,
    });
    expect(cells[1]).toEqual({
      iso: "2026-09-01",
      day: 1,
      inCurrentMonth: true,
    });
    expect(cells.find((cell) => cell.iso === "2026-09-12")).toEqual({
      iso: "2026-09-12",
      day: 12,
      inCurrentMonth: true,
    });
    expect(cells[41]?.iso).toBe("2026-10-11");
  });

  it("shifts months across years", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2025, 12, 1)).toEqual({ year: 2026, month: 1 });
  });

  it("compares ISO dates and checks inclusive range", () => {
    expect(compareIsoDate("2026-09-12", "2026-09-13")).toBeLessThan(0);
    expect(isIsoDateInRange("2026-09-12", "2026-09-01", "2026-09-30")).toBe(
      true,
    );
    expect(isIsoDateInRange("2026-08-31", "2026-09-01", "2026-09-30")).toBe(
      false,
    );
    expect(isIsoDateInRange("2026-09-01", "2026-09-01", undefined)).toBe(true);
  });
});
