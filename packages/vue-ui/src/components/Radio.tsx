import {
  computed,
  defineComponent,
  inject,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  useId,
  watch,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from "vue";

export type RadioOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type RadioOrientation = "horizontal" | "vertical";

type RadioGroupProvided = {
  name: ComputedRef<string>;
  value: ComputedRef<string | undefined>;
  groupDisabled: ComputedRef<boolean>;
  setValue: (next: string) => void;
  registerSync: (fn: () => void) => void;
  unregisterSync: (fn: () => void) => void;
};

const RADIO_GROUP_KEY: InjectionKey<RadioGroupProvided> = Symbol(
  "component-ai-radio-group",
);

function useRadioGroupContext(component: string): RadioGroupProvided {
  const ctx = inject(RADIO_GROUP_KEY);
  if (!ctx) throw new Error(`${component} must be used inside <RadioGroup>`);
  return ctx;
}

export const Radio = defineComponent({
  name: "Radio",
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    const ctx = useRadioGroupContext("Radio");
    const inputRef = ref<HTMLInputElement | null>(null);

    function syncCheckedFromContext() {
      if (inputRef.value) {
        inputRef.value.checked = ctx.value.value === props.value;
      }
    }

    ctx.registerSync(syncCheckedFromContext);
    watch(() => ctx.value.value, syncCheckedFromContext);
    onBeforeUnmount(() => ctx.unregisterSync(syncCheckedFromContext));

    function handleChange() {
      const disabled = ctx.groupDisabled.value || props.disabled;
      if (disabled) return;
      ctx.setValue(props.value);
    }

    return () => {
      const checked = ctx.value.value === props.value;
      const disabled = ctx.groupDisabled.value || props.disabled;
      const wrapperCls =
        `inline-flex items-center gap-2 text-sm text-slate-800 ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${props.class}`.trim();
      const inputCls =
        "h-4 w-4 shrink-0 border-slate-300 text-sky-600 accent-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed";

      return (
        <label class={wrapperCls}>
          <input
            ref={inputRef}
            type="radio"
            name={ctx.name.value}
            value={props.value}
            checked={checked}
            disabled={disabled}
            class={inputCls}
            onChange={handleChange}
          />
          {slots.default?.()}
        </label>
      );
    };
  },
});

export const RadioGroup = defineComponent({
  name: "RadioGroup",
  props: {
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    defaultModelValue: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    options: {
      type: Array as PropType<RadioOption[]>,
      default: undefined,
    },
    orientation: {
      type: String as PropType<RadioOrientation>,
      default: "horizontal",
    },
    disabled: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    id: { type: String, default: undefined },
    class: { type: String, default: "" },
  },
  emits: {
    "update:modelValue": (_value: string) => true,
  },
  setup(props, { emit, slots }) {
    const generatedName = useId().replace(/:/g, "");
    const isControlled = () => props.modelValue !== undefined;
    const internal = ref<string | undefined>(props.defaultModelValue);
    const syncFns = new Set<() => void>();

    const nameRef = computed(() => props.name ?? generatedName);
    const valueRef = computed(() =>
      isControlled() ? props.modelValue : internal.value,
    );
    const groupDisabled = computed(() => props.disabled);

    function syncAll() {
      for (const fn of syncFns) fn();
    }

    function setValue(next: string) {
      if (props.disabled) return;
      if (!isControlled()) internal.value = next;
      emit("update:modelValue", next);
      // 受控：父未更新 prop 时，把所有 radio DOM 拉回组当前值
      if (isControlled()) {
        nextTick(syncAll);
      }
    }

    provide(RADIO_GROUP_KEY, {
      name: nameRef,
      value: valueRef,
      groupDisabled,
      setValue,
      registerSync: (fn) => {
        syncFns.add(fn);
      },
      unregisterSync: (fn) => {
        syncFns.delete(fn);
      },
    });

    return () => {
      const orientationCls =
        props.orientation === "vertical"
          ? "inline-flex flex-col gap-2"
          : "inline-flex flex-row flex-wrap items-center gap-4";

      return (
        <div
          id={props.id}
          role="radiogroup"
          class={`${orientationCls} ${props.class}`.trim()}
        >
          {props.options?.map((opt) => (
            <Radio
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </Radio>
          ))}
          {slots.default?.()}
        </div>
      );
    };
  },
});
