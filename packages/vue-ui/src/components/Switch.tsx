import { defineComponent, ref } from "vue";

export const Switch = defineComponent({
  name: "Switch",
  props: {
    modelValue: { type: Boolean, default: undefined },
    defaultModelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    id: { type: String, default: undefined },
    class: { type: String, default: "" },
  },
  emits: {
    "update:modelValue": (_checked: boolean) => true,
    change: (_checked: boolean) => true,
  },
  setup(props, { emit }) {
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref(props.defaultModelValue);

    function currentChecked(): boolean {
      return isControlled() ? !!props.modelValue : internal.value;
    }

    function toggle() {
      if (props.disabled) return;
      const next = !currentChecked();
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
      emit("change", next);
    }

    return () => {
      const checked = currentChecked();
      const trackCls = [
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
        checked ? "bg-sky-600" : "bg-slate-300",
        props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        props.class,
      ]
        .filter(Boolean)
        .join(" ");
      const thumbCls = [
        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-5" : "translate-x-0.5",
      ].join(" ");

      return (
        <button
          id={props.id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={props.disabled}
          class={trackCls}
          onClick={toggle}
        >
          <span class={thumbCls} />
        </button>
      );
    };
  },
});
