import { defineComponent, nextTick, ref, type PropType } from "vue";

export type InputType = "text" | "password" | "search";

const inputCls =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = defineComponent({
  name: "Input",
  props: {
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    defaultModelValue: { type: String, default: "" },
    type: {
      type: String as PropType<InputType>,
      default: "text",
    },
    placeholder: { type: String, default: undefined },
    clearable: { type: Boolean, default: false },
    maxLength: { type: Number, default: undefined },
    disabled: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    id: { type: String, default: undefined },
    class: { type: String, default: "" },
    onClick: { type: Function as PropType<(event: MouseEvent) => void>, default: undefined },
  },
  emits: {
    "update:modelValue": (_value: string) => true,
    blur: (_e: FocusEvent) => true,
  },
  setup(props, { emit }) {
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref(props.defaultModelValue);
    const inputRef = ref<HTMLInputElement | null>(null);

    function currentValue(): string {
      return isControlled() ? (props.modelValue as string) : internal.value;
    }

    function commit(next: string) {
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
      if (isControlled()) {
        nextTick(() => {
          if (inputRef.value) inputRef.value.value = props.modelValue as string;
        });
      }
    }

    function handleInput(e: Event) {
      if (props.disabled || props.readOnly) {
        if (inputRef.value) inputRef.value.value = currentValue();
        return;
      }
      commit((e.target as HTMLInputElement).value);
    }

    function handleClear() {
      if (props.disabled) return;
      commit("");
      nextTick(() => inputRef.value?.focus());
    }

    return () => {
      const value = currentValue();
      const showClear = props.clearable && !props.disabled && value !== "";

      return (
        <div class={["relative inline-flex w-full items-center", props.class]}>
          <input
            ref={inputRef}
            id={props.id}
            type={props.type}
            value={value}
            placeholder={props.placeholder}
            maxlength={props.maxLength}
            disabled={props.disabled}
            readonly={props.readOnly}
            class={[inputCls, showClear ? "pr-8" : ""].join(" ")}
            onInput={handleInput}
            onClick={(e: MouseEvent) => props.onClick?.(e)}
            onBlur={(e: FocusEvent) => emit("blur", e)}
          />
          {showClear ? (
            <button
              type="button"
              aria-label="清除"
              class="absolute right-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              onClick={handleClear}
            >
              ×
            </button>
          ) : null}
        </div>
      );
    };
  },
});
