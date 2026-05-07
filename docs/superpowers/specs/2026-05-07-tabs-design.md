# Tabs 组件 — 设计规格（Design Spec）

**日期**：2026-05-07  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`@component-ai/react-ui`、`@component-ai/vue-ui`

---

## 1. 背景与目标

为组件库增加 **布局 / 导航** 能力中的 **Tabs（标签页）**，支持 **横向与纵向** 两种布局，并与现有 Button、Select 等产品在 **语义、无障碍与 Tailwind 视觉** 上保持一致。

**成功标准**

- 用户在多个视图间 **单选切换**，状态可与宿主表单 / 路由状态同步（受控 / 非受控）。
- **键盘可操作**：方向键、`Home` / `End` 在 Tab 间导航；**自动激活**（焦点落到某 Tab 即切换面板）。
- React 与 Vue 包 **API 与行为对齐**。
- 符合本文 §5 的无障碍约定。

---

## 2. 非目标（本期不做）

- 多选 Tab、树形 / 嵌套 Tab、拖拽排序。
- Tab 栏「更多」折叠、虚拟滚动。
- **懒挂载面板**：默认挂载所有 `TabsPanel` 子树；`lazyMount` 若需要另立二期。
- 完整国际化文案方案（本期可用中文默认 `aria-label`，后续替换）。

---

## 3. 信息架构与复合组件模型

采用 **复合组件（compound components）**：

| 导出名 | DOM / ARIA 职责 |
|--------|------------------|
| `Tabs` | 根容器；持有上下文：`orientation`、当前 `value`、`setValue`、`activationMode`（固定 `automatic`）。 |
| `TabsList` | `role="tablist"`；设置 `aria-orientation`；容纳多个 `TabsTrigger`。 |
| `TabsTrigger` | `role="tab"`；`value`、`disabled`；默认渲染 `button type="button"`。 |
| `TabsPanel` | `role="tabpanel"`；`value` 与某一 Trigger 对应；承载面板内容。 |

**配对规则**：每个 `value` 应 **同时** 存在一个 `TabsTrigger` 与一个 `TabsPanel`。若缺少面板或 Trigger，实现可对开发环境 **告警**（具体实现选型：`console.warn` 或开发断言）；生产行为：**孤立 Trigger 可聚焦但不切换有效面板；孤立 Panel 永不展示**（与当前激活值无关）。

---

## 4. API（React / Vue 对齐）

### 4.1 `Tabs`（根）

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 驱动布局与 `aria-orientation`。 |
| `value` | `string` | — | 受控：当前激活 `value`。 |
| `defaultValue` | `string` | — | 非受控：初始激活项。 |
| React：`onValueChange` | `(value: string) => void` | — | 激活变更回调。 |
| Vue：`modelValue` | `string` | — | 受控；`update:modelValue` 必选对齐；可选额外 `change` 事件与现有组件习惯一致。 |
| `className` / `class` | `string` | — | 根节点样式。 |

**受控判定**：与 Select 一致——React：`value !== undefined` 视为受控（以实现为准写清）；Vue：是否传入 `modelValue` 作为受控（以实现为准）。

**初始值**：若未提供 `defaultValue` / 非受控且无 `modelValue`，选中 **第一个未禁用** 的 Trigger 的 `value`；若全部禁用，则无激活（文档说明「全禁用为退化状态」）。

### 4.2 `TabsList`

| Prop | 说明 |
|------|------|
| `className` / `class` | 可选。 |
| `aria-label` | 可选；默认建议 `"标签页"`（Vue/React 均可覆盖）。 |

**布局**：`horizontal` 时 Tab 条单行排列，允许 **`overflow-x-auto`** 作为唯一溢出策略（不做复杂滚动劫持）。

### 4.3 `TabsTrigger`

| Prop | 说明 |
|------|------|
| `value` | 必填，`string`。 |
| `disabled` | 可选；跳过时跳过键盘焦点与鼠标激活。 |
| `className` / `class` | 可选。 |

### 4.4 `TabsPanel`

| Prop | 说明 |
|------|------|
| `value` | 必填，与对应 Trigger 一致。 |
| `className` / `class` | 可选。 |

---

## 5. 无障碍与键盘

- **`TabsList`**：`aria-orientation="horizontal|vertical"`，与 `orientation` 一致。
- **`TabsTrigger`**：`aria-selected`；选中项 `tabindex="0"`，未选中 `tabindex="-1"`。
- **`TabsPanel`**：`aria-labelledby` 指向对应 Trigger 的稳定 id（根级 `useId` / Vue `useId` 生成前缀）。
- **未激活面板**：使用 `hidden`（或等价），内容不可聚焦。
- **自动激活**：箭头键或 `Home` / `End` 将焦点移到某一 Trigger 时，**立即** `setValue` 为该 Trigger 的 `value`。

**键盘表**

| 场景 | 按键 | 行为 |
|------|------|------|
| 焦点在某一 Trigger | `ArrowLeft` / `ArrowRight`（仅 `horizontal`） | 在 **可用** Trigger 间循环移动焦点并自动激活。 |
| 焦点在某一 Trigger | `ArrowUp` / `ArrowDown`（仅 `vertical`） | 同上。 |
| 焦点在某一 Trigger | `Home` | 焦点到第一个可用 Trigger 并激活。 |
| 焦点在某一 Trigger | `End` | 焦点到最后一个可用 Trigger 并激活。 |

与布局 **正交** 的箭头键（例如在 horizontal 时按 `ArrowUp`）：**不切换 Tab**（避免与页面滚动冲突）。

---

## 6. 视觉（Tailwind）

- **色系**：与 Button / Select 一致，`sky` 表示激活，`slate` 边框与次要文案。
- **横向**：`TabsList` 横向排列；激活 Trigger 使用 **底部边框或下划线** 强调（实现选定一种，两栈一致）。
- **纵向**：根容器 `flex`：**列表列 + 内容列**；激活 Trigger 使用 **左侧边框** 强调（统一左侧，本期不处理 RTL）。
- **禁用**：降低透明度、`pointer-events-none`，与现有禁用按钮观感接近。
- **焦点**：`focus-visible:outline` 与库内现有 ring/outline 约定一致。

样式依赖：使用者必须引入各包 **`style.css`**（与现有文档一致）。

---

## 7. 实现要点（供开发计划引用）

- React：`createContext` + 子组件消费；`useId` 生成 id 前缀。
- Vue：`provide`/`inject` 或等价组合式 API；子组件为 TSX（与现有 vue-ui 一致）或 SFC（若以仓库惯例为准则统一 TSX）。
- **不改变** 本期 Select/Button 的对外 API。
- 新增导出：`Tabs`、`TabsList`、`TabsTrigger`、`TabsPanel`（命名如需微调以实现为准，但须两栈同名）。

---

## 8. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-07 | 初版：brainstorming 确认横向+纵向、复合组件、自动激活后落盘。 |

---

## 9. 自检（spec self-review）

- **占位符**：无 TBD/TODO。
- **一致性**：API、键盘与「自动激活」与上文 brainstorming 结论一致。
- **范围**：单组件族 Tabs；懒挂载与高级溢出列为非目标。
- **歧义**：受控判定以实现为准须在编码时在 README/API 文档再写一句精确规则（React `undefined` vs 空字符串若有区分）。
