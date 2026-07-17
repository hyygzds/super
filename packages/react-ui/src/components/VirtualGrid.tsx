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
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Checkbox } from "./Checkbox";
import { Pagination } from "./Pagination";

export type VirtualGridColumn = GridColumn;

export type VirtualGridProps = {
  columns: VirtualGridColumn[];
  data: Record<string, unknown>[];
  idField?: string;
  rowHeight?: number;
  height?: number | string;
  virtual?: boolean;
  overscan?: number;
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
};

const ROW_NUMBER_WIDTH = 48;
const SELECTION_WIDTH = 40;

function isNodeDevelopment(): boolean {
  const proc = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } })
    .process;
  return proc?.env?.NODE_ENV === "development";
}

function toCssHeight(height: number | string): string {
  return typeof height === "number" ? `${height}px` : height;
}

export function VirtualGrid({
  columns,
  data,
  idField = "id",
  rowHeight = 36,
  height,
  virtual = false,
  overscan = 4,
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
}: VirtualGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
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

  const win = computeVirtualWindow({
    enabled: canVirtualize,
    rowCount: pagedRows.length,
    rowHeight,
    scrollTop,
    viewportHeight: canVirtualize ? (height as number) : 0,
    overscan,
  });

  const gridTemplateColumns = useMemo(() => {
    const widths = visibleColumns.map((c) => (c.width ? `${c.width}px` : "1fr"));
    const prefixed = [
      ...(selectable ? [`${SELECTION_WIDTH}px`] : []),
      ...(showRowNumber ? [`${ROW_NUMBER_WIDTH}px`] : []),
      ...widths,
    ];
    return prefixed.join(" ");
  }, [visibleColumns, showRowNumber, selectable]);

  const rootCls =
    `inline-block w-full overflow-hidden rounded-lg text-sm text-slate-800 ${
      bordered ? "border border-slate-200" : ""
    } ${className}`.trim();
  const cellBase = `flex items-center overflow-hidden px-3 py-2 truncate ${
    bordered ? "border-b border-slate-200" : ""
  }`;

  const allSelected = isAllSelected(selectedKeys, allKeys);
  const partiallySelected = isIndeterminate(selectedKeys, allKeys);

  function renderRow(row: Record<string, unknown>, absoluteIndex: number) {
    const key = rowKey(row, absoluteIndex);
    return (
      <div
        key={key}
        role="row"
        aria-rowindex={absoluteIndex + 2}
        style={{ display: "grid", gridTemplateColumns, height: rowHeight }}
        className={stripe && absoluteIndex % 2 === 1 ? "bg-slate-50" : ""}
      >
        {selectable ? (
          <div role="cell" className={cellBase}>
            <Checkbox
              checked={selectedKeys.includes(key)}
              onCheckedChange={() =>
                commitSelectedKeys(toggleKey(selectedKeys, key, multiple))
              }
            >
              <span className="sr-only">选择第 {absoluteIndex + 1} 行</span>
            </Checkbox>
          </div>
        ) : null}
        {showRowNumber ? (
          <div role="cell" className={cellBase}>
            {absoluteIndex + 1}
          </div>
        ) : null}
        {visibleColumns.map((col) => (
          <div key={col.field} role="cell" className={cellBase}>
            {String(row[col.field] ?? "")}
          </div>
        ))}
      </div>
    );
  }

  const headerStyle: CSSProperties = { display: "grid", gridTemplateColumns };

  return (
    <div className={rootCls} role="table" aria-rowcount={pagedRows.length + 1}>
      <div
        role="row"
        aria-rowindex={1}
        style={headerStyle}
        className="bg-slate-50 font-medium"
      >
        {selectable ? (
          <div role="columnheader" className={cellBase}>
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
        ) : null}
        {showRowNumber ? (
          <div role="columnheader" className={cellBase} aria-label="序号">
            #
          </div>
        ) : null}
        {visibleColumns.map((col) => (
          <div key={col.field} role="columnheader" className={cellBase}>
            {col.title}
          </div>
        ))}
      </div>
      <div
        role="rowgroup"
        className="relative overflow-y-auto"
        style={height !== undefined ? { height: toCssHeight(height) } : undefined}
        onScroll={(e) => {
          if (canVirtualize) setScrollTop(e.currentTarget.scrollTop);
        }}
      >
        {pagedRows.length === 0 ? (
          <div className="px-3 py-6 text-center text-slate-400">
            {emptyText}
          </div>
        ) : canVirtualize ? (
          <div style={{ height: win.totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${win.offsetY}px)` }}>
              {pagedRows
                .slice(win.startIndex, win.endIndex)
                .map((row, i) => renderRow(row, win.startIndex + i))}
            </div>
          </div>
        ) : (
          pagedRows.map((row, absoluteIndex) => renderRow(row, absoluteIndex))
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
