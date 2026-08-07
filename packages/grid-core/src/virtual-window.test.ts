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

  it("uses per-row heights with prefix sums when rowHeights is provided", () => {
    // heights: 10,20,30,40,50 → prefix 0,10,30,60,100,150
    const rowHeights = [10, 20, 30, 40, 50];
    const result = computeVirtualWindow({
      enabled: true,
      rowCount: 5,
      rowHeight: 30,
      rowHeights,
      scrollTop: 30,
      viewportHeight: 50,
      overscan: 1,
    });
    // rawStart at prefix<=30 → index 2 (prefix[2]=30); overscan → start 1
    // cover to scrollTop+viewport=80 → end before overscan at least 4; +overscan → 5
    expect(result.startIndex).toBe(1);
    expect(result.offsetY).toBe(10);
    expect(result.totalHeight).toBe(150);
    expect(result.endIndex).toBe(5);
    expect(result.visibleCount).toBe(4);
  });

  it("falls back to rowHeight for undefined rowHeights entries", () => {
    const result = computeVirtualWindow({
      enabled: true,
      rowCount: 4,
      rowHeight: 40,
      rowHeights: [20, undefined, 20, undefined],
      scrollTop: 0,
      viewportHeight: 60,
      overscan: 0,
    });
    // heights 20,40,20,40 → total 120
    expect(result.totalHeight).toBe(120);
    expect(result.startIndex).toBe(0);
    // cover 60 → rows 0 (20) + 1 (40) = 60 → endIndex 2
    expect(result.endIndex).toBe(2);
  });

  it("clamps variable-height window at edges", () => {
    const rowHeights = [50, 50, 50];
    const top = computeVirtualWindow({
      enabled: true,
      rowCount: 3,
      rowHeight: 50,
      rowHeights,
      scrollTop: 0,
      viewportHeight: 200,
      overscan: 2,
    });
    expect(top.startIndex).toBe(0);
    expect(top.endIndex).toBe(3);

    const bottom = computeVirtualWindow({
      enabled: true,
      rowCount: 3,
      rowHeight: 50,
      rowHeights,
      scrollTop: 10_000,
      viewportHeight: 50,
      overscan: 1,
    });
    expect(bottom.endIndex).toBe(3);
    expect(bottom.startIndex).toBeLessThan(bottom.endIndex);
  });
});
