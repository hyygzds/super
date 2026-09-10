import {
  activeFilterEntries,
  buildGroupedRows,
  buildHeaderRows,
  cascadeToggleKey,
  clearKeys,
  collectExpandableKeys,
  computeVirtualWindow,
  flattenLeafColumns,
  filterRows,
  flattenTree,
  isAllSelected,
  isIndeterminate,
  isTreeIndeterminate,
  nextSortState,
  normalizeSpans,
  selectAllKeys,
  setFilterValue,
  slicePage,
  sortRows,
  toggleExpandKey,
  toggleKey,
  type DisplayRow,
  type FilterPredicate,
  type FilterState,
  type GridColumn,
  type GroupByConfig,
  type HeaderCell,
  type SortCompare,
  type SortState,
  type SpanMethod,
  type TreeFlatRow,
} from "@component-ai/grid-core";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";
import { Pagination } from "./Pagination";
import { Tooltip } from "./Tooltip";

export type VirtualGridCellContext = {
  row: Record<string, unknown>;
  column: VirtualGridColumn;
  value: unknown;
  rowIndex: number;
};

export type VirtualGridHeaderContext = {
  column: VirtualGridColumn;
};

export type VirtualGridCellChangeInfo = {
  rowKey: string;
  field: string;
  value: string;
  row: Record<string, unknown>;
};

export type VirtualGridColumn = GridColumn & {
  editable?: boolean;
  sortable?: boolean;
  sorter?: SortCompare;
  filterable?: boolean;
  filter?: FilterPredicate;
  showOverflowTooltip?: boolean;
  render?: (ctx: VirtualGridCellContext) => ReactNode;
  renderHeader?: (ctx: VirtualGridHeaderContext) => ReactNode;
  children?: VirtualGridColumn[];
};

export type { FilterState, GroupByConfig, SortState, SpanMethod };

export type VirtualGridExpandedRowContext = {
  row: Record<string, unknown>;
  rowIndex: number;
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
  showOverflowTooltip?: boolean;
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
  tree?: boolean;
  childrenField?: string;
  expandedKeys?: string[];
  defaultExpandedKeys?: string[];
  onExpandedKeysChange?: (keys: string[]) => void;
  cascadeParent?: boolean;
  cascadeChild?: boolean;
  loadData?: (
    row: Record<string, unknown>,
  ) => Promise<Record<string, unknown>[]>;
  expandable?: boolean | ((row: Record<string, unknown>) => boolean);
  expandedRowKeys?: string[];
  defaultExpandedRowKeys?: string[];
  onExpandedRowKeysChange?: (keys: string[]) => void;
  renderExpandedRow?: (ctx: VirtualGridExpandedRowContext) => ReactNode;
  renderCell?: (ctx: VirtualGridCellContext) => ReactNode;
  renderHeader?: (ctx: VirtualGridHeaderContext) => ReactNode;
  editable?: boolean;
  editMode?: "cell" | "row";
  onCellChange?: (info: VirtualGridCellChangeInfo) => void;
  editingRowKey?: string | null;
  defaultEditingRowKey?: string | null;
  onEditingRowKeyChange?: (key: string | null) => void;
  onRowSave?: (row: Record<string, unknown>) => void;
  onRowCancel?: (rowKey: string) => void;
  remote?: boolean;
  total?: number;
  loading?: boolean;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  filters?: FilterState;
  defaultFilters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
};

const ROW_NUMBER_WIDTH = 48;
const SELECTION_WIDTH = 40;
const EXPAND_WIDTH = 32;
const ROW_ACTIONS_WIDTH = 128;
const DEFAULT_COL_WIDTH = 120;
const TREE_INDENT = 16;

type LayoutCol =
  | { kind: "selection"; width: number; stickyLeft: number }
  | { kind: "expand"; width: number; stickyLeft: number }
  | { kind: "rowNumber"; width: number; stickyLeft: number }
  | { kind: "actions"; width: number }
  | {
      kind: "data";
      column: VirtualGridColumn;
      width: number;
      stickyLeft?: number;
      stickyRight?: number;
    };

