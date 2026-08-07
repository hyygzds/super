import {
  buildGroupedRows,
  buildHeaderRows,
  clearKeys,
  computeVirtualWindow,
  flattenLeafColumns,
  isAllSelected,
  isIndeterminate,
  normalizeSpans,
  selectAllKeys,
  slicePage,
  toggleKey,
  type DisplayRow,
  type GridColumn,
  type GroupByConfig,
  type HeaderCell,
  type SpanMethod,
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
  children?: VirtualGridColumn[];
};

export type { GroupByConfig, SpanMethod };

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
  groupBy?: GroupByConfig;
  spanMethod?: SpanMethod;
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

  // Preserve leaf DFS order so header colspan aligns with body columns.
  // Sticky offsets accumulate only across leading sticky (sel / row# / fixed-left) cols.
  const rightOffset = new Map<string, number>();
  let right = 0;
  for (let i = visibleColumns.length - 1; i >= 0; i--) {
    const column = visibleColumns[i]!;
    if (column.fixed === "right") {
      rightOffset.set(column.field, right);
      right += colWidth(column, true)!;
    }
  }

  for (const column of visibleColumns) {
    if (column.fixed === "left") {
      const width = colWidth(column, true)!;
      layout.push({ kind: "data", column, width, stickyLeft: left });
      left += width;
    } else if (column.fixed === "right") {
      const width = colWidth(column, true)!;
      layout.push({
        kind: "data",
        column,
        width,
        stickyRight: rightOffset.get(column.field) ?? 0,
      });
    } else {
      const width = colWidth(column, hasFixed);
      layout.push({
        kind: "data",
        column,
        width: width ?? 0,
      });
    }
  }
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

