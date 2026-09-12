import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  formatIsoDate,
  parseIsoDate,
} from "./date";

describe("date helpers", () => {
  it("parses and formats local ISO dates", () => {
    expect(parseIsoDate("2026-09-12")?.getFullYear()).toBe(2026);
    expect(parseIsoDate("2026-09-12")?.getMonth()).toBe(8);
    expect(parseIsoDate("2026-09-12")?.getDate()).toBe(12);
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("nope")).toBeNull();
    expect(formatIsoDate(new Date(2026, 8, 12))).toBe("2026-09-12");
  });

  it("builds a Monday-start September 2026 grid", () => {
    const grid = buildMonthGrid(2026, 9);
    expect(grid.year).toBe(2026);
    expect(grid.month).toBe(9);
    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks[0]).toHaveLength(7);
    expect(grid.weeks[0][0]).toMatchObject({
      iso: "2026-08-31",
      day: 31,
      inMonth: false,
      disabled: false,
    });
    expect(grid.weeks[0][1]).toMatchObject({
      iso: "2026-09-01",
      day: 1,
      inMonth: true,
    });
  });

  it("disables cells outside min/max and adds months across years", () => {
    const grid = buildMonthGrid(2026, 9, {
      minDate: "2026-09-10",
      maxDate: "2026-09-20",
    });
    const flat = grid.weeks.flat();
    expect(flat.find((c) => c.iso === "2026-09-09")?.disabled).toBe(true);
    expect(flat.find((c) => c.iso === "2026-09-10")?.disabled).toBe(false);
    expect(flat.find((c) => c.iso === "2026-09-21")?.disabled).toBe(true);
    expect(formatIsoDate(addMonths(new Date(2026, 11, 15), 1))).toBe(
      "2027-01-15",
    );
  });
});
