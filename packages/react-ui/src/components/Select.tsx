import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";

export type SelectProps<T = unknown> = {
  options?: T[];
  loadOptions?: (input: {
    query: string;
    signal: AbortSignal;
  }) => Promise<T[]>;
  getOptionValue?: (item: T) => string;
  getOptionLabel?: (item: T) => string;
  getOptionDisabled?: (item: T) => boolean;
  filterOption?: (item: T, query: string) => boolean;
  /** @default true */
  filterable?: boolean;
  /** @default 300 */
  debounceMs?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyContent?: ReactNode;
  className?: string;
};

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
    const v = (item as { disabled?: unknown }).disabled;
    return Boolean(v);
  }
  return false;
}

export function Select<T = unknown>(props: SelectProps<T>) {
  const {
    options,
    loadOptions,
    getOptionValue = defaultGetOptionValue as (item: T) => string,
    getOptionLabel = defaultGetOptionLabel as (item: T) => string,
    getOptionDisabled = defaultGetOptionDisabled as (item: T) => boolean,
    filterOption,
    filterable = true,
    debounceMs = 300,
    value: valueProp,
    defaultValue,
    onChange,
    placeholder = "请选择",
    disabled = false,
    emptyContent,
    className = "",
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const listboxId = useId();
  const baseId = useId();

  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState<string | undefined>(
    defaultValue,
  );
  const selectedValue = isControlled ? valueProp : internalValue;

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [asyncItems, setAsyncItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedQuery("");
      setHighlightedIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (searchQuery === "") {
      setDebouncedQuery("");
      return;
    }
    const id = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [open, searchQuery, debounceMs]);

  useEffect(() => {
    if (!open || !loadOptions) return;

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    loadOptions({ query: debouncedQuery, signal: controller.signal })
      .then((data) => {
        if (!cancelled) setAsyncItems(data);
      })
      .catch((err) => {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }
        if (!cancelled) setAsyncItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, debouncedQuery, loadOptions]);

  const syncPool = options ?? [];

  const displayItems = useMemo(() => {
    if (loadOptions) return asyncItems;

    const q = searchQuery.trim().toLowerCase();
    if (!filterable || !q) return syncPool;

    return syncPool.filter((item) => {
      if (filterOption) return filterOption(item, searchQuery);
      return getOptionLabel(item).toLowerCase().includes(q);
    });
  }, [
    loadOptions,
    asyncItems,
    syncPool,
    filterable,
    searchQuery,
    filterOption,
    getOptionLabel,
  ]);

  const resolveLabel = useCallback(
    (val: string | undefined) => {
      if (val === undefined || val === "") return null;
      const pool = loadOptions
        ? asyncItems
        : syncPool;
      const found = pool.find((item) => getOptionValue(item) === val);
      if (found) return getOptionLabel(found);
      const fallback = syncPool.find(
        (item) => getOptionValue(item) === val,
      );
      return fallback ? getOptionLabel(fallback) : val;
    },
    [
      loadOptions,
      asyncItems,
      syncPool,
      getOptionValue,
      getOptionLabel,
    ],
  );

  const selectedLabel = resolveLabel(selectedValue);

  const commitValue = useCallback(
    (next: string | undefined) => {
      onChange?.(next);
      if (!isControlled) setInternalValue(next);
      setOpen(false);
      setSearchQuery("");
      setDebouncedQuery("");
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    },
    [onChange, isControlled],
  );

  const selectIndex = useCallback(
    (index: number) => {
      const item = displayItems[index];
      if (!item || getOptionDisabled(item)) return;
      commitValue(getOptionValue(item));
    },
    [displayItems, getOptionDisabled, getOptionValue, commitValue],
  );

  const stepHighlight = useCallback(
    (delta: number) => {
      if (displayItems.length === 0) return;
      let next = highlightedIndex;
      if (next < 0) next = delta > 0 ? -1 : displayItems.length;
      for (let i = 0; i < displayItems.length; i++) {
        next += delta;
        next =
          ((next % displayItems.length) + displayItems.length) %
          displayItems.length;
        if (!getOptionDisabled(displayItems[next])) {
          setHighlightedIndex(next);
          return;
        }
      }
    },
    [displayItems, highlightedIndex, getOptionDisabled],
  );

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () =>
      document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      if (filterable) searchRef.current?.focus();
      else listboxRef.current?.focus();
    });
  }, [open, filterable]);

  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
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
      const first = displayItems.findIndex((item) => !getOptionDisabled(item));
      if (first >= 0) setHighlightedIndex(first);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      let last = -1;
      displayItems.forEach((item, idx) => {
        if (!getOptionDisabled(item)) last = idx;
      });
      if (last >= 0) setHighlightedIndex(last);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) selectIndex(highlightedIndex);
    }
  };

  const triggerClasses =
    "inline-flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:pointer-events-none disabled:opacity-50";

  const panelClasses =
    "absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg outline-none";

  const optionBase =
    "cursor-pointer px-3 py-2 text-sm text-slate-900 aria-disabled:pointer-events-none aria-disabled:opacity-40";

  const empty =
    emptyContent ?? (
      <li className="px-3 py-2 text-sm text-slate-500" role="presentation">
        暂无数据
      </li>
    );

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={triggerClasses}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listboxId}-panel`}
        id={`${baseId}-trigger`}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={selectedLabel ? "" : "text-slate-400"}>
          {selectedLabel ?? placeholder}
        </span>
        <svg
          aria-hidden
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && (
        <div
          id={`${listboxId}-panel`}
          className={panelClasses}
          role="presentation"
          onKeyDown={onPanelKeyDown}
          tabIndex={-1}
        >
          {filterable && (
            <div className="border-b border-slate-100 px-2 pb-2 pt-1">
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="搜索选项"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                autoComplete="off"
              />
            </div>
          )}
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={`${baseId}-trigger`}
            aria-busy={loading}
            tabIndex={-1}
            className="py-1"
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${listboxId}-opt-${highlightedIndex}`
                : undefined
            }
          >
            {loading && (
              <li className="px-3 py-2 text-sm text-slate-500" role="status">
                加载中…
              </li>
            )}
            {!loading &&
              displayItems.length === 0 &&
              empty}
            {!loading &&
              displayItems.map((item, idx) => {
                const val = getOptionValue(item);
                const label = getOptionLabel(item);
                const optDisabled = getOptionDisabled(item);
                const selected = selectedValue === val;
                const highlighted = highlightedIndex === idx;
                return (
                  <li
                    key={`${val}-${idx}`}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={optDisabled}
                    className={`${optionBase} ${highlighted ? "bg-sky-50" : ""} ${selected ? "font-medium text-sky-800" : ""}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!optDisabled) commitValue(val);
                    }}
                  >
                    {label}
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
