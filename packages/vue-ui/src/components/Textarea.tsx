import { defineComponent, nextTick, ref, type PropType } from "vue";

const textareaCls =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

export const Textarea = defineComponent({
  name: "Textarea",
  props: {
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    defaultModelValue: { type: String, default: "" },
    rows: { type: Number, default: 3 },
    maxLength: { type: Number, default: undefined },
    showCount: { type: Boolean, default: false },
    placeholder: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
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
    const taRef = ref<HTMLTextAreaElement | null>(null);

    function currentValue(): string {
      return isControlled() ? (props.modelValue as string) : internal.value;
    }

    function commit(next: string) {
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
      if (isControlled()) {
        nextTick(() => {
          if (taRef.value) taRef.value.value = props.modelValue as string;
        });
      }
    }

    function handleInput(e: Event) {
      if (props.disabled) return;
      commit((e.target as HTMLTextAreaElement).value);
    }

    return () => {
      const value = currentValue();
      return (
        <div class={["inline-flex w-full flex-col gap-1", props.class]}>
          <textarea
            ref={taRef}
            id={props.id}
            rows={props.rows}
            value={value}
            placeholder={props.placeholder}
            maxlength={props.maxLength}
            disabled={props.disabled}
            class={textareaCls}
            onInput={handleInput}
            onBlur={(e: FocusEvent) => emit("blur", e)}
          />
          {props.showCount ? (
            <div class="text-right text-xs text-slate-500">
              {value.length}
              {props.maxLength !== undefined ? `/${props.maxLength}` : ""}
            </div>
          ) : null}
        </div>
      );
    };
  },
});
