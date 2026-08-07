# Form P1: Input / InputNumber / Textarea Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@component-ai/react-ui` 与 `@component-ai/vue-ui` 交付完整可独立使用的 `Input`、`InputNumber`、`Textarea`；更新 Form Story 用库组件替换原生 `<input>`；必要时微调 FormItem 注入以兼容数字空值与 Vue `v-model`。

**Architecture:** 纯 UI 原子组件，不依赖 `form-core`。受控/非受控与现有 Checkbox/Select 一致。Form 通过公开 props 注入（React：`value`/`onChange`/`onBlur`；Vue：`modelValue`/`update:modelValue`/`blur`，同时保留原生 `value`/`input`）。`InputNumber` 空值为 `null`；`onChange` 直接传值（非 DOM event），以便 FormItem `readChangeValue` 透传。

**Tech Stack:** TypeScript、React 19、Vue 3.5、Vitest、Testing Library / Vue Test Utils、Tailwind v4

**规格来源:** [`docs/superpowers/specs/2026-07-13-form-system-design.md`](../specs/2026-07-13-form-system-design.md) §5、§8–§10（P1）  
**路线图:** [`2026-07-13-form-roadmap.md`](./2026-07-13-form-roadmap.md)

---

## API 契约（双端对齐）

### Input（`string`）

| 概念 | React | Vue |
|------|-------|-----|
| 值 | `value` / `defaultValue` / `onChange(value: string)` | `modelValue` / `defaultModelValue` / `update:modelValue` |
| 类型 | `type?: 'text' \| 'password' \| 'search'`（默认 `text`） | 同 |
| 其它 | `placeholder`、`clearable`、`maxLength`、`disabled`、`id`、`className`、`onBlur` | `class`、`blur` |
| a11y | 原生 `<input>`；clear 按钮 `type="button"` + `aria-label="清除"` | 同 |

### InputNumber（`number \| null`）

| 概念 | React | Vue |
|------|-------|-----|
| 值 | `value` / `defaultValue` / `onChange(value: number \| null)` | `modelValue` / `defaultModelValue` / `update:modelValue` |
| 约束 | `min` / `max` / `step`（默认 1）/ `precision?` | 同 |
| UI | 左右步进按钮 `−` / `+`；中间可编辑文本框 | 同 |
| 空值 | 清空输入 → `null`；展示为空串 | 同 |
| 其它 | `disabled`、`id`、`className`、`onBlur`、`placeholder` | `class`、`blur` |

步进：在当前有效数字（或 0）上 ±step，再按 min/max/precision 约束后 `onChange`。非法中间输入可暂存在本地 draft，blur 时 parse 或回退。

### Textarea（`string`）

| 概念 | React | Vue |
|------|-------|-----|
| 值 | `value` / `defaultValue` / `onChange(value: string)` | `modelValue` / `defaultModelValue` / `update:modelValue` |
| 其它 | `rows`（默认 3）、`maxLength`、`showCount?`、`placeholder`、`disabled`、`id`、`className`、`onBlur` | `class`、`blur` |

**刻意不做：** Input 前后缀插槽、Autosize Textarea、千分位/货币格式。

---

## FormItem 微调（P1）

