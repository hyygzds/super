import {
  clearKeys,
  computeVirtualWindow,
  isAllSelected,
  isIndeterminate,
  selectAllKeys,
  slicePage,
  toggleKey,
  type GridColumn,
} from "@component-ai/grid-core";
import { Checkbox } from "./Checkbox";
import { Pagination } from "./Pagination";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

function isNodeDevelopment(): boolean {
  const proc = (
    globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }
  ).process;
  return proc?.env?.NODE_ENV === "development";
}

export type VirtualGridColumn<T = Record<string, unknown>> = GridColumn & {
  render?: (ctx: {
    row: T;
    column: VirtualGridColumn<T>;
    rowIndex: number;
  }) => ReactNode;
  renderHeader?: (column: VirtualGridColumn<T>) => ReactNode;
};

export type VirtualGridProps<T = Record<string, unknown>> = {
  data: T[];
  columns: VirtualGridColumn<T>[];
  idField?: string;
  showHeader?: boolean;
  bordered?: boolean;
  stripe?: boolean;
  showRowNumber?: boolean;
  rowHeight?: number;
  enableVirtual?: boolean;
  className?: string;
  emptyText?: string;
  renderCell?: (ctx: {
    row: T;
    column: VirtualGridColumn<T>;
    rowIndex: number;
  }) => ReactNode;
  renderHeader?: (column: VirtualGridColumn<T>) => ReactNode;
  onRowClick?: (row: T, rowIndex: number, event: MouseEvent) => void;
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  pagination?: boolean;
  paginationMode?: "local" | "remote";
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  defaultPageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  total?: number;
  pageSizeOptions?: number[];
};

function getVisibleColumns<T>(
  columns: VirtualGridColumn<T>[],
): VirtualGridColumn<T>[] {
  return columns.filter((col) => {
    if (col.children?.length && isNodeDevelopment()) {
      console.warn(
        `[VirtualGrid] column "${col.field}" has children; P0 ignores nested headers`,
      );
    }
    return !col.hidden;
  });
}

function rowKey<T extends Record<string, unknown>>(
  row: T,
  index: number,
  idField: string,
): string {
  const raw = row[idField];
  if (raw === undefined || raw === null || raw === "") {
    if (isNodeDevelopment()) {
      console.warn(`[VirtualGrid] missing idField "${idField}" at row ${index}`);
    }
    return `row-${index}`;
  }
  return String(raw);
}

