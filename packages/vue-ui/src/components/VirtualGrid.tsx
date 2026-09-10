import {
  buildGroupedRows,
  buildHeaderRows,
  cascadeToggleKey,
  clearKeys,
  computeVirtualWindow,
  flattenLeafColumns,
  flattenTree,
  isAllSelected,
  isIndeterminate,
  isTreeIndeterminate,
  nextSortState,
  normalizeSpans,
  selectAllKeys,
  slicePage,
  sortRows,
  toggleExpandKey,
  toggleKey,
  type DisplayRow,
  type GridColumn,
  type GroupByConfig,
  type HeaderCell,
  type SortCompare,
  type SortState,
  type SpanMethod,
  type TreeFlatRow,
} from "@component-ai/grid-core";
import {
  computed,
  defineComponent,
  nextTick,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
  watch,
  type CSSProperties,
  type PropType,
} from "vue";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";
import { Pagination } from "./Pagination";

export type VirtualGridColumn = GridColumn & {
  /** When set, overrides table-level `editable` for this column. */
  editable?: boolean;
  sortable?: boolean;
  sorter?: SortCompare;
};

export type VirtualGridCellChangePayload = {
  rowKey: string;
  field: string;
  value: string;
  row: Record<string, unknown>;
};

export type VirtualGridEditMode = "cell" | "row";

export type VirtualGridCellContext = {
  row: Record<string, unknown>;
  column: VirtualGridColumn;
  value: unknown;
  rowIndex: number;
};

export type VirtualGridHeaderContext = {
  column: VirtualGridColumn;
};

export type VirtualGridExpandContext = {
  row: Record<string, unknown>;
  rowIndex: number;
};

export type { GroupByConfig, SortState, SpanMethod };

const ROW_NUMBER_WIDTH = 48;
const SELECTION_WIDTH = 40;
const DEFAULT_COL_WIDTH = 120;
const TREE_INDENT = 16;
const TREE_TOGGLE_WIDTH = 20;

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

type TreeMeta = {
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  key: string;
};

type DataBodyRow = Extract<DisplayRow, { kind: "data" }> & {
  tree?: TreeMeta;
};

type DetailBodyRow = {
  kind: "detail";
  row: Record<string, unknown>;
  dataIndex: number;
  key: string;
};

type BodyRow =
  | Extract<DisplayRow, { kind: "group" }>
  | DataBodyRow
  | DetailBodyRow;

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

function childrenOf(
  row: Record<string, unknown>,
  childrenField: string,
): Record<string, unknown>[] {
  const c = row[childrenField];
  return Array.isArray(c) ? (c as Record<string, unknown>[]) : [];
}

function nodeKey(
  row: Record<string, unknown>,
  idField: string,
  fallback: string,
): string {
  const v = row[idField];
  return v !== undefined && v !== null ? String(v) : fallback;
}

/** Merge async loadData children into a copy of the tree for flatten/cascade. */
function applyLoadedChildren(
  rows: Record<string, unknown>[],
  cache: Map<string, Record<string, unknown>[]>,
  idField: string,
  childrenField: string,
  path = "r",
): Record<string, unknown>[] {
  return rows.map((row, index) => {
    const key = nodeKey(row, idField, `${path}/${index}`);
    const loaded = cache.get(key);
    const existing = childrenOf(row, childrenField);
    const kids = loaded ?? existing;
    const nextKids = applyLoadedChildren(
      kids,
      cache,
      idField,
      childrenField,
      `${path}/${index}`,
    );
    if (loaded !== undefined || nextKids !== kids) {
      return { ...row, [childrenField]: nextKids };
    }
    return row;
  });
}

function insertDetailRows(
  rows: BodyRow[],
  expandedRowKeys: readonly string[],
  idField: string,
  isRowExpandable: (row: Record<string, unknown>) => boolean,
): BodyRow[] {
  if (expandedRowKeys.length === 0 && !rows.some((r) => r.kind === "data")) {
    return rows;
  }
  const expanded = new Set(expandedRowKeys);
  const out: BodyRow[] = [];
  for (const row of rows) {
    out.push(row);
    if (row.kind !== "data") continue;
    const key = nodeKey(row.row, idField, String(row.dataIndex));
    if (isRowExpandable(row.row) && expanded.has(key)) {
      out.push({
        kind: "detail",
        row: row.row,
        dataIndex: row.dataIndex,
        key,
      });
    }
  }
  return out;
}

