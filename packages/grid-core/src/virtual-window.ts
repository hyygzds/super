import type { VirtualWindowInput, VirtualWindowResult } from "./types";

export function computeVirtualWindow(
  input: VirtualWindowInput,
): VirtualWindowResult {
  const { enabled, rowCount, rowHeight, scrollTop, viewportHeight, overscan } =
    input;
  const totalHeight = rowCount * rowHeight;

  if (rowCount <= 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      offsetY: 0,
      totalHeight: 0,
      visibleCount: 0,
    };
  }

  if (!enabled) {
    return {
      startIndex: 0,
      endIndex: rowCount,
      offsetY: 0,
      totalHeight,
      visibleCount: rowCount,
    };
  }

  const safeHeight = Math.max(rowHeight, 1);
  const rawStart = Math.floor(scrollTop / safeHeight);
  const visible = Math.ceil(viewportHeight / safeHeight);
  let startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(rowCount, rawStart + visible + overscan);
  // When scrollTop exceeds the list, realign startIndex so it stays below endIndex.
  if (startIndex >= endIndex) {
    startIndex = Math.max(0, endIndex - visible - overscan);
  }
  const offsetY = startIndex * safeHeight;

  return {
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    visibleCount: Math.max(0, endIndex - startIndex),
  };
}
