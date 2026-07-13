import { runRules } from "./run-rules";
import type { FormRule, FormValues, ValidateResult } from "./types";

export type CreateFormStoreOptions = {
  initialValues?: FormValues;
};

type FieldMeta = {
  rules: FormRule[];
  errors: string[];
  validating: boolean;
};

export type FormStore = {
  registerField: (name: string, options?: { rules?: FormRule[] }) => void;
  unregisterField: (name: string) => void;
  updateFieldRules: (name: string, rules: FormRule[] | undefined) => void;
  getFieldValue: (name: string) => unknown;
  setFieldValue: (name: string, value: unknown) => void;
  getFieldsValue: () => FormValues;
  setFieldsValue: (values: Partial<FormValues>) => void;
  getFieldErrors: (name: string) => string[];
  isFieldValidating: (name: string) => boolean;
  validateField: (name: string) => Promise<boolean>;
  validateFields: (names?: string[]) => Promise<ValidateResult>;
  validate: () => Promise<ValidateResult>;
  resetFields: (names?: string[]) => void;
  clearValidate: (names?: string[]) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
};

export function createFormStore(
  options: CreateFormStoreOptions = {},
): FormStore {
  const initialSnapshot: FormValues = { ...(options.initialValues ?? {}) };
  const values: FormValues = { ...initialSnapshot };
  const fields = new Map<string, FieldMeta>();
  const listeners = new Set<() => void>();
  let version = 0;

  function notify() {
    version += 1;
    for (const listener of listeners) listener();
  }

  function ensureField(name: string): FieldMeta {
    let meta = fields.get(name);
    if (!meta) {
      meta = { rules: [], errors: [], validating: false };
      fields.set(name, meta);
    }
    return meta;
  }

  async function validateField(name: string): Promise<boolean> {
    const meta = ensureField(name);
    meta.validating = true;
    notify();
    const errors = await runRules(values[name], { ...values }, meta.rules);
    meta.errors = errors;
    meta.validating = false;
    notify();
    return errors.length === 0;
  }

  async function validateFields(names?: string[]): Promise<ValidateResult> {
    const target = names ?? [...fields.keys()];
    await Promise.all(target.map((name) => validateField(name)));
    const errors: Record<string, string[]> = {};
    let valid = true;
    for (const name of target) {
      const fieldErrors = fields.get(name)?.errors ?? [];
      if (fieldErrors.length) {
        errors[name] = fieldErrors;
        valid = false;
      }
    }
    return { valid, values: { ...values }, errors };
  }

  return {
    registerField(name, fieldOptions) {
      const meta = ensureField(name);
      meta.rules = fieldOptions?.rules ?? meta.rules;
      if (!(name in values)) values[name] = undefined;
      notify();
    },
    unregisterField(name) {
      fields.delete(name);
      notify();
    },
    updateFieldRules(name, rules) {
      const meta = ensureField(name);
      meta.rules = rules ?? [];
      notify();
    },
    getFieldValue(name) {
      return values[name];
    },
    setFieldValue(name, value) {
      values[name] = value;
      notify();
    },
    getFieldsValue() {
      return { ...values };
    },
    setFieldsValue(next) {
      Object.assign(values, next);
      notify();
    },
    getFieldErrors(name) {
      return [...(fields.get(name)?.errors ?? [])];
    },
    isFieldValidating(name) {
      return fields.get(name)?.validating ?? false;
    },
    validateField,
    validateFields,
    validate: () => validateFields(),
    resetFields(names) {
      const target = names ?? Object.keys(initialSnapshot).concat([...fields.keys()]);
      const unique = [...new Set(target)];
      for (const name of unique) {
        values[name] = initialSnapshot[name];
        const meta = fields.get(name);
        if (meta) {
          meta.errors = [];
          meta.validating = false;
        }
      }
      notify();
    },
    clearValidate(names) {
      const target = names ?? [...fields.keys()];
      for (const name of target) {
        const meta = fields.get(name);
        if (meta) meta.errors = [];
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return version;
    },
  };
}
