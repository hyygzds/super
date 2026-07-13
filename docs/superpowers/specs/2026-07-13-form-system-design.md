# Form 体系 — 设计规格（Design Spec）

**日期**：2026-07-13  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`@component-ai/form-core`、`@component-ai/react-ui`、`@component-ai/vue-ui`  
**Roadmap 索引**：[`docs/superpowers/plans/2026-07-13-form-roadmap.md`](../plans/2026-07-13-form-roadmap.md)

---

## 1. 背景与目标

在现有组件库（已有 `Button`、`Select`、`Checkbox`、`Tabs`、`Pagination`、`VirtualGrid` 等）上，补齐 **表单体系**：值收集型 `Form` / `FormItem`，以及第一批原子输入控件，供业务表单与后续 VirtualGrid 单元格编辑（P5）复用。

**成功标准**

- 宿主可用 `name` 注册字段，提交时拿到完整 `values`；校验失败时字段级错误可见且可访问。
- 规则可插拔（内置常见规则 + 自定义 / 异步 `validator`）；默认在 **失焦** 校验当前字段、**提交** 时全量校验。
- React / Vue **API 语义与行为对齐**；视觉走现有 Tailwind 皮肤。
- 每个原子控件均为 **完整、可独立使用的库组件**（公开 API、Story、双端测试），再被 Form 接线。
- 共享逻辑落在 `@component-ai/form-core`，双端只做薄适配（对齐 `grid-core` 模式）。

---

## 2. 非目标（本期不做）

- 完整 schema 表单引擎 / JSON Schema 驱动渲染。
- 嵌套字段路径（如 `user.address.city`、`users[0].name`）——本期 `name` 为 **扁平 string**。
- `DatePicker` / `TimePicker` / `CheckboxGroup`（可后续单独立项）。
- Input 前后缀复杂插槽体系、Autosize Textarea、Radio 胶囊按钮变体。
- Switch 的非 boolean `checkedValue` / `uncheckedValue`。
- 像素级复刻 Farris 外观；本体系以目标库习惯为主，行为可参考 Farris 同类控件，但不绑定其嵌套 config API。
- 完整国际化方案（默认中文文案，可后续替换）。

---

## 3. 架构选型

采用 **共享核心 + 双端薄适配**（brainstorming 选定方案 1）：

| 包 | 职责 |
|----|------|
| `@component-ai/form-core` | 纯 TypeScript：字段注册、取值/设值、rules 执行、blur/submit 触发、错误状态；无 React/Vue/DOM |
| `@component-ai/react-ui` | `Form` / `FormItem` 与原子控件渲染 + Tailwind |
| `@component-ai/vue-ui` | 同上（`defineComponent` + TSX） |

**不采用**：双端各自实现 Form 状态机；或直接依赖 RHF / VeeValidate 等第三方表单库（API 难对齐、与 monorepo 共享核心策略冲突）。

---

## 4. 能力清单与分期

| 阶段 | 交付 | 说明 |
|------|------|------|
| **P0** | `form-core` + 双端 `Form` / `FormItem` | 值收集、rules、blur/submit、布局与错误展示；集成测试可用原生 `input` 接线 |
| **P1** | `Input`、`InputNumber`、`Textarea` | 完整库组件；替换 Form demo 中的原生控件 |
| **P2** | `Radio` / `RadioGroup`、`Switch` | 完整库组件；Story 演示已有 `Checkbox` / `Select` 经 FormItem 接入 |

子计划文件与阻塞关系见 roadmap 索引。每期结束须：**可构建 / 可测 / 可演示 Story（若适用）**。

---

## 5. 依赖件硬约束

与 VirtualGrid spec §5 相同原则，对本体系同样生效：

1. `Input`、`InputNumber`、`Textarea`、`RadioGroup`、`Switch` 必须先作为 **完整库组件** 交付。
2. `Form` / `FormItem` 只消费上述组件及已有 `Select` / `Checkbox` 的 **公开 API**。
3. 禁止在 Form 内部塞未导出的半成品控件。

