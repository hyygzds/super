import { runRules } from "./run-rules";
import {
  getValueAtPath,
  normalizeNamePath,
  parseNamePath,
  setValueAtPath,
  type NamePath,
} from "./name-path";
import type { FormRule, FormValues, ValidateResult } from "./types";

export type CreateFormStoreOptions = {
  initialValues?: FormValues;
};

type FieldMeta = {
  rules: FormRule[];
  errors: string[];
  validating: boolean;
  dependencies: string[];
};

function cloneValues<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type FormStore = {
  registerField: (
    name: NamePath,
    options?: { rules?: FormRule[]; dependencies?: NamePath[] },
  ) => void;
  unregisterField: (name: NamePath) => void;
  updateFieldRules: (name: NamePath, rules: FormRule[] | undefined) => void;
  updateFieldDependencies: (
    name: NamePath,
    dependencies: NamePath[] | undefined,
  ) => void;
  getFieldValue: (name: NamePath) => unknown;
  setFieldValue: (name: NamePath, value: unknown) => void;
  getFieldsValue: () => FormValues;
  setFieldsValue: (values: Partial<FormValues>) => void;
  getFieldErrors: (name: NamePath) => string[];
  isFieldValidating: (name: NamePath) => boolean;
  validateField: (name: NamePath) => Promise<boolean>;
  validateFields: (names?: NamePath[]) => Promise<ValidateResult>;
  validate: () => Promise<ValidateResult>;
  resetFields: (names?: NamePath[]) => void;
  clearValidate: (names?: NamePath[]) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
};

function fieldPathExists(root: unknown, path: NamePath): boolean {
  let current: unknown = root;
  for (const seg of parseNamePath(path)) {
    if (current === null || current === undefined || typeof current !== "object") {
      return false;
    }
    if (!(seg in (current as object))) return false;
    current = (current as Record<string | number, unknown>)[seg as string];
  }
  return true;
}

export function createFormStore(
  options: CreateFormStoreOptions = {},
): FormStore {
  const initialSnapshot: FormValues = cloneValues(
    options.initialValues ?? {},
  );
  const values: FormValues = cloneValues(options.initialValues ?? {});
  const fields = new Map<string, FieldMeta>();
  const listeners = new Set<() => void>();
  let version = 0;

  function notify() {
    version += 1;
    for (const listener of listeners) listener();
  }

  function keyOf(name: NamePath): string {
    return normalizeNamePath(name);
  }

  function ensureField(name: NamePath): FieldMeta {
    const key = keyOf(name);
    let meta = fields.get(key);
    if (!meta) {
      meta = { rules: [], errors: [], validating: false, dependencies: [] };
      fields.set(key, meta);
    }
    return meta;
  }

  async function validateField(name: NamePath): Promise<boolean> {
    const key = keyOf(name);
    const meta = ensureField(key);
    meta.validating = true;
    notify();
    const errors = await runRules(
      getValueAtPath(values, key),
      cloneValues(values),
      meta.rules,
    );
    meta.errors = errors;
    meta.validating = false;
    notify();
    return errors.length === 0;
  }

  async function validateFields(names?: NamePath[]): Promise<ValidateResult> {
    const target = names?.map((n) => keyOf(n)) ?? [...fields.keys()];
    await Promise.all(target.map((fieldName) => validateField(fieldName)));
    const errors: Record<string, string[]> = {};
    let valid = true;
    for (const fieldName of target) {
      const fieldErrors = fields.get(fieldName)?.errors ?? [];
      if (fieldErrors.length) {
        errors[fieldName] = fieldErrors;
        valid = false;
      }
    }
    return { valid, values: cloneValues(values), errors };
  }

  function revalidateDependents(changedKey: string) {
    for (const [fieldName, meta] of fields) {
      if (meta.dependencies.includes(changedKey)) {
        void validateField(fieldName);
      }
    }
  }

  return {
    registerField(name, fieldOptions) {
      const key = keyOf(name);
      const meta = ensureField(key);
      meta.rules = fieldOptions?.rules ?? meta.rules;
      if (fieldOptions?.dependencies) {
        meta.dependencies = fieldOptions.dependencies.map((d) => keyOf(d));
      }
      if (!fieldPathExists(values, key)) {
        setValueAtPath(values, key, undefined);
      }
      notify();
    },
    unregisterField(name) {
      fields.delete(keyOf(name));
      notify();
    },
    updateFieldRules(name, rules) {
      const meta = ensureField(name);
      meta.rules = rules ?? [];
      notify();
    },
    updateFieldDependencies(name, dependencies) {
      const meta = ensureField(name);
      meta.dependencies = (dependencies ?? []).map((d) => keyOf(d));
      notify();
    },
    getFieldValue(name) {
      return getValueAtPath(values, name);
    },
    setFieldValue(name, value) {
      const key = keyOf(name);
      setValueAtPath(values, key, value);
      notify();
      revalidateDependents(key);
    },
    getFieldsValue() {
      return cloneValues(values);
    },
    setFieldsValue(next) {
      Object.assign(values, next);
      notify();
    },
    getFieldErrors(name) {
      return [...(fields.get(keyOf(name))?.errors ?? [])];
    },
    isFieldValidating(name) {
      return fields.get(keyOf(name))?.validating ?? false;
    },
    validateField,
    validateFields,
    validate: () => validateFields(),
    resetFields(names) {
      if (!names) {
        for (const key of Object.keys(values)) {
          delete values[key];
        }
        Object.assign(values, cloneValues(initialSnapshot));
        for (const meta of fields.values()) {
          meta.errors = [];
          meta.validating = false;
        }
        notify();
        return;
      }
      for (const name of names) {
        const key = keyOf(name);
        setValueAtPath(values, key, getValueAtPath(initialSnapshot, key));
        const meta = fields.get(key);
        if (meta) {
          meta.errors = [];
          meta.validating = false;
        }
      }
      notify();
    },
    clearValidate(names) {
      const target = names?.map((n) => keyOf(n)) ?? [...fields.keys()];
      for (const fieldName of target) {
        const meta = fields.get(fieldName);
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
