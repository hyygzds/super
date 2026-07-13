# Form P0: form-core + Form/FormItem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 `@component-ai/form-core`，并在 React / Vue 两端交付可独立使用的 `Form` / `FormItem`（值收集、可插拔 rules、blur 单字段校验、submit 全量校验、vertical/horizontal 布局与错误展示）；P0 用原生 `<input>` 接线验证，不实现 Input 等原子控件。

**Architecture:** `form-core` 提供 `createFormStore` + `runRules`（纯 TS，无 DOM）。UI 包持有 store（React：`useSyncExternalStore`；Vue：`provide` + subscribe 触发重渲染）。`FormItem` 对**单一子节点**注入受控 `value` / `onChange` / `onBlur` 与 a11y 属性（React：`cloneElement`；Vue：`cloneVNode`）。P0 只注入文本控件语义；Checkbox/Select 的 `checked` / `onCheckedChange` 映射留到 Form P2。

**Tech Stack:** TypeScript、Vite 8、vite-plugin-dts、Vitest 4、React 19、Vue 3.5、Testing Library / Vue Test Utils、Tailwind v4

**规格来源:** [`docs/superpowers/specs/2026-07-13-form-system-design.md`](../specs/2026-07-13-form-system-design.md) §3–§7、§9–§10（P0）  
**路线图:** [`2026-07-13-form-roadmap.md`](./2026-07-13-form-roadmap.md)

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/form-core/package.json` | 包元数据、exports、scripts |
| `packages/form-core/tsconfig.json` | 严格 TS |
| `packages/form-core/vite.config.ts` | lib ESM + dts |
| `packages/form-core/vitest.config.ts` | node 环境 |
| `packages/form-core/src/types.ts` | `FormValues`、`FormRule`、错误类型 |
| `packages/form-core/src/run-rules.ts` | 规则执行器 |
| `packages/form-core/src/run-rules.test.ts` | 规则单测 |
| `packages/form-core/src/create-form-store.ts` | store 工厂 |
| `packages/form-core/src/create-form-store.test.ts` | store 单测 |
| `packages/form-core/src/index.ts` | 公共导出 |
| `packages/react-ui/src/components/Form.tsx` | React Form + FormItem |
| `packages/react-ui/src/components/Form.test.tsx` | React 集成测 |
| `packages/react-ui/src/components/Form.stories.tsx` | React Story |
| `packages/vue-ui/src/components/Form.tsx` | Vue Form + FormItem |
| `packages/vue-ui/src/components/Form.test.tsx` | Vue 集成测 |
| `packages/vue-ui/src/components/Form.stories.tsx` | Vue Story |
| `packages/react-ui/package.json` / `packages/vue-ui/package.json` | 增加 `form-core` 依赖 |
| `packages/*/src/index.ts` | 导出 Form / FormItem |
| 根 `package.json` | `build:form-core` / `test:form-core` |
| `docs/superpowers/plans/2026-07-13-form-roadmap.md` | 把 P0 行从 *待写* 改为本文件 |

---

## API 契约（P0 锁定）

### form-core

```ts
type FormValues = Record<string, unknown>;

type FormRule = {
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

type ValidateResult = {
  valid: boolean;
  values: FormValues;
  errors: Record<string, string[]>;
};

type CreateFormStoreOptions = {
  initialValues?: FormValues;
};

type FormStore = {
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
```

### React / Vue Form

| 概念 | React | Vue |
|------|-------|-----|
| 初始值 | `initialValues?: FormValues` | 同 |
| 布局 | `layout?: 'vertical' \| 'horizontal'`（默认 `vertical`） | 同 |
| 标签宽 | `labelWidth?: number`（px，horizontal 用） | 同 |
| 整表禁用 | `disabled?: boolean` | 同 |
| 成功 | `onFinish?: (values) => void` | `finish` |
| 失败 | `onFinishFailed?: (info) => void` | `finishFailed` |
| 样式 | `className` | `class` |
| 命令式 | `ref`：`validate` / `validateFields` / `getFieldsValue` / `setFieldsValue` / `resetFields` / `clearValidate` | `expose` 同名方法 |

### FormItem

| Prop | 说明 |
|------|------|
| `name?: string` | 扁平字段名；缺省仅布局，`NODE_ENV===development` 时 `console.warn` |
| `label?: string` | 标签 |
| `rules?: FormRule[]` | 校验规则 |
| `required?: boolean` | 仅展示星号 |
| `help?: string` | 帮助文案 |
| `extra?: ReactNode` / slot `extra` | 额外内容 |
| `className` / `class` | 样式 |
| children | **恰好一个**可注入子节点（原生 input 或后续库控件） |

注入 props（P0）：`id`、`value`（来自 store）、`onChange`（读 `event.target.value` 若为 DOM 事件，否则把参数当值）、`onBlur` → `validateField`、`disabled`（合并表级）、`aria-invalid`、`aria-describedby`（指向错误节点 id）。

---

### Task 1: 搭建 `@component-ai/form-core` 包骨架

**Files:**
- Create: `packages/form-core/package.json`
- Create: `packages/form-core/tsconfig.json`
- Create: `packages/form-core/vite.config.ts`
- Create: `packages/form-core/vitest.config.ts`
- Create: `packages/form-core/src/index.ts`
- Modify: `package.json`（根 scripts）

- [ ] **Step 1: 创建 package.json**

Create `packages/form-core/package.json`:

```json
{
  "name": "@component-ai/form-core",
  "version": "1.0.0",
  "type": "module",
  "description": "Framework-agnostic form store and rules runner (pure TypeScript)",
  "license": "ISC",
  "files": ["dist"],
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vite": "^8.0.10",
    "vite-plugin-dts": "^5.0.0",
    "vitest": "^4.1.5"
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: 创建 tsconfig / vite / vitest（对齐 grid-core）**

Create `packages/form-core/tsconfig.json`（与 `packages/grid-core/tsconfig.json` 相同内容）。

Create `packages/form-core/vite.config.ts`：复制 `packages/grid-core/vite.config.ts`，将 `name: "ComponentAiGridCore"` 改为 `"ComponentAiFormCore"`。

Create `packages/form-core/vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Create `packages/form-core/src/index.ts`:

```ts
export {};
```

- [ ] **Step 3: 根 scripts + 安装**

在根 `package.json` 的 `scripts` 中增加：

```json
"build:form-core": "npm run build -w @component-ai/form-core",
"test:form-core": "npm run test -w @component-ai/form-core"
```

Run: `npm install`  
Expected: workspace 识别 `@component-ai/form-core`，无报错。

- [ ] **Step 4: Commit**

```bash
git add packages/form-core package.json package-lock.json
git commit -m "chore(form-core): scaffold package with Vite and Vitest"
```

---

### Task 2: `runRules` — 失败测试 → 实现

**Files:**
- Create: `packages/form-core/src/types.ts`
- Create: `packages/form-core/src/run-rules.test.ts`
- Create: `packages/form-core/src/run-rules.ts`
- Modify: `packages/form-core/src/index.ts`

- [ ] **Step 1: 写入类型与失败测试**

Create `packages/form-core/src/types.ts`:

```ts
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
```

Create `packages/form-core/src/run-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runRules } from "./run-rules";

describe("runRules", () => {
  it("returns empty when no rules", async () => {
    expect(await runRules("x", {}, [])).toEqual([]);
  });

  it("fails required on empty string / null / undefined", async () => {
    const rules = [{ required: true, message: "必填" }];
    expect(await runRules("", {}, rules)).toEqual(["必填"]);
    expect(await runRules(null, {}, rules)).toEqual(["必填"]);
    expect(await runRules(undefined, {}, rules)).toEqual(["必填"]);
  });

  it("passes required when value is present", async () => {
    expect(await runRules("a", {}, [{ required: true, message: "必填" }])).toEqual([]);
    expect(await runRules(0, {}, [{ required: true, message: "必填" }])).toEqual([]);
  });

  it("applies minLength / maxLength only for strings", async () => {
    expect(
      await runRules("ab", {}, [{ minLength: 3, message: "太短" }]),
    ).toEqual(["太短"]);
    expect(
      await runRules("abcd", {}, [{ maxLength: 3, message: "太长" }]),
    ).toEqual(["太长"]);
    expect(await runRules(12, {}, [{ minLength: 3, message: "太短" }])).toEqual([]);
  });

  it("applies min / max only for numbers", async () => {
    expect(await runRules(1, {}, [{ min: 2, message: "太小" }])).toEqual(["太小"]);
    expect(await runRules(5, {}, [{ max: 4, message: "太大" }])).toEqual(["太大"]);
    expect(await runRules("3", {}, [{ min: 2, message: "太小" }])).toEqual([]);
  });

  it("applies pattern for strings", async () => {
    expect(
      await runRules("abc", {}, [{ pattern: /^\d+$/, message: "数字" }]),
    ).toEqual(["数字"]);
  });

  it("stops at first failing rule", async () => {
    const errors = await runRules("", {}, [
      { required: true, message: "必填" },
      { minLength: 2, message: "太短" },
    ]);
    expect(errors).toEqual(["必填"]);
  });

  it("supports sync validator returning string / true", async () => {
    expect(
      await runRules("admin", { name: "admin" }, [
        {
          validator: (v) => (v === "admin" ? "不能用 admin" : true),
        },
      ]),
    ).toEqual(["不能用 admin"]);
  });

  it("supports async validator", async () => {
    expect(
      await runRules("x", {}, [
        {
          validator: async () => "异步失败",
        },
      ]),
    ).toEqual(["异步失败"]);
  });

  it("uses default message when rule fails without message", async () => {
    const errors = await runRules("", {}, [{ required: true }]);
    expect(errors[0]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — expect RED**

Run: `npm run test -w @component-ai/form-core -- src/run-rules.test.ts`  
Expected: FAIL（无法解析 `./run-rules` 或 `runRules` 未导出）

- [ ] **Step 3: 实现 `runRules`**

Create `packages/form-core/src/run-rules.ts`:

```ts
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
```

Update `packages/form-core/src/index.ts`:

```ts
export type { FormValues, FormRule, ValidateResult } from "./types";
export { runRules } from "./run-rules";
```

- [ ] **Step 4: Run test — expect GREEN**

Run: `npm run test -w @component-ai/form-core -- src/run-rules.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/form-core/src
git commit -m "feat(form-core): add runRules for pluggable validation"
```

---

### Task 3: `createFormStore` — 失败测试 → 实现

**Files:**
- Create: `packages/form-core/src/create-form-store.test.ts`
- Create: `packages/form-core/src/create-form-store.ts`
- Modify: `packages/form-core/src/index.ts`

- [ ] **Step 1: 编写失败测试**

Create `packages/form-core/src/create-form-store.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createFormStore } from "./create-form-store";

describe("createFormStore", () => {
  it("uses initialValues and get/set field values", () => {
    const store = createFormStore({ initialValues: { name: "Ada" } });
    store.registerField("name");
    store.registerField("age");
    expect(store.getFieldValue("name")).toBe("Ada");
    expect(store.getFieldsValue()).toEqual({ name: "Ada" });
    store.setFieldValue("age", 1);
    expect(store.getFieldsValue()).toEqual({ name: "Ada", age: 1 });
  });

  it("validateField runs rules on blur path and stores errors", async () => {
    const store = createFormStore();
    store.registerField("email", {
      rules: [{ required: true, message: "必填" }],
    });
    expect(await store.validateField("email")).toBe(false);
    expect(store.getFieldErrors("email")).toEqual(["必填"]);
    store.setFieldValue("email", "a@b.c");
    expect(await store.validateField("email")).toBe(true);
    expect(store.getFieldErrors("email")).toEqual([]);
  });

  it("validate aggregates all registered fields", async () => {
    const store = createFormStore({
      initialValues: { a: "", b: "ok" },
    });
    store.registerField("a", { rules: [{ required: true, message: "a" }] });
    store.registerField("b", { rules: [{ required: true, message: "b" }] });
    const result = await store.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.a).toEqual(["a"]);
    expect(result.values.b).toBe("ok");
  });

  it("setFieldValue does not clear errors until revalidate", async () => {
    const store = createFormStore();
    store.registerField("x", { rules: [{ required: true, message: "必填" }] });
    await store.validateField("x");
    store.setFieldValue("x", "hi");
    expect(store.getFieldErrors("x")).toEqual(["必填"]);
  });

  it("resetFields restores initial and clears errors", async () => {
    const store = createFormStore({ initialValues: { n: "1" } });
    store.registerField("n", { rules: [{ required: true, message: "必填" }] });
    store.setFieldValue("n", "");
    await store.validateField("n");
    store.resetFields();
    expect(store.getFieldValue("n")).toBe("1");
    expect(store.getFieldErrors("n")).toEqual([]);
  });

  it("clearValidate clears errors without changing values", async () => {
    const store = createFormStore();
    store.registerField("n", { rules: [{ required: true, message: "必填" }] });
    await store.validateField("n");
    store.clearValidate();
    expect(store.getFieldErrors("n")).toEqual([]);
  });

  it("subscribe notifies on value and error changes", async () => {
    const store = createFormStore();
    store.registerField("n");
    const spy = vi.fn();
    const unsub = store.subscribe(spy);
    const before = store.getSnapshot();
    store.setFieldValue("n", 1);
    expect(spy).toHaveBeenCalled();
    expect(store.getSnapshot()).not.toBe(before);
    unsub();
    spy.mockClear();
    store.setFieldValue("n", 2);
    expect(spy).not.toHaveBeenCalled();
  });

  it("marks validating during async validator", async () => {
    let resolve!: (v: boolean | string) => void;
    const store = createFormStore();
    store.registerField("n", {
      rules: [
        {
          validator: () =>
            new Promise((r) => {
              resolve = r;
            }),
        },
      ],
    });
    const p = store.validateField("n");
    expect(store.isFieldValidating("n")).toBe(true);
    resolve(true);
    await p;
    expect(store.isFieldValidating("n")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect RED**

Run: `npm run test -w @component-ai/form-core -- src/create-form-store.test.ts`  
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `createFormStore`**

Create `packages/form-core/src/create-form-store.ts`:

```ts
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
```

Update `packages/form-core/src/index.ts`:

```ts
export type { FormValues, FormRule, ValidateResult } from "./types";
export { runRules } from "./run-rules";
export { createFormStore } from "./create-form-store";
export type { FormStore, CreateFormStoreOptions } from "./create-form-store";
```

- [ ] **Step 4: Run all form-core tests — expect GREEN**

Run: `npm run test -w @component-ai/form-core`  
Expected: PASS

- [ ] **Step 5: Build**

Run: `npm run build -w @component-ai/form-core`  
Expected: `dist/index.js` + `dist/index.d.ts` 生成成功

- [ ] **Step 6: Commit**

```bash
git add packages/form-core
git commit -m "feat(form-core): add createFormStore for field registration and validation"
```

---

### Task 4: React Form / FormItem — 失败测试 → 实现

**Files:**
- Create: `packages/react-ui/src/components/Form.test.tsx`
- Create: `packages/react-ui/src/components/Form.tsx`
- Modify: `packages/react-ui/package.json`（dependencies 增加 `"@component-ai/form-core": "1.0.0"`）
- Modify: `packages/react-ui/src/index.ts`
- Run: `npm install`（链接 form-core）

- [ ] **Step 1: 添加依赖并写失败测试**

在 `packages/react-ui/package.json` 的 `dependencies` 中与 `grid-core` 并列加入 `"@component-ai/form-core": "1.0.0"`，然后 `npm install`。

Create `packages/react-ui/src/components/Form.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { Form, FormItem, type FormHandle } from "./Form";

describe("Form (React)", () => {
  it("collects values and calls onFinish when valid", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <Form initialValues={{ email: "" }} onFinish={onFinish}>
        <FormItem name="email" label="邮箱" rules={[{ required: true, message: "必填" }]}>
          <input aria-label="邮箱" />
        </FormItem>
        <button type="submit">提交</button>
      </Form>,
    );
    await user.type(screen.getByLabelText("邮箱"), "a@b.c");
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() =>
      expect(onFinish).toHaveBeenCalledWith({ email: "a@b.c" }),
    );
  });

  it("validates on blur and shows error", async () => {
    const user = userEvent.setup();
    render(
      <Form>
        <FormItem name="email" label="邮箱" rules={[{ required: true, message: "必填" }]}>
          <input aria-label="邮箱" />
        </FormItem>
      </Form>,
    );
    const input = screen.getByLabelText("邮箱");
    await user.click(input);
    await user.tab();
    expect(await screen.findByText("必填")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("calls onFinishFailed when submit invalid", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const onFinishFailed = vi.fn();
    render(
      <Form onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <FormItem name="email" label="邮箱" rules={[{ required: true, message: "必填" }]}>
          <input aria-label="邮箱" />
        </FormItem>
        <button type="submit">提交</button>
      </Form>,
    );
    await user.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() => expect(onFinishFailed).toHaveBeenCalled());
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("exposes imperative validate via ref", async () => {
    const onFinish = vi.fn();
    function Harness() {
      const ref = useRef<FormHandle>(null);
      return (
        <Form ref={ref} onFinish={onFinish}>
          <FormItem name="n" label="N" rules={[{ required: true, message: "必填" }]}>
            <input aria-label="N" />
          </FormItem>
          <button type="button" onClick={() => void ref.current?.validate()}>
            校验
          </button>
        </Form>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "校验" }));
    expect(await screen.findByText("必填")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect RED**

Run: `npm run test -w @component-ai/react-ui -- src/components/Form.test.tsx`  
Expected: FAIL（`./Form` 不存在）

- [ ] **Step 3: 实现 React `Form.tsx`**

Create `packages/react-ui/src/components/Form.tsx`:

```tsx
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
    value: value ?? "",
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
  });

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
```

- [ ] **Step 4: 导出**

在 `packages/react-ui/src/index.ts` 增加：

```ts
export { Form, FormItem } from "./components/Form";
export type { FormProps, FormItemProps, FormHandle } from "./components/Form";
```

- [ ] **Step 5: Run test — expect GREEN**

Run: `npm run test -w @component-ai/react-ui -- src/components/Form.test.tsx`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/react-ui/package.json packages/react-ui/src/components/Form.tsx packages/react-ui/src/components/Form.test.tsx packages/react-ui/src/index.ts package-lock.json
git commit -m "feat(react-ui): add Form and FormItem with form-core store"
```

---

### Task 5: Vue Form / FormItem — 失败测试 → 实现

**Files:**
- Create: `packages/vue-ui/src/components/Form.test.tsx`
- Create: `packages/vue-ui/src/components/Form.tsx`
- Modify: `packages/vue-ui/package.json`（dependencies 增加 form-core）
- Modify: `packages/vue-ui/src/index.ts`

- [ ] **Step 1: 依赖 + 失败测试**

在 `packages/vue-ui/package.json` 的 `dependencies` 中加入 `"@component-ai/form-core": "1.0.0"`，然后 `npm install`。

Create `packages/vue-ui/src/components/Form.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { Form, FormItem } from "./Form";

describe("Form (Vue)", () => {
  it("collects values and emits finish when valid", async () => {
    const onFinish = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form initialValues={{ email: "" }} onFinish={onFinish}>
              <FormItem
                name="email"
                label="邮箱"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="邮箱" />
              </FormItem>
              <button type="submit">提交</button>
            </Form>
          );
        },
      }),
    );
    const input = wrapper.find('input[aria-label="邮箱"]');
    await input.setValue("a@b.c");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinish).toHaveBeenCalledWith({ email: "a@b.c" });
  });

  it("validates on blur and shows error", async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form>
              <FormItem
                name="email"
                label="邮箱"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="邮箱" />
              </FormItem>
            </Form>
          );
        },
      }),
    );
    const input = wrapper.find('input[aria-label="邮箱"]');
    await input.trigger("focus");
    await input.trigger("blur");
    await flushPromises();
    expect(wrapper.text()).toContain("必填");
    expect(input.attributes("aria-invalid")).toBe("true");
  });

  it("emits finishFailed when submit invalid", async () => {
    const onFinish = vi.fn();
    const onFinishFailed = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form onFinish={onFinish} onFinishFailed={onFinishFailed}>
              <FormItem
                name="email"
                label="邮箱"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="邮箱" />
              </FormItem>
              <button type="submit">提交</button>
            </Form>
          );
        },
      }),
    );
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(onFinishFailed).toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("exposes imperative validate", async () => {
    const onFinish = vi.fn();
    const formRef = ref<{ validate: () => Promise<unknown> } | null>(null);
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Form ref={formRef} onFinish={onFinish}>
              <FormItem
                name="n"
                label="N"
                rules={[{ required: true, message: "必填" }]}
              >
                <input aria-label="N" />
              </FormItem>
            </Form>
          );
        },
      }),
    );
    await formRef.value!.validate();
    await flushPromises();
    await nextTick();
    expect(wrapper.text()).toContain("必填");
    expect(onFinish).not.toHaveBeenCalled();
  });
});
```

说明：若 Vue 端 `onFinish` 作为 prop 不便，可改为监听 `finish` / `finishFailed` 事件（`wrapper.emitted("finish")`），实现时 **emits 与 props 回调二选一或两者都支持**；测试须与实现一致。推荐：props 回调 `onFinish`/`onFinishFailed`（与 React 命名接近）同时 `emit('finish')` / `emit('finishFailed')`。

- [ ] **Step 2: Run — expect RED**

Run: `npm run test -w @component-ai/vue-ui -- src/components/Form.test.tsx`  
Expected: FAIL

- [ ] **Step 3: 实现 Vue Form（`defineComponent` + TSX）**

Create `packages/vue-ui/src/components/Form.tsx`:

```tsx
import {
  cloneVNode,
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type PropType,
  type VNode,
} from "vue";
import {
  createFormStore,
  type FormRule,
  type FormStore,
  type FormValues,
  type ValidateResult,
} from "@component-ai/form-core";

const FORM_KEY = Symbol("component-ai-form");

type FormLayout = "vertical" | "horizontal";

type FormContext = {
  store: FormStore;
  layout: FormLayout;
  labelWidth?: number;
  disabled: boolean;
  tick: { value: number };
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

    provide<FormContext>(FORM_KEY, {
      store,
      get layout() {
        return props.layout;
      },
      get labelWidth() {
        return props.labelWidth;
      },
      get disabled() {
        return props.disabled;
      },
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

    return () => {
      void tick.value;
      return (
        <form
          class={["flex flex-col gap-4", props.class].filter(Boolean).join(" ")}
          onSubmit={(e) => void onSubmit(e)}
          noValidate
        >
          {slots.default?.()}
        </form>
      );
    };
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
    const ctx = inject<FormContext>(FORM_KEY);
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
        ctx.disabled;

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
            ctx.layout === "horizontal" && ctx.labelWidth
              ? {
                  width: `${ctx.labelWidth}px`,
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
            ctx.layout === "horizontal"
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
```

注意：`provide` 里用 getter 读取 props，确保 layout/disabled 变更可见；若执行时发现 provide 快照过期，改为 `computed` 包一层 context 字段。

- [ ] **Step 4: 导出并 GREEN**

在 `packages/vue-ui/src/index.ts` 增加：

```ts
export { Form, FormItem } from "./components/Form";
export type { FormProps, FormItemProps } from "./components/Form";
```

Run: `npm run test -w @component-ai/vue-ui -- src/components/Form.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/vue-ui/package.json packages/vue-ui/src/components/Form.tsx packages/vue-ui/src/components/Form.test.tsx packages/vue-ui/src/index.ts package-lock.json
git commit -m "feat(vue-ui): add Form and FormItem with form-core store"
```

---

### Task 6: Storybook + 构建冒烟 + 更新 roadmap

**Files:**
- Create: `packages/react-ui/src/components/Form.stories.tsx`
- Create: `packages/vue-ui/src/components/Form.stories.tsx`
- Modify: `docs/superpowers/plans/2026-07-13-form-roadmap.md`
- Modify: `AGENTS.md`（组件表增加 Form / form-core 一行；若文件存在）

- [ ] **Step 1: React Story**

`title: "React/Form"`，至少：

- `Basic`：vertical，email required，submit 弹出/展示 values  
- `Horizontal`：`layout="horizontal"` + `labelWidth={80}`  
- `BlurValidation`：说明失焦校验  

使用原生 `<input className="... border ... rounded px-2 py-1">` 即可。

- [ ] **Step 2: Vue Story**

镜像 React 场景，`title: "Vue/Form"`。

- [ ] **Step 3: 构建冒烟**

```bash
npm run build -w @component-ai/form-core
npm run build -w @component-ai/react-ui
npm run build -w @component-ai/vue-ui
```

Expected: 全部成功。

- [ ] **Step 4: 更新 roadmap**

将 `2026-07-13-form-roadmap.md` 顺序 1 的「*待写*」改为链接本文件 `2026-07-13-form-core-and-form.md`，并在「当前应执行」写明 P0 完成后进入 P1 输入控件计划。

- [ ] **Step 5: Commit（不含勾选人工 Storybook 目视）**

```bash
git add packages/react-ui/src/components/Form.stories.tsx packages/vue-ui/src/components/Form.stories.tsx docs/superpowers/plans/2026-07-13-form-roadmap.md AGENTS.md
git commit -m "docs(story): add Form stories and mark form P0 plan in roadmap"
```

- [ ] **Step 6: 人工验证（勿由 agent 自行勾选）**

用户本地：`npm run storybook:react` / `npm run storybook:vue`，确认 Form Basic / Horizontal / 失焦错误展示。

---

## Self-review（对照规格）

| 规格项 | 对应 Task |
|--------|-----------|
| form-core 包 + rules + store | Task 1–3 |
| blur 单字段 / submit 全量 | Task 3–5 |
| Form/FormItem API、layout、命令式 API | Task 4–5 |
| a11y（aria-invalid / describedby / 必填 sr-only） | Task 4–5 |
| P0 原生 input 接线；不做 Input 原子控件 | Task 4–6 |
| 双端测试 + Story | Task 4–6 |
| 嵌套路径 / DatePicker / schema — 非目标 | 未纳入 |
| Checkbox 注入映射 | 明确留到 P2 |

无 TBD 占位；`FormStore` 方法名在 Task 3–5 一致。

---

## 完成定义（本计划）

- `npm run test -w @component-ai/form-core` 通过  
- React / Vue Form 测试通过  
- 三包 build 通过  
- Story 文件已添加；roadmap P0 已链接本文件  
