import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  compareIsoDate,
  daysInMonth,
  formatIsoDate,
  isIsoDateInRange,
  isValidIsoDate,
  parseIsoDate,
  todayIso,
  visibleMonthFromValue,
} from "./date-calendar";

describe("date-calendar", () => {
  it("parses and formats valid ISO dates", () => {
    expect(parseIsoDate("2026-03-15")).toEqual({ y: 2026, m: 3, d: 15 });
    expect(formatIsoDate({ y: 2026, m: 3, d: 15 })).toBe("2026-03-15");
    expect(isValidIsoDate("2026-03-15")).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseIsoDate("2026-2-1")).toBeNull();
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(isValidIsoDate("not-a-date")).toBe(false);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it("builds a 42-cell Sunday-start grid for January 2026", () => {
    const cells = buildMonthGrid(2026, 1);
    expect(cells).toHaveLength(42);
    expect(cells[0]).toMatchObject({
      iso: "2025-12-28",
      day: 28,
      inCurrentMonth: false,
    });
    expect(cells[4]).toMatchObject({
      iso: "2026-01-01",
      day: 1,
      inCurrentMonth: true,
    });
    expect(cells[41].iso).toBe("2026-02-07");
  });

  it("marks cells outside min/max as disabled", () => {
    const cells = buildMonthGrid(2026, 3, {
      min: "2026-03-10",
      max: "2026-03-20",
    });
    expect(cells.find((c) => c.iso === "2026-03-09")?.disabled).toBe(true);
    expect(cells.find((c) => c.iso === "2026-03-10")?.disabled).toBe(false);
    expect(cells.find((c) => c.iso === "2026-03-21")?.disabled).toBe(true);
  });

  it("compares and clamps ISO dates in range", () => {
    expect(compareIsoDate("2026-01-02", "2026-01-01")).toBe(1);
    expect(isIsoDateInRange("2026-03-15", "2026-03-10", "2026-03-20")).toBe(
      true,
    );
    expect(isIsoDateInRange("2026-03-09", "2026-03-10")).toBe(false);
  });

  it("adds months across year boundaries and clamps the day", () => {
    expect(addMonths({ y: 2026, m: 1, d: 31 }, 1)).toEqual({
      y: 2026,
      m: 2,
      d: 28,
    });
    expect(addMonths({ y: 2025, m: 12, d: 15 }, 1)).toEqual({
      y: 2026,
      m: 1,
      d: 15,
    });
  });

  it("derives visible month from value or today", () => {
    expect(visibleMonthFromValue("2024-07-04")).toEqual({ y: 2024, m: 7 });
    expect(todayIso(new Date(2026, 8, 12))).toBe("2026-09-12");
    expect(visibleMonthFromValue("", new Date(2026, 8, 12))).toEqual({
      y: 2026,
      m: 9,
    });
  });
});
