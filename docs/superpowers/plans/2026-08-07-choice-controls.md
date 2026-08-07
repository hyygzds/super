# Form P2: Radio / Switch + Checkbox/Select 接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 双端交付 `Radio`/`RadioGroup`、`Switch`；扩展 FormItem 以公开 API 接入 `Checkbox`/`Switch`（`checked` / `onCheckedChange`）与已有 `Select`；Form Story 演示完整选择类表单。

**Architecture:** 原子控件独立、不依赖 form-core。`RadioGroup` 用 React Context / Vue provide 向子 `Radio` 下发 `name`、当前值、`disabled`、变更回调；也支持 `options` 快捷渲染。FormItem 增加 `valuePropName` + `trigger`（对齐 Ant Design 习惯），默认仍为文本控件语义；Checkbox/Switch 使用 `valuePropName="checked"`（Vue 映射为 `modelValue`，且不再把 store 值写入原生 `value` 属性）。

**Tech Stack:** TypeScript、React 19、Vue 3.5、Vitest、Testing Library / Vue Test Utils、Tailwind v4

**规格来源:** [`docs/superpowers/specs/2026-07-13-form-system-design.md`](../specs/2026-07-13-form-system-design.md) §5、§8–§10（P2）  
**路线图:** [`2026-07-13-form-roadmap.md`](./2026-07-13-form-roadmap.md)

---

## API 契约

### RadioGroup（组值 `string`）

| 概念 | React | Vue |
|------|-------|-----|
| 值 | `value` / `defaultValue` / `onChange(value: string)` | `modelValue` / `defaultModelValue` / `update:modelValue` |
| 选项 | `options?: { label: string; value: string; disabled?: boolean }[]` 和/或子 `Radio` | 同 + 默认 slot |
| 布局 | `orientation?: 'horizontal' \| 'vertical'`（默认 `horizontal`） | 同 |
| 其它 | `disabled`、`name`、`id`、`className`、`aria-labelledby` | `class`、`blur`（组失焦可选） |

### Radio（子项）

| 概念 | React | Vue |
|------|-------|-----|
| 选项值 | `value: string`（必填） | 同 |
| 标签 | `children` | 默认 slot |
| 禁用 | `disabled?` | 同 |

根节点：`role="radiogroup"`；单项原生 `<input type="radio">`。

### Switch（`boolean`）

| 概念 | React | Vue |
|------|-------|-----|
| 值 | `checked` / `defaultChecked` / `onCheckedChange` | `modelValue` / `defaultModelValue` / `update:modelValue` |
| 其它 | `disabled`、`id`、`className` | `class`、`change`（可选） |

视觉：可点击轨道 + 滑块；`role="switch"` + `aria-checked`。

### FormItem 扩展

| Prop | 默认 | 说明 |
|------|------|------|
| `valuePropName` | `'value'` | React 注入的值 prop 名；`'checked'` 时注入 boolean。Vue：`'value'`→同时 `value`+`modelValue`；`'checked'`→只注入 `modelValue`（boolean），不覆盖 Checkbox 的 string `value` |
| `trigger` | React `'onChange'`；Vue `'update:modelValue'`（文本） | React Checkbox/Switch 用 `'onCheckedChange'` |

Select：继续默认 `value`/`onChange`（React）与 `modelValue`（Vue），无需额外 prop。

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/*/src/components/Radio.tsx` (+ test/stories) | Radio + RadioGroup |
| `packages/*/src/components/Switch.tsx` (+ test/stories) | Switch |
| `packages/*/src/components/Form.tsx` | FormItem `valuePropName` / `trigger` |
| `packages/*/src/components/Form.stories.tsx` | WithChoices：Radio/Switch/Checkbox/Select |
| `packages/*/src/components/Form.test.tsx` | Checkbox/Switch 或 RadioGroup 接线测 |
| `packages/*/src/index.ts` | 导出 |
| `docs/superpowers/plans/2026-07-13-form-roadmap.md` | P2 行指向本文件 |

---

### Task 1: FormItem valuePropName / trigger

- [ ] React + Vue FormItem 实现上表语义；现有 Form 测试不回归
- [ ] 增补：`valuePropName="checked"` + Checkbox/Switch 提交 boolean

### Task 2: React RadioGroup / Radio / Switch

- [x] TDD + Story + 导出 — `npm run test -w @component-ai/react-ui -- src/components/Radio.test.tsx src/components/Switch.test.tsx` → 2 files, 9 passed

### Task 3: Vue RadioGroup / Radio / Switch

- [ ] TDD + Story + 导出

### Task 4: Form Stories + 集成测 + roadmap

- [ ] 双端 `WithChoices` Story（RadioGroup、Switch、Checkbox、Select + Input）
- [ ] `npm test` / UI build 通过
- [ ] roadmap 标记 P2 完成

---

## 完成定义

- 双端导出 Radio/RadioGroup/Switch；FormItem 可接 Checkbox/Switch/Select
- Form Story 覆盖选择类字段
- Storybook 目视与 commit 须用户明确要求（本次用户已要求推送则实现后推送）
