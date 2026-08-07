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
import { Pagination } from "./Pagination";

export type VirtualGridColumn = GridColumn;

export type VirtualGridCellContext = {
  row: Record<string, unknown>;
  column: VirtualGridColumn;
  value: unknown;
  rowIndex: number;
};

export type VirtualGridHeaderContext = {
  column: VirtualGridColumn;
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
  },
  emits: {
    "update:selectedKeys": (_keys: string[]) => true,
    "update:page": (_page: number) => true,
    "update:pageSize": (_pageSize: number) => true,
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

    const selectedKeys = computed(
      () => props.selectedKeys ?? uncontrolledSelectedKeys.value,
    );
    const page = computed(() => props.page ?? uncontrolledPage.value);
    const pageSize = computed(
      () => props.pageSize ?? uncontrolledPageSize.value,
    );

    function commitSelectedKeys(next: string[]) {
      if (props.selectedKeys === undefined) uncontrolledSelectedKeys.value = next;
      emit("update:selectedKeys", next);
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

    watch(page, () => {
      scrollTop.value = 0;
    });

    const visibleColumns = computed(() =>
      props.columns.filter((c) => !c.hidden),
    );

    const pagedRows = computed(() =>
      props.pagination
        ? slicePage(props.data, {
            pageIndex: page.value,
            pageSize: pageSize.value,
            total: props.data.length,
          })
        : props.data,
    );

    watch(
      () => [pagedRows.value.length, page.value, pageSize.value] as const,
      () => {
        heightCache.value = new Array(pagedRows.value.length);
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
      pagedRows.value.map((row, i) => rowKey(row, i)),
    );

    const canVirtualize = computed(
      () => props.virtual && typeof props.height === "number",
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
        rowCount: pagedRows.value.length,
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
      buildLayout(visibleColumns.value, props.selectable, props.showRowNumber),
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
      if (!props.autoHeight) return;
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
          while (next.length < pagedRows.value.length) next.push(undefined);
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
          pagedRows.value.length,
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

    function renderDataCell(
      column: VirtualGridColumn,
      row: Record<string, unknown>,
      rowIndex: number,
    ) {
      const value = row[column.field];
      const ctx: VirtualGridCellContext = { row, column, value, rowIndex };
      const fieldSlot = slots[`cell-${column.field}`];
      if (fieldSlot) return fieldSlot(ctx);
      if (slots.cell) return slots.cell(ctx);
      return String(value ?? "");
    }

    function renderHeaderCell(column: VirtualGridColumn) {
      const ctx: VirtualGridHeaderContext = { column };
      const fieldSlot = slots[`header-${column.field}`];
      if (fieldSlot) return fieldSlot(ctx);
      if (slots.header) return slots.header(ctx);
      return column.title;
    }

    function renderRow(row: Record<string, unknown>, absoluteIndex: number) {
      const key = rowKey(row, absoluteIndex);
      const stripeBg = props.stripe && absoluteIndex % 2 === 1;
      const rowBg = stripeBg ? "rgb(248 250 252)" : "rgb(255 255 255)";
      const measured = heightCache.value[absoluteIndex];
      const rowStyle: CSSProperties = {
        display: "grid",
        gridTemplateColumns: gridTemplateColumns.value,
        ...(props.autoHeight
          ? { minHeight: props.rowHeight, height: measured }
          : { height: props.rowHeight }),
      };

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
              return (
                <div
                  key="__sel"
                  role="cell"
                  class={cellClass(props.autoHeight)}
                  style={stickyStyle(item, false, rowBg)}
                >
                  <Checkbox
                    modelValue={selectedKeys.value.includes(key)}
                    onUpdate:modelValue={() =>
                      commitSelectedKeys(
                        toggleKey(selectedKeys.value, key, props.multiple),
                      )
                    }
                  >
                    <span class="sr-only">选择第 {absoluteIndex + 1} 行</span>
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
                  {absoluteIndex + 1}
                </div>
              );
            }
            return (
              <div
                key={item.column.field}
                role="cell"
                class={cellClass(props.autoHeight)}
                style={stickyStyle(item, false, rowBg)}
              >
                {renderDataCell(item.column, row, absoluteIndex)}
              </div>
            );
          })}
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

      const bodyRows = canVirtualize.value
        ? pagedRows.value
            .slice(win.value.startIndex, win.value.endIndex)
            .map((row, i) => renderRow(row, win.value.startIndex + i))
        : pagedRows.value.map((row, absoluteIndex) =>
            renderRow(row, absoluteIndex),
          );

      return (
        <div
          class={rootCls}
          role="table"
          aria-rowcount={pagedRows.value.length + 1}
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
                position: "sticky",
                top: 0,
                zIndex: 5,
              }}
              class="bg-slate-50 font-medium"
            >
              {layout.value.map((item) => {
                if (item.kind === "selection") {
                  return (
                    <div
                      key="__sel"
                      role="columnheader"
                      class={cellClass(false)}
                      style={stickyStyle(item, true, headerBg)}
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
                if (item.kind === "rowNumber") {
                  return (
                    <div
                      key="__num"
                      role="columnheader"
                      class={cellClass(false)}
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
                    class={cellClass(false)}
                    style={stickyStyle(item, true, headerBg)}
                  >
                    {renderHeaderCell(item.column)}
                  </div>
                );
              })}
            </div>

            {pagedRows.value.length === 0 ? (
              <div class="px-3 py-6 text-center text-slate-400">
                {slots.empty?.() ?? props.emptyText}
              </div>
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
                total={props.data.length}
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
