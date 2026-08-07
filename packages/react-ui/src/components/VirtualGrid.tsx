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
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Checkbox } from "./Checkbox";
import { Pagination } from "./Pagination";

export type VirtualGridCellContext = {
  row: Record<string, unknown>;
  column: VirtualGridColumn;
  value: unknown;
  rowIndex: number;
};

export type VirtualGridHeaderContext = {
  column: VirtualGridColumn;
};

export type VirtualGridColumn = GridColumn & {
  render?: (ctx: VirtualGridCellContext) => ReactNode;
  renderHeader?: (ctx: VirtualGridHeaderContext) => ReactNode;
};

export type VirtualGridProps = {
  columns: VirtualGridColumn[];
  data: Record<string, unknown>[];
  idField?: string;
  rowHeight?: number;
  height?: number | string;
  virtual?: boolean;
  overscan?: number;
  autoHeight?: boolean;
  bordered?: boolean;
  stripe?: boolean;
  showRowNumber?: boolean;
  emptyText?: ReactNode;
  className?: string;
  selectable?: boolean;
  multiple?: boolean;
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  showSelectAll?: boolean;
  onSelectedKeysChange?: (keys: string[]) => void;
  pagination?: boolean;
  page?: number;
  defaultPage?: number;
  pageSize?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  renderCell?: (ctx: VirtualGridCellContext) => ReactNode;
  renderHeader?: (ctx: VirtualGridHeaderContext) => ReactNode;
};

const ROW_NUMBER_WIDTH = 48;
const SELECTION_WIDTH = 40;
const DEFAULT_COL_WIDTH = 120;

type LayoutCol =
  | { kind: "selection"; width: number; stickyLeft: number }
  | { kind: "rowNumber"; width: number; stickyLeft: number }
  | {
      kind: "data";
      column: VirtualGridColumn;
      width: number;
      stickyLeft?: number;
      stickyRight?: number;
    };

function isNodeDevelopment(): boolean {
  const proc = (
    globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }
  ).process;
  return proc?.env?.NODE_ENV === "development";
}

function toCssHeight(height: number | string): string {
  return typeof height === "number" ? `${height}px` : height;
}

function colWidth(col: VirtualGridColumn, forcePx: boolean): number | null {
  if (col.width != null) return col.width;
  if (col.fixed || forcePx) return DEFAULT_COL_WIDTH;
  return null;
}

function buildLayout(
  visibleColumns: VirtualGridColumn[],
  selectable: boolean,
  showRowNumber: boolean,
): LayoutCol[] {
  const hasFixed = visibleColumns.some((c) => c.fixed);
  const layout: LayoutCol[] = [];
  let left = 0;

  if (selectable) {
    layout.push({ kind: "selection", width: SELECTION_WIDTH, stickyLeft: left });
    left += SELECTION_WIDTH;
  }
  if (showRowNumber) {
    layout.push({ kind: "rowNumber", width: ROW_NUMBER_WIDTH, stickyLeft: left });
    left += ROW_NUMBER_WIDTH;
  }

  for (const column of visibleColumns) {
    if (column.fixed === "left") {
      const width = colWidth(column, true)!;
      layout.push({ kind: "data", column, width, stickyLeft: left });
      left += width;
    }
  }

  for (const column of visibleColumns) {
    if (!column.fixed) {
      const width = colWidth(column, hasFixed);
      // width 0 → 1fr in template (only when no fixed columns)
      layout.push({
        kind: "data",
        column,
        width: width ?? 0,
      });
    }
  }

  const rightCols = visibleColumns.filter((c) => c.fixed === "right");
  let right = 0;
  const rightLayout: LayoutCol[] = [];
  for (let i = rightCols.length - 1; i >= 0; i--) {
    const column = rightCols[i]!;
    const width = colWidth(column, true)!;
    rightLayout.unshift({
      kind: "data",
      column,
      width,
      stickyRight: right,
    });
    right += width;
  }
  layout.push(...rightLayout);
  return layout;
}

function stickyStyle(
  item: LayoutCol,
  isHeader: boolean,
  bg: string,
): CSSProperties | undefined {
  if (item.kind === "selection" || item.kind === "rowNumber") {
    return {
      position: "sticky",
      left: item.stickyLeft,
      zIndex: isHeader ? 4 : 2,
      background: bg,
    };
  }
  if (item.stickyLeft != null) {
    return {
      position: "sticky",
      left: item.stickyLeft,
      zIndex: isHeader ? 4 : 2,
      background: bg,
      boxShadow: "2px 0 4px -2px rgba(15,23,42,0.12)",
    };
  }
  if (item.stickyRight != null) {
    return {
      position: "sticky",
      right: item.stickyRight,
      zIndex: isHeader ? 4 : 2,
      background: bg,
      boxShadow: "-2px 0 4px -2px rgba(15,23,42,0.12)",
    };
  }
  return isHeader ? { background: bg } : undefined;
}