P0 允许用原生 DOM 控件验证 Form 接线；P1 起 demo / Story 应改用库组件。

---

## 6. `@component-ai/form-core` 边界

**放入 core**

- 类型：`FormValues`、`FormRule`、`FieldState`、`ValidateError` 等
- Store / 工厂：`createFormStore(options)`（或等价纯函数 + 可变 store）
- 字段注册 / 注销（`name`、`rules`）
- `getFieldsValue` / `setFieldsValue` / `resetFields` / `clearValidate`
- `validateField(name)` / `validateFields(names?)` / `validate()`（全量）
- Rules runner：`required`、`min`、`max`、`minLength`、`maxLength`、`pattern`、同步/异步 `validator`
- 触发策略默认：**blur → 单字段**；**submit / validate → 全量**（change 不默认校验）

**不放入 core**

- DOM、焦点管理、样式
- 标签布局、错误文案渲染
- 具体 Input / Switch 等 UI 组件

**测试**：Vitest，`environment: "node"`。

---

## 7. Form / FormItem API

### 7.1 数据流

1. `FormItem` 以 `name` + `rules` 向 form-core 注册字段。
2. 子控件变更 → `setFieldValue`（**不**默认跑校验）。
3. 子控件 blur → `validateField(name)` → 错误写入 store → FormItem 展示。
4. 提交 → `validateAll()` → 通过则触发完成回调并带上 `values`；失败则触发失败回调并带上 `values` + `errors`，不抛未捕获异常。

### 7.2 `Form`（根）

| Prop / 事件 | 类型 / 说明 |
|-------------|-------------|
| `initialValues` | `Record<string, unknown>`，初始值 |
| `layout` | `'vertical'`（默认）\| `'horizontal'` |
| `labelWidth` | horizontal 时标签宽度，类型为 `number`（单位 px） |
| `disabled` | 整表禁用，经 context 下发 |
| React：`onFinish` | `(values) => void` |
| React：`onFinishFailed` | `(info: { values; errors }) => void` |
| Vue：`finish` / `finishFailed` | 与上语义对齐 |
| `className` / `class` | 根节点样式 |

**命令式 API**（React `ref` / Vue `expose`）：`validate`、`validateFields`、`getFieldsValue`、`setFieldsValue`、`resetFields`、`clearValidate`。

提交入口：根节点渲染为 `<form>`，监听原生 `submit`（`preventDefault`）；也可命令式 `validate` 后由宿主自行处理。

### 7.3 `FormItem`

| Prop | 说明 |
|------|------|
| `name` | 字段名，扁平 `string`；缺省则不参与值收集（仅布局），开发环境可 `console.warn` |
| `label` | 标签文案 |
| `rules` | `FormRule[]` |
| `required` | **仅展示**必填星号；真正校验仍由 `rules` 中的 `required` 等决定 |
| `help` / `extra` | 辅助说明（帮助文案 / 额外内容） |
| `className` / `class` | 样式 |

**子控件接线**：通过 Form context 向子控件注入受控 `value`（或 Checkbox/Switch 的 `checked`）、`onChange`/`onCheckedChange`、`onBlur`，以及 `id`、`aria-invalid`、`aria-describedby`。具体注入策略（单一子节点 clone / 约定 props）在 P0 实现计划中选定，须保证控件 **脱离 Form 仍可独立使用**。

### 7.4 `FormRule`

```ts
type FormRule = {
  required?: boolean;
  /** 数值下限（value 为 number 时生效） */
  min?: number;
  /** 数值上限（value 为 number 时生效） */
  max?: number;
  /** 字符串最小长度（value 为 string 时生效） */
  minLength?: number;
  /** 字符串最大长度（value 为 string 时生效） */
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
  /** 返回 true 表示通过；返回 string 表示错误文案；可返回 Promise */
  validator?: (
    value: unknown,
    values: Record<string, unknown>,
  ) => boolean | string | Promise<boolean | string>;
};
```

