# VirtualGrid 迁移 — 设计规格（Design Spec）

**日期**：2026-07-09  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**源工程**：`farris-vue`（分支 `virtual-grid`）`packages/ui-vue/components/virtual-grid`  
**目标工程**：`super-component`（`@component-ai/react-ui`、`@component-ai/vue-ui`）

---

## 1. 背景与目标

将 Farris Vue 的 **VirtualGrid（高性能表格）** 迁移到 `component-ai` monorepo，并在 **React** 与 **Vue** 两端实现。行为与能力对齐源组件文档中的全部场景；视觉采用目标库 **Tailwind 新皮肤**，不追求与 Farris 外观一致。

**成功标准**

- 源文档 `packages/ui-vue/docs/components/virtual-grid` 中每个 demo 场景，在 React / Vue Storybook 各有对应 story。
- 同场景下双端交互结果一致（选中、分页、展开、合并、树等）。
- API **语义**对齐源能力；命名与受控模式跟从目标库习惯（对齐现有 Tabs / Select）。
- 表格依赖的基础组件（Pagination、Checkbox、Input 等）先作为 **完整、可独立使用的库组件** 落地，再接到 VirtualGrid。

---

## 2. 非目标（本期不做）

- 像素级复刻 Farris CSS / 资源图。
- 把依赖件做成「只够表格凑合」的半成品 UI。
- 完整表单体系、主题系统、国际化方案（可用中文默认文案，后续替换）。
- 独立性能压测平台 / 大数据基准套件（可另开变更）。

---

## 3. 架构选型

采用 **共享核心 + 双端薄适配**：

| 包 | 职责 |
|----|------|
| `@component-ai/grid-core` | 纯 TypeScript：虚拟窗口、树扁平化、合并/分组计算、选中状态机、分页切片等；无 React/Vue/DOM |
| `@component-ai/react-ui` | React 渲染层 + Tailwind；导出 VirtualGrid 及依赖基础件 |
| `@component-ai/vue-ui` | Vue 渲染层 + Tailwind；同上 |

**不采用**：Vue 先迁再镜像、或双端各自完整实现无共享逻辑（全量能力下易漂移、维护成本高）。

---

## 4. 包结构与目录约定

与现有 Tabs 一致：

- 组件源码：`packages/*/src/components/`（VirtualGrid 可分子目录）
- Stories：同目录 `*.stories.tsx`
- grid-core：`packages/grid-core/src/...`，由两 UI 包依赖
- 设计 / 计划文档：`docs/superpowers/specs/`、`docs/superpowers/plans/`

根 `package.json` workspaces 已含 `packages/*`；新增 `grid-core` 后纳入同一 workspace 构建。

---

## 5. 依赖件策略（硬约束）

VirtualGrid 所需的 **Pagination、Checkbox、Input**（及实现过程中确认还缺的同类基础件）：

1. 先在 `react-ui` / `vue-ui` 作为 **完整库组件** 交付：公开 API、Storybook、双端行为对齐、组件级测试。
2. 再由 VirtualGrid **只消费其公开 API** 接线。
3. 禁止在表格内部塞未导出的半成品控件冒充依赖件。

依赖件自身的详细 API 可在各自 design / plan 中展开；本 spec 约束其与表格的关系与完成度门槛。

---

## 6. 能力清单与分期（全量对齐）

| 批次 | 能力 | 前置 |
|------|------|------|
| **P0** | 基础表：列配置、数据、表头、边框/斑马纹、序号、空状态、固定行高 | grid-core 行/列模型 |
| **P0** | 纵向虚拟滚动（对齐源 `virtual` / `enableVirtual` 语义） | grid-core 虚拟窗口 |
| **P1** | 多选/单选、`selectedKeys`、全选、级联（树用） | **完整 Checkbox** |
| **P1** | 分页（本地切片 + 变更事件） | **完整 Pagination** |
| **P2** | 列模板 / 单元格模板（render / slot） | — |
| **P2** | 自动行高、固定列 | layout 测量 |
| **P3** | 表头分组、数据分组 | grid-core group |
| **P3** | 合并单元格（`spanMethod`；开启后关闭纵向虚拟） | grid-core span |
| **P4** | 树形、异步 `loadData`、树多选 | tree flatten |
| **P4** | 行扩展（expandable） | — |
| **P5** | 单元格编辑、行编辑 | **完整 Input**（及必要编辑器） |
| **P5** | 远端加载 / 分页远端 | Pagination + 事件契约 |

源文档场景对照（Storybook 必须覆盖）：basic、stripe、auto-height、column-template、cell-template、merge-cells、page、remote、edit、row-edit、selection、virtual、head-group、group-data、tree、tree-selection、load-async、expand-row；以及 demos 中存在的 fixed、show-row-number、page-remote 等。

---

## 7. `@component-ai/grid-core` 边界

**放入 core**