export function VirtualGrid({
  columns,
  data,
  idField = "id",
  rowHeight = 36,
  height,
  virtual = false,
  overscan = 4,
  autoHeight = false,
  bordered = true,
  stripe = false,
  showRowNumber = false,
  emptyText = "暂无数据",
  className = "",
  selectable = false,
  multiple = true,
  selectedKeys: selectedKeysProp,
  defaultSelectedKeys = [],
  showSelectAll = true,
  onSelectedKeysChange,
  pagination = false,
  page: pageProp,
  defaultPage = 1,
  pageSize: pageSizeProp,
  defaultPageSize = 10,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  renderCell,
  renderHeader,
}: VirtualGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [heightCache, setHeightCache] = useState<Array<number | undefined>>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [uncontrolledSelectedKeys, setUncontrolledSelectedKeys] =
    useState<string[]>(defaultSelectedKeys);
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
  const [uncontrolledPageSize, setUncontrolledPageSize] =
    useState(defaultPageSize);

  const selectedKeys = selectedKeysProp ?? uncontrolledSelectedKeys;
  const page = pageProp ?? uncontrolledPage;
  const pageSize = pageSizeProp ?? uncontrolledPageSize;

  function commitSelectedKeys(next: string[]) {
    if (selectedKeysProp === undefined) setUncontrolledSelectedKeys(next);
    onSelectedKeysChange?.(next);
  }

  function setPage(next: number) {
    if (pageProp === undefined) setUncontrolledPage(next);
    onPageChange?.(next);
  }

  function setPageSize(next: number) {
    if (pageSizeProp === undefined) setUncontrolledPageSize(next);
    onPageSizeChange?.(next);
    if (pageProp === undefined) setUncontrolledPage(1);
    onPageChange?.(1);
  }

  useEffect(() => {
    setScrollTop(0);
  }, [page]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.hidden),
    [columns],
  );

  const pagedRows = useMemo(
    () =>
      pagination
        ? slicePage(data, { pageIndex: page, pageSize, total: data.length })
        : data,
    [data, pagination, page, pageSize],
  );

  useEffect(() => {
    setHeightCache(new Array(pagedRows.length));
  }, [pagedRows.length, page, pageSize]);

  function rowKey(row: Record<string, unknown>, absoluteIndex: number): string {
    const v = row[idField];
    return v !== undefined && v !== null ? String(v) : String(absoluteIndex);
  }

  const allKeys = useMemo(
    () => pagedRows.map((row, i) => rowKey(row, i)),
    [pagedRows, idField],
  );

  const canVirtualize = virtual && typeof height === "number";
  if (virtual && typeof height !== "number" && isNodeDevelopment()) {
    console.warn(
      "VirtualGrid: `virtual` requires a numeric `height` prop; falling back to non-virtual rendering.",
    );
  }

  const rowScrollTop = Math.max(0, scrollTop - headerHeight);

  const win = computeVirtualWindow({
    enabled: canVirtualize,
    rowCount: pagedRows.length,
    rowHeight,
    rowHeights: autoHeight ? heightCache : undefined,
    scrollTop: rowScrollTop,
    viewportHeight: canVirtualize
      ? Math.max(0, (height as number) - headerHeight)
      : 0,
    overscan,
  });

  const layout = useMemo(
    () => buildLayout(visibleColumns, selectable, showRowNumber),
    [visibleColumns, selectable, showRowNumber],
  );

  const gridTemplateColumns = useMemo(
    () =>
      layout
        .map((item) => {
          if (item.kind !== "data") return `${item.width}px`;
          if (item.width === 0) return "1fr";
          return `${item.width}px`;
        })
        .join(" "),
    [layout],
  );

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    if (Math.abs(h - headerHeight) >= 1) setHeaderHeight(h);
  });

  useLayoutEffect(() => {
    if (!autoHeight) return;
    const root = scrollerRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-vg-row]");
    const observers: ResizeObserver[] = [];

    nodes.forEach((node) => {
      const index = Number(node.dataset.vgRow);
      if (Number.isNaN(index)) return;
      const apply = () => {
        const h = node.offsetHeight;
        setHeightCache((prev) => {
          const cur = prev[index];
          if (cur !== undefined && Math.abs(cur - h) < 1) return prev;
          const next = prev.slice();
          while (next.length < pagedRows.length) next.push(undefined);
          next[index] = h;
          return next;
        });
      };
      apply();
      if (typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(apply);
      ro.observe(node);
      observers.push(ro);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [
    autoHeight,
    pagedRows.length,
    win.startIndex,
    win.endIndex,
    canVirtualize,
  ]);

  const rootCls =
    `inline-block w-full overflow-hidden rounded-lg text-sm text-slate-800 ${
      bordered ? "border border-slate-200" : ""
    } ${className}`.trim();

  function cellClass(auto: boolean): string {
    return `flex items-center overflow-hidden px-3 py-2 ${
      auto ? "whitespace-normal break-words" : "truncate"
    } ${bordered ? "border-b border-slate-200" : ""}`;
  }

  const allSelected = isAllSelected(selectedKeys, allKeys);
  const partiallySelected = isIndeterminate(selectedKeys, allKeys);

  function renderDataCell(
    column: VirtualGridColumn,
    row: Record<string, unknown>,
    rowIndex: number,
  ): ReactNode {
    const value = row[column.field];
    const ctx: VirtualGridCellContext = { row, column, value, rowIndex };
    if (column.render) return column.render(ctx);
    if (renderCell) return renderCell(ctx);
    return String(value ?? "");
  }

  function renderHeaderCell(column: VirtualGridColumn): ReactNode {
    const ctx: VirtualGridHeaderContext = { column };
    if (column.renderHeader) return column.renderHeader(ctx);
    if (renderHeader) return renderHeader(ctx);
    return column.title;
  }

  function renderRow(row: Record<string, unknown>, absoluteIndex: number) {
    const key = rowKey(row, absoluteIndex);
    const stripeBg = stripe && absoluteIndex % 2 === 1;
    const rowBg = stripeBg ? "rgb(248 250 252)" : "rgb(255 255 255)";
    const measured = heightCache[absoluteIndex];
    const rowStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns,
      ...(autoHeight
        ? { minHeight: rowHeight, height: measured }
        : { height: rowHeight }),
    };

    return (
      <div
        key={key}
        role="row"
        aria-rowindex={absoluteIndex + 2}
        data-vg-row={absoluteIndex}
        style={rowStyle}
        className={stripeBg ? "bg-slate-50" : "bg-white"}
      >
        {layout.map((item) => {
          if (item.kind === "selection") {
            return (
              <div
                key="__sel"
                role="cell"
                className={cellClass(autoHeight)}
                style={stickyStyle(item, false, rowBg)}
              >
                <Checkbox
                  checked={selectedKeys.includes(key)}
                  onCheckedChange={() =>
                    commitSelectedKeys(toggleKey(selectedKeys, key, multiple))
                  }
                >
                  <span className="sr-only">选择第 {absoluteIndex + 1} 行</span>
                </Checkbox>
              </div>
            );
          }
          if (item.kind === "rowNumber") {
            return (
              <div
                key="__num"
                role="cell"
                className={cellClass(autoHeight)}
                style={stickyStyle(item, false, rowBg)}
              >
                {absoluteIndex + 1}
              </div>
            );
          }
          return (
            <div
              key={item.column.field}
              role="cell"
              className={cellClass(autoHeight)}
              style={stickyStyle(item, false, rowBg)}
            >
              {renderDataCell(item.column, row, absoluteIndex)}
            </div>
          );
        })}
      </div>
    );
  }

  const headerBg = "rgb(248 250 252)";
  const scrollerStyle: CSSProperties | undefined =
    height !== undefined ? { height: toCssHeight(height) } : undefined;

  const bodyRows = canVirtualize
    ? pagedRows
        .slice(win.startIndex, win.endIndex)
        .map((row, i) => renderRow(row, win.startIndex + i))
    : pagedRows.map((row, absoluteIndex) => renderRow(row, absoluteIndex));

  return (
    <div className={rootCls} role="table" aria-rowcount={pagedRows.length + 1}>
      <div
        ref={scrollerRef}
        data-vg-scroller=""
        role="rowgroup"
        className="relative overflow-auto"
        style={scrollerStyle}
        onScroll={(e) => {
          setScrollTop(e.currentTarget.scrollTop);
        }}
      >
        <div
          ref={headerRef}
          role="row"
          aria-rowindex={1}
          style={{
            display: "grid",
            gridTemplateColumns,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
          className="bg-slate-50 font-medium"
        >
          {layout.map((item) => {
            if (item.kind === "selection") {
              return (
                <div
                  key="__sel"
                  role="columnheader"
                  className={cellClass(false)}
                  style={stickyStyle(item, true, headerBg)}
                >
                  {multiple && showSelectAll ? (
                    <Checkbox
                      checked={allSelected}
                      indeterminate={partiallySelected}
                      onCheckedChange={() =>
                        commitSelectedKeys(
                          allSelected ? clearKeys() : selectAllKeys(allKeys),
                        )
                      }
                    >
                      <span className="sr-only">全选</span>
                    </Checkbox>
                  ) : null}
                </div>
              );
            }
            if (item.kind === "rowNumber") {
              return (
                <div
                  key="__num"
                  role="columnheader"
                  className={cellClass(false)}
                  style={stickyStyle(item, true, headerBg)}
                  aria-label="序号"
                >
                  #
                </div>
              );
            }
            return (
              <div
                key={item.column.field}
                role="columnheader"
                className={cellClass(false)}
                style={stickyStyle(item, true, headerBg)}
              >
                {renderHeaderCell(item.column)}
              </div>
            );
          })}
        </div>

        {pagedRows.length === 0 ? (
          <div className="px-3 py-6 text-center text-slate-400">{emptyText}</div>
        ) : canVirtualize ? (
          <div style={{ height: win.totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${win.offsetY}px)` }}>
              {bodyRows}
            </div>
          </div>
        ) : (
          bodyRows
        )}
      </div>
      {pagination ? (
        <div
          className={`flex justify-end p-2 ${
            bordered ? "border-t border-slate-200" : ""
          }`}
        >
          <Pagination
            total={data.length}
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
