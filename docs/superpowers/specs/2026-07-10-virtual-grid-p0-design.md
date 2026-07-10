# VirtualGrid P0 — 设计规格（Design Spec）

**日期**：2026-07-10  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`@component-ai/react-ui`、`@component-ai/vue-ui`、`@component-ai/grid-core`  
**总规格**：[`2026-07-09-virtual-grid-migration-design.md`](./2026-07-09-virtual-grid-migration-design.md)  
**路线图**：[`../plans/2026-07-09-virtual-grid-roadmap.md`](../plans/2026-07-09-virtual-grid-roadmap.md)

---

## 1. 背景与目标

交付 VirtualGrid 迁移的 **P0**：可独立使用的基础表格 + 可选纵向虚拟滚动，并在双端提供列/单元格模板能力（原总规格 P2 模板提前纳入本期，便于 Story 与后续扩展）。视觉为 Tailwind 新皮肤，不复刻 Farris CSS。

**成功标准**

- React / Vue 导出 `VirtualGrid`，行为语义对齐。
- 支持列配置、数据、表头、边框/斑马纹、序号、空状态、固定行高。
- `enableVirtual` **默认 `false`**；显式 `true` 时用 `grid-core` 的 `computeVirtualWindow` 做纵向虚拟滚动。
- 支持单元格 / 表头模板（React render、Vue slot）。
- Vitest + Storybook 覆盖 P0 场景；**不**接线 Checkbox / Pagination。

---

## 2. 非目标（本期不做）

- 选中 / Checkbox、分页、固定列、自动行高。
- 树、分组、合并单元格、行扩展、编辑、远端加载。
- 像素级复刻 Farris 外观。
- 将 `VirtualGridColumn` 子组件声明式糖作为 React 必选项（列以 `columns` prop 为主）。

---

## 3. 架构选型

采用 **双端薄 UI + 复用 `@component-ai/grid-core` 虚拟窗口**：

| 层 | 职责 |
|----|------|
| `grid-core` | `computeVirtualWindow`、`GridColumn` 类型（已有）；P0 不新增树/span/group |
| `react-ui` / `vue-ui` | DOM、滚动监听、表头/行渲染、Tailwind、模板桥接 |

**不采用**：仅 Vue 先做再镜像；P0 砍掉模板只做纯文本（与已确认范围不符）。

---

## 4. 组件边界

| 导出名 | 职责 |
|--------|------|
| `VirtualGrid` | 根：可选表头 + 可滚动表体；消费 `computeVirtualWindow` |

列定义以 **`columns` prop** 为主。

---

## 5. API（React / Vue 对齐）

### 5.1 数据与列

| 概念 | React | Vue | 默认 / 说明 |
|------|-------|-----|-------------|
| 数据 | `data: Record<string, unknown>[]`（或 `any[]`） | 同 | 必填语义：可传 `[]` |
| 列 | `columns: GridColumn[]` | 同 | `field`、`title`、`width?`、`hidden?`；可扩展模板字段 |
| 行标识 | `idField?: string` | 同 | 默认 `'id'`；缺失或不唯一时开发环境 `console.warn`，`key` 回退索引 |
| 表头 | `showHeader?: boolean` | 同 | 默认 `true` |
| 边框 | `bordered?: boolean` | 同 | 默认 `true` |
| 斑马纹 | `stripe?: boolean` | 同 | 默认 `false` |
| 序号列 | `showRowNumber?: boolean` | 同 | 默认 `true` |
| 行高 | `rowHeight?: number` | 同 | 默认 `36`（固定行高；单位 px） |
| 虚拟滚动 | `enableVirtual?: boolean` | 同 | **默认 `false`** |
| 样式 | `className?: string` | `class?: string` | — |
| 行点击 | `onRowClick?: (row, index, event) => void` | `rowClick` 事件 | P0 提供，便于 demo |

### 5.2 模板（提前自原 P2）

| 概念 | React | Vue |
|------|-------|-----|
| 单元格 | `columns[].render?: (ctx) => ReactNode`；可选根级 `renderCell` | 作用域 slot `#cell`（`{ row, column, rowIndex }`）；可按 `field` 细分若实现方便 |
| 表头 | `columns[].renderHeader?: (column) => ReactNode`；可选根级 `renderHeader` | `#header`（`{ column }`） |

无模板时：单元格为 `String(row[field] ?? '')`；表头为 `column.title`。

**优先级（写死）**：列级模板 > 根级模板 > 默认文本。

### 5.3 `GridColumn`（与 grid-core 对齐并可扩展）

沿用 `@component-ai/grid-core` 的 `GridColumn`（`field`、`title`、`width?`、`hidden?`、`children?`）。P0 **不渲染** `children` 多级表头（表头分组属 P3）；若传入 `children`，P0 可忽略或仅用叶子列——**写死：P0 只渲染无 `children` 的叶子列；带 `children` 的列在开发环境 warn，不展开**。

UI 包可在本地用交叉类型扩展 `render` / `renderHeader`（React）而不污染 core。

---

## 6. 布局与虚拟滚动

```text
VirtualGrid（宿主需提供可用高度，如固定 height / flex 子项）
├── Header（showHeader）
│   └── 序号列（可选）+ 可见列标题
└── Body（overflow auto）
    ├── spacer：totalHeight（virtual 开：rowCount * rowHeight；关：仍可用内容高度或同等逻辑简化为直接渲染全部行）
    └── 可见行（virtual 开：slice + offsetY；关：全部行）
```

**Virtual 开启时**

1. 读取 body 的 `clientHeight`、`scrollTop`。  
2. 调用 `computeVirtualWindow({ enabled: true, rowCount: data.length, rowHeight, scrollTop, viewportHeight, overscan: 2 })`。  
3. 只挂载 `[startIndex, endIndex)` 行；容器内用 `offsetY` 定位窗口。  

**Virtual 关闭时**

- 渲染全部行；不依赖滚动窗口计算（可不调用或 `enabled: false`）。

**空状态**

- `data.length === 0`：表体显示简洁空状态文案（默认「暂无数据」）；有列时可仍显示表头。

---

## 7. 视觉

- Tailwind；对齐 Button / Checkbox / Pagination 的 slate / sky 体系。  
- 表头浅底、单元格边框随 `bordered`、斑马纹随 `stripe`。  
- 序号列固定较窄宽度（如 56px），右对齐或居中（实现时统一一种并写进 plan）。

---

## 8. 测试与完成定义

| 层 | 内容 |
|----|------|
| Vitest 双端 | 列与单元格文本；`hidden` 不渲染；空状态；`enableVirtual` 下大数据只挂载有限行（可 mock 容器尺寸 / 直接测窗口切片接线）；模板/slot 冒烟；`onRowClick` / `rowClick` |
| Storybook | Basic、Stripe、ShowRowNumber、Empty、Virtual、CellTemplate、HeaderTemplate |
| 手工 | 大数据滚动手感（验收清单，不阻塞合入） |

**完成定义**：双端导出、测试绿、Story 可演示；无 Checkbox/Pagination 接线。

---

## 9. 实现顺序（摘要）

1. 确认 UI 包已依赖 `grid-core`（Pagination 已接入；VirtualGrid 同依赖）。  
2. React：失败测试 → `VirtualGrid` → 导出 → stories。  
3. Vue：对称实现（TSX）→ 导出 → stories。  
4. 更新 roadmap：P0 计划文件链接；「当前应执行」指向 P0 完成后的 P1 或 Input。

详细任务见后续 `docs/superpowers/plans/2026-07-10-virtual-grid-p0.md`（writing-plans）。