- 类型契约：`Column`、`RowMeta`、`SpanResult`、`GroupByConfig`、`SelectionMode` 等
- 虚拟窗口：由 `scrollTop` / 视口高 / 行高（或行高 map）计算可见区间与 spacer
- 树：扁平化、展开/折叠、父子级联选中所需的 id 关系
- 分组 / 合并：`groupBy` 行生成；`spanMethod` 结果规范化；「配置 span 则关闭纵向虚拟」规则
- 分页切片：本地 `pageIndex` / `pageSize` → 当前页数据
- 选中状态机：单选/多选、全选、indeterminate、`selectedKeys` 更新纯函数

**不放入 core**

- DOM、滚动监听、框架组件、JSX、CSS / Tailwind
- Pagination / Checkbox / Input 的 UI

---

## 8. 双端 API 形状

**原则**

- 能力同构；行为以 core 为准。
- 命名跟框架：
  - React：`value` / `defaultValue` / `onXChange`
  - Vue：`modelValue` / `v-model:*` / `update:modelValue`
- 模板扩展：
  - React：`renderCell` / `renderHeader` / `columns[].render`
  - Vue：slot（如 `#cell`、`#header`）或等价 render；文档维护映射表
- 列定义以 `columns` prop 为主。源 Vue 的 `VirtualGridColumn` 子组件若保留，仅作 Vue 声明式糖；React 不强制镜像。

**与源 props 的语义映射（实现 plan 中细化表）**

源侧主要能力面：`columns`、`data`、`selection`、`showRowNumber`、`idField`、`selectedKeys`、`bordered`、`stripe`、`virtual` / `enableVirtual`、`pagination`、`rowHeight`、`autoHeight`、`rowOption`、`cascadeParent` / `cascadeChild`、`loadData`、`showHeader`、`groupBy`、`expandable`、`spanMethod` 等——目标库用等价语义暴露，不要求 prop 名与 Farris 字面一一相同，但须在文档中给出对照表。

---

## 9. 数据流

```text
props (data / columns / selection / pagination / tree…)
        │
        ▼
   grid-core（派生：pageData / flatRows / window / spans / selection）
        │
        ▼
   UI 层（React / Vue）渲染 header + body + 依赖件
        │
        ▼
   用户交互 → 回调 / v-model → 宿主更新 props（或内部非受控状态）
```

- **受控优先**：`data`、`selectedKeys`、分页页码等可由宿主完全控制；未传时组件内维护非受控默认（与 Tabs/Select 一致）。
- **派生不回写 raw**：core 不改写入参数组引用语义；展开/折叠等 UI 状态与 `data` 分离存放。

---

## 10. 错误与边界行为

| 情况 | 行为 |
|------|------|
| `columns` / `data` 为空 | 渲染空表头或空状态，不抛错 |
| `idField` 缺失或不唯一 | 开发环境 `console.warn`；文档标明唯一 id 约束 |
| 配置了 `spanMethod` | 自动关闭纵向虚拟滚动（与源一致） |
| 树 + 本地分页 | **分页作用于当前可见扁平列表**（含已展开节点）；写死为约定，双端一致 |
| 依赖件缺省受控值 | 走依赖件自身的非受控默认 |

---

## 11. 视觉

- 使用目标库 Tailwind 体系建立 **新的中性表格皮肤**。
- 不迁移 Farris `virtual-grid.css` 与空状态位图作为视觉来源（空状态可用简洁 Tailwind 占位）。
- 与 Button / Select / Tabs 在间距、圆角、边框色、焦点环上保持同一设计语言。

---

## 12. 测试与完成定义

| 层 | 内容 |
|----|------|
| grid-core（Vitest） | 虚拟窗口、树扁平/级联、span、分组、分页切片、选中状态机 — 无 DOM |
| 依赖件（双端 Vitest） | Pagination / Checkbox / Input 完整组件测（交互 + a11y 关键） |
| VirtualGrid（双端 Vitest） | 选中、分页接线、虚拟窗口渲染行数、树展开；模板/slot 冒烟 |
| Storybook | 对齐源文档每个 demo；双端各一份 |
| 手工验收 | 大数据滚动手感、固定列横向滚动、编辑焦点 |

**整项迁移完成定义**

- P0–P5 在双端 Storybook 可演示。
- core + 组件单测通过。
- 所有被表格引用的依赖件均已作为完整库组件导出。

---

## 13. 实现顺序（摘要）

1. 搭建 `@component-ai/grid-core` 包与核心类型 / 纯函数测试。
2. 完整交付 Pagination（双端）→ 再 Checkbox → 再 Input（按编辑批次需要）。
3. VirtualGrid 按 P0→P5 增量接线；每批双端行为对齐后再进入下一批。
4. Storybook 与文档对照表随批次补齐。

详细任务拆解见后续 `docs/superpowers/plans/` 实现计划（writing-plans）。