**空值与 `required`**：`undefined`、`null`、空字符串 `""` 视为空；`required: true` 时失败。`InputNumber` 空值为 `null`，与 `required` 一致。类型不符的 `min`/`max` 或 `minLength`/`maxLength`（例如对 string 设 `min`）在该规则上 **跳过**（不报错也不通过该条），由 `required` / `pattern` / `validator` 等其它规则负责。

规则按数组顺序执行；第一条失败的 `message`（或 validator 返回串）作为该字段展示错误。异步校验期间字段可处于 `validating`（P0 最小支持即可）。

---

## 8. 原子控件 API（第一期）

共性：

- 受控 / 非受控双模式（与 `Checkbox` / `Select` / `Pagination` 一致）。
- React：`onChange` / `onBlur`（Switch 对齐 Checkbox 用 `onCheckedChange`）。
- Vue：`modelValue` + `update:modelValue`，以及 `blur`。
- `disabled`、`id`、`className`/`class`；可被 FormItem 注入。

| 组件 | 值类型 | 关键 props | 分期 |
|------|--------|-----------|------|
| `Input` | `string` | `type`: `text` \| `password` \| `search`；`placeholder`；`clearable`；`maxLength` | P1 |
| `InputNumber` | `number \| null` | `min` / `max` / `step`；`precision`；步进按钮；空值为 `null` | P1 |
| `Textarea` | `string` | `rows`；`maxLength`；可选 `showCount` | P1 |
| `Radio` + `RadioGroup` | 组值为 `string` | Group：`options` 或子 `Radio`；`orientation` | P2 |
| `Switch` | `boolean` | `checked` / `defaultChecked`；`onCheckedChange` | P2 |

**已有控件接入（P2 Story）**：`Select`、`Checkbox` 经 FormItem 公开 API 接线，不修改其私有实现来迁就 Form。

---

## 9. 无障碍

- FormItem 错误区与控件通过 `aria-invalid`、`aria-describedby` 关联。
- `label` 与控件 `id` 正确关联（`<label htmlFor>` 或包裹策略在实现中统一）。
- RadioGroup 使用适当 `role` / `aria-labelledby`（与现有 Tabs 无障碍风格一致）。
- 必填星号对读屏提供可读提示（如 `sr-only`「必填」），不只靠颜色。

---

## 10. 测试策略

| 层 | 内容 |
|----|------|
| `form-core` | 注册、设值、reset、blur/submit 触发、内置规则、异步 validator、错误聚合 |
| 原子控件 | 受控/非受控、交互、禁用；双端镜像 |
| Form 集成 | 填值 → blur 出错 → 修正 → submit 触发 `onFinish`；失败走 `onFinishFailed`；双端镜像 |

---

## 11. 与 VirtualGrid 的关系

- VirtualGrid roadmap 中「完整 Input」依赖可并入本体系 **P1 `Input`**，避免另做半成品。
- 表格单元格编辑（VirtualGrid P5）只消费 Input 等公开 API，不内嵌 Form 半成品。
- 本 Form 体系 **不阻塞** VirtualGrid P2–P4；仅 P5 编辑强依赖 Input 类控件。

---

## 12. 完成定义（整项）

- P0–P2 子计划全部完成：`form-core` 可构建可测；双端导出 Form/FormItem 与全部第一期原子控件。
- Storybook React/Vue 可演示：基础表单、校验失败/成功、horizontal/vertical 布局、Checkbox/Select 接入。
- 无障碍约定 §9 在组件测试或 Story 中有覆盖证据。

---

## 13. 文档与执行约定

- 本文件为设计规格；执行索引见 [`2026-07-13-form-roadmap.md`](../plans/2026-07-13-form-roadmap.md)。
- 每个分期另写带 TDD checkbox 的详细 plan；agent 完成自动化步骤可勾选，**Storybook 目视确认与 `git commit` 须用户明确要求后再勾/执行**。