type BodyDisplayRow =
  | DisplayRow
  | {
      kind: "detail";
      row: Record<string, unknown>;
      dataIndex: number;
      key: string;
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

function overflowTitle(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value);
  return text === "" ? undefined : text;
}

function buildLayout(
  visibleColumns: VirtualGridColumn[],
  selectable: boolean,
  showRowNumber: boolean,
  showExpandCol: boolean,
  showRowActions: boolean,
): LayoutCol[] {
  const hasFixed = visibleColumns.some((c) => c.fixed);
  const layout: LayoutCol[] = [];
  let left = 0;

  if (selectable) {
    layout.push({ kind: "selection", width: SELECTION_WIDTH, stickyLeft: left });
    left += SELECTION_WIDTH;
  }
  if (showExpandCol) {
    layout.push({ kind: "expand", width: EXPAND_WIDTH, stickyLeft: left });
    left += EXPAND_WIDTH;
  }
  if (showRowNumber) {
    layout.push({ kind: "rowNumber", width: ROW_NUMBER_WIDTH, stickyLeft: left });
    left += ROW_NUMBER_WIDTH;
  }

  // Preserve leaf DFS order so header colspan aligns with body columns.
  // Sticky offsets accumulate only across leading sticky (sel / expand / row# / fixed-left) cols.
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
  if (showRowActions) {
    layout.push({ kind: "actions", width: ROW_ACTIONS_WIDTH });
  }
  return layout;
}

function columnCanEdit(
  column: VirtualGridColumn,
  tableEditable: boolean,
): boolean {
  return (column.editable ?? tableEditable) === true;
}

