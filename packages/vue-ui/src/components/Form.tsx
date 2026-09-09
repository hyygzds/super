import {
  cloneVNode,
  computed,
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
  joinNamePath,
  normalizeNamePath,
  type FormRule,
  type FormStore,
  type FormValues,
  type NamePath,
  type ValidateResult,
} from "@component-ai/form-core";

type FormLayout = "vertical" | "horizontal";
type ValidateTrigger = "blur" | "change";

type FormContext = {
  store: FormStore;
  layout: Ref<FormLayout>;
  labelWidth: Ref<number | undefined>;
  disabled: Ref<boolean>;
  tick: Ref<number>;
};

type FormListContext = {
  listName: Ref<string>;
};

const FORM_KEY: InjectionKey<FormContext> = Symbol("component-ai-form");
const FORM_LIST_KEY: InjectionKey<FormListContext> = Symbol(
  "component-ai-form-list",
);

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

function normalizeTriggers(
  trigger: ValidateTrigger | ValidateTrigger[] | undefined,
): ValidateTrigger[] {
  if (trigger === undefined) return ["blur"];
  return Array.isArray(trigger) ? trigger : [trigger];
}

function resolveFieldName(
  name: NamePath | undefined,
  listCtx: FormListContext | undefined,
): string | undefined {
  if (name === undefined || name === null || name === "") return undefined;
  if (listCtx) return joinNamePath(listCtx.listName.value, name);
  return normalizeNamePath(name);
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

export const FormRoot = defineComponent({
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
    watch(
      () => props.layout,
      (next) => {
        layout.value = next;
      },
    );
    const labelWidth = ref(props.labelWidth);
    watch(
      () => props.labelWidth,
      (next) => {
        labelWidth.value = next;
      },
    );
    const disabled = ref(props.disabled);
    watch(
      () => props.disabled,
      (next) => {
        disabled.value = next;
      },
    );

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
      validateFields: (names?: NamePath[]) => store.validateFields(names),
      getFieldsValue: () => store.getFieldsValue(),
      setFieldsValue: (values: Partial<FormValues>) =>
        store.setFieldsValue(values),
      resetFields: (names?: NamePath[]) => store.resetFields(names),
      clearValidate: (names?: NamePath[]) => store.clearValidate(names),
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

    return () => (
      <form
        class={["flex flex-col gap-4", props.class].filter(Boolean).join(" ")}
        onSubmit={(e) => void onSubmit(e)}
        novalidate
      >
        {slots.default?.()}
      </form>
    );
  },
});

export type FormListField = {
  key: number;
  name: number;
};

export type FormListOperations = {
  add: (defaultValue?: unknown) => void;
  remove: (index: number) => void;
};

export type FormListProps = {
  name: NamePath;
};