/** Place header cells into a CSS grid, accounting for rowspan occupancy. */
function placeHeaderCells(
  headerRows: HeaderCell[][],
  prefixCount: number,
): Array<{
  cell: HeaderCell;
  gridColumn: string;
  gridRow: string;
  key: string;
}> {
  const depth = headerRows.length;
  if (depth === 0) return [];
  const cols = headerRows[0]!.reduce((sum, c) => sum + c.colspan, 0);
  const occupied: boolean[][] = Array.from({ length: depth }, () =>
    Array.from({ length: cols }, () => false),
  );
  const placed: Array<{
    cell: HeaderCell;
    gridColumn: string;
    gridRow: string;
    key: string;
  }> = [];

  for (let r = 0; r < depth; r++) {
    let cursor = 0;
    for (const cell of headerRows[r]!) {
      while (cursor < cols && occupied[r]![cursor]) cursor++;
      const start = cursor;
      for (let rr = r; rr < r + cell.rowspan; rr++) {
        for (let cc = start; cc < start + cell.colspan; cc++) {
          if (rr < depth && cc < cols) occupied[rr]![cc] = true;
        }
      }
      placed.push({
        cell,
        gridColumn: `${prefixCount + start + 1} / span ${cell.colspan}`,
        gridRow: `${r + 1} / span ${cell.rowspan}`,
        key: `${r}-${start}-${cell.title}-${cell.column?.field ?? ""}`,
      });
      cursor = start + cell.colspan;
    }
  }
  return placed;
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
  groupBy,
  spanMethod,
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

  const leafColumns = useMemo(
    () => flattenLeafColumns(columns) as VirtualGridColumn[],
    [columns],
  );

  const headerRows = useMemo(() => buildHeaderRows(columns), [columns]);
  const headerDepth = Math.max(1, headerRows.length);

  const displayRows = useMemo(
    () => buildGroupedRows(data, groupBy),
    [data, groupBy],
  );

  const pagedDisplayRows = useMemo(
    () =>
      pagination
        ? slicePage(displayRows, {
            pageIndex: page,
            pageSize,
            total: displayRows.length,
          })
        : displayRows,
    [displayRows, pagination, page, pageSize],
  );

  useEffect(() => {
    setHeightCache(new Array(pagedDisplayRows.length));
  }, [pagedDisplayRows.length, page, pageSize]);

  function rowKey(row: Record<string, unknown>, absoluteIndex: number): string {
    const v = row[idField];
    return v !== undefined && v !== null ? String(v) : String(absoluteIndex);
  }

  const allKeys = useMemo(
    () =>
      pagedDisplayRows
        .filter(
          (d): d is Extract<DisplayRow, { kind: "data" }> => d.kind === "data",
        )
        .map((d) => rowKey(d.row, d.dataIndex)),
    [pagedDisplayRows, idField],
  );

  const canVirtualize =
    virtual && typeof height === "number" && spanMethod === undefined;
  if (virtual && typeof height !== "number" && isNodeDevelopment()) {
    console.warn(
      "VirtualGrid: `virtual` requires a numeric `height` prop; falling back to non-virtual rendering.",
    );
  }

  const rowScrollTop = Math.max(0, scrollTop - headerHeight);

  const win = computeVirtualWindow({
    enabled: canVirtualize,
    rowCount: pagedDisplayRows.length,
    rowHeight,
    rowHeights: autoHeight ? heightCache : undefined,
    scrollTop: rowScrollTop,
    viewportHeight: canVirtualize
      ? Math.max(0, (height as number) - headerHeight)
      : 0,
    overscan,
  });

  const layout = useMemo(
    () => buildLayout(leafColumns, selectable, showRowNumber),
    [leafColumns, selectable, showRowNumber],
  );

  const prefixCount = (selectable ? 1 : 0) + (showRowNumber ? 1 : 0);

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

  const placedHeaderCells = useMemo(
    () => placeHeaderCells(headerRows, prefixCount),
    [headerRows, prefixCount],
  );

  const spanMatrix = useMemo(() => {
    if (!spanMethod) return null;
    return normalizeSpans({
      displayRows: pagedDisplayRows,
      columns: leafColumns,
      spanMethod,
    });
  }, [spanMethod, pagedDisplayRows, leafColumns]);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    if (Math.abs(h - headerHeight) >= 1) setHeaderHeight(h);
  });

  useLayoutEffect(() => {
    if (!autoHeight || spanMethod) return;
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
          while (next.length < pagedDisplayRows.length) next.push(undefined);
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
    spanMethod,
    pagedDisplayRows.length,
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

  function layoutItemForColumn(
    column: VirtualGridColumn,
  ): LayoutCol | undefined {
    return layout.find(
      (item) => item.kind === "data" && item.column.field === column.field,
    );
  }

  function renderGroupRow(
    display: Extract<DisplayRow, { kind: "group" }>,
    absoluteIndex: number,
  ) {
    return (
      <div
        key={`group-${display.key}-${absoluteIndex}`}
        role="row"
        aria-rowindex={absoluteIndex + 2}
        style={{
          display: "grid",
          gridTemplateColumns,
          height: rowHeight,
        }}
        className="bg-slate-100 font-medium"
      >
        <div
          role="cell"
          className={`${cellClass(false)} bg-slate-100 font-medium`}
          style={{ gridColumn: "1 / -1" }}
        >
          {`${display.label} (${display.count})`}
        </div>
      </div>
    );
  }

  function renderDataRow(
    display: Extract<DisplayRow, { kind: "data" }>,
    absoluteIndex: number,
  ) {
    const key = rowKey(display.row, display.dataIndex);
    const stripeBg = stripe && display.dataIndex % 2 === 1;
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
                  <span className="sr-only">
                    选择第 {display.dataIndex + 1} 行
                  </span>
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
                {display.dataIndex + 1}
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
              {renderDataCell(item.column, display.row, display.dataIndex)}
            </div>
          );
        })}
      </div>
    );
  }

  function renderDisplayRow(display: DisplayRow, absoluteIndex: number) {
    if (display.kind === "group") {
      return renderGroupRow(display, absoluteIndex);
    }
    return renderDataRow(display, absoluteIndex);
  }

  function renderSpannedBody() {
    const rows = pagedDisplayRows;
    const spans = spanMatrix!;
    const cells: ReactNode[] = [];

    for (let r = 0; r < rows.length; r++) {
      const display = rows[r]!;
      if (display.kind === "group") {
        cells.push(
          <div
            key={`group-${display.key}-${r}`}
            role="row"
            aria-rowindex={r + 2}
            className="contents"
          >
            <div
              role="cell"
              className={`${cellClass(false)} bg-slate-100 font-medium`}
              style={{
                gridRow: r + 1,
                gridColumn: "1 / -1",
              }}
            >
              {`${display.label} (${display.count})`}
            </div>
          </div>,
        );
        continue;
      }

      const key = rowKey(display.row, display.dataIndex);
      const stripeBg = stripe && display.dataIndex % 2 === 1;
      const rowBg = stripeBg ? "rgb(248 250 252)" : "rgb(255 255 255)";
      const rowCells: ReactNode[] = [];

      let colOffset = 1;
      if (selectable) {
        const selItem = layout.find((i) => i.kind === "selection")!;
        rowCells.push(
          <div
            key={`sel-${r}`}
            role="cell"
            className={cellClass(false)}
            style={{
              gridRow: r + 1,
              gridColumn: colOffset,
              ...stickyStyle(selItem, false, rowBg),
            }}
          >
            <Checkbox
              checked={selectedKeys.includes(key)}
              onCheckedChange={() =>
                commitSelectedKeys(toggleKey(selectedKeys, key, multiple))
              }
            >
              <span className="sr-only">选择第 {display.dataIndex + 1} 行</span>
            </Checkbox>
          </div>,
        );
        colOffset++;
      }
      if (showRowNumber) {
        const numItem = layout.find((i) => i.kind === "rowNumber")!;
        rowCells.push(
          <div
            key={`num-${r}`}
            role="cell"
            className={cellClass(false)}
            style={{
              gridRow: r + 1,
              gridColumn: colOffset,
              ...stickyStyle(numItem, false, rowBg),
            }}
          >
            {display.dataIndex + 1}
          </div>,
        );
        colOffset++;
      }

      for (let c = 0; c < leafColumns.length; c++) {
        const span = spans[r]![c]!;
        if (span.rowspan === 0 || span.colspan === 0) continue;
        const column = leafColumns[c]!;
        const layoutItem = layoutItemForColumn(column);
        const sticky = layoutItem
          ? stickyStyle(layoutItem, false, rowBg)
          : undefined;
        rowCells.push(
          <div
            key={`${r}-${column.field}`}
            role="cell"
            className={`${cellClass(false)} ${stripeBg ? "bg-slate-50" : "bg-white"}`}
            style={{
              gridRow: `${r + 1} / span ${span.rowspan}`,
              gridColumn: `${prefixCount + c + 1} / span ${span.colspan}`,
              ...sticky,
              background: sticky?.background ?? rowBg,
            }}
          >
            {renderDataCell(column, display.row, display.dataIndex)}
          </div>,
        );
      }

      cells.push(
        <div key={key} role="row" aria-rowindex={r + 2} className="contents">
          {rowCells}
        </div>,
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns,
          gridTemplateRows: `repeat(${rows.length}, ${rowHeight}px)`,
        }}
      >
        {cells}
      </div>
    );
  }

  const headerBg = "rgb(248 250 252)";
  const scrollerStyle: CSSProperties | undefined =
    height !== undefined ? { height: toCssHeight(height) } : undefined;

  const bodyRows =
    spanMethod !== undefined
      ? null
      : canVirtualize
        ? pagedDisplayRows
            .slice(win.startIndex, win.endIndex)
            .map((row, i) => renderDisplayRow(row, win.startIndex + i))
        : pagedDisplayRows.map((row, absoluteIndex) =>
            renderDisplayRow(row, absoluteIndex),
          );

  const prefixItems = layout.filter(
    (item) => item.kind === "selection" || item.kind === "rowNumber",
  );

  return (
    <div
      className={rootCls}
      role="table"
      aria-rowcount={pagedDisplayRows.length + 1}
    >
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
            gridTemplateRows: `repeat(${headerDepth}, ${rowHeight}px)`,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
          className="bg-slate-50 font-medium"
        >
          {prefixItems.map((item, idx) => {
            if (item.kind === "selection") {
              return (
                <div
                  key="__sel"
                  role="columnheader"
                  className={cellClass(false)}
                  style={{
                    gridColumn: idx + 1,
                    gridRow: `1 / span ${headerDepth}`,
                    ...stickyStyle(item, true, headerBg),
                  }}
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
            return (
              <div
                key="__num"
                role="columnheader"
                className={cellClass(false)}
                style={{
                  gridColumn: idx + 1,
                  gridRow: `1 / span ${headerDepth}`,
                  ...stickyStyle(item, true, headerBg),
                }}
                aria-label="序号"
              >
                #
              </div>
            );
          })}
          {placedHeaderCells.map(({ cell, gridColumn, gridRow, key }) => {
            const layoutItem = cell.column
              ? layoutItemForColumn(cell.column as VirtualGridColumn)
              : undefined;
            const sticky = layoutItem
              ? stickyStyle(layoutItem, true, headerBg)
              : { background: headerBg };
            return (
              <div
                key={key}
                role="columnheader"
                className={cellClass(false)}
                style={{
                  gridColumn,
                  gridRow,
                  ...sticky,
                }}
              >
                {cell.column
                  ? renderHeaderCell(cell.column as VirtualGridColumn)
                  : cell.title}
              </div>
            );
          })}
        </div>

        {pagedDisplayRows.length === 0 ? (
          <div className="px-3 py-6 text-center text-slate-400">{emptyText}</div>
        ) : spanMethod !== undefined ? (
          renderSpannedBody()
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
            total={displayRows.length}
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