function stickyStyle(
  item: LayoutCol,
  isHeader: boolean,
  bg: string,
): CSSProperties | undefined {
  if (item.kind === "actions") {
    return isHeader ? { background: bg } : undefined;
  }
  if (
    item.kind === "selection" ||
    item.kind === "rowNumber" ||
    item.kind === "expand"
  ) {
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

function setChildrenAtKey(
  rows: Record<string, unknown>[],
  key: string,
  children: Record<string, unknown>[],
  idField: string,
  childrenField: string,
  path = "r",
): Record<string, unknown>[] {
  return rows.map((row, index) => {
    const rowKey =
      row[idField] !== undefined && row[idField] !== null
        ? String(row[idField])
        : `${path}/${index}`;
    if (rowKey === key) {
      const next: Record<string, unknown> = {
        ...row,
        [childrenField]: children,
      };
      delete next.__hasChildren;
      return next;
    }
    const kids = row[childrenField];
    if (Array.isArray(kids)) {
      return {
        ...row,
        [childrenField]: setChildrenAtKey(
          kids as Record<string, unknown>[],
          key,
          children,
          idField,
          childrenField,
          `${path}/${index}`,
        ),
      };
    }
    return row;
  });
}

function overflowTooltipText(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  return text.trim().length === 0 ? "" : text;
}

function shouldShowOverflowTooltip(
  column: VirtualGridColumn,
  showOverflowTooltip: boolean,
  autoHeight: boolean,
): boolean {
  if (column.showOverflowTooltip != null) return column.showOverflowTooltip;
  if (autoHeight) return false;
  return showOverflowTooltip;
}

function rowLabel(row: Record<string, unknown>, key: string): string {
  const name = row.name;
  return typeof name === "string" && name.length > 0 ? name : key;
}

function isRowExpandable(
  expandable: boolean | ((row: Record<string, unknown>) => boolean) | undefined,
  row: Record<string, unknown>,
): boolean {
  if (expandable === undefined || expandable === false) return false;
  if (expandable === true) return true;
  return expandable(row);
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
  showOverflowTooltip = true,
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
  tree = false,
  childrenField = "children",
  expandedKeys: expandedKeysProp,
  defaultExpandedKeys = [],
  onExpandedKeysChange,
  cascadeParent = false,
  cascadeChild = false,
  loadData,
  expandable,
  expandedRowKeys: expandedRowKeysProp,
  defaultExpandedRowKeys = [],
  onExpandedRowKeysChange,
  renderExpandedRow,
  renderCell,
  renderHeader,
  editable = false,
  editMode = "cell",
  onCellChange,
  editingRowKey: editingRowKeyProp,
  defaultEditingRowKey = null,
  onEditingRowKeyChange,
  onRowSave,
  onRowCancel,
  remote = false,
  total: totalProp,
  loading = false,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  filters: filtersProp,
  defaultFilters = {},
  onFiltersChange,
}: VirtualGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [heightCache, setHeightCache] = useState<Array<number | undefined>>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const loadingKeysRef = useRef(new Set<string>());
  const cellCommitLockRef = useRef(false);

  const [treeData, setTreeData] = useState(data);
  useEffect(() => {
    if (tree) setTreeData(data);
  }, [tree, data]);

  const [uncontrolledSelectedKeys, setUncontrolledSelectedKeys] =
    useState<string[]>(defaultSelectedKeys);
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
  const [uncontrolledPageSize, setUncontrolledPageSize] =
    useState(defaultPageSize);
  const [uncontrolledExpandedKeys, setUncontrolledExpandedKeys] =
    useState<string[]>(defaultExpandedKeys);
  const [uncontrolledExpandedRowKeys, setUncontrolledExpandedRowKeys] =
    useState<string[]>(defaultExpandedRowKeys);
  const [uncontrolledEditingRowKey, setUncontrolledEditingRowKey] = useState<
    string | null
  >(defaultEditingRowKey);
  const [uncontrolledSort, setUncontrolledSort] = useState<SortState | null>(
    defaultSort,
  );
  const [uncontrolledFilters, setUncontrolledFilters] =
    useState<FilterState>(defaultFilters);
  const [editingCell, setEditingCell] = useState<{
    rowKey: string;
    field: string;
  } | null>(null);
  const [cellDraft, setCellDraft] = useState("");
  const [rowDraft, setRowDraft] = useState<Record<string, string>>({});

  const selectedKeys = selectedKeysProp ?? uncontrolledSelectedKeys;
  const page = pageProp ?? uncontrolledPage;
  const pageSize = pageSizeProp ?? uncontrolledPageSize;
  const expandedKeys = expandedKeysProp ?? uncontrolledExpandedKeys;
  const expandedRowKeys = expandedRowKeysProp ?? uncontrolledExpandedRowKeys;
  const editingRowKey = editingRowKeyProp ?? uncontrolledEditingRowKey;
  const sort = sortProp !== undefined ? sortProp : uncontrolledSort;
  const filters = filtersProp ?? uncontrolledFilters;

  const showExpandCol = expandable !== undefined && expandable !== false;
  const showRowActions = editMode === "row";
  const useCascade = tree && (cascadeParent || cascadeChild);

  function commitSelectedKeys(next: string[]) {
    if (selectedKeysProp === undefined) setUncontrolledSelectedKeys(next);
    onSelectedKeysChange?.(next);
  }

  function commitExpandedKeys(next: string[]) {
    if (expandedKeysProp === undefined) setUncontrolledExpandedKeys(next);
    onExpandedKeysChange?.(next);
  }

  function commitExpandedRowKeys(next: string[]) {
    if (expandedRowKeysProp === undefined) setUncontrolledExpandedRowKeys(next);
    onExpandedRowKeysChange?.(next);
  }

  function commitEditingRowKey(next: string | null) {
    if (editingRowKeyProp === undefined) setUncontrolledEditingRowKey(next);
    onEditingRowKeyChange?.(next);
  }

  function commitSort(next: SortState | null) {
    if (sortProp === undefined) setUncontrolledSort(next);
    onSortChange?.(next);
    if (pagination && !remote) {
      setPage(1);
    }
  }

  function commitFilters(next: FilterState) {
    if (filtersProp === undefined) setUncontrolledFilters(next);
    onFiltersChange?.(next);
    if (pagination && !remote) {
      setPage(1);
    }
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

  const sortedSource = useMemo(() => {
    const source = tree ? treeData : data;
    const predicates = Object.fromEntries(
      leafColumns
        .filter((col) => col.filter)
        .map((col) => [col.field, col.filter!]),
    );
    const filtered =
      remote
        ? source
        : filterRows(source, filters, {
            predicates,
            childrenField: tree ? childrenField : undefined,
          });
    if (remote || !sort) return filtered;
    const column = leafColumns.find((col) => col.field === sort.field);
    return sortRows(filtered, sort, {
      compare: column?.sorter,
      childrenField: tree ? childrenField : undefined,
    });
  }, [
    tree,
    treeData,
    data,
    remote,
    filters,
    sort,
    leafColumns,
    childrenField,
  ]);

  const treeFlat = useMemo(() => {
    if (!tree) return null;
    const revealKeys =
      !remote && activeFilterEntries(filters).length > 0
        ? collectExpandableKeys(sortedSource, { idField, childrenField })
        : [];
    return flattenTree({
      data: sortedSource,
      idField,
      childrenField,
      expandedKeys:
        revealKeys.length > 0
          ? [...new Set([...expandedKeys, ...revealKeys])]
          : expandedKeys,
    });
  }, [
    tree,
    sortedSource,
    idField,
    childrenField,
    expandedKeys,
    remote,
    filters,
  ]);

  const treeMetaByKey = useMemo(() => {
    const map = new Map<string, TreeFlatRow>();
    if (!treeFlat) return map;
    for (const item of treeFlat) map.set(item.key, item);
    return map;
  }, [treeFlat]);

  const displayRows = useMemo((): DisplayRow[] => {
    if (tree && treeFlat) {
      return treeFlat.map((item, dataIndex) => ({
        kind: "data" as const,
        row: item.row,
        dataIndex,
      }));
    }
    return buildGroupedRows(sortedSource, groupBy);
  }, [tree, treeFlat, sortedSource, groupBy]);

  const pagedBaseRows = useMemo(
    () =>
      pagination && !remote
        ? slicePage(displayRows, {
            pageIndex: page,
            pageSize,
            total: displayRows.length,
          })
        : displayRows,
    [displayRows, pagination, remote, page, pageSize],
  );

  const paginationTotal = totalProp ?? (remote ? data.length : displayRows.length);

  const pagedDisplayRows = useMemo((): BodyDisplayRow[] => {
    if (!showExpandCol) return pagedBaseRows;
    const out: BodyDisplayRow[] = [];
    for (const display of pagedBaseRows) {
      out.push(display);
      if (display.kind !== "data") continue;
      const key =
        display.row[idField] !== undefined && display.row[idField] !== null
          ? String(display.row[idField])
          : String(display.dataIndex);
      if (
        isRowExpandable(expandable, display.row) &&
        expandedRowKeys.includes(key)
      ) {
        out.push({
          kind: "detail",
          row: display.row,
          dataIndex: display.dataIndex,
          key,
        });
      }
    }
    return out;
  }, [
    pagedBaseRows,
    showExpandCol,
    expandable,
    expandedRowKeys,
    idField,
  ]);

  useEffect(() => {
    setHeightCache(new Array(pagedDisplayRows.length));
  }, [pagedDisplayRows.length, page, pageSize]);

  function rowKey(row: Record<string, unknown>, absoluteIndex: number): string {
    const v = row[idField];
    return v !== undefined && v !== null ? String(v) : String(absoluteIndex);
  }

  const allKeys = useMemo(
    () =>
      pagedBaseRows
        .filter(
          (d): d is Extract<DisplayRow, { kind: "data" }> => d.kind === "data",
        )
        .map((d) => rowKey(d.row, d.dataIndex)),
    [pagedBaseRows, idField],
  );

  const canVirtualize =
    virtual &&
    typeof height === "number" &&
    spanMethod === undefined &&
    !showExpandCol;
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
    () =>
      buildLayout(
        leafColumns,
        selectable,
        showRowNumber,
        showExpandCol,
        showRowActions,
      ),
    [leafColumns, selectable, showRowNumber, showExpandCol, showRowActions],
  );

  const prefixCount =
    (selectable ? 1 : 0) + (showExpandCol ? 1 : 0) + (showRowNumber ? 1 : 0);

  const gridTemplateColumns = useMemo(
    () =>
      layout
        .map((item) => {
          if (item.kind === "data") {
            if (item.width === 0) return "1fr";
            return `${item.width}px`;
          }
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
    // spanMethod only applies to DisplayRow (no detail rows)
    return normalizeSpans({
      displayRows: pagedBaseRows,
      columns: leafColumns,
      spanMethod,
    });
  }, [spanMethod, pagedBaseRows, leafColumns]);

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

  function handleToggleSelect(key: string) {
    if (useCascade) {
      commitSelectedKeys(
        cascadeToggleKey({
          selectedKeys,
          key,
          data: treeData,
          idField,
          childrenField,
          multiple,
          cascadeChild,
          cascadeParent,
        }),
      );
      return;
    }
    commitSelectedKeys(toggleKey(selectedKeys, key, multiple));
  }

  async function handleTreeExpand(flat: TreeFlatRow) {
    const nextKeys = toggleExpandKey(expandedKeys, flat.key);
    const willExpand = !flat.expanded;
    commitExpandedKeys(nextKeys);

    if (!willExpand || !loadData) return;
    const kids = flat.row[childrenField];
    const hasKids = Array.isArray(kids) && kids.length > 0;
    if (hasKids) return;
    if (loadingKeysRef.current.has(flat.key)) return;
    loadingKeysRef.current.add(flat.key);
    try {
      const loaded = await loadData(flat.row);
      setTreeData((prev) =>
        setChildrenAtKey(prev, flat.key, loaded, idField, childrenField),
      );
    } finally {
      loadingKeysRef.current.delete(flat.key);
    }
  }

  function handleRowExpandToggle(key: string) {
    commitExpandedRowKeys(toggleExpandKey(expandedRowKeys, key));
  }

  function findDataRow(key: string): Record<string, unknown> | undefined {
    for (const display of displayRows) {
      if (display.kind !== "data") continue;
      if (rowKey(display.row, display.dataIndex) === key) return display.row;
    }
    return undefined;
  }

  function initRowDraft(row: Record<string, unknown>) {
    const draft: Record<string, string> = {};
    for (const column of leafColumns) {
      if (columnCanEdit(column, editable)) {
        draft[column.field] = String(row[column.field] ?? "");
      }
    }
    setRowDraft(draft);
  }

  useEffect(() => {
    if (editMode !== "row" || editingRowKey == null) {
      setRowDraft({});
      return;
    }
    const row = findDataRow(editingRowKey);
    if (row) initRowDraft(row);
    // Intentionally re-seed draft when the editing key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync draft to editingRowKey
  }, [editMode, editingRowKey, leafColumns, editable, displayRows]);

  function beginCellEdit(
    key: string,
    column: VirtualGridColumn,
    row: Record<string, unknown>,
  ) {
    if (editMode !== "cell" || !columnCanEdit(column, editable)) return;
    cellCommitLockRef.current = false;
    setEditingCell({ rowKey: key, field: column.field });
    setCellDraft(String(row[column.field] ?? ""));
  }

  function beginRowEdit(key: string, row: Record<string, unknown>) {
    if (editMode !== "row") return;
    initRowDraft(row);
    commitEditingRowKey(key);
  }

  function cancelCellEdit() {
    cellCommitLockRef.current = true;
    setEditingCell(null);
    setCellDraft("");
  }

  function commitCellEdit(
    key: string,
    field: string,
    row: Record<string, unknown>,
    value: string,
  ) {
    if (cellCommitLockRef.current) return;
    cellCommitLockRef.current = true;
    onCellChange?.({ rowKey: key, field, value, row });
    setEditingCell(null);
    setCellDraft("");
  }

  function handleCellEditorKeyDown(
    e: KeyboardEvent,
    key: string,
    field: string,
    row: Record<string, unknown>,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitCellEdit(key, field, row, cellDraft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelCellEdit();
    }
  }

  function saveRowEdit(row: Record<string, unknown>) {
    onRowSave?.({ ...row, ...rowDraft });
    commitEditingRowKey(null);
    setRowDraft({});
  }

  function cancelRowEdit(key: string) {
    onRowCancel?.(key);
    commitEditingRowKey(null);
    setRowDraft({});
  }

  function renderDataCell(
    column: VirtualGridColumn,
    row: Record<string, unknown>,
    rowIndex: number,
    treeMeta?: TreeFlatRow,
    isFirstDataCol?: boolean,
  ): ReactNode {
    const key = rowKey(row, rowIndex);
    const canEdit = columnCanEdit(column, editable);
    const isCellEditing =
      editMode === "cell" &&
      editingCell?.rowKey === key &&
      editingCell.field === column.field;
    const isRowEditing = editMode === "row" && editingRowKey === key && canEdit;

    if (isCellEditing) {
      return (
        <div
          className="w-full min-w-0"
          onKeyDown={(e) => handleCellEditorKeyDown(e, key, column.field, row)}
        >
          <Input
            value={cellDraft}
            onChange={setCellDraft}
            onBlur={() => commitCellEdit(key, column.field, row, cellDraft)}
          />
        </div>
      );
    }

    if (isRowEditing) {
      return (
        <Input
          value={rowDraft[column.field] ?? String(row[column.field] ?? "")}
          onChange={(next) =>
            setRowDraft((prev) => ({ ...prev, [column.field]: next }))
          }
        />
      );
    }

    const value = row[column.field];
    const ctx: VirtualGridCellContext = { row, column, value, rowIndex };
    let content: ReactNode;
    if (column.render) content = column.render(ctx);
    else if (renderCell) content = renderCell(ctx);
    else content = String(value ?? "");

    const wrapEditable = (node: ReactNode) => {
      if (!canEdit) return node;
      return (
        <div
          className="min-w-0 w-full truncate"
          onDoubleClick={() => {
            if (editMode === "cell") beginCellEdit(key, column, row);
            else beginRowEdit(key, row);
          }}
        >
          {node}
        </div>
      );
    };

    const usedCustom = Boolean(column.render) || Boolean(renderCell);
    const wrapOverflow = (node: ReactNode, triggerClass: string) => {
      const text = overflowTooltipText(value);
      if (
        usedCustom ||
        !shouldShowOverflowTooltip(column, showOverflowTooltip, autoHeight) ||
        !text
      ) {
        return node;
      }
      return (
        <Tooltip content={text} onlyIfOverflow className={triggerClass}>
          {node}
        </Tooltip>
      );
    };

    if (tree && isFirstDataCol) {
      const depth = treeMeta?.depth ?? 0;
      const hasChildren = treeMeta?.hasChildren ?? false;
      const expanded = treeMeta?.expanded ?? false;
      const label = rowLabel(row, treeMeta?.key ?? key);
      return wrapOverflow(
        wrapEditable(
        <div
          className="flex min-w-0 items-center gap-1"
          style={{ paddingLeft: depth * TREE_INDENT }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              aria-label={expanded ? `折叠 ${label}` : `展开 ${label}`}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation();
                if (treeMeta) void handleTreeExpand(treeMeta);
              }}
            >
              <span
                aria-hidden
                className="inline-block text-[10px] leading-none"
                style={{
                  transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                ▶
              </span>
            </button>
          ) : (
            <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 truncate">{content}</span>
        </div>,
      ),
        "min-w-0 w-full",
    );
    }
    return wrapOverflow(wrapEditable(content), "block min-w-0 w-full truncate");
  }

  function renderHeaderLabel(column: VirtualGridColumn): ReactNode {
    const ctx: VirtualGridHeaderContext = { column };
    if (column.renderHeader) return column.renderHeader(ctx);
    if (renderHeader) return renderHeader(ctx);
    return column.title;
  }

  function isLeafSortable(column: VirtualGridColumn): boolean {
    return !!column.sortable && !(column.children && column.children.length > 0);
  }

  function isLeafFilterable(column: VirtualGridColumn): boolean {
    return !!column.filterable && !(column.children && column.children.length > 0);
  }

  const hasFilterableLeaf = leafColumns.some(isLeafFilterable);

  function headerAriaSort(
    column: VirtualGridColumn | undefined,
  ): "none" | "ascending" | "descending" | undefined {
    if (!column || !isLeafSortable(column)) return undefined;
    if (sort?.field === column.field) {
      return sort.order === "asc" ? "ascending" : "descending";
    }
    return "none";
  }

  function renderHeaderCell(column: VirtualGridColumn): ReactNode {
    const label = renderHeaderLabel(column);
    const titleNode = isLeafSortable(column) ? (
      <button
        type="button"
        className="inline-flex min-w-0 items-center gap-1 text-left"
        onClick={() => commitSort(nextSortState(sort, column.field))}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="shrink-0 text-xs text-slate-400">
          {sort?.field === column.field
            ? sort.order === "asc"
              ? "↑"
              : "↓"
            : "↕"}
        </span>
      </button>
    ) : (
      label
    );
    if (!isLeafFilterable(column)) return titleNode;
    return (
      <div className="flex min-w-0 flex-col items-stretch gap-1">
        {titleNode}
        <label className="block min-w-0 font-normal">
          <span className="sr-only">{`筛选${column.title}`}</span>
          <Input
            type="search"
            clearable
            value={filters[column.field] ?? ""}
            placeholder="筛选"
            onChange={(value) =>
              commitFilters(setFilterValue(filters, column.field, value))
            }
          />
        </label>
      </div>
    );
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

  function renderDetailRow(
    display: Extract<BodyDisplayRow, { kind: "detail" }>,
    absoluteIndex: number,
  ) {
    return (
      <div
        key={`detail-${display.key}-${absoluteIndex}`}
        role="row"
        aria-rowindex={absoluteIndex + 2}
        data-vg-row={absoluteIndex}
        style={{
          display: "grid",
          gridTemplateColumns,
          minHeight: rowHeight,
        }}
        className="bg-slate-50"
      >
        <div
          role="cell"
          className={`${cellClass(true)} bg-slate-50`}
          style={{ gridColumn: "1 / -1" }}
        >
          {renderExpandedRow?.({
            row: display.row,
            rowIndex: display.dataIndex,
          })}
        </div>
      </div>
    );
  }

  function renderDataRow(
    display: Extract<DisplayRow, { kind: "data" }>,
    absoluteIndex: number,
  ) {
    const key = rowKey(display.row, display.dataIndex);
    const treeMeta = treeMetaByKey.get(key);
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
    const rowCanExpand = isRowExpandable(expandable, display.row);
    const rowExpanded = expandedRowKeys.includes(key);
    const firstDataField = leafColumns[0]?.field;

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
            const indeterminate =
              useCascade &&
              isTreeIndeterminate(
                selectedKeys,
                key,
                treeData,
                idField,
                childrenField,
              );
            return (
              <div
                key="__sel"
                role="cell"
                className={cellClass(autoHeight)}
                style={stickyStyle(item, false, rowBg)}
              >
                <Checkbox
                  checked={selectedKeys.includes(key)}
                  indeterminate={indeterminate}
                  onCheckedChange={() => handleToggleSelect(key)}
                >
                  <span className="sr-only">
                    选择第 {display.dataIndex + 1} 行
                  </span>
                </Checkbox>
              </div>
            );
          }
          if (item.kind === "expand") {
            return (
              <div
                key="__exp"
                role="cell"
                className={cellClass(autoHeight)}
                style={stickyStyle(item, false, rowBg)}
              >
                {rowCanExpand ? (
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                    aria-label={
                      rowExpanded
                        ? `折叠行 ${display.dataIndex + 1}`
                        : `展开行 ${display.dataIndex + 1}`
                    }
                    aria-expanded={rowExpanded}
                    onClick={() => handleRowExpandToggle(key)}
                  >
                    <span
                      aria-hidden
                      className="inline-block text-[10px] leading-none"
                      style={{
                        transform: rowExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      ▶
                    </span>
                  </button>
                ) : null}
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
          if (item.kind === "actions") {
            const isEditing = editingRowKey === key;
            return (
              <div
                key="__actions"
                role="cell"
                className={cellClass(autoHeight)}
                style={stickyStyle(item, false, rowBg)}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="primary"
                      className="!rounded px-2 !py-0.5 text-xs"
                      onClick={() => saveRowEdit(display.row)}
                    >
                      保存
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="!rounded px-2 !py-0.5 text-xs"
                      onClick={() => cancelRowEdit(key)}
                    >
                      取消
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          }
          const isFirstDataCol = item.column.field === firstDataField;
          return (
            <div
              key={item.column.field}
              role="cell"
              className={cellClass(autoHeight)}
              style={stickyStyle(item, false, rowBg)}
              title={overflowTitle(display.row[item.column.field])}
            >
              {renderDataCell(
                item.column,
                display.row,
                display.dataIndex,
                treeMeta,
                isFirstDataCol,
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderDisplayRow(display: BodyDisplayRow, absoluteIndex: number) {
    if (display.kind === "group") {
      return renderGroupRow(display, absoluteIndex);
    }
    if (display.kind === "detail") {
      return renderDetailRow(display, absoluteIndex);
    }
    return renderDataRow(display, absoluteIndex);
  }

  function renderSpannedBody() {
    const rows = pagedBaseRows;
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
      const treeMeta = treeMetaByKey.get(key);
      const stripeBg = stripe && display.dataIndex % 2 === 1;
      const rowBg = stripeBg ? "rgb(248 250 252)" : "rgb(255 255 255)";
      const rowCells: ReactNode[] = [];
      const firstDataField = leafColumns[0]?.field;

      let colOffset = 1;
      if (selectable) {
        const selItem = layout.find((i) => i.kind === "selection")!;
        const indeterminate =
          useCascade &&
          isTreeIndeterminate(
            selectedKeys,
            key,
            treeData,
            idField,
            childrenField,
          );
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
              indeterminate={indeterminate}
              onCheckedChange={() => handleToggleSelect(key)}
            >
              <span className="sr-only">选择第 {display.dataIndex + 1} 行</span>
            </Checkbox>
          </div>,
        );
        colOffset++;
      }
      if (showExpandCol) {
        const expItem = layout.find((i) => i.kind === "expand")!;
        const rowCanExpand = isRowExpandable(expandable, display.row);
        const rowExpanded = expandedRowKeys.includes(key);
        rowCells.push(
          <div
            key={`exp-${r}`}
            role="cell"
            className={cellClass(false)}
            style={{
              gridRow: r + 1,
              gridColumn: colOffset,
              ...stickyStyle(expItem, false, rowBg),
            }}
          >
            {rowCanExpand ? (
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                aria-label={
                  rowExpanded
                    ? `折叠行 ${display.dataIndex + 1}`
                    : `展开行 ${display.dataIndex + 1}`
                }
                aria-expanded={rowExpanded}
                onClick={() => handleRowExpandToggle(key)}
              >
                <span aria-hidden className="inline-block text-[10px]">
                  ▶
                </span>
              </button>
            ) : null}
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
            title={overflowTitle(display.row[column.field])}
          >
            {renderDataCell(
              column,
              display.row,
              display.dataIndex,
              treeMeta,
              column.field === firstDataField,
            )}
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
    (item) =>
      item.kind === "selection" ||
      item.kind === "expand" ||
      item.kind === "rowNumber",
  );

  return (
    <div
      className={rootCls}
      role="table"
      aria-rowcount={pagedDisplayRows.length + 1}
      aria-busy={loading || undefined}
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
            gridTemplateRows: `repeat(${headerDepth}, ${
              hasFilterableLeaf ? "minmax(" + rowHeight + "px, auto)" : `${rowHeight}px`
            })`,
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
            if (item.kind === "expand") {
              return (
                <div
                  key="__exp"
                  role="columnheader"
                  className={cellClass(false)}
                  style={{
                    gridColumn: idx + 1,
                    gridRow: `1 / span ${headerDepth}`,
                    ...stickyStyle(item, true, headerBg),
                  }}
                  aria-label="展开"
                />
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
                aria-sort={headerAriaSort(cell.column as VirtualGridColumn)}
                style={{
                  gridColumn,
                  gridRow,
                  ...sticky,
                }}
                title={overflowTitle(cell.title)}
              >
                {cell.column
                  ? renderHeaderCell(cell.column as VirtualGridColumn)
                  : cell.title}
              </div>
            );
          })}
          {showRowActions ? (
            <div
              key="__actions"
              role="columnheader"
              className={cellClass(false)}
              style={{
                gridColumn: layout.length,
                gridRow: `1 / span ${headerDepth}`,
                background: headerBg,
              }}
              aria-label="操作"
            />
          ) : null}
        </div>

        {loading ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-[3] flex items-start justify-center bg-white/60 pt-16 text-sm text-slate-600"
            aria-live="polite"
          >
            加载中...
          </div>
        ) : null}

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
