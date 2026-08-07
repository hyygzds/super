import type { VirtualWindowInput, VirtualWindowResult } from "./types";

function resolveHeight(
  index: number,
  rowHeight: number,
  rowHeights?: Array<number | undefined>,
): number {
  const h = rowHeights?.[index];
  if (typeof h === "number" && Number.isFinite(h) && h > 0) return h;
  return Math.max(rowHeight, 1);
}

/** prefix[i] = sum of heights of rows [0, i) */
function buildPrefix(
  rowCount: number,
  rowHeight: number,
  rowHeights?: Array<number | undefined>,
): number[] {
  const prefix = new Array<number>(rowCount + 1);
  prefix[0] = 0;
  for (let i = 0; i < rowCount; i++) {
    prefix[i + 1] = prefix[i]! + resolveHeight(i, rowHeight, rowHeights);
  }
  return prefix;
}

/** Largest i in [0, rowCount) such that prefix[i] <= scrollTop; 0 if none. */
function findStartIndex(prefix: number[], scrollTop: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  let lo = 0;
  let hi = rowCount - 1;
  let ans = 0;
  const top = Math.max(0, scrollTop);
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (prefix[mid]! <= top) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function computeVariableWindow(input: VirtualWindowInput): VirtualWindowResult {
  const { rowCount, rowHeight, rowHeights, scrollTop, viewportHeight, overscan } =
    input;
  const prefix = buildPrefix(rowCount, rowHeight, rowHeights);
  const totalHeight = prefix[rowCount]!;

  if (!input.enabled) {
    return {
      startIndex: 0,
      endIndex: rowCount,
      offsetY: 0,
      totalHeight,
      visibleCount: rowCount,
    };
  }

  const rawStart = findStartIndex(prefix, scrollTop, rowCount);
  const startIndex = Math.max(0, rawStart - overscan);

  const targetBottom = Math.max(0, scrollTop) + Math.max(0, viewportHeight);
  let endIndex = rawStart;
  while (endIndex < rowCount && prefix[endIndex]! < targetBottom) {
    endIndex += 1;
  }
  endIndex = Math.min(rowCount, endIndex + overscan);

  return {
    startIndex,
    endIndex,
    offsetY: prefix[startIndex]!,
    totalHeight,
    visibleCount: Math.max(0, endIndex - startIndex),
  };
}

function computeFixedWindow(input: VirtualWindowInput): VirtualWindowResult {
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
  const rawStart = Math.min(
    Math.max(0, Math.floor(scrollTop / safeHeight)),
    Math.max(0, rowCount - 1),
  );
  const visible = Math.ceil(viewportHeight / safeHeight);
  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(rowCount, rawStart + visible + overscan);
  const offsetY = startIndex * safeHeight;

  return {
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    visibleCount: Math.max(0, endIndex - startIndex),
  };
}

export function computeVirtualWindow(
  input: VirtualWindowInput,
): VirtualWindowResult {
  if (input.rowCount <= 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      offsetY: 0,
      totalHeight: 0,
      visibleCount: 0,
    };
  }

  if (input.rowHeights !== undefined) {
    return computeVariableWindow(input);
  }
  return computeFixedWindow(input);
}
