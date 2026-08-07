import { defineComponent, nextTick, ref, watch, type PropType } from "vue";

function clamp(n: number, min?: number, max?: number): number {
  let v = n;
  if (min !== undefined && v < min) v = min;
  if (max !== undefined && v > max) v = max;
  return v;
}

function roundPrecision(n: number, precision?: number): number {
  if (precision === undefined) return n;
  const factor = 10 ** precision;
  return Math.round(n * factor) / factor;
}

function constrain(n: number, min?: number, max?: number, precision?: number): number {
  return roundPrecision(clamp(n, min, max), precision);
}

function formatDisplay(n: number | null, precision?: number): string {
  if (n === null) return "";
  if (precision !== undefined) return n.toFixed(precision);
  return String(n);
}

const inputCls =
  "w-full min-w-0 rounded border border-slate-300 px-2 py-1 text-center text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

const btnCls =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

export const InputNumber = defineComponent({
  name: "InputNumber",
  props: {
    modelValue: {
      type: [Number, null] as unknown as PropType<number | null | undefined>,
      default: undefined,
    },
    defaultModelValue: {
      type: [Number, null] as unknown as PropType<number | null>,
      default: null,
    },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    step: { type: Number, default: 1 },
    precision: { type: Number, default: undefined },
    placeholder: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    id: { type: String, default: undefined },
    class: { type: String, default: "" },
  },
  emits: {
    "update:modelValue": (_value: number | null) => true,
    blur: (_e: FocusEvent) => true,
  },
  setup(props, { emit }) {
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref<number | null>(props.defaultModelValue ?? null);
    const drafting = ref(false);
    const draft = ref("");
    const inputRef = ref<HTMLInputElement | null>(null);

    function currentValue(): number | null {
      return isControlled()
        ? (props.modelValue as number | null)
        : internal.value;
    }

    function commit(next: number | null) {
      const value =
        next === null
          ? null
          : constrain(next, props.min, props.max, props.precision);
      if (!isControlled()) internal.value = value;
      emit("update:modelValue", value);
      drafting.value = false;
      if (isControlled()) {
        nextTick(() => {
          if (inputRef.value && !drafting.value) {
            inputRef.value.value = formatDisplay(
              props.modelValue as number | null,
              props.precision,
            );
          }
        });
      }
    }

    watch(
      () => props.modelValue,
      () => {
        if (isControlled()) drafting.value = false;
      },
    );

    function stepBy(delta: number) {
      if (props.disabled) return;
      const base = currentValue() ?? 0;
      commit(base + delta * props.step);
    }

    function handleInput(e: Event) {
      if (props.disabled) return;
      const raw = (e.target as HTMLInputElement).value;
      drafting.value = true;
      draft.value = raw;
      if (raw.trim() === "") {
        commit(null);
        drafting.value = true;
        draft.value = "";
        return;
      }
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        // Keep draft for intermediate typing; still emit numeric when valid
        if (!isControlled()) internal.value = parsed;
        emit("update:modelValue", parsed);
      }
    }

    function handleBlur(e: FocusEvent) {
      if (drafting.value) {
        const raw = draft.value.trim();
        if (raw === "") {
          commit(null);
        } else {
          const parsed = Number(raw);
          if (Number.isNaN(parsed)) {
            drafting.value = false;
            const fallback = currentValue();
            if (inputRef.value) {
              inputRef.value.value = formatDisplay(fallback, props.precision);
            }
          } else {
            commit(parsed);
          }
        }
      }
      emit("blur", e);
    }

    return () => {
      const value = currentValue();
      const display = drafting.value
        ? draft.value
        : formatDisplay(value, props.precision);

      return (
        <div class={["inline-flex w-full items-center gap-1", props.class]}>
          <button
            type="button"
            aria-label="减少"
            class={btnCls}
            disabled={props.disabled}
            onClick={() => stepBy(-1)}
          >
            −
          </button>
          <input
            ref={inputRef}
            id={props.id}
            type="text"
            inputmode="decimal"
            value={display}
            placeholder={props.placeholder}
            disabled={props.disabled}
            class={inputCls}
            onInput={handleInput}
            onBlur={handleBlur}
          />
          <button
            type="button"
            aria-label="增加"
            class={btnCls}
            disabled={props.disabled}
            onClick={() => stepBy(1)}
          >
            +
          </button>
        </div>
      );
    };
  },
});
