import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
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

type FormContextValue = {
  store: FormStore;
  layout: FormLayout;
  labelWidth?: number;
  disabled: boolean;
};

type FormListContextValue = {
  listName: NamePath;
};

const FormContext = createContext<FormContextValue | null>(null);
const FormListContext = createContext<FormListContextValue | null>(null);

function useFormContext(component: string) {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error(`${component} must be used inside <Form>`);
  return ctx;
}

function resolveFieldName(
  name: NamePath | undefined,
  listCtx: FormListContextValue | null,
): string | undefined {
  if (name === undefined || name === null || name === "") return undefined;
  if (listCtx) {
    return joinNamePath(listCtx.listName, name);
  }
  return normalizeNamePath(name);
}

export type FormHandle = {
  validate: () => Promise<ValidateResult>;
  validateFields: (names?: NamePath[]) => Promise<ValidateResult>;
  getFieldsValue: () => FormValues;
  setFieldsValue: (values: Partial<FormValues>) => void;
  resetFields: (names?: NamePath[]) => void;
  clearValidate: (names?: NamePath[]) => void;
};

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
  className?: string;
  children?: ReactNode;
};

type ValidateTrigger = "blur" | "change";

function normalizeTriggers(
  trigger: ValidateTrigger | ValidateTrigger[] | undefined,
): ValidateTrigger[] {
  if (trigger === undefined) return ["blur"];
  return Array.isArray(trigger) ? trigger : [trigger];
}

