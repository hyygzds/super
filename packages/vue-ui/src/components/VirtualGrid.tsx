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
  onMounted,
  onUnmounted,
  ref,
  watch,
  type PropType,
  type VNode,
} from "vue";
import { Checkbox } from "./Checkbox";
import { Pagination } from "./Pagination";

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
  }) => VNode | string | number;
  renderHeader?: (column: VirtualGridColumn<T>) => VNode | string | number;
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

export const VirtualGrid = defineComponent({
  name: "VirtualGrid",
  props: {
    data: {
      type: Array as PropType<Record<string, unknown>[]>,
      required: true,
    },
    columns: {
      type: Array as PropType<VirtualGridColumn[]>,
      required: true,
    },
    idField: { type: String, default: "id" },
    showHeader: { type: Boolean, default: true },
    bordered: { type: Boolean, default: true },
    stripe: { type: Boolean, default: false },
    showRowNumber: { type: Boolean, default: true },
    rowHeight: { type: Number, default: 36 },
    enableVirtual: { type: Boolean, default: false },
    class: { type: String, default: "" },
    emptyText: { type: String, default: "暂无数据" },
    selectionMode: {
      type: String as PropType<"none" | "single" | "multiple">,
      default: "none",
    },
    selectedKeys: {
      type: Array as PropType<string[]>,
      default: undefined,
    },
    defaultSelectedKeys: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    pagination: { type: Boolean, default: false },
    paginationMode: {
      type: String as PropType<"local" | "remote">,
      default: "local",
    },
    page: { type: Number, default: undefined },
    defaultPage: { type: Number, default: 1 },
    pageSize: { type: Number, default: undefined },
    defaultPageSize: { type: Number, default: 10 },
    total: { type: Number, default: undefined },
    pageSizeOptions: {
      type: Array as PropType<number[]>,
      default: undefined,
    },
  },
  emits: [
    "rowClick",
    "update:selectedKeys",
    "update:page",
    "update:pageSize",
  ],
  setup(props, { emit, slots }) {
    const bodyRef = ref<HTMLDivElement | null>(null);
    const scrollTop = ref(0);
    const viewportHeight = ref(0);
    const innerKeys = ref<string[]>([...(props.defaultSelectedKeys ?? [])]);
    const innerPage = ref(props.defaultPage);
    const innerSize = ref(props.defaultPageSize);

    const visibleColumns = computed(() => getVisibleColumns(props.columns));
    const selectedKeys = computed(() =>
      props.selectedKeys !== undefined ? props.selectedKeys : innerKeys.value,
    );
    const page = computed(() =>
      props.page !== undefined ? props.page : innerPage.value,
    );
    const pageSize = computed(() =>
      props.pageSize !== undefined ? props.pageSize : innerSize.value,
    );
    const showSelection = computed(() => props.selectionMode !== "none");
    const multiple = computed(() => props.selectionMode === "multiple");

    const paginationTotal = computed(() =>
      props.pagination && props.paginationMode === "remote"
        ? (props.total ?? props.data.length)
        : props.data.length,
    );

    const pageRows = computed(() => {
      if (!props.pagination) return props.data;
      if (props.paginationMode === "remote") return props.data;
      return slicePage(props.data, {
        pageIndex: page.value,
        pageSize: pageSize.value,
        total: props.data.length,
      });
    });

    const scopeKeys = computed(() =>
      props.data.map((row, index) => rowKey(row, index, props.idField)),
    );
    const scopeKeySet = computed(() => new Set(scopeKeys.value));
    const scopedSelectedKeys = computed(() =>
      selectedKeys.value.filter((k) => scopeKeySet.value.has(k)),
    );
    const headerChecked = computed(() =>
      isAllSelected(selectedKeys.value, scopeKeys.value),
    );
    const headerIndeterminate = computed(() =>
      isIndeterminate(scopedSelectedKeys.value, scopeKeys.value),
    );

    function measure() {
      const el = bodyRef.value;
      if (!el) return;
      viewportHeight.value = el.clientHeight;
    }

    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      measure();
      const el = bodyRef.value;
      if (!el || typeof ResizeObserver === "undefined") return;
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(el);
    });

    onUnmounted(() => {
      resizeObserver?.disconnect();
    });

    watch(
      () =>
        [
          props.pagination,
          props.paginationMode,
          props.total,
          props.data.length,
        ] as const,
      () => {
        if (
          props.pagination &&
          props.paginationMode === "remote" &&
          props.total === undefined &&
          isNodeDevelopment()
        ) {
          console.warn(
            "[VirtualGrid] paginationMode=remote without `total`; falling back to data.length",
          );
        }
      },
      { immediate: true },
    );

    function setSelectedKeys(next: string[]) {
      if (props.selectedKeys === undefined) innerKeys.value = next;
      emit("update:selectedKeys", next);
    }

    function setPage(next: number) {
      if (props.page === undefined) innerPage.value = next;
      emit("update:page", next);
    }

    function setPageSize(next: number) {
      if (props.pageSize === undefined) innerSize.value = next;
      emit("update:pageSize", next);
    }

    function onToggleRow(key: string) {
      setSelectedKeys(
        toggleKey(selectedKeys.value, key, multiple.value),
      );
    }

    function onToggleAll() {
      if (headerChecked.value || headerIndeterminate.value) {
        setSelectedKeys(clearKeys());
      } else {
        setSelectedKeys(selectAllKeys(scopeKeys.value));
      }
    }

    const windowResult = computed(() =>
      computeVirtualWindow({
        enabled: props.enableVirtual,
        rowCount: pageRows.value.length,
        rowHeight: props.rowHeight,
        scrollTop: scrollTop.value,
        viewportHeight: Math.max(viewportHeight.value, 1),
        overscan: 2,
      }),
    );

    const slice = computed(() => {
      const { startIndex, endIndex } = windowResult.value;
      return pageRows.value.slice(startIndex, endIndex);
    });

    function cellContent(
      row: Record<string, unknown>,
      column: VirtualGridColumn,
      rowIndex: number,
    ) {
      if (column.render) return column.render({ row, column, rowIndex });
      if (slots.cell) return slots.cell({ row, column, rowIndex });
      const v = row[column.field];
      return v == null ? "" : String(v);
    }

    function headerContent(column: VirtualGridColumn) {
      if (column.renderHeader) return column.renderHeader(column);
      if (slots.header) return slots.header({ column });
      return column.title;
    }

    return () => {
      const borderCls = props.bordered ? "border border-slate-200" : "border-0";
      const gridCls =
        `flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-white text-sm text-slate-900 ${borderCls} ${props.class}`.trim();
      const outerCls =
        `flex h-full min-h-0 w-full flex-col text-sm text-slate-900 ${props.class}`.trim();
      const cardCls =
        `flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white ${borderCls}`.trim();
      const start = windowResult.value.startIndex;

      return (
        <div
          data-testid="virtual-grid"
          class={props.pagination ? outerCls : gridCls}
          role={props.pagination ? undefined : "grid"}
        >
          <div
            class={props.pagination ? cardCls : "contents"}
            role={props.pagination ? "grid" : undefined}
          >
            {props.showHeader ? (
              <div
                class="flex shrink-0 border-b border-slate-200 bg-slate-50"
                role="row"
              >
                {showSelection.value ? (
                  <div
                    class="flex w-12 shrink-0 items-center justify-center border-r border-slate-200"
                    role="columnheader"
                    style={{ height: props.rowHeight }}
                  >
                    {multiple.value ? (
                      <Checkbox
                        aria-label="全选"
                        checked={headerChecked.value}
                        indeterminate={headerIndeterminate.value}
                        onUpdate:checked={() => onToggleAll()}
                      />
                    ) : null}
                  </div>
                ) : null}
                {props.showRowNumber ? (
                  <div
                    class="flex w-14 shrink-0 items-center justify-center border-r border-slate-200 px-1 font-medium text-slate-600"
                    style={{ height: props.rowHeight }}
                    role="columnheader"
                  >
                    #
                  </div>
                ) : null}
                {visibleColumns.value.map((col) => (
                  <div
                    key={col.field}
                    class="flex shrink-0 items-center border-r border-slate-200 px-3 font-medium text-slate-700 last:border-r-0"
                    style={{
                      width: col.width ?? 120,
                      height: props.rowHeight,
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
              class="relative min-h-0 flex-1 overflow-auto"
              onScroll={(e: Event) => {
                const el = e.currentTarget as HTMLDivElement;
                scrollTop.value = el.scrollTop;
                viewportHeight.value = el.clientHeight;
              }}
            >
              {props.data.length === 0 ? (
                <div class="flex h-full min-h-24 items-center justify-center text-slate-500">
                  {props.emptyText}
                </div>
              ) : (
                <div
                  class="relative w-full"
                  style={{
                    height: props.enableVirtual
                      ? windowResult.value.totalHeight
                      : pageRows.value.length * props.rowHeight,
                  }}
                >
                  <div
                    class="absolute left-0 right-0"
                    style={{
                      transform: props.enableVirtual
                        ? `translateY(${windowResult.value.offsetY}px)`
                        : undefined,
                      top: props.enableVirtual ? 0 : undefined,
                    }}
                  >
                    {slice.value.map((row, i) => {
                      const rowIndex = start + i;
                      const key = rowKey(row, rowIndex, props.idField);
                      const displayIndex =
                        (props.pagination
                          ? (page.value - 1) * pageSize.value
                          : 0) +
                        rowIndex +
                        1;
                      const zebra =
                        props.stripe && rowIndex % 2 === 1
                          ? "bg-slate-50"
                          : "bg-white";
                      return (
                        <div
                          key={key}
                          role="row"
                          data-row-index={rowIndex}
                          class={`flex border-b border-slate-100 ${zebra} hover:bg-sky-50/60`}
                          style={{ height: props.rowHeight }}
                          onClick={(e: MouseEvent) =>
                            emit("rowClick", row, rowIndex, e)
                          }
                        >
                          {showSelection.value ? (
                            <div
                              class="flex w-12 shrink-0 items-center justify-center border-r border-slate-100"
                              role="gridcell"
                              onClick={(e: MouseEvent) => e.stopPropagation()}
                            >
                              <Checkbox
                                aria-label={`选择行 ${key}`}
                                checked={selectedKeys.value.includes(key)}
                                onUpdate:checked={() => onToggleRow(key)}
                              />
                            </div>
                          ) : null}
                          {props.showRowNumber ? (
                            <div
                              class="flex w-14 shrink-0 items-center justify-center border-r border-slate-100 text-slate-500"
                              role="gridcell"
                            >
                              {displayIndex}
                            </div>
                          ) : null}
                          {visibleColumns.value.map((col) => (
                            <div
                              key={col.field}
                              class="flex shrink-0 items-center overflow-hidden border-r border-slate-100 px-3 text-ellipsis whitespace-nowrap last:border-r-0"
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
          {props.pagination ? (
            <div data-testid="virtual-grid-pagination" class="mt-2 shrink-0">
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
