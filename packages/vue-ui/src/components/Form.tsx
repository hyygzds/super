import {
  cloneVNode,
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
} from "vue";
import {
  createFormStore,
  type FormRule,
  type FormStore,
  type FormValues,
  type ValidateResult,
} from "@component-ai/form-core";

type FormLayout = "vertical" | "horizontal";

type FormContext = {
  store: FormStore;
  layout: Ref<FormLayout>;
  labelWidth: Ref<number | undefined>;
  disabled: Ref<boolean>;
  tick: Ref<number>;
};

const FORM_KEY: InjectionKey<FormContext> = Symbol("component-ai-form");

function readChangeValue(eventOrValue: unknown): unknown {
  if (
    eventOrValue !== null &&
    typeof eventOrValue === "object" &&
    "target" in eventOrValue
  ) {
    const target = (eventOrValue as { target: unknown }).target;
    if (target !== null && typeof target === "object" && "value" in target) {
      return (target as { value: unknown }).value;
    }
  }
  return eventOrValue;
}

export type FormProps = {
  initialValues?: FormValues;
  layout?: FormLayout;
  labelWidth?: number;
  disabled?: boolean;
  onFinish?: (values: FormValues) => void;
  onFinishFailed?: (info: {
    values: FormValues;
    errors: Record<string, string[]>;
  }) => void;
  class?: string;
};

export const Form = defineComponent({
  name: "Form",
  props: {
    initialValues: Object as PropType<FormValues>,
    layout: { type: String as PropType<FormLayout>, default: "vertical" },
    labelWidth: Number,
    disabled: { type: Boolean, default: false },
    onFinish: Function as PropType<FormProps["onFinish"]>,
    onFinishFailed: Function as PropType<FormProps["onFinishFailed"]>,
    class: { type: String, default: "" },
  },
  emits: {
    finish: (_values: FormValues) => true,
    finishFailed: (_info: {
      values: FormValues;
      errors: Record<string, string[]>;
    }) => true,
  },
  setup(props, { emit, slots, expose }) {
    const store = createFormStore({ initialValues: props.initialValues });
    const tick = ref(0);
    store.subscribe(() => {
      tick.value += 1;
    });

    const layout = ref(props.layout);
    watch(() => props.layout, (next) => {
      layout.value = next;
    });
    const labelWidth = ref(props.labelWidth);
    watch(() => props.labelWidth, (next) => {
      labelWidth.value = next;
    });
    const disabled = ref(props.disabled);
    watch(() => props.disabled, (next) => {
      disabled.value = next;
    });

    provide(FORM_KEY, {
      store,
      layout,
      labelWidth,
      disabled,
      tick,
    });

    async function runValidate(): Promise<ValidateResult> {
      return store.validate();
    }

    expose({
      validate: runValidate,
      validateFields: (names?: string[]) => store.validateFields(names),
      getFieldsValue: () => store.getFieldsValue(),
      setFieldsValue: (values: Partial<FormValues>) =>
        store.setFieldsValue(values),
      resetFields: (names?: string[]) => store.resetFields(names),
      clearValidate: (names?: string[]) => store.clearValidate(names),
    });

    async function onSubmit(event: Event) {
      event.preventDefault();
      const result = await store.validate();
      if (result.valid) {
        props.onFinish?.(result.values);
        emit("finish", result.values);
      } else {
        const info = { values: result.values, errors: result.errors };
        props.onFinishFailed?.(info);
        emit("finishFailed", info);
      }
    }

    // Form's own render must NOT depend on `tick`: FormItem already
    // subscribes to `tick` directly via inject(), so it re-renders itself
    // whenever the store notifies. If Form also depended on `tick` here,
    // every store update would re-run `slots.default()`, producing fresh
    // vnodes/prop literals (e.g. a new `rules` array) for FormItem, which
    // in turn retriggers FormItem's `watch(() => props.rules, ...)` and
    // calls `updateFieldRules` -> `notify()` -> infinite render loop.
    return () => (
      <form
        class={["flex flex-col gap-4", props.class].filter(Boolean).join(" ")}
        onSubmit={(e) => void onSubmit(e)}
        noValidate
      >
        {slots.default?.()}
      </form>
    );
  },
});

