import { normalizePageSlice } from "@component-ai/grid-core";
import { useState } from "react";

export type PaginationProps = {
  total: number;
  page?: number;
  defaultPage?: number;
  pageSize?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
  totalLabel?: (total: number) => string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

function getPageItems(
  page: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(pageCount - 1, page + 1);
  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

export function Pagination({
  total,
  page: pageProp,
  defaultPage = 1,
  pageSize: pageSizeProp,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
  className = "",
  totalLabel = (t) => `共 ${t} 条`,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
  const [uncontrolledSize, setUncontrolledSize] = useState(defaultPageSize);

  const pageSize = pageSizeProp ?? uncontrolledSize;
  const slice = normalizePageSlice({
    pageIndex: pageProp ?? uncontrolledPage,
    pageSize,
    total,
  });
  const page = slice.pageIndex;
  const pageCount = slice.pageCount;

  function setPage(next: number) {
    const normalized = normalizePageSlice({
      pageIndex: next,
      pageSize,
      total,
    }).pageIndex;
    if (pageProp === undefined) setUncontrolledPage(normalized);
    onPageChange?.(normalized);
  }

  function setPageSize(next: number) {
    if (pageSizeProp === undefined) setUncontrolledSize(next);
    onPageSizeChange?.(next);
    if (pageProp === undefined) setUncontrolledPage(1);
    onPageChange?.(1);
  }

  const items = getPageItems(page, pageCount);
  const navClass =
    "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm text-slate-800";
  const btnBase =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 disabled:pointer-events-none disabled:opacity-40 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
  const currentClass = "bg-sky-600 text-white hover:bg-sky-600";

  return (
    <nav
      className={`${navClass} ${className}`.trim()}
      aria-label="分页"
      data-disabled={disabled || undefined}
    >
      <span className="px-2 text-slate-600">{totalLabel(total)}</span>
      <button
        type="button"
        className={btnBase}
        disabled={disabled || page <= 1}
        aria-label="上一页"
        onClick={() => setPage(page - 1)}
      >
        上一页
      </button>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-slate-400" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={`${btnBase} ${item === page ? currentClass : ""}`}
            aria-label={String(item)}
            aria-current={item === page ? "page" : undefined}
            disabled={disabled}
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className={btnBase}
        disabled={disabled || page >= pageCount}
        aria-label="下一页"
        onClick={() => setPage(page + 1)}
      >
        下一页
      </button>
      <label className="ml-2 flex items-center gap-1 px-1 text-slate-600">
        <span>每页</span>
        <select
          aria-label="每页条数"
          className="rounded-md border border-slate-300 bg-white px-2 py-1"
          disabled={disabled}
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
