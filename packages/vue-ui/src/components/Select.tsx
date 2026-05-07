import {
  computed,
  defineComponent,
  nextTick,
  onUnmounted,
  ref,
  useId,
  watch,
  type PropType,
} from "vue";

export type SelectLoadFn = (input: {
  query: string;
  signal: AbortSignal;
}) => Promise<unknown[]>;

export default defineComponent({
  name: "Select",
  props: {
    options: {
      type: Array as PropType<unknown[]>,
      default: () => [],
    },
    loadOptions: Function as PropType<SelectLoadFn | undefined>,
    getOptionValue: Function as PropType<((item: unknown) => string) | undefined>,
    getOptionLabel: Function as PropType<((item: unknown) => string) | undefined>,
    getOptionDisabled: Function as PropType<
      ((item: unknown) => boolean) | undefined
    >,
    filterOption: Function as PropType<
      ((item: unknown, query: string) => boolean) | undefined
    >,
    filterable: { type: Boolean, default: true },
    debounceMs: { type: Number, default: 300 },
    modelValue: String as PropType<string | undefined>,
    defaultModelValue: String as PropType<string | undefined>,
    placeholder: { type: String, default: "请选择" },
    disabled: Boolean,
    class: { type: String, default: "" },
  },
  emits: {
    "update:modelValue": (_value: string | undefined) => true,
    change: (_value: string | undefined) => true,
  },
  setup(props, { emit, slots }) {
    function defaultGetOptionValue(item: unknown): string {
      if (item !== null && typeof item === "object" && "value" in item) {
        const v = (item as { value: unknown }).value;
        if (typeof v === "string" || typeof v === "number") return String(v);
      }
      return String(item);
    }

    function defaultGetOptionLabel(item: unknown): string {
      if (item !== null && typeof item === "object" && "label" in item) {
        const v = (item as { label: unknown }).label;
        if (typeof v === "string") return v;
      }
      return defaultGetOptionValue(item);
    }

    function defaultGetOptionDisabled(item: unknown): boolean {
      if (item !== null && typeof item === "object" && "disabled" in item) {
        return Boolean((item as { disabled?: unknown }).disabled);
      }
      return false;
    }

    const getOptionValue = (item: unknown) =>
      props.getOptionValue?.(item) ?? defaultGetOptionValue(item);
    const getOptionLabel = (item: unknown) =>
      props.getOptionLabel?.(item) ?? defaultGetOptionLabel(item);
    const getOptionDisabled = (item: unknown) =>
      props.getOptionDisabled?.(item) ?? defaultGetOptionDisabled(item);

    const isControlled = computed(() => props.modelValue !== undefined);
    const internalValue = ref<string | undefined>(props.defaultModelValue);

    const selectedValue = computed(() =>
      isControlled.value ? props.modelValue : internalValue.value,
    );

    const open = ref(false);
    const searchQuery = ref("");
    const debouncedQuery = ref("");
    const asyncItems = ref<unknown[]>([]);
    const loading = ref(false);
    const highlightedIndex = ref(-1);

    const rootRef = ref<HTMLElement | null>(null);
    const triggerRef = ref<HTMLButtonElement | null>(null);
    const searchRef = ref<HTMLInputElement | null>(null);
    const listboxRef = ref<HTMLUListElement | null>(null);

    const listboxId = useId();
    const baseId = useId();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function onDocPointerDown(e: MouseEvent) {
      const el = rootRef.value;
      if (!el?.contains(e.target as Node)) open.value = false;
    }

    watch(open, (isOpen) => {
      if (!isOpen) {
        searchQuery.value = "";
        debouncedQuery.value = "";
        highlightedIndex.value = -1;
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        document.removeEventListener("pointerdown", onDocPointerDown);
        return;
      }
      document.addEventListener("pointerdown", onDocPointerDown);
      nextTick(() => {
        if (props.filterable) searchRef.value?.focus();
        else listboxRef.value?.focus();
      });
    });

    watch([open, searchQuery, () => props.debounceMs], ([isOpen, q]) => {
      if (!isOpen) return;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      if (q === "") {
        debouncedQuery.value = "";
        return;
      }
      debounceTimer = setTimeout(() => {
        debouncedQuery.value = q;
        debounceTimer = null;
      }, props.debounceMs);
    });

    let loadAbort: AbortController | null = null;

    watch(
      [open, debouncedQuery, () => props.loadOptions],
      async ([isOpen, dq]) => {
        const loader = props.loadOptions;
        if (!isOpen || !loader) return;

        loadAbort?.abort();
        const controller = new AbortController();
        loadAbort = controller;
        loading.value = true;
        try {
          const data = await loader({
            query: dq as string,
            signal: controller.signal,
          });
          if (!controller.signal.aborted) asyncItems.value = data;
        } catch {
          if (!controller.signal.aborted) asyncItems.value = [];
        } finally {
          if (!controller.signal.aborted) loading.value = false;
        }
      },
    );

    const syncPool = computed(() => props.options ?? []);

    const displayItems = computed(() => {
      if (props.loadOptions) return asyncItems.value;

      const q = searchQuery.value.trim().toLowerCase();
      if (!props.filterable || !q) return syncPool.value;

      return syncPool.value.filter((item) => {
        if (props.filterOption)
          return props.filterOption(item, searchQuery.value);
        return getOptionLabel(item).toLowerCase().includes(q);
      });
    });

    function resolveLabel(val: string | undefined): string | null {
      if (val === undefined || val === "") return null;
      const pool = props.loadOptions ? asyncItems.value : syncPool.value;
      const found = pool.find((item) => getOptionValue(item) === val);
      if (found) return getOptionLabel(found);
      const fallback = syncPool.value.find(
        (item) => getOptionValue(item) === val,
      );
      return fallback ? getOptionLabel(fallback) : val;
    }

    const selectedLabel = computed(() => resolveLabel(selectedValue.value));

    function commitValue(next: string | undefined) {
      emit("update:modelValue", next);
      emit("change", next);
      if (!isControlled.value) internalValue.value = next;
      open.value = false;
      searchQuery.value = "";
      debouncedQuery.value = "";
      nextTick(() => triggerRef.value?.focus());
    }

    function selectIndex(index: number) {
      const item = displayItems.value[index];
      if (!item || getOptionDisabled(item)) return;
      commitValue(getOptionValue(item));
    }

    function stepHighlight(delta: number) {
      const items = displayItems.value;
      if (items.length === 0) return;
      let next = highlightedIndex.value;
      if (next < 0) next = delta > 0 ? -1 : items.length;
      for (let i = 0; i < items.length; i++) {
        next += delta;
        next = ((next % items.length) + items.length) % items.length;
        if (!getOptionDisabled(items[next])) {
          highlightedIndex.value = next;
          return;
        }
      }
    }

    onUnmounted(() => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      loadAbort?.abort();
      if (debounceTimer !== null) clearTimeout(debounceTimer);
    });

    function onTriggerKeyDown(e: KeyboardEvent) {
      if (props.disabled) return;
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open.value = true;
      }
    }

    function onPanelKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        open.value = false;
        triggerRef.value?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        stepHighlight(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        stepHighlight(-1);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        const first = displayItems.value.findIndex(
          (item) => !getOptionDisabled(item),
        );
        if (first >= 0) highlightedIndex.value = first;
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        let last = -1;
        displayItems.value.forEach((item, idx) => {
          if (!getOptionDisabled(item)) last = idx;
        });
        if (last >= 0) highlightedIndex.value = last;
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex.value >= 0)
          selectIndex(highlightedIndex.value);
      }
    }

    const triggerCls =
      "inline-flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:pointer-events-none disabled:opacity-50";

    const panelCls =
      "absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg outline-none";

    const optionBase =
      "cursor-pointer px-3 py-2 text-sm text-slate-900 aria-disabled:pointer-events-none aria-disabled:opacity-40";

    return () => (
      <div ref={rootRef} class={["relative", props.class]}>
        <button
          ref={triggerRef}
          type="button"
          disabled={props.disabled}
          class={triggerCls}
          aria-haspopup="listbox"
          aria-expanded={open.value}
          aria-controls={`${listboxId}-panel`}
          id={`${baseId}-trigger`}
          onClick={() => {
            if (!props.disabled) open.value = !open.value;
          }}
          onKeydown={onTriggerKeyDown}
        >
          <span class={selectedLabel.value ? "" : "text-slate-400"}>
            {selectedLabel.value ?? props.placeholder}
          </span>
          <svg
            aria-hidden="true"
            class={[
              "h-4 w-4 shrink-0 text-slate-500 transition-transform",
              open.value ? "rotate-180" : "",
            ]}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" />
          </svg>
        </button>

        {open.value ? (
          <div
            id={`${listboxId}-panel`}
            class={panelCls}
            role="presentation"
            tabindex={-1}
            onKeydown={onPanelKeyDown}
          >
            {props.filterable ? (
              <div class="border-b border-slate-100 px-2 pb-2 pt-1">
                <input
                  ref={searchRef}
                  type="search"
                  value={searchQuery.value}
                  onInput={(e: Event) => {
                    searchQuery.value = (e.target as HTMLInputElement).value;
                  }}
                  aria-label="搜索选项"
                  autocomplete="off"
                  class="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                />
              </div>
            ) : null}
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={`${baseId}-trigger`}
              aria-busy={loading.value}
              tabindex={-1}
              class="py-1"
              aria-activedescendant={
                highlightedIndex.value >= 0
                  ? `${listboxId}-opt-${highlightedIndex.value}`
                  : undefined
              }
            >
              {loading.value ? (
                <li class="px-3 py-2 text-sm text-slate-500" role="status">
                  加载中…
                </li>
              ) : null}
              {!loading.value && displayItems.value.length === 0 ? (
                slots.empty?.() ?? (
                  <li class="px-3 py-2 text-sm text-slate-500" role="presentation">
                    暂无数据
                  </li>
                )
              ) : null}
              {!loading.value
                ? displayItems.value.map((item, idx) => (
                    <li
                      key={`${getOptionValue(item)}-${idx}`}
                      id={`${listboxId}-opt-${idx}`}
                      role="option"
                      aria-selected={
                        selectedValue.value === getOptionValue(item)
                      }
                      aria-disabled={getOptionDisabled(item)}
                      class={[
                        optionBase,
                        highlightedIndex.value === idx ? "bg-sky-50" : "",
                        selectedValue.value === getOptionValue(item)
                          ? "font-medium text-sky-800"
                          : "",
                      ]}
                      onMouseenter={() => {
                        highlightedIndex.value = idx;
                      }}
                      onMousedown={(e: MouseEvent) => e.preventDefault()}
                      onClick={() => {
                        if (!getOptionDisabled(item))
                          commitValue(getOptionValue(item));
                      }}
                    >
                      {getOptionLabel(item)}
                    </li>
                  ))
                : null}
            </ul>
          </div>
        ) : null}
      </div>
    );
  },
});
