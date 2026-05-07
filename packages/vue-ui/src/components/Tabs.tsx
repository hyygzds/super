import {
  computed,
  defineComponent,
  inject,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  useId,
  watch,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue";

function isNodeDevelopment(): boolean {
  const proc = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } })
    .process;
  return proc?.env?.NODE_ENV === "development";
}

export type Orientation = "horizontal" | "vertical";

type TabsProvided = {
  baseId: string;
  orientation: ComputedRef<Orientation>;
  value: ComputedRef<string>;
  setValue: (next: string) => void;
  registerTab: (value: string, disabled: boolean) => void;
  unregisterTab: (value: string) => void;
  isDisabled: (value: string) => boolean;
  tabOrder: Ref<string[]>;
};

const TABS_KEY: InjectionKey<TabsProvided> = Symbol("component-ai-tabs");

function useTabsContext(component: string): TabsProvided {
  const ctx = inject(TABS_KEY);
  if (!ctx) throw new Error(`${component} must be used inside <Tabs>`);
  return ctx;
}

function moveFocus(
  ctx: TabsProvided,
  current: string,
  delta: number,
): void {
  const order = ctx.tabOrder.value;
  if (order.length === 0) return;
  let idx = order.indexOf(current);
  if (idx < 0) idx = delta > 0 ? -1 : order.length;
  for (let i = 0; i < order.length; i++) {
    idx = (idx + delta + order.length) % order.length;
    const v = order[idx];
    if (!ctx.isDisabled(v)) {
      ctx.setValue(v);
      document.getElementById(`${ctx.baseId}-tab-${v}`)?.focus();
      return;
    }
  }
}

function focusEdge(ctx: TabsProvided, edge: "start" | "end") {
  const order = ctx.tabOrder.value;
  const seq = edge === "start" ? order : [...order].reverse();
  const v = seq.find((x) => !ctx.isDisabled(x));
  if (v !== undefined) {
    ctx.setValue(v);
    document.getElementById(`${ctx.baseId}-tab-${v}`)?.focus();
  }
}

export const Tabs = defineComponent({
  name: "Tabs",
  props: {
    orientation: {
      type: String as PropType<Orientation>,
      default: "horizontal",
    },
    modelValue: String as PropType<string | undefined>,
    defaultValue: String as PropType<string | undefined>,
    class: { type: String, default: "" },
  },
  emits: {
    "update:modelValue": (_value: string) => true,
    change: (_value: string) => true,
  },
  setup(props, { emit, slots }) {
    const baseId = useId().replace(/:/g, "");
    const isControlled = computed(() => props.modelValue !== undefined);
    const internalValue = ref<string | undefined>(props.defaultValue);
    const tabOrder = ref<string[]>([]);
    const disabledMap = reactive<Record<string, boolean>>({});

    watch(
      () => props.defaultValue,
      (v) => {
        if (!isControlled.value) internalValue.value = v;
      },
    );

    const selected = computed(() =>
      isControlled.value ? props.modelValue! : internalValue.value ?? "",
    );

    function tryAutoSelect() {
      if (isControlled.value) return;
      if (props.defaultValue !== undefined) return;
      if (internalValue.value !== undefined && internalValue.value !== "") return;
      const first = tabOrder.value.find((v) => !disabledMap[v]);
      if (first !== undefined && internalValue.value !== first) {
        internalValue.value = first;
      }
    }

    function registerTab(value: string, disabled: boolean) {
      const dis = disabled ?? false;
      const existed = tabOrder.value.includes(value);
      if (!existed) {
        tabOrder.value = [...tabOrder.value, value];
      } else if (
        isNodeDevelopment() &&
        Boolean(disabledMap[value]) === dis
      ) {
        console.warn(`[Tabs] duplicate TabsTrigger value: ${value}`);
      }
      disabledMap[value] = dis;
      tryAutoSelect();
    }

    function unregisterTab(value: string) {
      tabOrder.value = tabOrder.value.filter((v) => v !== value);
      delete disabledMap[value];
      tryAutoSelect();
    }

    function setValue(next: string) {
      if (disabledMap[next]) return;
      emit("update:modelValue", next);
      emit("change", next);
      if (!isControlled.value) internalValue.value = next;
    }

    function isDisabled(v: string) {
      return Boolean(disabledMap[v]);
    }

    const orientationRef = computed(() => props.orientation);

    const ctx: TabsProvided = {
      baseId,
      orientation: orientationRef,
      value: selected,
      setValue,
      registerTab,
      unregisterTab,
      isDisabled,
      tabOrder,
    };

    provide(TABS_KEY, ctx);

    return () => {
      const rootOrientationClass =
        props.orientation === "vertical"
          ? "flex flex-row gap-4 items-start"
          : "flex flex-col";
      return (
        <div class={`${rootOrientationClass} ${props.class}`.trim()}>
          {slots.default?.()}
        </div>
      );
    };
  },
});

