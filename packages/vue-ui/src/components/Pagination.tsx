import { normalizePageSlice } from "@component-ai/grid-core";
import { computed, defineComponent, ref, type PropType } from "vue";

function getPageItems(
  page: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(pageCount - 1, page + 1);
  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

export const Pagination = defineComponent({
  name: "Pagination",
  props: {
    total: { type: Number, required: true },
    page: { type: Number, default: undefined },
    defaultPage: { type: Number, default: 1 },
    pageSize: { type: Number, default: undefined },
    defaultPageSize: { type: Number, default: 10 },
    pageSizeOptions: {
      type: Array as PropType<number[]>,
      default: () => [10, 20, 50],
    },
    disabled: { type: Boolean, default: false },
    class: { type: String, default: "" },
    totalLabel: {
      type: Function as PropType<(total: number) => string>,
      default: undefined,
    },
  },
  emits: ["update:page", "update:pageSize"],
  setup(props, { emit }) {
    const innerPage = ref(props.defaultPage);
    const innerSize = ref(props.defaultPageSize);

    const pageSize = computed(() => props.pageSize ?? innerSize.value);
    const slice = computed(() =>
      normalizePageSlice({
        pageIndex: props.page ?? innerPage.value,
        pageSize: pageSize.value,
        total: props.total,
      }),
    );
    const label = computed(() =>
      (props.totalLabel ?? ((t: number) => `共 ${t} 条`))(props.total),
    );

    function setPage(next: number) {
      const normalized = normalizePageSlice({
        pageIndex: next,
        pageSize: pageSize.value,
        total: props.total,
      }).pageIndex;
      if (props.page === undefined) innerPage.value = normalized;
      emit("update:page", normalized);
    }

    function setPageSize(next: number) {
      if (props.pageSize === undefined) innerSize.value = next;
      emit("update:pageSize", next);
      if (props.page === undefined) innerPage.value = 1;
      emit("update:page", 1);
    }

    return () => {
      const page = slice.value.pageIndex;
      const pageCount = slice.value.pageCount;
      const items = getPageItems(page, pageCount);
      const navClass =
        "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm text-slate-800";
      const btnBase =
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 disabled:pointer-events-none disabled:opacity-40 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
      const currentClass = "bg-sky-600 text-white hover:bg-sky-600";

      return (
        <nav class={`${navClass} ${props.class}`.trim()} aria-label="分页">
          <span class="px-2 text-slate-600">{label.value}</span>
          <button
            type="button"
            class={btnBase}
            disabled={props.disabled || page <= 1}
            aria-label="上一页"
            onClick={() => setPage(page - 1)}
          >
            上一页
          </button>
          {items.map((item, i) =>
            item === "ellipsis" ? (
              <span key={`e-${i}`} class="px-1 text-slate-400" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                class={`${btnBase} ${item === page ? currentClass : ""}`}
                aria-label={String(item)}
                aria-current={item === page ? "page" : undefined}
                disabled={props.disabled}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            class={btnBase}
            disabled={props.disabled || page >= pageCount}
            aria-label="下一页"
            onClick={() => setPage(page + 1)}
          >
            下一页
          </button>
          <label class="ml-2 flex items-center gap-1 px-1 text-slate-600">
            <span>每页</span>
            <select
              aria-label="每页条数"
              class="rounded-md border border-slate-300 bg-white px-2 py-1"
              disabled={props.disabled}
              value={pageSize.value}
              onChange={(e: Event) =>
                setPageSize(Number((e.target as HTMLSelectElement).value))
              }
            >
              {props.pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </nav>
      );
    };
  },
});
