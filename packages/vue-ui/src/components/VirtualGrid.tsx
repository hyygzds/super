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
import { computed, defineComponent, ref, watch, type PropType } from "vue";
import { Checkbox } from "./Checkbox";
import { Pagination } from "./Pagination";

export type VirtualGridColumn = GridColumn;

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
    const uncontrolledSelectedKeys = ref<string[]>(props.defaultSelectedKeys);
    const uncontrolledPage = ref(props.defaultPage);
    const uncontrolledPageSize = ref(props.defaultPageSize);

    const selectedKeys = computed(
      () => props.selectedKeys ?? uncontrolledSelectedKeys.value,
    );
    const page = computed(() => props.page ?? uncontrolledPage.value);
    const pageSize = computed(() => props.pageSize ?? uncontrolledPageSize.value);

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

    const win = computed(() =>
      computeVirtualWindow({
        enabled: canVirtualize.value,
        rowCount: pagedRows.value.length,
        rowHeight: props.rowHeight,
        scrollTop: scrollTop.value,
        viewportHeight: canVirtualize.value ? (props.height as number) : 0,
        overscan: props.overscan,
      }),
    );

    const gridTemplateColumns = computed(() => {
      const widths = visibleColumns.value.map((c) =>
        c.width ? `${c.width}px` : "1fr",
      );
      const prefixed = [
        ...(props.selectable ? [`${SELECTION_WIDTH}px`] : []),
        ...(props.showRowNumber ? [`${ROW_NUMBER_WIDTH}px`] : []),
        ...widths,
      ];
      return prefixed.join(" ");
    });

    function onScroll(e: Event) {
      if (canVirtualize.value) {
        scrollTop.value = (e.currentTarget as HTMLElement).scrollTop;
      }
    }

    const cellBase = () =>
      `flex items-center overflow-hidden px-3 py-2 truncate ${
        props.bordered ? "border-b border-slate-200" : ""
      }`;

    function renderRow(row: Record<string, unknown>, absoluteIndex: number) {
      const key = rowKey(row, absoluteIndex);
      return (
        <div
          key={key}
          role="row"
          aria-rowindex={absoluteIndex + 2}
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplateColumns.value,
            height: `${props.rowHeight}px`,
          }}
          class={props.stripe && absoluteIndex % 2 === 1 ? "bg-slate-50" : ""}
        >
          {props.selectable ? (
            <div role="cell" class={cellBase()}>
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
          ) : null}
          {props.showRowNumber ? (
            <div role="cell" class={cellBase()}>
              {absoluteIndex + 1}
            </div>
          ) : null}
          {visibleColumns.value.map((col) => (
            <div key={col.field} role="cell" class={cellBase()}>
              {String(row[col.field] ?? "")}
            </div>
          ))}
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

      return (
        <div
          class={rootCls}
          role="table"
          aria-rowcount={pagedRows.value.length + 1}
        >
          <div
            role="row"
            aria-rowindex={1}
            style={{
              display: "grid",
              gridTemplateColumns: gridTemplateColumns.value,
            }}
            class="bg-slate-50 font-medium"
          >
            {props.selectable ? (
              <div role="columnheader" class={cellBase()}>
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
            ) : null}
            {props.showRowNumber ? (
              <div role="columnheader" class={cellBase()} aria-label="序号">
                #
              </div>
            ) : null}
            {visibleColumns.value.map((col) => (
              <div key={col.field} role="columnheader" class={cellBase()}>
                {col.title}
              </div>
            ))}
          </div>
          <div
            role="rowgroup"
            class="relative overflow-y-auto"
            style={
              props.height !== undefined
                ? { height: toCssHeight(props.height) }
                : undefined
            }
            onScroll={onScroll}
          >
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
                  {pagedRows.value
                    .slice(win.value.startIndex, win.value.endIndex)
                    .map((row, i) => renderRow(row, win.value.startIndex + i))}
                </div>
              </div>
            ) : (
              pagedRows.value.map((row, absoluteIndex) =>
                renderRow(row, absoluteIndex),
              )
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
