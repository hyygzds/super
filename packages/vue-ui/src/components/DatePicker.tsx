import {
  defineComponent,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from "vue";
import {
  buildMonthGrid,
  isIsoDateInRange,
  parseIsoDate,
  shiftMonth,
  todayIsoDate,
} from "@component-ai/form-core";
import Button from "./Button";
import { Input } from "./Input";

export type DatePickerProps = {
  modelValue?: string;
  defaultModelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: string;
  maxDate?: string;
  id?: string;
  class?: string;
  ariaLabel?: string;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function viewFromValue(value: string): { year: number; month: number } {
  const parsed = parseIsoDate(value);
  if (parsed) return { year: parsed.year, month: parsed.month };
  const now = parseIsoDate(todayIsoDate());
  return now ?? { year: 1970, month: 1 };
}

export const DatePicker = defineComponent({
  name: "DatePicker",
  props: {
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    defaultModelValue: { type: String, default: "" },
    placeholder: { type: String, default: "请选择日期" },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    minDate: { type: String, default: undefined },
    maxDate: { type: String, default: undefined },
    id: { type: String, default: undefined },
    class: { type: String, default: "" },
    ariaLabel: { type: String, default: "日期选择" },
  },
  emits: {
    "update:modelValue": (_value: string) => true,
    blur: (_e: FocusEvent) => true,
  },
  setup(props, { emit }) {
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref(props.defaultModelValue);
    const open = ref(false);
    const view = ref(viewFromValue(isControlled() ? (props.modelValue as string) : internal.value));
    const rootRef = ref<HTMLDivElement | null>(null);

    function currentValue(): string {
      return isControlled() ? (props.modelValue as string) : internal.value;
    }

    function commit(next: string) {
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
    }

    function openPanel() {
      if (props.disabled) return;
      view.value = viewFromValue(currentValue());
      open.value = true;
    }

    function togglePanel() {
      if (props.disabled) return;
      if (open.value) {
        open.value = false;
        return;
      }
      openPanel();
    }

    function onDocPointerDown(e: PointerEvent) {
      const el = rootRef.value;
      if (!el?.contains(e.target as Node)) open.value = false;
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") open.value = false;
    }

    watch(open, (isOpen) => {
      if (isOpen) {
        document.addEventListener("pointerdown", onDocPointerDown);
        document.addEventListener("keydown", onDocKeyDown);
        return;
      }
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    });

    onBeforeUnmount(() => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    });

    return () => {
      const value = currentValue();
      const cells = buildMonthGrid(view.value.year, view.value.month);
      const today = todayIsoDate();

      return (
        <div
          ref={rootRef}
          class={["relative w-full", props.class]}
          aria-label={props.ariaLabel}
        >
          <div class="flex items-center gap-1">
            <div class="min-w-0 flex-1" onClick={openPanel}>
              <Input
                id={props.id}
                modelValue={value}
                placeholder={props.placeholder}
                disabled={props.disabled}
                readOnly
                clearable={props.clearable}
                onUpdate:modelValue={commit}
                onBlur={(e: FocusEvent) => emit("blur", e)}
              />
            </div>
            <Button
              variant="ghost"
              disabled={props.disabled}
              aria-label="打开日历"
              aria-haspopup="dialog"
              aria-expanded={open.value}
              class="h-8 w-8 shrink-0 px-0 py-0 text-slate-600"
              onClick={togglePanel}
            >
              <span aria-hidden>📅</span>
            </Button>
          </div>

          {open.value ? (
            <div
              role="dialog"
              aria-label="选择日期"
              class="absolute z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
            >
              <div class="mb-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  aria-label="上个月"
                  class="h-8 w-8 px-0 py-0"
                  onClick={() => {
                    view.value = shiftMonth(view.value.year, view.value.month, -1);
                  }}
                >
                  ‹
                </Button>
                <div class="text-sm font-medium text-slate-800">
                  {view.value.year}年{view.value.month}月
                </div>
                <Button
                  variant="ghost"
                  aria-label="下个月"
                  class="h-8 w-8 px-0 py-0"
                  onClick={() => {
                    view.value = shiftMonth(view.value.year, view.value.month, 1);
                  }}
                >
                  ›
                </Button>
              </div>

              <div role="grid" aria-label={`${view.value.year}年${view.value.month}月`}>
                <div role="row" class="mb-1 grid grid-cols-7">
                  {WEEKDAYS.map((label) => (
                    <div
                      key={label}
                      role="columnheader"
                      class="py-1 text-center text-xs text-slate-500"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                {Array.from({ length: 6 }, (_, week) => (
                  <div key={week} role="row" class="grid grid-cols-7">
                    {cells.slice(week * 7, week * 7 + 7).map((cell) => {
                      const selected = cell.iso === value;
                      const isToday = cell.iso === today;
                      const inRange = isIsoDateInRange(
                        cell.iso,
                        props.minDate,
                        props.maxDate,
                      );
                      return (
                        <div
                          key={cell.iso}
                          role="gridcell"
                          aria-selected={selected}
                          class="p-0.5"
                        >
                          <button
                            type="button"
                            aria-label={cell.iso}
                            disabled={!inRange}
                            class={[
                              "flex h-8 w-full items-center justify-center rounded text-sm",
                              cell.inCurrentMonth ? "text-slate-800" : "text-slate-400",
                              selected
                                ? "bg-sky-600 text-white"
                                : isToday
                                  ? "font-semibold text-sky-700 ring-1 ring-sky-400"
                                  : "hover:bg-slate-100",
                              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                            ].join(" ")}
                            onClick={() => {
                              if (!inRange) return;
                              commit(cell.iso);
                              open.value = false;
                            }}
                          >
                            {cell.day}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                aria-label="今天"
                class="mt-2 w-full py-1.5"
                disabled={!isIsoDateInRange(today, props.minDate, props.maxDate)}
                onClick={() => {
                  commit(today);
                  open.value = false;
                }}
              >
                今天
              </Button>
            </div>
          ) : null}
        </div>
      );
    };
  },
});