| 变更 | 原因 |
|------|------|
| React/Vue：`value` 仅在 `undefined` 时落到 `""`，**保留 `null`** | InputNumber 空值 |
| Vue：额外注入 `modelValue` + `onUpdate:modelValue` | 库组件走 v-model |
| Vue：继续注入 `value`/`onInput`/`onChange` | 原生元素与兼容 |

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/react-ui/src/components/Input.tsx` (+ `.test` / `.stories`) | React Input |
| `packages/react-ui/src/components/InputNumber.tsx` (+ `.test` / `.stories`) | React InputNumber |
| `packages/react-ui/src/components/Textarea.tsx` (+ `.test` / `.stories`) | React Textarea |
| `packages/vue-ui/src/components/Input.tsx` (+ `.test` / `.stories`) | Vue Input |
| `packages/vue-ui/src/components/InputNumber.tsx` (+ `.test` / `.stories`) | Vue InputNumber |
| `packages/vue-ui/src/components/Textarea.tsx` (+ `.test` / `.stories`) | Vue Textarea |
| `packages/*/src/components/Form.tsx` | FormItem 注入微调 |
| `packages/*/src/components/Form.stories.tsx` | 改用库组件 |
| `packages/*/src/components/Form.test.tsx` | 至少一条用 Input 的集成（可选增补） |
| `packages/*/src/index.ts` | 导出 |
| `docs/superpowers/plans/2026-07-13-form-roadmap.md` | P1 行指向本文件 |

共享输入样式（与 Form story 一致）：`w-full rounded border border-slate-300 px-2 py-1 text-sm`，focus 用 sky outline。

---

### Task 1: FormItem 注入微调

**Files:** `packages/react-ui/src/components/Form.tsx`, `packages/vue-ui/src/components/Form.tsx`

- [ ] **Step 1:** React：`value: value === undefined ? "" : value`（允许 `null`）
- [ ] **Step 2:** Vue：同上，并注入 `modelValue` + `onUpdate:modelValue`（与 `syncValue` 相同）
- [ ] **Step 3:** 跑现有 Form 测试确保不回归  
  `npm run test -w @component-ai/react-ui -- src/components/Form.test.tsx`  
  `npm run test -w @component-ai/vue-ui -- src/components/Form.test.tsx`

---

### Task 2: React Input

**Files:** Create `Input.tsx` / `Input.test.tsx` / `Input.stories.tsx`；更新 `index.ts`

- [x] **Step 1:** 失败测试 — 非受控输入、`onChange` 收 string；受控不内部翻转；`clearable` 清空；`disabled`；`type=password`  
  RED: failed to resolve `./Input`
- [x] **Step 2:** 实现并通过测试  
  GREEN: `Input.test.tsx` passed
- [x] **Step 3:** Story：`Basic` / `Clearable` / `Password`；导出

---

### Task 3: React InputNumber

**Files:** Create `InputNumber.tsx` / `.test` / `.stories`；更新 `index.ts`

- [x] **Step 1:** 失败测试 — 非受控步进；清空 → `null`；受控；min/max 夹紧；disabled  
  RED: failed to resolve `./InputNumber`
- [x] **Step 2:** 实现并通过测试  
  GREEN: `InputNumber.test.tsx` passed
- [x] **Step 3:** Story：`Basic` / `MinMax`；导出

---

### Task 4: React Textarea

**Files:** Create `Textarea.tsx` / `.test` / `.stories`；更新 `index.ts`

- [x] **Step 1:** 失败测试 — 非受控 / 受控 / `showCount` / `maxLength` / disabled  
  RED: failed to resolve `./Textarea`
- [x] **Step 2:** 实现并通过测试  
  GREEN: `Textarea.test.tsx` passed
- [x] **Step 3:** Story：`Basic` / `WithCount`；导出

---

### Task 5: Vue Input / InputNumber / Textarea

镜像 Task 2–4（VTU + `modelValue` / `update:modelValue` / `blur`）。

- [x] **Step 1–3:** 同上三组件 TDD + Story + `index.ts` 导出  
  Evidence: `npm run test -w @component-ai/vue-ui -- src/components/Input.test.tsx src/components/InputNumber.test.tsx src/components/Textarea.test.tsx` → 3 files / 17 tests passed

---

### Task 6: Form Stories 改用库组件 + 冒烟

**Files:** 双端 `Form.stories.tsx`；可选增补 Form 集成测用 `Input`

- [ ] **Step 1:** Basic / Horizontal / Validation 等 story 用 `<Input>`（及可选 `InputNumber`/`Textarea`）替换原生 input
- [ ] **Step 2:** `npm test` 与 `npm run build -w @component-ai/react-ui` / `vue-ui` 通过
- [ ] **Step 3:** 更新 roadmap：P1 行指向本文件；「当前应执行」改为 P1 已完成 / 下一步 P2

---

## 完成定义

- 双端导出 `Input` / `InputNumber` / `Textarea`，单测通过
- Form Story 不再依赖原生 `<input>` 作为字段控件
- FormItem 支持 `null` 与 Vue `modelValue` 注入
- Storybook 目视与 `git commit` 须用户明确要求后再做
