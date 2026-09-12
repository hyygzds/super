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
  formatIsoDate,
  isDateInRange,
  parseIsoDate,
} from "@component-ai/form-core";
import Button from "./Button";
import { Input } from "./Input";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function displayValue(raw: string | undefined): string {
  return parseIsoDate(raw ?? "") ? (raw as string) : "";
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
  },
  emits: {
    "update:modelValue": (_value: string) => true,
    blur: (_e: FocusEvent) => true,
  },
  setup(props, { emit }) {
    const rootRef = ref<HTMLDivElement | null>(null);
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref(props.defaultModelValue);
    const open = ref(false);

    function currentRaw(): string {
      return isControlled() ? (props.modelValue as string) : internal.value;
    }

    const selected = computed(() => displayValue(currentRaw()));
    const view = ref(parseIsoDate(selected.value) ?? new Date());

    watch(open, (isOpen) => {
      if (isOpen) view.value = parseIsoDate(selected.value) ?? new Date();
    });

    const grid = computed(() =>
      buildMonthGrid(view.value.getFullYear(), view.value.getMonth() + 1, {
        minDate: props.minDate,
        maxDate: props.maxDate,
      }),
    );

    function commit(next: string) {
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
    }

    function handleInputChange(next: string) {
      commit(next);
      open.value = false;
    }

    function handleInputClick() {
      if (props.disabled) return;
      open.value = true;
    }

    function pick(iso: string, cellDisabled: boolean) {
      if (cellDisabled || props.disabled) return;
      commit(iso);
      open.value = false;
    }

    function onDocPointerDown(event: PointerEvent) {
      if (!open.value) return;
      if (!rootRef.value?.contains(event.target as Node)) open.value = false;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") open.value = false;
    }

    watch(open, (isOpen) => {
      if (isOpen) {
        document.addEventListener("pointerdown", onDocPointerDown);
        document.addEventListener("keydown", onKeyDown);
      } else {
        document.removeEventListener("pointerdown", onDocPointerDown);
        document.removeEventListener("keydown", onKeyDown);
      }
    });

    onUnmounted(() => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    });

    return () => {
      const today = formatIsoDate(new Date());
      const todayDisabled = !isDateInRange(today, props.minDate, props.maxDate);
      const monthGrid = grid.value;
      const selectedIso = selected.value;

      return (
        <div ref={rootRef} class={["relative", props.class]}>
          <Input
            id={props.id}
            modelValue={selectedIso}
            placeholder={props.placeholder}
            disabled={props.disabled}
            readOnly
            clearable={props.clearable}
            onUpdate:modelValue={handleInputChange}
            onBlur={(event: FocusEvent) => emit("blur", event)}
            onClick={handleInputClick}
          />
          {open.value ? (
            <div
              role="dialog"
              aria-label="日期选择"
              class="absolute z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  aria-label="上个月"
                  class="h-8 w-8 px-0 py-0"
                  onClick={() => {
                    view.value = addMonths(view.value, -1);
                  }}
                >
                  ‹
                </Button>
                <div class="text-sm font-medium text-slate-800">
                  {monthGrid.year}年{monthGrid.month}月
                </div>
                <Button
                  variant="ghost"
                  aria-label="下个月"
                  class="h-8 w-8 px-0 py-0"
                  onClick={() => {
                    view.value = addMonths(view.value, 1);
                  }}
                >
                  ›
                </Button>
              </div>
              <div role="grid" class="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((label) => (
                  <div
                    key={label}
                    class="text-center text-xs text-slate-500"
                    role="columnheader"
                  >
                    {label}
                  </div>
                ))}
                {monthGrid.weeks.flat().map((cell) => {
                  const isSelected = cell.iso === selectedIso;
                  const isToday = cell.iso === today;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      role="gridcell"
                      aria-label={cell.iso}
                      aria-selected={isSelected}
                      data-today={isToday ? "" : undefined}
                      disabled={cell.disabled}
                      class={[
                        "h-8 w-8 rounded text-sm",
                        cell.inMonth ? "text-slate-800" : "text-slate-400",
                        isSelected ? "bg-sky-600 text-white" : "hover:bg-slate-100",
                        isToday && !isSelected ? "ring-1 ring-sky-600" : "",
                        "disabled:pointer-events-none disabled:opacity-40",
                      ].join(" ")}
                      onClick={() => pick(cell.iso, cell.disabled)}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
              <div class="mt-2 flex justify-end">
                <Button
                  variant="secondary"
                  aria-label="今天"
                  class="px-3 py-1"
                  disabled={todayDisabled}
                  onClick={() => pick(today, todayDisabled)}
                >
                  今天
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      );
    };
  },
});
