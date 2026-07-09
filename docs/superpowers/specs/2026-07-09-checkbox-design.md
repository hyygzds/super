# Checkbox 组件 — 设计规格（Design Spec）

**日期**：2026-07-09  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`@component-ai/react-ui`、`@component-ai/vue-ui`  
**路线图位置**：VirtualGrid 迁移依赖件（在 Pagination 之后、VirtualGrid P1 选中接线之前）

---

## 1. 背景与目标

为组件库提供完整、可独立使用的 **Checkbox** 与 **CheckboxGroup**，供表单与后续 VirtualGrid 行选 / 表头全选使用。视觉为 Tailwind 自定义方框（非系统原生外观），API 习惯对齐现有 Tabs / Select / Pagination。

**成功标准**

- React / Vue 双端行为与语义对齐。
- 支持受控 / 非受控、`indeterminate`、`disabled`、可选文案。
- `CheckboxGroup` 管理 `string[]` 选中集合。
- Vitest + Storybook 覆盖关键路径；作为完整库组件导出后再被 VirtualGrid 引用（本期不接线表格）。

---

## 2. 非目标（本期不做）

- 三态点击循环（unchecked → indeterminate → checked）。
- 与特定表单库（Formik / VeeValidate 等）的深度绑定。
- 完整校验文案 / 国际化方案（可用中文默认 `aria-label`，后续替换）。
- 本期将 Checkbox 接到 VirtualGrid（属 VirtualGrid P1 计划）。

---

## 3. 架构选型

采用 **原生 `input[type=checkbox]` 视觉隐藏 + 自绘指示器**：

| 优点 | 说明 |
|------|------|
| 无障碍 | 焦点、空格切换、label 关联走原生 |
| Indeterminate | DOM `indeterminate` + `aria-checked="mixed"` 可控 |
| 表格嵌入 | 无文案时仅方框，尺寸稳定 |

**不采用**：纯 `button role=checkbox`（表单与 Group 成本高）；仅原生轻样式（跨浏览器观感不一致，与已选视觉方向不符）。

---

## 4. 组件模型

| 导出名 | 职责 |
|--------|------|
| `Checkbox` | 单个勾选；可独立使用，或作为 `CheckboxGroup` 子项 |
| `CheckboxGroup` | 提供选中值数组上下文；`role="group"` |

**Group 内规则**：以 Group 的 `value` 数组为准；子 `Checkbox` 若再传 `checked`，开发环境 `console.warn`，运行时仍以 Group 为准。

---

## 5. API（React / Vue 对齐）

### 5.1 `Checkbox`

| 概念 | React | Vue | 默认 |
|------|-------|-----|------|
| 勾选 | `checked` / `defaultChecked` / `onCheckedChange(checked: boolean)` | `checked` / `defaultChecked` / `update:checked` | 非受控默认 `false` |
| 半选 | `indeterminate?: boolean` | 同 | `false` |
| 禁用 | `disabled?: boolean` | 同 | `false` |
| Group 项值 | `value?: string`（在 Group 内建议必填） | 同 | — |
| 文案 | `children`；可选另设可见文案 | 默认 slot；可选 `label` | — |
| 样式 | `className?: string` | `class?: string` | — |

**受控判定**：与 Tabs / Select 一致——传入 `checked !== undefined`（React）或传入 `checked` prop（Vue，以实现为准写清）视为受控。

**Indeterminate 行为**：仅影响展示与 `aria-checked="mixed"`；用户激活后仍发出布尔 `true`/`false`。是否清除 `indeterminate` 由宿主负责（表格全选典型模式）。

### 5.2 `CheckboxGroup`

| 概念 | React | Vue | 默认 |
|------|-------|-----|------|
| 选中集合 | `value` / `defaultValue` / `onValueChange(value: string[])` | `modelValue` / `update:modelValue`（`v-model`） | 非受控默认 `[]` |
| 整组禁用 | `disabled?: boolean` | 同 | `false` |
| 布局 | `orientation?: 'horizontal' \| 'vertical'` | 同 | `'vertical'` |
| 无障碍名 | `aria-label` / `aria-labelledby` | 同 | — |
| 样式 | `className` | `class` | — |

**子项切换**：勾选 → 将 `value` 加入数组；取消 → 移除。禁用子项或整组禁用时不响应。

---

## 6. 无障碍

- 保留可聚焦的原生 checkbox；自绘方框装饰性，`aria-hidden="true"`。
- 勾选态：`aria-checked` 为 `true` / `false`；半选为 `mixed`，并设置 input 的 `indeterminate`。
- Label / 包裹 `label` 可点击切换。
- 键盘：空格切换（原生默认），不额外劫持。
- Group：`role="group"`，提供 `aria-label` 或 `aria-labelledby` 之一（Story 与文档给出示例）。

---

## 7. 视觉

- Tailwind；对齐 Button：未选中 `border-slate-300` 白底；选中 / 半选 `bg-sky-600`；焦点环 `outline-sky-600`；禁用 `opacity-50` + `pointer-events-none`。
- 勾选：简洁白色 SVG 对勾；半选：白色短横。
- 允许无 `children`（表格列仅方框）。

---

## 8. 测试与完成定义

| 层 | 内容 |
|----|------|
| Vitest 双端 | 受控切换、非受控、`indeterminate` 点击发出布尔、`disabled`、Group 增删选中项 |
| Storybook | Basic、Indeterminate、Disabled、Group（horizontal / vertical） |
| 构建 | 两 UI 包导出 `Checkbox` / `CheckboxGroup`（及必要类型） |

**完成定义**：双端测试绿、Story 可演示、作为完整库组件导出。不包含 VirtualGrid 接线。

---

## 9. 实现顺序（摘要）

1. React：失败测试 → `Checkbox` → `CheckboxGroup` → 导出 → stories。
2. Vue：对称实现（TSX + provide/inject 或等价上下文）。
3. 双端 build / test 通过后勾选计划；更新 roadmap 中 Checkbox 条目指向本 spec 与实现计划。

详细任务见后续 `docs/superpowers/plans/`（writing-plans）。
