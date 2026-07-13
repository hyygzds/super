import type { FormRule, FormValues } from "./types";

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function defaultMessage(rule: FormRule): string {
  if (rule.required) return "必填";
  if (rule.minLength !== undefined) return `至少 ${rule.minLength} 个字符`;
  if (rule.maxLength !== undefined) return `最多 ${rule.maxLength} 个字符`;
  if (rule.min !== undefined) return `不能小于 ${rule.min}`;
  if (rule.max !== undefined) return `不能大于 ${rule.max}`;
  if (rule.pattern) return "格式不正确";
  return "校验失败";
}

export async function runRules(
  value: unknown,
  values: FormValues,
  rules: FormRule[],
): Promise<string[]> {
  for (const rule of rules) {
    if (rule.required && isEmpty(value)) {
      return [rule.message ?? defaultMessage(rule)];
    }

    if (typeof value === "string") {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return [rule.message ?? defaultMessage(rule)];
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return [rule.message ?? defaultMessage(rule)];
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return [rule.message ?? defaultMessage(rule)];
      }
    }

    if (typeof value === "number" && !Number.isNaN(value)) {
      if (rule.min !== undefined && value < rule.min) {
        return [rule.message ?? defaultMessage(rule)];
      }
      if (rule.max !== undefined && value > rule.max) {
        return [rule.message ?? defaultMessage(rule)];
      }
    }

    if (rule.validator) {
      const result = await rule.validator(value, values);
      if (result === true) continue;
      if (result === false) return [rule.message ?? defaultMessage(rule)];
      if (typeof result === "string") return [result];
    }
  }
  return [];
}
