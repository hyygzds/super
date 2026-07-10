import { computed, defineComponent, ref, type PropType } from "vue";

export type InputType = "text" | "password" | "number";
export type InputSize = "sm" | "md";

const sizeClass: Record<InputSize, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-9 px-3 text-sm",
};

export const Input = defineComponent({
  name: "Input",
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: "" },
    type: {
      type: String as PropType<InputType>,
      default: "text",
    },
    placeholder: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    size: {
      type: String as PropType<InputSize>,
      default: "md",
    },
    class: { type: String, default: "" },
    id: { type: String, default: undefined },
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    const uncontrolled = ref(props.defaultValue);
    const showPassword = ref(false);

    const isControlled = computed(() => props.modelValue !== undefined);
    const value = computed(() =>
      isControlled.value ? props.modelValue! : uncontrolled.value,
    );

    function setValue(next: string) {
      if (!isControlled.value) uncontrolled.value = next;
      emit("update:modelValue", next);
    }

    const inputType = computed(() =>
      props.type === "password"
        ? showPassword.value
          ? "text"
          : "password"
        : props.type,
    );

    const showClear = computed(
      () =>
        props.clearable &&
        !props.disabled &&
        !props.readOnly &&
        value.value.length > 0,
    );
    const showPasswordToggle = computed(
      () => props.type === "password" && !props.disabled,
    );

    return () => (
      <div
        class={`inline-flex w-full items-center gap-1 rounded-lg border border-slate-300 bg-white ${sizeClass[props.size]} focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-600 ${props.disabled ? "opacity-50" : ""} ${props.class}`.trim()}
      >
        <input
          {...attrs}
          id={props.id}
          type={inputType.value}
          class="min-w-0 flex-1 border-0 bg-transparent outline-none disabled:cursor-not-allowed"
          value={value.value}
          placeholder={props.placeholder}
          disabled={props.disabled}
          readonly={props.readOnly || undefined}
          onInput={(e: Event) =>
            setValue((e.target as HTMLInputElement).value)
          }
        />
        {showClear.value ? (
          <button
            type="button"
            aria-label="清除"
            class="shrink-0 rounded px-1 text-slate-500 hover:text-slate-800"
            onClick={() => setValue("")}
          >
            ×
          </button>
        ) : null}
        {showPasswordToggle.value ? (
          <button
            type="button"
            aria-label={showPassword.value ? "隐藏密码" : "显示密码"}
            class="shrink-0 rounded px-1 text-slate-500 hover:text-slate-800"
            onClick={() => {
              showPassword.value = !showPassword.value;
            }}
          >
            {showPassword.value ? "隐" : "显"}
          </button>
        ) : null}
      </div>
    );
  },
});
