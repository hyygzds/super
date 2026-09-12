# DatePicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `form-core` 落地月历纯函数，并双端交付独立 `DatePicker`（ISO 单日、受控/非受控、min/max）。

**Architecture:** 日历解析、6×7 网格、翻月、范围判断放 `@component-ai/form-core`。React/Vue DatePicker 只用已导出 `Input` + `Button` 画触发框和面板。

**Tech Stack:** TypeScript、React 19、Vue 3.5 TSX、Vitest、Testing Library / Vue Test Utils、Tailwind v4

**规格来源:** [`docs/superpowers/specs/2026-09-12-datepicker-design.md`](../specs/2026-09-12-datepicker-design.md)

## Global Constraints

- 受控优先：`valueProp ?? uncontrolled`（Vue：`modelValue ?? internal`）
- 变更一律回调，不管受控与否
- Vue：`defineComponent` + TSX；`PropType`；`emits` + `emit`
- 禁止自绘文本框 / 原生 button 冒充依赖件
- 对外值仅 `YYYY-MM-DD` 或 `""`
- TDD：RED 再 GREEN；agent 可勾选自动化步骤；勿勾选 Storybook 目视与 git commit

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/form-core/src/date.ts` | 解析、格式化、网格、翻月、范围 |
| `packages/form-core/src/date.test.ts` | 纯函数测试 |
| `packages/form-core/src/index.ts` | 导出日期 API |
| `packages/react-ui/src/components/Input.tsx` | 增加 `readOnly` |
| `packages/vue-ui/src/components/Input.tsx` | 增加 `readOnly` |
| `packages/{react,vue}-ui/src/components/DatePicker.tsx` | 双端组件 |
| `packages/{react,vue}-ui/src/components/DatePicker.test.tsx` | 双端测试 |
| `packages/{react,vue}-ui/src/components/DatePicker.stories.tsx` | Story |
| `packages/*/src/index.ts`、`AGENTS.md`、form roadmap | 导出与索引 |

---

### Task 1: form-core 月历

**Files:**
- Create: `packages/form-core/src/date.test.ts`
- Create: `packages/form-core/src/date.ts`
- Modify: `packages/form-core/src/index.ts`

- [x] **Step 1: 写失败测试**（`date.test.ts`：parse/format、2026-09 网格 42 格且 9/1 为周二、shiftMonth 跨年、range）
- [x] **Step 2: RED** `npm run test -w @component-ai/form-core -- src/date.test.ts` — `Cannot find module './date'`
- [x] **Step 3: 实现 `date.ts` 并导出**
- [x] **Step 4: GREEN** 5 passed

---

### Task 2: Input.readOnly

**Files:** Input 组件与测试（React / Vue）

- [x] **Step 1: 写失败测试**（readOnly 时输入不改值）
- [x] **Step 2: RED** React：`toHaveAttribute("readonly")` 失败
- [x] **Step 3: 实现 `readOnly`**
- [x] **Step 4: GREEN** 两端 Input 各 7 passed

---

### Task 3: React DatePicker

**Files:**
- Create: `packages/react-ui/src/components/DatePicker.test.tsx`
- Create: `packages/react-ui/src/components/DatePicker.tsx`
- Create: `packages/react-ui/src/components/DatePicker.stories.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: 写失败测试**
- [x] **Step 2: RED** `Failed to resolve import "./DatePicker"`
- [x] **Step 3: 实现组件 + Story + 导出**
- [x] **Step 4: GREEN** 5 passed

---

### Task 4: Vue DatePicker

**Files:** 与 React 镜像

- [x] **Step 1: 写失败测试**
- [x] **Step 2: RED** `Failed to resolve import "./DatePicker"`
- [x] **Step 3: 实现组件 + Story + 导出**
- [x] **Step 4: GREEN** 5 passed

---

### Task 5: 文档索引与构建

- [x] 更新 `AGENTS.md` 组件表、`docs/superpowers/plans/2026-07-13-form-roadmap.md`
- [x] `npm run test -w @component-ai/form-core`、`react-ui`、`vue-ui` — 32 / 116 / 110 passed
- [x] `npm run build -w @component-ai/form-core`、`react-ui`、`vue-ui` — 均成功产出 dist

- [ ] Storybook 目视确认（人工）
- [ ] git commit（需用户明确要求）
