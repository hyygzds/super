# Input 组件 — 设计规格（Design Spec）

**日期**：2026-07-10  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`@component-ai/react-ui`、`@component-ai/vue-ui`  
**路线图位置**：VirtualGrid 迁移依赖件（P5 单元格/行编辑前置；在 Checkbox / Pagination / VirtualGrid P0 之后）

---

## 1. 背景与目标

为组件库提供完整、可独立使用的 **单行 Input**，供表单与后续 VirtualGrid P5 编辑使用。支持 `text` / `password` / `number`；视觉为 Tailwind，API 习惯对齐 Tabs / Checkbox / Select。

**成功标准**

- React / Vue 双端行为与语义对齐。
- 受控 / 非受控、`placeholder`、`disabled`、`readOnly`、`clearable`、尺寸、`type` 变体。
- Vitest + Storybook 覆盖关键路径；作为完整库组件导出后再被 VirtualGrid 引用（本期不接线表格）。

---

## 2. 非目标（本期不做）

- Textarea、InputGroup（前后缀复合）。
- 自定义数字 stepper（使用原生 `type=number`）。
- 与特定表单库的深度绑定、校验文案体系。
- 本期将 Input 接到 VirtualGrid（属 VirtualGrid P5）。

---

## 3. 架构选型

采用 **原生 `<input>` + Tailwind 皮肤**：

| 优点 | 说明 |
|------|------|
| 无障碍 / 表单 | 焦点、键盘、IME、浏览器原生行为 |
| 表格嵌入 | 尺寸稳定，易与单元格对齐 |
| 与现有库一致 | sky / slate 焦点与边框语言 |

**不采用**：几乎无皮肤的薄包装；本期不做 InputGroup。

密码显隐：本地切换展示用 type，不改变 prop `type` 的产品语义。数字：`onValueChange` / `update:modelValue` 始终传 **string**。

---

## 4. 组件模型

| 导出名 | 职责 |
|--------|------|
| `Input` | 单行输入；可选清除、密码显隐 |

不做复合子组件。

---

## 5. API（React / Vue 对齐）

| 概念 | React | Vue | 默认 |
|------|-------|-----|------|
| 值 | `value` / `defaultValue` / `onValueChange(value: string)` | `modelValue` / `update:modelValue`（`v-model`） | 非受控默认 `''` |
| 类型 | `type?: 'text' \| 'password' \| 'number'` | 同 | `'text'` |
| 占位 | `placeholder?: string` | 同 | — |
| 禁用 | `disabled?: boolean` | 同 | `false` |
| 只读 | `readOnly?: boolean` | 同 | `false` |
| 可清空 | `clearable?: boolean` | 同 | `false` |
| 尺寸 | `size?: 'sm' \| 'md'` | 同 | `'md'` |
| 样式 | `className?: string` | `class?: string` | — |
| 透传 | 安全的原生 input 属性（`name`、`id`、`autoComplete`、`maxLength`、`aria-*` 等） | 同 | — |

**受控判定**：与 Tabs / Checkbox 一致——React：`value !== undefined`；Vue：`modelValue !== undefined`（以实现为准写清）。

**Clearable**：有非空值且非 `disabled` 时显示清除按钮；点击后发出 `''`。`readOnly` 时不显示清除（或显示但不可点——**写死：readOnly 时不显示清除**）。

**Password**：`type="password"` 时显示显隐切换；`aria-label` 在「显示密码」/「隐藏密码」间切换。

**Number**：原生 `type="number"`；回调值仍为 string（例如 `"12"`），避免受控模型 number/string 混用。

---

## 6. 无障碍

- 原生 input 承担焦点与输入。
- 清除、密码切换为 `type="button"`，具备明确 `aria-label`。
- 支持 `aria-label` / `aria-labelledby` 透传；推荐宿主用 `<label>` 包裹或关联。

---

## 7. 视觉

- Tailwind；白底、`border-slate-300`、圆角、`focus-visible` 环 `outline-sky-600`；禁用 `opacity-50`。
- `sm` / `md`：高度与字号分级（实现 plan 写死具体 class，如 md≈`h-9 text-sm`，sm≈`h-8 text-sm`）。
- 右侧操作区：清除与密码按钮，间距紧凑，不遮挡过多输入区域。

---

## 8. 测试与完成定义

| 层 | 内容 |
|----|------|
| Vitest 双端 | 受控/非受控输入、`clearable`、`disabled`、`readOnly`、password 显隐、`type=number` 回调为 string |
| Storybook | Basic、Password、Number、Clearable、Disabled、Sizes |
| 构建 | 两 UI 包导出 `Input`（及必要类型） |

**完成定义**：双端测试绿、Story 可演示、完整库组件导出。不包含 VirtualGrid 接线。

---

## 9. 实现顺序（摘要）

1. React：失败测试 → `Input` → 导出 → stories。  
2. Vue：对称实现 → 导出 → stories。  
3. 更新 roadmap：Input 计划链接；「当前应执行」指向 Input 完成后的 VirtualGrid P1 或 P5。

详细任务见后续 `docs/superpowers/plans/`（writing-plans）。
