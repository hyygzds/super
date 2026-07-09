import { describe, expect, it } from "vitest";
import { computeVirtualWindow } from "./virtual-window";

describe("computeVirtualWindow", () => {
  it("returns full range when virtualization is disabled", () => {
    const result = computeVirtualWindow({
      enabled: false,
      rowCount: 100,
      rowHeight: 30,
      scrollTop: 0,
      viewportHeight: 300,
      overscan: 2,
    });
    expect(result).toEqual({
      startIndex: 0,
      endIndex: 100,
      offsetY: 0,
      totalHeight: 3000,
      visibleCount: 100,
    });
  });

  it("computes start/end with overscan for fixed row height", () => {
    const result = computeVirtualWindow({
      enabled: true,
      rowCount: 1000,
      rowHeight: 30,
      scrollTop: 300,
      viewportHeight: 300,
      overscan: 2,
    });
    // scrollTop 300 → row 10; overscan 2 → start 8
    // visible ≈ ceil(300/30)=10 → end exclusive 8+10+2*2 = 22 (clamped)
    expect(result.startIndex).toBe(8);
    expect(result.endIndex).toBe(22);
    expect(result.offsetY).toBe(8 * 30);
    expect(result.totalHeight).toBe(1000 * 30);
    expect(result.visibleCount).toBe(14);
  });

  it("clamps start at 0 and end at rowCount", () => {
    const top = computeVirtualWindow({
      enabled: true,
      rowCount: 5,
      rowHeight: 30,
      scrollTop: 0,
      viewportHeight: 300,
      overscan: 2,
    });
    expect(top.startIndex).toBe(0);
    expect(top.endIndex).toBe(5);

    const bottom = computeVirtualWindow({
      enabled: true,
      rowCount: 20,
      rowHeight: 30,
      scrollTop: 10_000,
      viewportHeight: 300,
      overscan: 2,
    });
    expect(bottom.endIndex).toBe(20);
    expect(bottom.startIndex).toBeLessThan(bottom.endIndex);
  });

  it("handles empty data", () => {
    const result = computeVirtualWindow({
      enabled: true,
      rowCount: 0,
      rowHeight: 30,
      scrollTop: 0,
      viewportHeight: 300,
      overscan: 2,
    });
    expect(result).toEqual({
      startIndex: 0,
      endIndex: 0,
      offsetY: 0,
      totalHeight: 0,
      visibleCount: 0,
    });
  });
});