export const FormList = defineComponent({
  name: "FormList",
  props: {
    name: {
      type: [String, Array] as PropType<NamePath>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const ctx = inject(FORM_KEY);
    if (!ctx) throw new Error("Form.List must be used inside Form");
    const store = ctx.store;

    const listKey = computed(() => normalizeNamePath(props.name));
    provide(FORM_LIST_KEY, { listName: listKey });

    let keySeed = 0;
    const keys = ref<number[]>([]);

    function syncKeys(length: number) {
      if (keys.value.length === length) return;
      if (keys.value.length < length) {
        const next = [...keys.value];
        while (next.length < length) {
          keySeed += 1;
          next.push(keySeed);
        }
        keys.value = next;
        return;
      }
      keys.value = keys.value.slice(0, length);
    }

    watch(
      () => {
        void ctx.tick.value;
        const listValue = store.getFieldValue(listKey.value);
        return Array.isArray(listValue) ? listValue.length : 0;
      },
      (length) => {
        syncKeys(length);
      },
      { immediate: true },
    );

    function add(defaultValue: unknown = {}) {
      const current = store.getFieldValue(listKey.value);
      const arr = Array.isArray(current) ? [...current] : [];
      arr.push(defaultValue);
      keySeed += 1;
      keys.value = [...keys.value, keySeed];
      store.setFieldValue(listKey.value, arr);
    }

    function remove(index: number) {
      const current = store.getFieldValue(listKey.value);
      if (!Array.isArray(current)) return;
      const arr = current.filter((_, i) => i !== index);
      keys.value = keys.value.filter((_, i) => i !== index);
      store.setFieldValue(listKey.value, arr);
    }

    return () => {
      void ctx.tick.value;
      const listValue = store.getFieldValue(listKey.value);
      const length = Array.isArray(listValue) ? listValue.length : 0;
      const fields: FormListField[] = Array.from({ length }, (_, index) => ({
        key: keys.value[index] ?? index,
        name: index,
      }));
      return slots.default?.({ fields, add, remove }) ?? null;
    };
  },
});

export type FormItemProps = {
  name?: NamePath;
  label?: string;
  rules?: FormRule[];
  required?: boolean;
  help?: string;
  class?: string;
  valuePropName?: string;
  validateTrigger?: ValidateTrigger | ValidateTrigger[];
  dependencies?: NamePath[];
};

let formItemSeq = 0;

export const FormItem = defineComponent({
  name: "FormItem",
  props: {
    name: [String, Array] as PropType<NamePath>,
    label: String,
    rules: Array as PropType<FormRule[]>,
    required: { type: Boolean, default: false },
    help: String,
    class: { type: String, default: "" },
    valuePropName: { type: String, default: "value" },
    validateTrigger: [String, Array] as PropType<
      ValidateTrigger | ValidateTrigger[]
    >,
    dependencies: Array as PropType<NamePath[]>,
  },
  setup(props, { slots }) {
    const ctx = inject(FORM_KEY);
    if (!ctx) throw new Error("FormItem must be used inside Form");
    const listCtx = inject(FORM_LIST_KEY, undefined);

    const seq = ++formItemSeq;
    const controlId = `form-vue-${seq}-control`;
    const errorId = `form-vue-${seq}-error`;

    function currentFieldName(): string | undefined {
      return resolveFieldName(props.name, listCtx);
    }

    onMounted(() => {
      const fieldName = currentFieldName();
      if (!fieldName) {
        if (
          (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
            ?.env?.NODE_ENV === "development"
        ) {
          console.warn("[FormItem] missing name — field will not be collected");
        }
        return;
      }
      ctx.store.registerField(fieldName, {
        rules: props.rules,
        dependencies: props.dependencies,
      });
    });

    watch(
      () => currentFieldName(),
      (next, prev) => {
        if (prev === next) return;
        if (prev) ctx.store.unregisterField(prev);
        if (next) {
          ctx.store.registerField(next, {
            rules: props.rules,
            dependencies: props.dependencies,
          });
        }
      },
    );

    onBeforeUnmount(() => {
      const fieldName = currentFieldName();
      if (fieldName) ctx.store.unregisterField(fieldName);
    });

    watch(
      () => props.rules,
      (rules) => {
        const fieldName = currentFieldName();
        if (fieldName) ctx.store.updateFieldRules(fieldName, rules);
      },
    );

    watch(
      () => props.dependencies,
      (dependencies) => {
        const fieldName = currentFieldName();
        if (fieldName) ctx.store.updateFieldDependencies(fieldName, dependencies);
      },
    );

    return () => {
      void ctx.tick.value;
      const fieldName = currentFieldName();
      const triggers = normalizeTriggers(props.validateTrigger);
      const errors = fieldName ? ctx.store.getFieldErrors(fieldName) : [];
      const showError = errors[0];
      const value = fieldName ? ctx.store.getFieldValue(fieldName) : undefined;

      const raw = slots.default?.() ?? [];
      const first = raw.find((n) => n && typeof n.type !== "symbol") as
        | VNode
        | undefined;
      if (!first) throw new Error("FormItem expects a single element child");

      const childDisabled =
        Boolean((first.props as { disabled?: boolean } | null)?.disabled) ||
        ctx.disabled.value;

      const isCheckControl = props.valuePropName === "checked";

      const syncValue = (eventOrValue: unknown) => {
        if (!fieldName) return;
        const next = isCheckControl
          ? Boolean(eventOrValue)
          : readChangeValue(eventOrValue);
        ctx.store.setFieldValue(fieldName, next);
        if (triggers.includes("change")) {
          void ctx.store.validateField(fieldName);
        }
      };

      const onBlur = () => {
        if (fieldName && triggers.includes("blur")) {
          void ctx.store.validateField(fieldName);
        }
      };

      const controlValue = isCheckControl
        ? Boolean(value)
        : value === undefined
          ? ""
          : value;

      const injected = cloneVNode(
        first,
        isCheckControl
          ? {
              id: controlId,
              modelValue: controlValue,
              disabled: childDisabled,
              "aria-invalid": showError ? true : undefined,
              "aria-describedby": showError ? errorId : undefined,
              "onUpdate:modelValue": syncValue,
              onBlur,
            }
          : {
              id: controlId,
              value: controlValue,
              modelValue: controlValue,
              disabled: childDisabled,
              "aria-invalid": showError ? true : undefined,
              "aria-describedby": showError ? errorId : undefined,
              onInput: syncValue,
              onChange: syncValue,
              "onUpdate:modelValue": syncValue,
              onBlur,
            },
      );

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

export const Form = Object.assign(FormRoot, { List: FormList });
