import {
  computeVirtualWindow,
  type GridColumn,
} from "@component-ai/grid-core";
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
}: VirtualGridProps<T>) {
  const visibleColumns = useMemo(() => getVisibleColumns(columns), [columns]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

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

  const windowResult = useMemo(() => {
    return computeVirtualWindow({
      enabled: enableVirtual,
      rowCount: data.length,
      rowHeight,
      scrollTop,
      viewportHeight: Math.max(viewportHeight, 1),
      overscan: 2,
    });
  }, [enableVirtual, data.length, rowHeight, scrollTop, viewportHeight]);

  const start = windowResult.startIndex;
  const end = windowResult.endIndex;
  const slice = data.slice(start, end);

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

  return (
    <div data-testid="virtual-grid" className={gridCls} role="grid">
      {showHeader ? (
        <div
          className="flex shrink-0 border-b border-slate-200 bg-slate-50"
          role="row"
        >
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
                : data.length * rowHeight,
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
                const zebra =
                  stripe && rowIndex % 2 === 1 ? "bg-slate-50" : "bg-white";
                return (
                  <div
                    key={rowKey(row, rowIndex, idField)}
                    role="row"
                    data-row-index={rowIndex}
                    className={`flex border-b border-slate-100 ${zebra} hover:bg-sky-50/60`}
                    style={{ height: rowHeight }}
                    onClick={(e) => onRowClick?.(row, rowIndex, e)}
                  >
                    {showRowNumber ? (
                      <div
                        className="flex w-14 shrink-0 items-center justify-center border-r border-slate-100 text-slate-500"
                        role="gridcell"
                      >
                        {rowIndex + 1}
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
  );
}