export function VirtualGrid<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  data,
  columns,
  idField = "id",
  showHeader = true,
  bordered = true,
  stripe = false,
  showRowNumber = true,
  rowHeight = 36,
  enableVirtual = false,
  className = "",
  emptyText = "暂无数据",
  renderCell,
  renderHeader,
  onRowClick,
  selectionMode = "none",
  selectedKeys: selectedKeysProp,
  defaultSelectedKeys = [],
  onSelectedKeysChange,
  pagination = false,
  paginationMode = "local",
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  pageSize: pageSizeProp,
  defaultPageSize = 10,
  onPageSizeChange,
  total: totalProp,
  pageSizeOptions,
}: VirtualGridProps<T>) {
  const visibleColumns = useMemo(() => getVisibleColumns(columns), [columns]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [innerKeys, setInnerKeys] = useState(defaultSelectedKeys);
  const [innerPage, setInnerPage] = useState(defaultPage);
  const [innerSize, setInnerSize] = useState(defaultPageSize);

  const selectedKeys = selectedKeysProp !== undefined ? selectedKeysProp : innerKeys;
  const page = pageProp !== undefined ? pageProp : innerPage;
  const pageSize = pageSizeProp !== undefined ? pageSizeProp : innerSize;

  const showSelection = selectionMode !== "none";
  const multiple = selectionMode === "multiple";

  const paginationTotal =
    pagination && paginationMode === "remote"
      ? (totalProp ?? data.length)
      : data.length;

  const measure = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
  }, []);

  useEffect(() => {
    measure();
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (
      pagination &&
      paginationMode === "remote" &&
      totalProp === undefined &&
      isNodeDevelopment()
    ) {
      console.warn(
        "[VirtualGrid] paginationMode=remote without `total`; falling back to data.length",
      );
    }
  }, [pagination, paginationMode, totalProp, data.length]);

  const pageRows = useMemo(() => {
    if (!pagination) return data;
    if (paginationMode === "remote") return data;
    return slicePage(data, {
      pageIndex: page,
      pageSize,
      total: data.length,
    });
  }, [pagination, paginationMode, data, page, pageSize]);

  const scopeKeys = useMemo(
    () => data.map((row, index) => rowKey(row, index, idField)),
    [data, idField],
  );
  const scopeKeySet = useMemo(() => new Set(scopeKeys), [scopeKeys]);
  const scopedSelectedKeys = useMemo(
    () => selectedKeys.filter((k) => scopeKeySet.has(k)),
    [selectedKeys, scopeKeySet],
  );
  const headerChecked = isAllSelected(selectedKeys, scopeKeys);
  const headerIndeterminate = isIndeterminate(scopedSelectedKeys, scopeKeys);

  function setSelectedKeys(next: string[]) {
    if (selectedKeysProp === undefined) setInnerKeys(next);
    onSelectedKeysChange?.(next);
  }

  function setPage(next: number) {
    if (pageProp === undefined) setInnerPage(next);
    onPageChange?.(next);
  }

  function setPageSize(next: number) {
    if (pageSizeProp === undefined) setInnerSize(next);
    onPageSizeChange?.(next);
  }

  function onToggleRow(key: string) {
    setSelectedKeys(toggleKey(selectedKeys, key, multiple));
  }

  function onToggleAll() {
    if (headerChecked || headerIndeterminate) {
      setSelectedKeys(clearKeys());
    } else {
      setSelectedKeys(selectAllKeys(scopeKeys));
    }
  }

  const windowResult = useMemo(
    () =>
      computeVirtualWindow({
        enabled: enableVirtual,
        rowCount: pageRows.length,
        rowHeight,
        scrollTop,
        viewportHeight: Math.max(viewportHeight, 1),
        overscan: 2,
      }),
    [enableVirtual, pageRows.length, rowHeight, scrollTop, viewportHeight],
  );

  const start = windowResult.startIndex;
  const end = windowResult.endIndex;
  const slice = pageRows.slice(start, end);

  function cellContent(row: T, column: VirtualGridColumn<T>, rowIndex: number) {
    if (column.render) return column.render({ row, column, rowIndex });
    if (renderCell) return renderCell({ row, column, rowIndex });
    const v = row[column.field as keyof T];
    return v == null ? "" : String(v);
  }

  function headerContent(column: VirtualGridColumn<T>) {
    if (column.renderHeader) return column.renderHeader(column);
    if (renderHeader) return renderHeader(column);
    return column.title;
  }

  const borderCls = bordered ? "border border-slate-200" : "border-0";
  const gridCls =
    `flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-white text-sm text-slate-900 ${borderCls} ${className}`.trim();
  const outerCls =
    `flex h-full min-h-0 w-full flex-col text-sm text-slate-900 ${className}`.trim();
  const cardCls =
    `flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white ${borderCls}`.trim();

  return (
    <div
      data-testid="virtual-grid"
      className={pagination ? outerCls : gridCls}
      role={pagination ? undefined : "grid"}
    >
      <div
        className={pagination ? cardCls : "contents"}
        role={pagination ? "grid" : undefined}
      >
        {showHeader ? (
          <div
            className="flex shrink-0 border-b border-slate-200 bg-slate-50"
            role="row"
          >
            {showSelection ? (
              <div
                className="flex w-12 shrink-0 items-center justify-center border-r border-slate-200"
                role="columnheader"
                style={{ height: rowHeight }}
              >
                {multiple ? (
                  <Checkbox
                    aria-label="全选"
                    checked={headerChecked}
                    indeterminate={headerIndeterminate}
                    onCheckedChange={() => onToggleAll()}
                  />
                ) : null}
              </div>
            ) : null}
            {showRowNumber ? (
              <div
                className="flex w-14 shrink-0 items-center justify-center border-r border-slate-200 px-1 font-medium text-slate-600"
                style={{ height: rowHeight }}
                role="columnheader"
              >
                #
              </div>
            ) : null}
            {visibleColumns.map((col) => (
              <div
                key={col.field}
                className="flex shrink-0 items-center border-r border-slate-200 px-3 font-medium text-slate-700 last:border-r-0"
                style={{
                  width: col.width ?? 120,
                  height: rowHeight,
                }}
                role="columnheader"
              >
                {headerContent(col)}
              </div>
            ))}
          </div>
        ) : null}

        <div
          ref={bodyRef}
          data-testid="virtual-grid-body"
          className="relative min-h-0 flex-1 overflow-auto"
          onScroll={(e) => {
            setScrollTop(e.currentTarget.scrollTop);
            setViewportHeight(e.currentTarget.clientHeight);
          }}
        >
          {data.length === 0 ? (
            <div className="flex h-full min-h-24 items-center justify-center text-slate-500">
              {emptyText}
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{
                height: enableVirtual
                  ? windowResult.totalHeight
                  : pageRows.length * rowHeight,
              }}
            >
              <div
                className="absolute left-0 right-0"
                style={{
                  transform: enableVirtual
                    ? `translateY(${windowResult.offsetY}px)`
                    : undefined,
                  top: enableVirtual ? 0 : undefined,
                }}
              >
                {slice.map((row, i) => {
                  const rowIndex = start + i;
                  const key = rowKey(row, rowIndex, idField);
                  const displayIndex =
                    (pagination ? (page - 1) * pageSize : 0) + rowIndex + 1;
                  const zebra =
                    stripe && rowIndex % 2 === 1 ? "bg-slate-50" : "bg-white";
                  return (
                    <div
                      key={key}
                      role="row"
                      data-row-index={rowIndex}
                      className={`flex border-b border-slate-100 ${zebra} hover:bg-sky-50/60`}
                      style={{ height: rowHeight }}
                      onClick={(e) => onRowClick?.(row, rowIndex, e)}
                    >
                      {showSelection ? (
                        <div
                          className="flex w-12 shrink-0 items-center justify-center border-r border-slate-100"
                          role="gridcell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            aria-label={`选择行 ${key}`}
                            checked={selectedKeys.includes(key)}
                            onCheckedChange={() => onToggleRow(key)}
                          />
                        </div>
                      ) : null}
                      {showRowNumber ? (
                        <div
                          className="flex w-14 shrink-0 items-center justify-center border-r border-slate-100 text-slate-500"
                          role="gridcell"
                        >
                          {displayIndex}
                        </div>
                      ) : null}
                      {visibleColumns.map((col) => (
                        <div
                          key={col.field}
                          className="flex shrink-0 items-center overflow-hidden border-r border-slate-100 px-3 text-ellipsis whitespace-nowrap last:border-r-0"
                          style={{ width: col.width ?? 120 }}
                          role="gridcell"
                        >
                          {cellContent(row, col, rowIndex)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {pagination ? (
        <div data-testid="virtual-grid-pagination" className="mt-2 shrink-0">
          <Pagination
            total={paginationTotal}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : null}
    </div>
  );
}