const FormRoot = forwardRef<FormHandle, FormProps>(function Form(
  {
    initialValues,
    layout = "vertical",
    labelWidth,
    disabled = false,
    onFinish,
    onFinishFailed,
    className = "",
    children,
  },
  ref,
) {
  const storeRef = useRef<FormStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createFormStore({ initialValues });
  }
  const store = storeRef.current;
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useImperativeHandle(ref, () => ({
    validate: () => store.validate(),
    validateFields: (names) => store.validateFields(names),
    getFieldsValue: () => store.getFieldsValue(),
    setFieldsValue: (values) => store.setFieldsValue(values),
    resetFields: (names) => store.resetFields(names),
    clearValidate: (names) => store.clearValidate(names),
  }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await store.validate();
    if (result.valid) onFinish?.(result.values);
    else onFinishFailed?.({ values: result.values, errors: result.errors });
  }

  return (
    <FormContext.Provider value={{ store, layout, labelWidth, disabled }}>
      <form
        className={`flex flex-col gap-4 ${className}`.trim()}
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
        {children}
      </form>
    </FormContext.Provider>
  );
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
  children: (
    fields: FormListField[],
    operations: FormListOperations,
  ) => ReactNode;
};

export function FormList({ name, children }: FormListProps) {
  const { store } = useFormContext("Form.List");
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const listKey = normalizeNamePath(name);
  const keySeed = useRef(0);
  const [keys, setKeys] = useState<number[]>(() => {
    const initial = store.getFieldValue(listKey);
    const len = Array.isArray(initial) ? initial.length : 0;
    return Array.from({ length: len }, () => {
      keySeed.current += 1;
      return keySeed.current;
    });
  });

  const listValue = store.getFieldValue(listKey);
  const length = Array.isArray(listValue) ? listValue.length : 0;

  useEffect(() => {
    setKeys((prev) => {
      if (prev.length === length) return prev;
      if (prev.length < length) {
        const next = [...prev];
        while (next.length < length) {
          keySeed.current += 1;
          next.push(keySeed.current);
        }
        return next;
      }
      return prev.slice(0, length);
    });
  }, [length]);

  const fields: FormListField[] = useMemo(
    () =>
      Array.from({ length }, (_, index) => ({
        key: keys[index] ?? index,
        name: index,
      })),
    [length, keys],
  );

  const operations: FormListOperations = {
    add(defaultValue = {}) {
      const current = store.getFieldValue(listKey);
      const arr = Array.isArray(current) ? [...current] : [];
      arr.push(defaultValue);
      keySeed.current += 1;
      setKeys((prev) => [...prev, keySeed.current]);
      store.setFieldValue(listKey, arr);
    },
    remove(index: number) {
      const current = store.getFieldValue(listKey);
      if (!Array.isArray(current)) return;
      const arr = current.filter((_, i) => i !== index);
      setKeys((prev) => prev.filter((_, i) => i !== index));
      store.setFieldValue(listKey, arr);
    },
  };

  return (
    <FormListContext.Provider value={{ listName: listKey }}>
      {children(fields, operations)}
    </FormListContext.Provider>
  );
}

export type FormItemProps = {
  name?: NamePath;
  label?: string;
  rules?: FormRule[];
  required?: boolean;
  help?: string;
  extra?: ReactNode;
  className?: string;
  /** Prop name for the field value. Use `"checked"` for Checkbox/Switch. */
  valuePropName?: string;
  /** Event prop that receives the next value. Use `"onCheckedChange"` for Checkbox/Switch. */
  trigger?: string;
  validateTrigger?: ValidateTrigger | ValidateTrigger[];
  dependencies?: NamePath[];
  children: ReactElement;
};

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

export function FormItem({
  name,
  label,
  rules,
  required = false,
  help,
  extra,
  className = "",
  valuePropName = "value",
  trigger = "onChange",
  validateTrigger,
  dependencies,
  children,
}: FormItemProps) {
  const { store, layout, labelWidth, disabled } = useFormContext("FormItem");
  const listCtx = useContext(FormListContext);
  const fieldName = resolveFieldName(name, listCtx);
  const triggers = normalizeTriggers(validateTrigger);
  const reactId = useId().replace(/:/g, "");
  const controlId = `form-${reactId}-control`;
  const errorId = `form-${reactId}-error`;

  useEffect(() => {
    if (!fieldName) {
      if (
        (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
          ?.env?.NODE_ENV === "development"
      ) {
        console.warn("[FormItem] missing name — field will not be collected");
      }
      return;
    }
    store.registerField(fieldName, { rules, dependencies });
    return () => store.unregisterField(fieldName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName, store]);

  useEffect(() => {
    if (!fieldName) return;
    store.updateFieldRules(fieldName, rules);
  }, [fieldName, rules, store]);

  useEffect(() => {
    if (!fieldName) return;
    store.updateFieldDependencies(fieldName, dependencies);
  }, [fieldName, dependencies, store]);

  const errors = fieldName ? store.getFieldErrors(fieldName) : [];
  const value = fieldName ? store.getFieldValue(fieldName) : undefined;
  const showError = errors[0];

  if (!isValidElement(children)) {
    throw new Error("FormItem expects a single React element child");
  }
  const child = Children.only(children) as ReactElement<Record<string, unknown>>;
  const childDisabled = Boolean(child.props.disabled) || disabled;

  const isCheckControl = valuePropName === "checked";
  const controlValue = isCheckControl
    ? Boolean(value)
    : value === undefined
      ? ""
      : value;

  const handleTrigger = (eventOrValue: unknown) => {
    if (!fieldName) return;
    const next = isCheckControl
      ? Boolean(eventOrValue)
      : readChangeValue(eventOrValue);
    store.setFieldValue(fieldName, next);
    if (triggers.includes("change")) {
      void store.validateField(fieldName);
    }
    const childTrigger = child.props[trigger] as
      | ((v: unknown) => void)
      | undefined;
    childTrigger?.(eventOrValue);
  };

  const injected = cloneElement(child, {
    id: controlId,
    [valuePropName]: controlValue,
    disabled: childDisabled,
    "aria-invalid": showError ? true : undefined,
    "aria-describedby": showError ? errorId : undefined,
    [trigger]: handleTrigger,
    onBlur: (event: unknown) => {
      if (fieldName && triggers.includes("blur")) {
        void store.validateField(fieldName);
      }
      const childOnBlur = child.props.onBlur as ((e: unknown) => void) | undefined;
      childOnBlur?.(event);
    },
  } as Record<string, unknown>);

  const labelNode = label ? (
    <label
      htmlFor={controlId}
      className="text-sm text-slate-700"
      style={
        layout === "horizontal" && labelWidth
          ? { width: labelWidth, flexShrink: 0, textAlign: "right" }
          : undefined
      }
    >
      {(required || rules?.some((r) => r.required)) && (
        <span className="mr-0.5 text-red-600" aria-hidden="true">
          *
        </span>
      )}
      {(required || rules?.some((r) => r.required)) && (
        <span className="sr-only">必填</span>
      )}
      {label}
    </label>
  ) : null;

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {injected}
      {help && !showError ? (
        <p className="text-xs text-slate-500">{help}</p>
      ) : null}
      {showError ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {showError}
        </p>
      ) : null}
      {extra}
    </div>
  );

  return (
    <div
      className={
        layout === "horizontal"
          ? `flex items-start gap-3 ${className}`.trim()
          : `flex flex-col gap-1 ${className}`.trim()
      }
    >
      {labelNode}
      {body}
    </div>
  );
}

export const Form = Object.assign(FormRoot, { List: FormList });
