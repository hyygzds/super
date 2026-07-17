import {
  defineComponent,
  nextTick,
  onMounted,
  ref,
  watch,
} from "vue";

export const Checkbox = defineComponent({
  name: "Checkbox",
  props: {
    modelValue: { type: Boolean, default: undefined },
    defaultModelValue: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    value: { type: String, default: undefined },
    class: { type: String, default: "" },
  },
  emits: {
    "update:modelValue": (_checked: boolean) => true,
    change: (_checked: boolean) => true,
  },
  setup(props, { emit, slots }) {
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref(props.defaultModelValue);
    const inputRef = ref<HTMLInputElement | null>(null);

    function applyIndeterminate() {
      if (inputRef.value) inputRef.value.indeterminate = props.indeterminate;
    }
    onMounted(applyIndeterminate);
    watch(() => props.indeterminate, applyIndeterminate);

    function syncCheckedFromProps() {
      if (inputRef.value && isControlled()) {
        inputRef.value.checked = !!props.modelValue;
      }
    }
    watch(() => props.modelValue, syncCheckedFromProps);

    function handleChange(e: Event) {
      const next = (e.target as HTMLInputElement).checked;
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
      emit("change", next);
      // 受控：父未更新 prop 时，把 DOM 拉回 props 值（对齐 React 受控语义）
      if (isControlled()) {
        nextTick(syncCheckedFromProps);
      }
    }

    return () => {
      const checked = isControlled() ? props.modelValue : internal.value;
      const wrapperCls =
        `inline-flex items-center gap-2 text-sm text-slate-800 ${
          props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${props.class}`.trim();
      const boxCls =
        "h-4 w-4 shrink-0 rounded border border-slate-300 text-sky-600 accent-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed";

      return (
        <label class={wrapperCls}>
          <input
            ref={inputRef}
            type="checkbox"
            checked={checked}
            disabled={props.disabled}
            required={props.required}
            name={props.name}
            value={props.value}
            aria-checked={props.indeterminate ? "mixed" : checked}
            class={boxCls}
            onChange={handleChange}
          />
          {slots.default?.()}
        </label>
      );
    };
  },
});