export const VirtualGrid = defineComponent({
  name: "VirtualGrid",
  props: {
    columns: { type: Array as PropType<VirtualGridColumn[]>, required: true },
    data: {
      type: Array as PropType<Record<string, unknown>[]>,
      required: true,
    },
    idField: { type: String, default: "id" },
    rowHeight: { type: Number, default: 36 },
    height: {
      type: [Number, String] as PropType<number | string | undefined>,
      default: undefined,
    },
    virtual: { type: Boolean, default: false },
    overscan: { type: Number, default: 4 },
    autoHeight: { type: Boolean, default: false },
    bordered: { type: Boolean, default: true },
    stripe: { type: Boolean, default: false },
    showRowNumber: { type: Boolean, default: false },
    emptyText: { type: String, default: "暂无数据" },
    class: { type: String, default: "" },
    selectable: { type: Boolean, default: false },
    multiple: { type: Boolean, default: true },
    selectedKeys: {
      type: Array as PropType<string[] | undefined>,
      default: undefined,
    },
    defaultSelectedKeys: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    showSelectAll: { type: Boolean, default: true },
    pagination: { type: Boolean, default: false },
    page: { type: Number, default: undefined },
    defaultPage: { type: Number, default: 1 },
    pageSize: { type: Number, default: undefined },
    defaultPageSize: { type: Number, default: 10 },
    pageSizeOptions: {
      type: Array as PropType<number[] | undefined>,
      default: undefined,
    },
    groupBy: {
      type: [String, Array] as PropType<GroupByConfig | undefined>,
      default: undefined,
    },
    spanMethod: {
      type: Function as PropType<SpanMethod | undefined>,
      default: undefined,
    },
    tree: { type: Boolean, default: false },
    childrenField: { type: String, default: "children" },
    expandedKeys: {
      type: Array as PropType<string[] | undefined>,
      default: undefined,
    },
    defaultExpandedKeys: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    cascadeParent: { type: Boolean, default: false },
    cascadeChild: { type: Boolean, default: false },
    loadData: {
      type: Function as PropType<
        | ((row: Record<string, unknown>) => Promise<Record<string, unknown>[]>)
        | undefined
      >,
      default: undefined,
    },
    expandable: {
      type: [Boolean, Function] as PropType<
        boolean | ((row: Record<string, unknown>) => boolean)
      >,
      default: false,
    },
    expandedRowKeys: {
      type: Array as PropType<string[] | undefined>,
      default: undefined,
    },
    defaultExpandedRowKeys: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    editable: { type: Boolean, default: false },
    editMode: {
      type: String as PropType<VirtualGridEditMode>,
      default: "cell",
    },
    editingRowKey: {
      type: String as PropType<string | null | undefined>,
      default: undefined,
    },
    defaultEditingRowKey: {
      type: String as PropType<string | null>,
      default: null,
    },
    remote: { type: Boolean, default: false },
    total: { type: Number, default: undefined },
    loading: { type: Boolean, default: false },
    sort: {
      type: Object as PropType<SortState | null | undefined>,
      default: undefined,
    },
    defaultSort: {
      type: Object as PropType<SortState | null>,
      default: null,
    },
  },
  emits: {
    "update:selectedKeys": (_keys: string[]) => true,
    "update:page": (_page: number) => true,
    "update:pageSize": (_pageSize: number) => true,
    "update:expandedKeys": (_keys: string[]) => true,
    "update:expandedRowKeys": (_keys: string[]) => true,
    "update:editingRowKey": (_key: string | null) => true,
    "update:sort": (_sort: SortState | null) => true,
    cellChange: (_payload: VirtualGridCellChangePayload) => true,
    rowSave: (_row: Record<string, unknown>) => true,
    rowCancel: (_rowKey: string) => true,
  },
  setup(props, { emit, slots }) {
    const scrollTop = ref(0);
    const headerHeight = ref(0);
    const heightCache = ref<Array<number | undefined>>([]);
    const scrollerRef = ref<HTMLElement | null>(null);
    const headerRef = ref<HTMLElement | null>(null);
    let rowObservers: ResizeObserver[] = [];

    const uncontrolledSelectedKeys = ref<string[]>(props.defaultSelectedKeys);
    const uncontrolledPage = ref(props.defaultPage);
    const uncontrolledPageSize = ref(props.defaultPageSize);
    const uncontrolledExpandedKeys = ref<string[]>(props.defaultExpandedKeys);
    const uncontrolledExpandedRowKeys = ref<string[]>(
      props.defaultExpandedRowKeys,
    );
    const uncontrolledEditingRowKey = ref<string | null>(
      props.defaultEditingRowKey,
    );
    const uncontrolledSort = ref<SortState | null>(props.defaultSort);
    const childrenCache = ref(
      new Map<string, Record<string, unknown>[]>(),
    );
    const loadingKeys = ref(new Set<string>());

    type CellEditState = { rowKey: string; field: string; draft: string };
    const cellEdit = ref<CellEditState | null>(null);
    const rowDraft = ref<Record<string, string>>({});
    let skipCellBlurCommit = false;

    const selectedKeys = computed(
      () => props.selectedKeys ?? uncontrolledSelectedKeys.value,
    );
    const page = computed(() => props.page ?? uncontrolledPage.value);
    const pageSize = computed(
      () => props.pageSize ?? uncontrolledPageSize.value,
    );
    const expandedKeys = computed(
      () => props.expandedKeys ?? uncontrolledExpandedKeys.value,
    );
    const expandedRowKeys = computed(
      () => props.expandedRowKeys ?? uncontrolledExpandedRowKeys.value,
    );
    const editingRowKey = computed(
      () =>
        props.editingRowKey !== undefined
          ? props.editingRowKey
          : uncontrolledEditingRowKey.value,
    );
    const sort = computed(() =>
      props.sort !== undefined ? props.sort : uncontrolledSort.value,
    );

    function commitSelectedKeys(next: string[]) {
      if (props.selectedKeys === undefined) uncontrolledSelectedKeys.value = next;
      emit("update:selectedKeys", next);
    }

    function commitExpandedKeys(next: string[]) {
      if (props.expandedKeys === undefined) uncontrolledExpandedKeys.value = next;
      emit("update:expandedKeys", next);
    }

    function commitExpandedRowKeys(next: string[]) {
      if (props.expandedRowKeys === undefined) {
        uncontrolledExpandedRowKeys.value = next;
      }
      emit("update:expandedRowKeys", next);
    }

    function commitEditingRowKey(next: string | null) {
      if (props.editingRowKey === undefined) {
        uncontrolledEditingRowKey.value = next;
      }
      emit("update:editingRowKey", next);
    }

    function commitSort(next: SortState | null) {
      if (props.sort === undefined) uncontrolledSort.value = next;
      emit("update:sort", next);
      if (props.pagination && !props.remote) {
        setPage(1);
      }
    }

    function setPage(next: number) {
      if (props.page === undefined) uncontrolledPage.value = next;
      emit("update:page", next);
    }

    function setPageSize(next: number) {
      if (props.pageSize === undefined) uncontrolledPageSize.value = next;
      emit("update:pageSize", next);
      if (props.page === undefined) uncontrolledPage.value = 1;
      emit("update:page", 1);
    }

    function isRowExpandable(row: Record<string, unknown>): boolean {
      const exp = props.expandable;
      if (typeof exp === "function") return exp(row);
      return !!exp;
    }

    function hasExpandableFeature(): boolean {
      return props.expandable !== false;
    }

    watch(page, () => {
      scrollTop.value = 0;
    });

    const leafColumns = computed(() => flattenLeafColumns(props.columns));

    const headerRows = computed(() => buildHeaderRows(props.columns));

    const headerDepth = computed(() => Math.max(1, headerRows.value.length));

    const treeData = computed(() => {
      if (!props.tree) return props.data;
      return applyLoadedChildren(
        props.data,
        childrenCache.value,
        props.idField,
        props.childrenField,
      );
    });

    const sortedSource = computed(() => {
      const source = props.tree ? treeData.value : props.data;
      const current = sort.value;
      if (props.remote || !current) return source;
      const column = leafColumns.value.find((col) => col.field === current.field);
      return sortRows(source, current, {
        compare: (column as VirtualGridColumn | undefined)?.sorter,
        childrenField: props.tree ? props.childrenField : undefined,
      });
    });

    const baseDisplayRows = computed((): BodyRow[] => {
      if (props.tree) {
        const flat = flattenTree({
          data: sortedSource.value,
          idField: props.idField,
          childrenField: props.childrenField,
          expandedKeys: expandedKeys.value,
        });
        return flat.map(
          (t: TreeFlatRow, dataIndex: number): DataBodyRow => ({
            kind: "data",
            row: t.row,
            dataIndex,
            tree: {
              depth: t.depth,
              hasChildren: t.hasChildren,
              expanded: t.expanded,
              key: t.key,
            },
          }),
        );
      }
      return buildGroupedRows(sortedSource.value, props.groupBy);
    });

    const pagedBaseRows = computed(() =>
      props.pagination && !props.remote
        ? slicePage(baseDisplayRows.value, {
            pageIndex: page.value,
            pageSize: pageSize.value,
            total: baseDisplayRows.value.length,
          })
        : baseDisplayRows.value,
    );

    const paginationTotal = computed(() =>
      props.remote
        ? (props.total ?? props.data.length)
        : baseDisplayRows.value.length,
    );

    const pagedDisplayRows = computed((): BodyRow[] => {
      if (!hasExpandableFeature()) return pagedBaseRows.value;
      return insertDetailRows(
        pagedBaseRows.value,
        expandedRowKeys.value,
        props.idField,
        isRowExpandable,
      );
    });

    watch(
      () =>
        [pagedDisplayRows.value.length, page.value, pageSize.value] as const,
      () => {
        heightCache.value = new Array(pagedDisplayRows.value.length);
      },
      { immediate: true },
    );

    function rowKey(
      row: Record<string, unknown>,
      absoluteIndex: number,
    ): string {
      const v = row[props.idField];
      return v !== undefined && v !== null ? String(v) : String(absoluteIndex);
    }

    const allKeys = computed(() =>
      pagedDisplayRows.value
        .filter((d): d is DataBodyRow => d.kind === "data")
        .map((d) => d.tree?.key ?? rowKey(d.row, d.dataIndex)),
    );

    const canVirtualize = computed(
      () =>
        props.virtual &&
        typeof props.height === "number" &&
        props.spanMethod === undefined,
    );

    if (
      props.virtual &&
      typeof props.height !== "number" &&
      isNodeDevelopment()
    ) {
      console.warn(
        "VirtualGrid: `virtual` requires a numeric `height` prop; falling back to non-virtual rendering.",
      );
    }

    const rowScrollTop = computed(() =>
      Math.max(0, scrollTop.value - headerHeight.value),
    );

    const win = computed(() =>
      computeVirtualWindow({
        enabled: canVirtualize.value,
        rowCount: pagedDisplayRows.value.length,
        rowHeight: props.rowHeight,
        rowHeights: props.autoHeight ? heightCache.value : undefined,
        scrollTop: rowScrollTop.value,
        viewportHeight: canVirtualize.value
          ? Math.max(0, (props.height as number) - headerHeight.value)
          : 0,
        overscan: props.overscan,
      }),
    );

    const layout = computed(() =>
      buildLayout(leafColumns.value, props.selectable, props.showRowNumber),
    );

    const prefixCount = computed(
      () => (props.selectable ? 1 : 0) + (props.showRowNumber ? 1 : 0),
    );

    const gridTemplateColumns = computed(() =>
      layout.value
        .map((item) => {
          if (item.kind !== "data") return `${item.width}px`;
          if (item.width === 0) return "1fr";
          return `${item.width}px`;
        })
        .join(" "),
    );

    const placedHeaderCells = computed(() =>
      placeHeaderCells(headerRows.value, prefixCount.value),
    );

    const spanMatrix = computed(() => {
      if (!props.spanMethod) return null;
      // spanMethod path ignores detail rows; use base paged data/group rows only
      const rowsForSpan = pagedBaseRows.value.filter(
        (r): r is Extract<BodyRow, { kind: "group" } | DataBodyRow> =>
          r.kind === "group" || r.kind === "data",
      );
      return normalizeSpans({
        displayRows: rowsForSpan,
        columns: leafColumns.value,
        spanMethod: props.spanMethod,
      });
    });

    function measureHeader() {
      const el = headerRef.value;
      if (!el) return;
      const h = el.offsetHeight;
      if (Math.abs(h - headerHeight.value) >= 1) headerHeight.value = h;
    }

    function disconnectRowObservers() {
      rowObservers.forEach((o) => o.disconnect());
      rowObservers = [];
    }

    function setupRowObservers() {
      disconnectRowObservers();
      if (!props.autoHeight || props.spanMethod) return;
      const root = scrollerRef.value;
      if (!root) return;
      const nodes = root.querySelectorAll<HTMLElement>("[data-vg-row]");

      nodes.forEach((node) => {
        const index = Number(node.dataset.vgRow);
        if (Number.isNaN(index)) return;
        const apply = () => {
          const h = node.offsetHeight;
          const prev = heightCache.value;
          const cur = prev[index];
          if (cur !== undefined && Math.abs(cur - h) < 1) return;
          const next = prev.slice();
          while (next.length < pagedDisplayRows.value.length) next.push(undefined);
          next[index] = h;
          heightCache.value = next;
        };
        apply();
        if (typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(apply);
        ro.observe(node);
        rowObservers.push(ro);
      });
    }

    onMounted(() => {
      measureHeader();
      nextTick(setupRowObservers);
    });

    onUpdated(() => {
      measureHeader();
    });

    watch(
      () =>
        [
          props.autoHeight,
          props.spanMethod,
          pagedDisplayRows.value.length,
          win.value.startIndex,
          win.value.endIndex,
          canVirtualize.value,
        ] as const,
      () => {
        nextTick(setupRowObservers);
      },
    );

    onUnmounted(disconnectRowObservers);

    function onScroll(e: Event) {
      scrollTop.value = (e.currentTarget as HTMLElement).scrollTop;
    }

    function cellClass(auto: boolean): string {
      return `flex items-center overflow-hidden px-3 py-2 ${
        auto ? "whitespace-normal break-words" : "truncate"
      } ${props.bordered ? "border-b border-slate-200" : ""}`;
    }

    function toggleLabel(row: Record<string, unknown>, key: string): string {
      const name = row.name;
      return name !== undefined && name !== null ? String(name) : key;
    }

    async function onToggleTreeExpand(meta: TreeMeta, row: Record<string, unknown>) {
      const next = toggleExpandKey(expandedKeys.value, meta.key);
      const willExpand = !meta.expanded;
      commitExpandedKeys(next);

      if (
        willExpand &&
        props.loadData &&
        meta.hasChildren &&
        childrenOf(row, props.childrenField).length === 0 &&
        !childrenCache.value.has(meta.key) &&
        !loadingKeys.value.has(meta.key)
      ) {
        const loading = new Set(loadingKeys.value);
        loading.add(meta.key);
        loadingKeys.value = loading;
        try {
          const loaded = await props.loadData(row);
          const cache = new Map(childrenCache.value);
          cache.set(meta.key, loaded);
          childrenCache.value = cache;
        } finally {
          const done = new Set(loadingKeys.value);
          done.delete(meta.key);
          loadingKeys.value = done;
        }
      }
    }

    function onToggleRowExpand(key: string) {
      commitExpandedRowKeys(toggleExpandKey(expandedRowKeys.value, key));
    }

    function onToggleSelect(key: string) {
      if (
        props.tree &&
        (props.cascadeChild || props.cascadeParent)
      ) {
        commitSelectedKeys(
          cascadeToggleKey({
            selectedKeys: selectedKeys.value,
            key,
            data: treeData.value,
            idField: props.idField,
            childrenField: props.childrenField,
            multiple: props.multiple,
            cascadeChild: props.cascadeChild,
            cascadeParent: props.cascadeParent,
          }),
        );
        return;
      }
      commitSelectedKeys(toggleKey(selectedKeys.value, key, props.multiple));
    }

    function isColumnEditable(column: VirtualGridColumn): boolean {
      return (column.editable ?? props.editable) === true;
    }

    function cellValueString(row: Record<string, unknown>, field: string): string {
      const value = row[field];
      return value === undefined || value === null ? "" : String(value);
    }

    function beginCellEdit(
      rowKey: string,
      column: VirtualGridColumn,
      row: Record<string, unknown>,
    ) {
      if (props.editMode !== "cell" || !isColumnEditable(column)) return;
      cellEdit.value = {
        rowKey,
        field: column.field,
        draft: cellValueString(row, column.field),
      };
    }

    function commitCellEdit(row: Record<string, unknown>) {
      const state = cellEdit.value;
      if (!state) return;
      emit("cellChange", {
        rowKey: state.rowKey,
        field: state.field,
        value: state.draft,
        row,
      });
      cellEdit.value = null;
    }

    function cancelCellEdit() {
      skipCellBlurCommit = true;
      cellEdit.value = null;
      nextTick(() => {
        skipCellBlurCommit = false;
      });
    }

    function initRowDraft(row: Record<string, unknown>) {
      const draft: Record<string, string> = {};
      for (const col of leafColumns.value) {
        if (!isColumnEditable(col)) continue;
        draft[col.field] = cellValueString(row, col.field);
      }
      rowDraft.value = draft;
    }

    watch(
      editingRowKey,
      (key) => {
        if (!key || props.editMode !== "row") {
          rowDraft.value = {};
          return;
        }
        const found = props.data.find(
          (row, index) => rowKey(row, index) === key,
        );
        if (found) initRowDraft(found);
      },
      { immediate: true },
    );

    function saveRowEdit(row: Record<string, unknown>) {
      const next = { ...row };
      for (const [field, value] of Object.entries(rowDraft.value)) {
        next[field] = value;
      }
      emit("rowSave", next);
      rowDraft.value = {};
      commitEditingRowKey(null);
    }

    function cancelRowEdit(key: string) {
      rowDraft.value = {};
      emit("rowCancel", key);
      commitEditingRowKey(null);
    }

    function renderDataCell(
      column: VirtualGridColumn,
      row: Record<string, unknown>,
      rowIndex: number,
      key: string,
    ) {
      const value = row[column.field];
      const ctx: VirtualGridCellContext = { row, column, value, rowIndex };
      const fieldSlot = slots[`cell-${column.field}`];
      if (fieldSlot) return fieldSlot(ctx);
      if (slots.cell) return slots.cell(ctx);

      const editable = isColumnEditable(column);
      const isRowEditing =
        props.editMode === "row" && editingRowKey.value === key && editable;
      const isCellEditing =
        props.editMode === "cell" &&
        cellEdit.value?.rowKey === key &&
        cellEdit.value?.field === column.field;

      if (isRowEditing) {
        return (
          <div
            class="w-full min-w-0"
            onKeydown={(e: KeyboardEvent) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancelRowEdit(key);
              }
            }}
          >
            <Input
              modelValue={rowDraft.value[column.field] ?? ""}
              onUpdate:modelValue={(v: string) => {
                rowDraft.value = { ...rowDraft.value, [column.field]: v };
              }}
            />
          </div>
        );
      }

      if (isCellEditing) {
        return (
          <div
            class="w-full min-w-0"
            onKeydown={(e: KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCellEdit(row);
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelCellEdit();
              }
            }}
          >
            <Input
              modelValue={cellEdit.value!.draft}
              onUpdate:modelValue={(v: string) => {
                if (cellEdit.value) {
                  cellEdit.value = { ...cellEdit.value, draft: v };
                }
              }}
              onBlur={() => {
                if (skipCellBlurCommit) return;
                commitCellEdit(row);
              }}
            />
          </div>
        );
      }

      return String(value ?? "");
    }

    function renderRowEditActions(key: string, row: Record<string, unknown>) {
      if (props.editMode !== "row" || editingRowKey.value !== key) return null;
      return (
        <span class="ml-1 inline-flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="保存"
            class="rounded px-1.5 py-0.5 text-xs text-sky-700 hover:bg-sky-50"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              saveRowEdit(row);
            }}
          >
            保存
          </button>
          <button
            type="button"
            aria-label="取消"
            class="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              cancelRowEdit(key);
            }}
          >
            取消
          </button>
        </span>
      );
    }

    function renderHeaderLabel(column: VirtualGridColumn) {
      const ctx: VirtualGridHeaderContext = { column };
      const fieldSlot = slots[`header-${column.field}`];
      if (fieldSlot) return fieldSlot(ctx);
      if (slots.header) return slots.header(ctx);
      return column.title;
    }

    function isLeafSortable(column: VirtualGridColumn): boolean {
      return !!column.sortable && !(column.children && column.children.length > 0);
    }

    function headerAriaSort(
      column: VirtualGridColumn | undefined,
    ): "none" | "ascending" | "descending" | undefined {
      if (!column || !isLeafSortable(column)) return undefined;
      if (sort.value?.field === column.field) {
        return sort.value.order === "asc" ? "ascending" : "descending";
      }
      return "none";
    }

    function renderHeaderCell(column: VirtualGridColumn) {
      const label = renderHeaderLabel(column);
      if (!isLeafSortable(column)) return label;
      const indicator =
        sort.value?.field === column.field
          ? sort.value.order === "asc"
            ? "↑"
            : "↓"
          : "↕";
      return (
        <button
          type="button"
          class="inline-flex min-w-0 items-center gap-1 text-left"
          onClick={() => commitSort(nextSortState(sort.value, column.field))}
        >
          <span class="truncate">{label}</span>
          <span aria-hidden class="shrink-0 text-xs text-slate-400">
            {indicator}
          </span>
        </button>
      );
    }

    function layoutItemForColumn(column: VirtualGridColumn): LayoutCol | undefined {
      return layout.value.find(
        (item) => item.kind === "data" && item.column.field === column.field,
      );
    }

    function renderRowLeading(
      display: DataBodyRow,
      isFirstDataCol: boolean,
    ) {
      if (!isFirstDataCol) return null;
      const parts = [];

      if (display.tree) {
        const label = toggleLabel(display.row, display.tree.key);
        const pad = display.tree.depth * TREE_INDENT;
        if (display.tree.hasChildren) {
          parts.push(
            <button
              type="button"
              key="tree-toggle"
              aria-label={
                display.tree.expanded ? `折叠 ${label}` : `展开 ${label}`
              }
              class="mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              style={{ marginLeft: `${pad}px` }}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                void onToggleTreeExpand(display.tree!, display.row);
              }}
            >
              {display.tree.expanded ? "▼" : "▶"}
            </button>,
          );
        } else {
          parts.push(
            <span
              key="tree-spacer"
              class="mr-1 inline-block shrink-0"
              style={{
                width: `${TREE_TOGGLE_WIDTH}px`,
                marginLeft: `${pad}px`,
              }}
            />,
          );
        }
      }

      if (isRowExpandable(display.row)) {
        const key = display.tree?.key ?? rowKey(display.row, display.dataIndex);
        const open = expandedRowKeys.value.includes(key);
        parts.push(
          <button
            type="button"
            key="row-expand"
            aria-label={
              open
                ? `折叠行 ${display.dataIndex + 1}`
                : `展开行 ${display.dataIndex + 1}`
            }
            class="mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onToggleRowExpand(key);
            }}
          >
            {open ? "▼" : "▶"}
          </button>,
        );
      }

      return parts.length > 0 ? (
        <span class="mr-1 inline-flex shrink-0 items-center">{parts}</span>
      ) : null;
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
            gridTemplateColumns: gridTemplateColumns.value,
            height: props.rowHeight,
          }}
          class="bg-slate-100 font-medium"
        >
          <div
            role="cell"
            class={`${cellClass(false)} bg-slate-100 font-medium`}
            style={{ gridColumn: "1 / -1" }}
          >
            {`${display.label} (${display.count})`}
          </div>
        </div>
      );
    }

    function renderDetailRow(display: DetailBodyRow, absoluteIndex: number) {
      const ctx: VirtualGridExpandContext = {
        row: display.row,
        rowIndex: display.dataIndex,
      };
      return (
        <div
          key={`detail-${display.key}-${absoluteIndex}`}
          role="row"
          aria-rowindex={absoluteIndex + 2}
          data-vg-row={absoluteIndex}
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplateColumns.value,
            minHeight: props.rowHeight,
          }}
          class="bg-slate-50"
        >
          <div
            role="cell"
            class={`${cellClass(true)} bg-slate-50`}
            style={{ gridColumn: "1 / -1" }}
          >
            {slots.expand?.(ctx) ?? null}
          </div>
        </div>
      );
    }

    function renderDataRow(display: DataBodyRow, absoluteIndex: number) {
      const key = display.tree?.key ?? rowKey(display.row, display.dataIndex);
      const stripeBg = props.stripe && display.dataIndex % 2 === 1;
      const rowBg = stripeBg ? "rgb(248 250 252)" : "rgb(255 255 255)";
      const measured = heightCache.value[absoluteIndex];
      const rowStyle: CSSProperties = {
        display: "grid",
        gridTemplateColumns: gridTemplateColumns.value,
        ...(props.autoHeight
          ? { minHeight: props.rowHeight, height: measured }
          : { height: props.rowHeight }),
      };

      let dataColIndex = 0;

      return (
        <div
          key={key}
          role="row"
          aria-rowindex={absoluteIndex + 2}
          data-vg-row={absoluteIndex}
          style={rowStyle}
          class={stripeBg ? "bg-slate-50" : "bg-white"}
        >
          {layout.value.map((item) => {
            if (item.kind === "selection") {
              const treeIndeterminate =
                props.tree &&
                props.cascadeParent &&
                isTreeIndeterminate(
                  selectedKeys.value,
                  key,
                  treeData.value,
                  props.idField,
                  props.childrenField,
                );
              return (
                <div
                  key="__sel"
                  role="cell"
                  class={cellClass(props.autoHeight)}
                  style={stickyStyle(item, false, rowBg)}
                >
                  <Checkbox
                    modelValue={selectedKeys.value.includes(key)}
                    indeterminate={treeIndeterminate}
                    onUpdate:modelValue={() => onToggleSelect(key)}
                  >
                    <span class="sr-only">选择第 {display.dataIndex + 1} 行</span>
                  </Checkbox>
                </div>
              );
            }
            if (item.kind === "rowNumber") {
              return (
                <div
                  key="__num"
                  role="cell"
                  class={cellClass(props.autoHeight)}
                  style={stickyStyle(item, false, rowBg)}
                >
                  {display.dataIndex + 1}
                </div>
              );
            }
            const isFirstDataCol = dataColIndex === 0;
            dataColIndex++;
            const canEditCell =
              props.editMode === "cell" && isColumnEditable(item.column);
            return (
              <div
                key={item.column.field}
                role="cell"
                class={cellClass(props.autoHeight)}
                style={stickyStyle(item, false, rowBg)}
                onDblclick={
                  canEditCell
                    ? () => beginCellEdit(key, item.column, display.row)
                    : undefined
                }
              >
                {renderRowLeading(display, isFirstDataCol)}
                {isFirstDataCol
                  ? renderRowEditActions(key, display.row)
                  : null}
                {renderDataCell(
                  item.column,
                  display.row,
                  display.dataIndex,
                  key,
                )}
              </div>
            );
          })}
        </div>
      );
    }

    function renderDisplayRow(display: BodyRow, absoluteIndex: number) {
      if (display.kind === "group") {
        return renderGroupRow(display, absoluteIndex);
      }
      if (display.kind === "detail") {
        return renderDetailRow(display, absoluteIndex);
      }
      return renderDataRow(display, absoluteIndex);
    }

    function renderSpannedBody() {
      const rows = pagedBaseRows.value.filter(
        (r): r is Extract<BodyRow, { kind: "group" } | DataBodyRow> =>
          r.kind === "group" || r.kind === "data",
      );
      const spans = spanMatrix.value!;
      const cells = [];

      for (let r = 0; r < rows.length; r++) {
        const display = rows[r]!;
        if (display.kind === "group") {
          cells.push(
            <div
              key={`group-${display.key}-${r}`}
              role="row"
              aria-rowindex={r + 2}
              class="contents"
            >
              <div
                role="cell"
                class={`${cellClass(false)} bg-slate-100 font-medium`}
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

        const key = display.tree?.key ?? rowKey(display.row, display.dataIndex);
        const stripeBg = props.stripe && display.dataIndex % 2 === 1;
        const rowBg = stripeBg ? "rgb(248 250 252)" : "rgb(255 255 255)";
        const rowCells = [];

        let colOffset = 1;
        if (props.selectable) {
          const selItem = layout.value.find((i) => i.kind === "selection")!;
          const treeIndeterminate =
            props.tree &&
            props.cascadeParent &&
            isTreeIndeterminate(
              selectedKeys.value,
              key,
              treeData.value,
              props.idField,
              props.childrenField,
            );
          rowCells.push(
            <div
              key={`sel-${r}`}
              role="cell"
              class={cellClass(false)}
              style={{
                gridRow: r + 1,
                gridColumn: colOffset,
                ...stickyStyle(selItem, false, rowBg),
              }}
            >
              <Checkbox
                modelValue={selectedKeys.value.includes(key)}
                indeterminate={treeIndeterminate}
                onUpdate:modelValue={() => onToggleSelect(key)}
              >
                <span class="sr-only">选择第 {display.dataIndex + 1} 行</span>
              </Checkbox>
            </div>,
          );
          colOffset++;
        }
        if (props.showRowNumber) {
          const numItem = layout.value.find((i) => i.kind === "rowNumber")!;
          rowCells.push(
            <div
              key={`num-${r}`}
              role="cell"
              class={cellClass(false)}
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

        for (let c = 0; c < leafColumns.value.length; c++) {
          const span = spans[r]![c]!;
          if (span.rowspan === 0 || span.colspan === 0) continue;
          const column = leafColumns.value[c]!;
          const layoutItem = layoutItemForColumn(column);
          const sticky = layoutItem
            ? stickyStyle(layoutItem, false, rowBg)
            : undefined;
          const canEditCell =
            props.editMode === "cell" && isColumnEditable(column);
          rowCells.push(
            <div
              key={`${r}-${column.field}`}
              role="cell"
              class={`${cellClass(false)} ${stripeBg ? "bg-slate-50" : "bg-white"}`}
              style={{
                gridRow: `${r + 1} / span ${span.rowspan}`,
                gridColumn: `${prefixCount.value + c + 1} / span ${span.colspan}`,
                ...sticky,
                background: sticky?.background ?? rowBg,
              }}
              onDblclick={
                canEditCell
                  ? () => beginCellEdit(key, column, display.row)
                  : undefined
              }
            >
              {c === 0 ? renderRowLeading(display, true) : null}
              {c === 0 ? renderRowEditActions(key, display.row) : null}
              {renderDataCell(column, display.row, display.dataIndex, key)}
            </div>,
          );
        }

        cells.push(
          <div
            key={key}
            role="row"
            aria-rowindex={r + 2}
            class="contents"
          >
            {rowCells}
          </div>,
        );
      }

      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplateColumns.value,
            gridTemplateRows: `repeat(${rows.length}, ${props.rowHeight}px)`,
          }}
        >
          {cells}
        </div>
      );
    }

    return () => {
      const rootCls =
        `inline-block w-full overflow-hidden rounded-lg text-sm text-slate-800 ${
          props.bordered ? "border border-slate-200" : ""
        } ${props.class}`.trim();
      const allSelected = isAllSelected(selectedKeys.value, allKeys.value);
      const partiallySelected = isIndeterminate(
        selectedKeys.value,
        allKeys.value,
      );
      const headerBg = "rgb(248 250 252)";
      const scrollerStyle: CSSProperties | undefined =
        props.height !== undefined
          ? { height: toCssHeight(props.height) }
          : undefined;

      const depth = headerDepth.value;
      const headerRowH = props.rowHeight;

      const bodyRows =
        props.spanMethod !== undefined
          ? null
          : canVirtualize.value
            ? pagedDisplayRows.value
                .slice(win.value.startIndex, win.value.endIndex)
                .map((row, i) =>
                  renderDisplayRow(row, win.value.startIndex + i),
                )
            : pagedDisplayRows.value.map((row, absoluteIndex) =>
                renderDisplayRow(row, absoluteIndex),
              );

      const prefixItems = layout.value.filter(
        (item) => item.kind === "selection" || item.kind === "rowNumber",
      );

      return (
        <div
          class={rootCls}
          role="table"
          aria-rowcount={pagedDisplayRows.value.length + 1}
        >
          <div
            ref={scrollerRef}
            data-vg-scroller=""
            role="rowgroup"
            class="relative overflow-auto"
            style={scrollerStyle}
            onScroll={onScroll}
          >
            <div
              ref={headerRef}
              role="row"
              aria-rowindex={1}
              style={{
                display: "grid",
                gridTemplateColumns: gridTemplateColumns.value,
                gridTemplateRows: `repeat(${depth}, ${headerRowH}px)`,
                position: "sticky",
                top: 0,
                zIndex: 5,
              }}
              class="bg-slate-50 font-medium"
            >
              {prefixItems.map((item, idx) => {
                if (item.kind === "selection") {
                  return (
                    <div
                      key="__sel"
                      role="columnheader"
                      class={cellClass(false)}
                      style={{
                        gridColumn: idx + 1,
                        gridRow: `1 / span ${depth}`,
                        ...stickyStyle(item, true, headerBg),
                      }}
                    >
                      {props.multiple && props.showSelectAll ? (
                        <Checkbox
                          modelValue={allSelected}
                          indeterminate={partiallySelected}
                          onUpdate:modelValue={() =>
                            commitSelectedKeys(
                              allSelected
                                ? clearKeys()
                                : selectAllKeys(allKeys.value),
                            )
                          }
                        >
                          <span class="sr-only">全选</span>
                        </Checkbox>
                      ) : null}
                    </div>
                  );
                }
                return (
                  <div
                    key="__num"
                    role="columnheader"
                    class={cellClass(false)}
                    style={{
                      gridColumn: idx + 1,
                      gridRow: `1 / span ${depth}`,
                      ...stickyStyle(item, true, headerBg),
                    }}
                    aria-label="序号"
                  >
                    #
                  </div>
                );
              })}
              {placedHeaderCells.value.map(({ cell, gridColumn, gridRow, key }) => {
                const layoutItem = cell.column
                  ? layoutItemForColumn(cell.column)
                  : undefined;
                const sticky = layoutItem
                  ? stickyStyle(layoutItem, true, headerBg)
                  : { background: headerBg };
                return (
                  <div
                    key={key}
                    role="columnheader"
                    class={cellClass(false)}
                    aria-sort={headerAriaSort(cell.column)}
                    style={{
                      gridColumn,
                      gridRow,
                      ...sticky,
                    }}
                  >
                    {cell.column
                      ? renderHeaderCell(cell.column)
                      : cell.title}
                  </div>
                );
              })}
            </div>

            {props.loading ? (
              <div
                class="pointer-events-none absolute inset-x-0 top-0 z-[4] flex justify-center pt-2"
                aria-busy="true"
              >
                <span class="rounded bg-white/90 px-2 py-1 text-xs text-slate-500 shadow-sm">
                  加载中…
                </span>
              </div>
            ) : null}
            {pagedDisplayRows.value.length === 0 ? (
              <div class="px-3 py-6 text-center text-slate-400">
                {slots.empty?.() ?? props.emptyText}
              </div>
            ) : props.spanMethod !== undefined ? (
              renderSpannedBody()
            ) : canVirtualize.value ? (
              <div
                style={{
                  height: `${win.value.totalHeight}px`,
                  position: "relative",
                }}
              >
                <div style={{ transform: `translateY(${win.value.offsetY}px)` }}>
                  {bodyRows}
                </div>
              </div>
            ) : (
              bodyRows
            )}
          </div>
          {props.pagination ? (
            <div
              class={`flex justify-end p-2 ${
                props.bordered ? "border-t border-slate-200" : ""
              }`}
            >
              <Pagination
                total={paginationTotal.value}
                page={page.value}
                pageSize={pageSize.value}
                pageSizeOptions={props.pageSizeOptions}
                onUpdate:page={setPage}
                onUpdate:pageSize={setPageSize}
              />
            </div>
          ) : null}
        </div>
      );
    };
  },
});
