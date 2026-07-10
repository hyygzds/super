import {
  computed,
  defineComponent,
  inject,
  onMounted,
  provide,
  ref,
  watch,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue";

function isNodeDevelopment(): boolean {
  const proc = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } })
    .process;
  return proc?.env?.NODE_ENV === "development";
}

type Orientation = "horizontal" | "vertical";

type CheckboxGroupProvided = {
  value: Ref<string[]>;
  setItemChecked: (itemValue: string, checked: boolean) => void;
  disabled: Ref<boolean>;
};

const CHECKBOX_GROUP_KEY: InjectionKey<CheckboxGroupProvided> = Symbol(
  "component-ai-checkbox-group",
);

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2 5.2 4.1 7.3 8 2.8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2.5 5h5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </svg>
  );
}

export const Checkbox = defineComponent({
  name: "Checkbox",
  inheritAttrs: false,
  props: {
    checked: { type: Boolean, default: undefined },
    defaultChecked: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    value: { type: String, default: undefined },
    class: { type: String, default: "" },
    label: { type: String, default: undefined },
  },
  emits: ["update:checked"],
  setup(props, { emit, slots, attrs }) {
    const group = inject(CHECKBOX_GROUP_KEY, null);
    const inputRef = ref<HTMLInputElement | null>(null);
    const inner = ref(props.defaultChecked);

    if (group && props.checked !== undefined && isNodeDevelopment()) {
      console.warn(
        "[Checkbox] `checked` is ignored inside CheckboxGroup; group value wins.",
      );
    }

    const inGroup = computed(
      () => group != null && props.value != null,
    );
    const checked = computed(() => {
      if (inGroup.value && group && props.value != null) {
        return group.value.value.includes(props.value);
      }
      return props.checked !== undefined ? props.checked : inner.value;
    });
    const isDisabled = computed(
      () => props.disabled || (group?.disabled.value ?? false),
    );
    const showIndeterminate = computed(
      () => props.indeterminate && !checked.value,
    );

    function syncIndeterminate() {
      if (inputRef.value) {
        inputRef.value.indeterminate = showIndeterminate.value;
      }
    }

    onMounted(syncIndeterminate);
    watch([showIndeterminate, checked], syncIndeterminate);

    function onChange(e: Event) {
      const next = (e.target as HTMLInputElement).checked;
      if (inGroup.value && group && props.value != null) {
        group.setItemChecked(props.value, next);
        return;
      }
      if (props.checked === undefined) inner.value = next;
      emit("update:checked", next);
    }

    return () => {
      const boxState =
        checked.value || showIndeterminate.value
          ? "border-sky-600 bg-sky-600"
          : "border-slate-300 bg-white";
      const labelText = slots.default?.() ?? props.label;

      return (
        <label
          class={`inline-flex items-center gap-2 text-sm text-slate-900 ${isDisabled.value ? "opacity-50" : ""} ${props.class}`.trim()}
        >
          <span class="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <input
              ref={inputRef}
              type="checkbox"
              class="peer absolute inset-0 z-10 m-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              checked={checked.value}
              disabled={isDisabled.value}
              value={props.value}
              aria-label={attrs["aria-label"] as string | undefined}
              aria-checked={
                showIndeterminate.value ? "mixed" : checked.value
              }
              onChange={onChange}
            />
            <span
              aria-hidden="true"
              class={`pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded border text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-600 ${boxState}`}
            >
              {checked.value ? <CheckIcon /> : null}
              {showIndeterminate.value ? <MinusIcon /> : null}
            </span>
          </span>
          {labelText != null ? <span>{labelText}</span> : null}
        </label>
      );
    };
  },
});

export const CheckboxGroup = defineComponent({
  name: "CheckboxGroup",
  props: {
    modelValue: { type: Array as PropType<string[]>, default: undefined },
    defaultValue: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    disabled: { type: Boolean, default: false },
    orientation: {
      type: String as PropType<Orientation>,
      default: "vertical",
    },
    class: { type: String, default: "" },
    ariaLabel: { type: String, default: undefined },
    ariaLabelledby: { type: String, default: undefined },
  },
  emits: ["update:modelValue"],
  setup(props, { emit, slots, attrs }) {
    const inner = ref<string[]>([...(props.defaultValue ?? [])]);
    const isControlled = computed(() => props.modelValue !== undefined);
    const value = computed(() =>
      isControlled.value ? (props.modelValue as string[]) : inner.value,
    );
    const disabledRef = computed(() => props.disabled);

    function setItemChecked(itemValue: string, nextChecked: boolean) {
      const set = new Set(value.value);
      if (nextChecked) set.add(itemValue);
      else set.delete(itemValue);
      const next = [...set];
      if (!isControlled.value) inner.value = next;
      emit("update:modelValue", next);
    }

    provide(CHECKBOX_GROUP_KEY, {
      value: value as unknown as Ref<string[]>,
      setItemChecked,
      disabled: disabledRef as unknown as Ref<boolean>,
    });

    return () => {
      const layout =
        props.orientation === "horizontal"
          ? "flex flex-row flex-wrap gap-3"
          : "flex flex-col gap-2";
      const ariaLabel =
        props.ariaLabel ??
        (attrs["aria-label"] as string | undefined);
      const ariaLabelledby =
        props.ariaLabelledby ??
        (attrs["aria-labelledby"] as string | undefined);

      return (
        <div
          role="group"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          class={`${layout} ${props.class}`.trim()}
        >
          {slots.default?.()}
        </div>
      );
    };
  },
});