export const TabsList = defineComponent({
  name: "TabsList",
  props: {
    class: { type: String, default: "" },
  },
  setup(props, { attrs, slots }) {
    const ctx = useTabsContext("TabsList");
    return () => {
      const flexDir =
        ctx.orientation.value === "vertical"
          ? "flex flex-col gap-1 shrink-0"
          : "flex flex-row gap-1 overflow-x-auto";
      const ariaLabel =
        (attrs["aria-label"] as string | undefined) ?? "标签页";
      return (
        <div
          role="tablist"
          aria-orientation={ctx.orientation.value}
          aria-label={ariaLabel}
          class={`${flexDir} ${props.class}`.trim()}
        >
          {slots.default?.()}
        </div>
      );
    };
  },
});

export const TabsTrigger = defineComponent({
  name: "TabsTrigger",
  props: {
    value: { type: String, required: true },
    disabled: Boolean,
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    const ctx = useTabsContext("TabsTrigger");

    watch(
      () => [props.value, props.disabled ?? false] as const,
      ([value, disabled]) => {
        ctx.registerTab(value, disabled);
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      ctx.unregisterTab(props.value);
    });

    return () => {
      const selectedBool = ctx.value.value === props.value;
      const base =
        "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:pointer-events-none disabled:opacity-50";
      const inactive =
        "text-slate-600 hover:text-slate-900 hover:bg-slate-50";
      const active =
        "text-sky-800 bg-sky-50 ring-1 ring-inset ring-sky-200";
      const orientation = ctx.orientation.value;
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

      const onKeyDown = (e: KeyboardEvent) => {
        if (props.disabled) return;
        const horizontalKeys = e.key === "ArrowLeft" || e.key === "ArrowRight";
        const verticalKeys = e.key === "ArrowUp" || e.key === "ArrowDown";
        if (orientation === "horizontal" && verticalKeys) return;
        if (orientation === "vertical" && horizontalKeys) return;

        if (orientation === "horizontal" && horizontalKeys) {
          e.preventDefault();
          moveFocus(ctx, props.value, e.key === "ArrowRight" ? 1 : -1);
          return;
        }
        if (orientation === "vertical" && verticalKeys) {
          e.preventDefault();
          moveFocus(ctx, props.value, e.key === "ArrowDown" ? 1 : -1);
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
          id={`${ctx.baseId}-tab-${props.value}`}
          aria-selected={selectedBool ? "true" : "false"}
          tabindex={selectedBool ? 0 : -1}
          disabled={props.disabled}
          class={`${base} ${inactive} ${selectedBool ? active : ""} ${horizontalMark} ${verticalMark} ${props.class}`.trim()}
          onClick={() => !props.disabled && ctx.setValue(props.value)}
          onFocus={() => !props.disabled && ctx.setValue(props.value)}
          onKeydown={onKeyDown}
        >
          {slots.default?.()}
        </button>
      );
    };
  },
});

export const TabsPanel = defineComponent({
  name: "TabsPanel",
  props: {
    value: { type: String, required: true },
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    const ctx = useTabsContext("TabsPanel");
    return () => (
      <div
        role="tabpanel"
        id={`${ctx.baseId}-panel-${props.value}`}
        aria-labelledby={`${ctx.baseId}-tab-${props.value}`}
        hidden={ctx.value.value !== props.value}
        class={props.class}
      >
        {slots.default?.()}
      </div>
    );
  },
});
