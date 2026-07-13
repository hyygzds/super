export type FormValues = Record<string, unknown>;

export type FormRule = {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
  validator?: (
    value: unknown,
    values: FormValues,
  ) => boolean | string | Promise<boolean | string>;
};

export type ValidateResult = {
  valid: boolean;
  values: FormValues;
  errors: Record<string, string[]>;
};
