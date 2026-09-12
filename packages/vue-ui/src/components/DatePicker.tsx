import {
  computed,
  defineComponent,
  onUnmounted,
  ref,
  watch,
  type PropType,
} from "vue";
import {
  addMonths,
  buildMonthGrid,
  isIsoDateInRange,
  isValidIsoDate,
  todayIso,
  visibleMonthFromValue,
} from "@component-ai/form-core";
import { Input } from "./Input";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const navBtnCls =
  "inline-flex h-7 w-7 items-center justify-center rounded text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:pointer-events-none disabled:opacity-50";

export const DatePicker = defineComponent({
  name: "DatePicker",
  props: {
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    defaultModelValue: { type: String, default: "" },
    placeholder: { type: String, default: "请选择日期" },
    clearable: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    min: { type: String, default: undefined },
    max: { type: String, default: undefined },
    id: { type: String, default: undefined },
    class: { type: String, default: "" },
  },
  emits: {
    "update:modelValue": (_value: string) => true,
    blur: (_e: FocusEvent) => true,
  },
  setup(props, { emit }) {
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref(props.defaultModelValue);
    const open = ref(false);
    const focused = ref(false);
    const draft = ref(props.defaultModelValue);
    const rootRef = ref<HTMLElement | null>(null);

    function currentValue(): string {
      return isControlled() ? (props.modelValue as string) : internal.value;
    }

    const visible = ref(visibleMonthFromValue(currentValue()));

    function commit(next: string) {
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
    }

    function pick(iso: string) {
      if (props.disabled || !isIsoDateInRange(iso, props.min, props.max)) return;
      commit(iso);
      draft.value = iso;
      visible.value = visibleMonthFromValue(iso);
      open.value = false;
    }

    function toggleOpen() {
      if (props.disabled) return;
      const next = !open.value;
      if (next) visible.value = visibleMonthFromValue(currentValue());
      open.value = next;
    }

    function handleInputChange(next: string) {
      draft.value = next;
      if (next === "") commit("");
    }

    function handleInputFocus() {
      if (props.disabled) return;
      focused.value = true;
      draft.value = currentValue();
      visible.value = visibleMonthFromValue(currentValue());
      open.value = true;
    }

    function handleInputBlur(event: FocusEvent) {
      focused.value = false;
      const next = draft.value;
      const current = currentValue();
      if (
        next === "" ||
        (isValidIsoDate(next) && isIsoDateInRange(next, props.min, props.max))
      ) {
        if (next !== current) commit(next);
      } else {
        draft.value = current;
      }
      emit("blur", event);
    }

    function shiftMonth(delta: number) {
      const next = addMonths(
        { y: visible.value.y, m: visible.value.m, d: 1 },
        delta,
      );
      visible.value = { y: next.y, m: next.m };
    }

    function onDocPointerDown(e: MouseEvent) {
      const el = rootRef.value;
      if (!el?.contains(e.target as Node)) open.value = false;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") open.value = false;
    }

    watch(open, (isOpen) => {
      if (isOpen) {
        document.addEventListener("pointerdown", onDocPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return;
      }
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    });

    onUnmounted(() => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    });

    const inputValue = computed(() =>
      focused.value ? draft.value : currentValue(),
    );

    return () => {
      const current = currentValue();
      const cells = buildMonthGrid(visible.value.y, visible.value.m, {
        min: props.min,
        max: props.max,
      });
      const today = todayIso();
      const todayDisabled = !isIsoDateInRange(today, props.min, props.max);

      return (
        <div
          ref={rootRef}
          class={["relative inline-flex w-full items-center gap-1", props.class]}
        >
          <div class="min-w-0 flex-1" onFocusin={handleInputFocus}>
            <Input
              id={props.id}
              modelValue={inputValue.value}
              placeholder={props.placeholder}
              clearable={props.clearable}
              disabled={props.disabled}
              onUpdate:modelValue={handleInputChange}
              onBlur={handleInputBlur}
            />
          </div>
          <button
            type="button"
            aria-label="打开日历"
            aria-haspopup="dialog"
            aria-expanded={open.value}
            disabled={props.disabled}
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={toggleOpen}
          >
            <svg
              aria-hidden
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" />
            </svg>
          </button>
          {open.value ? (
            <div
              role="dialog"
              aria-label="选择日期"
              class="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
            >
              <div class="mb-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  aria-label="上一年"
                  class={navBtnCls}
                  onClick={() => shiftMonth(-12)}
                >
                  «
                </button>
                <button
                  type="button"
                  aria-label="上一月"
                  class={navBtnCls}
                  onClick={() => shiftMonth(-1)}
                >
                  ‹
                </button>
                <div class="min-w-0 flex-1 text-center text-sm font-medium text-slate-800">
                  {visible.value.y}年{visible.value.m}月
                </div>
                <button
                  type="button"
                  aria-label="下一月"
                  class={navBtnCls}
                  onClick={() => shiftMonth(1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  aria-label="下一年"
                  class={navBtnCls}
                  onClick={() => shiftMonth(12)}
                >
                  »
                </button>
              </div>
              <div role="grid" aria-label={`${visible.value.y}年${visible.value.m}月`}>
                <div class="mb-1 grid grid-cols-7 text-center text-xs text-slate-500">
                  {WEEKDAYS.map((label) => (
                    <div key={label} role="columnheader">
                      {label}
                    </div>
                  ))}
                </div>
                <div class="grid grid-cols-7 gap-0.5">
                  {cells.map((cell) => {
                    const selected = cell.iso === current;
                    const isToday = cell.iso === today;
                    const dayCls = [
                      "h-8 w-full rounded text-sm",
                      cell.inCurrentMonth ? "text-slate-800" : "text-slate-400",
                      selected ? "bg-sky-600 text-white" : "hover:bg-slate-100",
                      isToday && !selected ? "ring-1 ring-sky-600" : "",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
                      "disabled:pointer-events-none disabled:opacity-40",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        role="gridcell"
                        aria-label={cell.iso}
                        aria-selected={selected}
                        aria-disabled={cell.disabled}
                        disabled={cell.disabled}
                        class={dayCls}
                        onMousedown={(e: MouseEvent) => e.preventDefault()}
                        onClick={() => pick(cell.iso)}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div class="mt-2 flex justify-end">
                <button
                  type="button"
                  aria-label="今天"
                  disabled={todayDisabled}
                  class="rounded px-2 py-1 text-sm text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:pointer-events-none disabled:opacity-40"
                  onMousedown={(e: MouseEvent) => e.preventDefault()}
                  onClick={() => pick(today)}
                >
                  今天
                </button>
              </div>
            </div>
          ) : null}
        </div>
      );
    };
  },
});
