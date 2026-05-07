import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type Orientation = "horizontal" | "vertical";

type TabsContextValue = {
  baseId: string;
  orientation: Orientation;
  value: string;
  setValue: (next: string) => void;
  registerTab: (value: string, disabled: boolean) => void;
  unregisterTab: (value: string) => void;
  isDisabled: (value: string) => boolean;
  tabOrder: string[];
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`${component} must be used inside <Tabs>`);
  return ctx;
}

export type TabsProps = {
  orientation?: Orientation;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
};

export function Tabs({
  orientation = "horizontal",
  value: valueProp,
  defaultValue,
  onValueChange,
  className = "",
  children,
}: TabsProps) {
  const baseId = useId().replace(/:/g, "");
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState<string | undefined>(
    defaultValue,
  );
  const selected = isControlled ? valueProp! : internalValue ?? "";

  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const disabledRef = useRef<Record<string, boolean>>({});

  const registerTab = useCallback((value: string, disabled: boolean) => {
    setTabOrder((prev) => {
      if (prev.includes(value)) {
        if (import.meta.env.DEV) {
          console.warn(`[Tabs] duplicate TabsTrigger value: ${value}`);
        }
        return prev;
      }
      return [...prev, value];
    });
    disabledRef.current[value] = disabled;
  }, []);

  const unregisterTab = useCallback((value: string) => {
    setTabOrder((prev) => prev.filter((v) => v !== value));
    delete disabledRef.current[value];
  }, []);

  const setValue = useCallback(
    (next: string) => {
      if (disabledRef.current[next]) return;
      onValueChange?.(next);
      if (!isControlled) setInternalValue(next);
    },
    [isControlled, onValueChange],
  );

  useEffect(() => {
    if (isControlled) return;
    if (defaultValue !== undefined) return;
    if (internalValue !== undefined && internalValue !== "") return;
    const first = tabOrder.find((v) => !disabledRef.current[v]);
    if (first !== undefined) setInternalValue(first);
  }, [isControlled, defaultValue, internalValue, tabOrder]);

  const ctx = useMemo(
    () =>
      ({
        baseId,
        orientation,
        value: selected,
        setValue,
        registerTab,
        unregisterTab,
        isDisabled: (v: string) => Boolean(disabledRef.current[v]),
        tabOrder,
      }) satisfies TabsContextValue,
    [
      baseId,
      orientation,
      selected,
      setValue,
      registerTab,
      unregisterTab,
      tabOrder,
    ],
  );

  const rootOrientationClass =
    orientation === "vertical"
      ? "flex flex-row gap-4 items-start"
      : "flex flex-col";

  return (
    <TabsContext.Provider value={ctx}>
      <div className={`${rootOrientationClass} ${className}`.trim()}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = {
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
};

export function TabsList({
  "aria-label": ariaLabel = "标签页",
  className = "",
  children,
}: TabsListProps) {
  const { orientation } = useTabsContext("TabsList");
  const flexDir =
    orientation === "vertical"
      ? "flex flex-col gap-1 shrink-0"
      : "flex flex-row gap-1 overflow-x-auto";
  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      className={`${flexDir} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export type TabsTriggerProps = {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

function moveFocus(
  ctx: TabsContextValue,
  current: string,
  delta: number,
): void {
  const { tabOrder, isDisabled, setValue } = ctx;
  if (tabOrder.length === 0) return;
  let idx = tabOrder.indexOf(current);
  if (idx < 0) idx = delta > 0 ? -1 : tabOrder.length;
  for (let i = 0; i < tabOrder.length; i++) {
    idx = (idx + delta + tabOrder.length) % tabOrder.length;
    const v = tabOrder[idx];
    if (!isDisabled(v)) {
      setValue(v);
      document.getElementById(`${ctx.baseId}-tab-${v}`)?.focus();
      return;
    }
  }
}

function focusEdge(ctx: TabsContextValue, edge: "start" | "end") {
  const { tabOrder, isDisabled, setValue } = ctx;
  const seq = edge === "start" ? tabOrder : [...tabOrder].reverse();
  const v = seq.find((x) => !isDisabled(x));
  if (v !== undefined) {
    setValue(v);
    document.getElementById(`${ctx.baseId}-tab-${v}`)?.focus();
  }
}

export function TabsTrigger({
  value,
  disabled = false,
  className = "",
  children,
}: TabsTriggerProps) {
  const ctx = useTabsContext("TabsTrigger");
  const {
    baseId,
    orientation,
    value: selected,
    setValue,
    registerTab,
    unregisterTab,
  } = ctx;

  useEffect(() => {
    registerTab(value, disabled);
    return () => unregisterTab(value);
  }, [value, disabled, registerTab, unregisterTab]);

  const selectedBool = selected === value;
  const base =
    "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:pointer-events-none disabled:opacity-50";
  const inactive =
    "text-slate-600 hover:text-slate-900 hover:bg-slate-50";
  const active =
    "text-sky-800 bg-sky-50 ring-1 ring-inset ring-sky-200";
  const verticalMark =
    orientation === "vertical" && selectedBool
      ? "border-l-2 border-sky-600 pl-2"
      : orientation === "vertical"
        ? "border-l-2 border-transparent pl-2"
        : "";
  const horizontalMark =
    orientation === "horizontal" && selectedBool
      ? "border-b-2 border-sky-600 -mb-px"
      : orientation === "horizontal"
        ? "border-b-2 border-transparent -mb-px"
        : "";

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const horizontalKeys = e.key === "ArrowLeft" || e.key === "ArrowRight";
    const verticalKeys = e.key === "ArrowUp" || e.key === "ArrowDown";
    if (orientation === "horizontal" && verticalKeys) return;
    if (orientation === "vertical" && horizontalKeys) return;

    if (orientation === "horizontal" && horizontalKeys) {
      e.preventDefault();
      moveFocus(ctx, value, e.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (orientation === "vertical" && verticalKeys) {
      e.preventDefault();
      moveFocus(ctx, value, e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      focusEdge(ctx, "start");
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      focusEdge(ctx, "end");
    }
  };

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selectedBool}
      tabIndex={selectedBool ? 0 : -1}
      disabled={disabled}
      className={`${base} ${inactive} ${selectedBool ? active : ""} ${horizontalMark} ${verticalMark} ${className}`.trim()}
      onClick={() => !disabled && setValue(value)}
      onFocus={() => !disabled && setValue(value)}
      onKeyDown={onKeyDown}
    >
      {children}
    </button>
  );
}

export type TabsPanelProps = {
  value: string;
  className?: string;
  children?: ReactNode;
};

export function TabsPanel({
  value,
  className = "",
  children,
}: TabsPanelProps) {
  const { baseId, value: selected } = useTabsContext("TabsPanel");
  const hidden = selected !== value;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={hidden}
      className={className}
    >
      {children}
    </div>
  );
}