export type FormItemProps = {
  name?: string;
  label?: string;
  rules?: FormRule[];
  required?: boolean;
  help?: string;
  class?: string;
};

let formItemSeq = 0;

export const FormItem = defineComponent({
  name: "FormItem",
  props: {
    name: String,
    label: String,
    rules: Array as PropType<FormRule[]>,
    required: { type: Boolean, default: false },
    help: String,
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    const ctx = inject(FORM_KEY);
    if (!ctx) throw new Error("FormItem must be used inside Form");

    const seq = ++formItemSeq;
    const controlId = `form-vue-${seq}-control`;
    const errorId = `form-vue-${seq}-error`;

    onMounted(() => {
      if (!props.name) {
        if (
          (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
            ?.env?.NODE_ENV === "development"
        ) {
          console.warn("[FormItem] missing name — field will not be collected");
        }
        return;
      }
      ctx.store.registerField(props.name, { rules: props.rules });
    });

    onBeforeUnmount(() => {
      if (props.name) ctx.store.unregisterField(props.name);
    });

    watch(
      () => props.rules,
      (rules) => {
        if (props.name) ctx.store.updateFieldRules(props.name, rules);
      },
    );

    return () => {
      void ctx.tick.value;
      const errors = props.name ? ctx.store.getFieldErrors(props.name) : [];
      const showError = errors[0];
      const value = props.name ? ctx.store.getFieldValue(props.name) : undefined;

      const raw = slots.default?.() ?? [];
      const first = raw.find((n) => n && typeof n.type !== "symbol") as
        | VNode
        | undefined;
      if (!first) throw new Error("FormItem expects a single element child");

      const childDisabled =
        Boolean((first.props as { disabled?: boolean } | null)?.disabled) ||
        ctx.disabled.value;

      const injected = cloneVNode(first, {
        id: controlId,
        value: (value as string | number | undefined) ?? "",
        disabled: childDisabled,
        "aria-invalid": showError ? true : undefined,
        "aria-describedby": showError ? errorId : undefined,
        onChange: (eventOrValue: unknown) => {
          if (!props.name) return;
          ctx.store.setFieldValue(props.name, readChangeValue(eventOrValue));
        },
        onBlur: () => {
          if (props.name) void ctx.store.validateField(props.name);
        },
      });

      const needStar =
        props.required || props.rules?.some((r) => r.required) === true;

      const labelNode = props.label ? (
        <label
          for={controlId}
          class="text-sm text-slate-700"
          style={
            ctx.layout.value === "horizontal" && ctx.labelWidth.value
              ? {
                  width: `${ctx.labelWidth.value}px`,
                  flexShrink: 0,
                  textAlign: "right",
                }
              : undefined
          }
        >
          {needStar ? (
            <span class="mr-0.5 text-red-600" aria-hidden="true">
              *
            </span>
          ) : null}
          {needStar ? <span class="sr-only">必填</span> : null}
          {props.label}
        </label>
      ) : null;

      const body = (
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          {injected}
          {props.help && !showError ? (
            <p class="text-xs text-slate-500">{props.help}</p>
          ) : null}
          {showError ? (
            <p id={errorId} role="alert" class="text-xs text-red-600">
              {showError}
            </p>
          ) : null}
          {slots.extra?.()}
        </div>
      );

      return (
        <div
          class={
            ctx.layout.value === "horizontal"
              ? ["flex items-start gap-3", props.class].filter(Boolean).join(" ")
              : ["flex flex-col gap-1", props.class].filter(Boolean).join(" ")
          }
        >
          {labelNode}
          {body}
        </div>
      );
    };
  },
});
