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
  useRef,
  useSyncExternalStore,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  createFormStore,
  type FormRule,
  type FormStore,
  type FormValues,
  type ValidateResult,
} from "@component-ai/form-core";

type FormLayout = "vertical" | "horizontal";

type FormContextValue = {
  store: FormStore;
  layout: FormLayout;
  labelWidth?: number;
  disabled: boolean;
};

const FormContext = createContext<FormContextValue | null>(null);

function useFormContext(component: string) {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error(`${component} must be used inside <Form>`);
  return ctx;
}

export type FormHandle = {
  validate: () => Promise<ValidateResult>;
  validateFields: (names?: string[]) => Promise<ValidateResult>;
  getFieldsValue: () => FormValues;
  setFieldsValue: (values: Partial<FormValues>) => void;
  resetFields: (names?: string[]) => void;
  clearValidate: (names?: string[]) => void;
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

export const Form = forwardRef<FormHandle, FormProps>(function Form(
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

export type FormItemProps = {
  name?: string;
  label?: string;
  rules?: FormRule[];
  required?: boolean;
  help?: string;
  extra?: ReactNode;
  className?: string;
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
  children,
}: FormItemProps) {
  const { store, layout, labelWidth, disabled } = useFormContext("FormItem");
  const reactId = useId().replace(/:/g, "");
  const controlId = `form-${reactId}-control`;
  const errorId = `form-${reactId}-error`;

  useEffect(() => {
    if (!name) {
      if (
        (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
          ?.env?.NODE_ENV === "development"
      ) {
        console.warn("[FormItem] missing name — field will not be collected");
      }
      return;
    }
    store.registerField(name, { rules });
    return () => store.unregisterField(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, store]);

  useEffect(() => {
    if (!name) return;
    store.updateFieldRules(name, rules);
  }, [name, rules, store]);

  const errors = name ? store.getFieldErrors(name) : [];
  const value = name ? store.getFieldValue(name) : undefined;
  const showError = errors[0];

  if (!isValidElement(children)) {
    throw new Error("FormItem expects a single React element child");
  }
  const child = Children.only(children) as ReactElement<Record<string, unknown>>;
  const childDisabled = Boolean(child.props.disabled) || disabled;

  const injected = cloneElement(child, {
    id: controlId,
    value: (value as string | number | readonly string[] | undefined) ?? "",
    disabled: childDisabled,
    "aria-invalid": showError ? true : undefined,
    "aria-describedby": showError ? errorId : undefined,
    onChange: (eventOrValue: unknown) => {
      if (!name) return;
      store.setFieldValue(name, readChangeValue(eventOrValue));
      const childOnChange = child.props.onChange as
        | ((v: unknown) => void)
        | undefined;
      childOnChange?.(eventOrValue);
    },
    onBlur: (event: unknown) => {
      if (name) void store.validateField(name);
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
