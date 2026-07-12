import type { PageSliceInput, PageSliceResult } from "./types";

export function normalizePageSlice(input: PageSliceInput): PageSliceResult {
  const pageSize = Math.max(1, Math.floor(input.pageSize) || 1);
  const total = Math.max(0, Math.floor(input.total) || 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  let pageIndex = Math.floor(input.pageIndex) || 1;
  if (pageIndex < 1) pageIndex = 1;
  if (pageIndex > pageCount) pageIndex = pageCount;
  const start = (pageIndex - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  return { pageIndex, pageSize, total, pageCount, start, end };
}

export function slicePage<T>(
  rows: readonly T[],
  input: PageSliceInput,
): T[] {
  const slice = normalizePageSlice({
    ...input,
    total: input.total >= 0 ? input.total : rows.length,
  });
  return rows.slice(slice.start, slice.end);
}
