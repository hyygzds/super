# VirtualGrid P1 — 设计规格（Design Spec）

**日期**：2026-07-10  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`@component-ai/react-ui`、`@component-ai/vue-ui`、`@component-ai/grid-core`  
**总规格**：[`2026-07-09-virtual-grid-migration-design.md`](./2026-07-09-virtual-grid-migration-design.md)  
**前置**：[`2026-07-10-virtual-grid-p0-design.md`](./2026-07-10-virtual-grid-p0-design.md)  
**依赖件**：已交付的完整 `Checkbox`、`Pagination`  
**路线图**：[`../plans/2026-07-09-virtual-grid-roadmap.md`](../plans/2026-07-09-virtual-grid-roadmap.md)

---

## 1. 背景与目标

交付 VirtualGrid 迁移的 **P1**：在 P0 基础表之上接线 **行选中（单选/多选 + 全选）** 与 **分页（本地切片 + 远端）**，双端行为对齐，视觉沿用 Tailwind 新皮肤。

**成功标准**

- `selectionMode` 支持 `none` / `single` / `multiple`；受控/非受控 `selectedKeys`。
- 多选时表头 Checkbox 全选/半选；单选无表头全选。
- `pagination` 开启后底部使用公开 `Pagination`；`paginationMode: 'local' | 'remote'`。
- 本地：对 `data` 切片；远端：不切片，翻页/改 pageSize 只发事件。
- Vitest + Storybook 覆盖选中与本地/远端分页；**不**做树级联、HYBRID 行点选。

---

## 2. 非目标（本期不做）

- 树形选中级联（`cascadeParent` / `cascadeChild`）——属 P4。
- `HYBRID` 行点击参与选中（源 `SelectionMode.HYBRID`）。
- 行级 `disabled` 选中。
- 固定列、自动行高、分组、合并、编辑。
- 扩展 `grid-core` 新模块（原则上复用现有纯函数即可）。

---

## 3. 架构选型

采用 **UI 内直接接线**（方案 1）：

| 层 | 职责 |
|----|------|
| `grid-core` | 复用 `toggleKey`、`selectAllKeys`、`clearKeys`、`isAllSelected`、`isIndeterminate`、`slicePage` / `normalizePageSlice` |
| `react-ui` / `vue-ui` `VirtualGrid` | 选择列 DOM、全选逻辑、分页派生、挂载公开 `Checkbox` / `Pagination` |

**不采用**：为本期单独扩大量 core API；拆出独立公开子组件（`VirtualGridSelectionColumn` 等）。

```text
props: data / selectedKeys / selectionMode / page / pageSize / paginationMode / total …
        │
        ▼
  派生行集
  · local：slicePage(data) → pageRows；全选 scope = 整表 data 的 id
  · remote：pageRows = data；全选 scope = 当前 data 的 id；total 由宿主传入
        │
        ▼
  VirtualGrid UI
  · 可选选择列（表头 + 行 Checkbox）
  · 表体：P0 渲染（enableVirtual 作用于 pageRows）
  · 底栏：Pagination（pagination === true）
        │
        ▼
  onSelectedKeysChange / onPageChange / onPageSizeChange
```

---

## 4. API（React / Vue 对齐）

在 P0 API 之上新增。命名跟从目标库习惯（扁平 props，非 Farris `selection` / `pagination` 对象）。

### 4.1 选中

| 概念 | React | Vue | 默认 / 说明 |
|------|-------|-----|-------------|
| 模式 | `selectionMode?: 'none' \| 'single' \| 'multiple'` | 同 | `'none'` |
| 受控选中 | `selectedKeys?: string[]` | 同；`v-model:selectedKeys` | — |
| 非受控 | `defaultSelectedKeys?: string[]` | 同 | `[]` |
| 变更 | `onSelectedKeysChange?: (keys: string[]) => void` | `update:selectedKeys` | — |

**行为写死**

- `selectionMode !== 'none'` 时在**序号列之前**渲染选择列。
- **multiple**：行 Checkbox + 表头全选/半选。
  - 全选 scope：**local** = 整表 `data` 的 id；**remote**（或未开分页）= 当前 `data` 的 id。
  - 已全选或半选时再点表头 → `clearKeys()`（清空全部 `selectedKeys`，不只清当前页）。
- **single**：仅行 Checkbox，无表头全选；再点已选项可取消（与 `toggleKey(..., false)` 一致）。
- 翻页**不清除** `selectedKeys`。
- 点击 Checkbox **不**冒泡触发 `onRowClick` / `rowClick`（P1 无 HYBRID）。

### 4.2 分页

| 概念 | React | Vue | 默认 / 说明 |
|------|-------|-----|-------------|
| 开关 | `pagination?: boolean` | 同 | `false` |
| 模式 | `paginationMode?: 'local' \| 'remote'` | 同 | `'local'`（仅 `pagination === true` 时有意义） |
| 页码 | `page?` / `defaultPage?` / `onPageChange` | `page` / `defaultPage` / `update:page` | 默认页 `1` |
| 每页条数 | `pageSize?` / `defaultPageSize?` / `onPageSizeChange` | 同 + `update:pageSize` | 默认 `10` |
| 总数 | `total?: number` | 同 | local：`data.length`；remote：宿主必填语义 |
| 选项 | `pageSizeOptions?: number[]` | 同 | 默认透传 Pagination `[10, 20, 50]` |

**行为写死**

1. `pagination === false`：`pageRows = data`；不渲染底栏。
2. `paginationMode: 'local'`：`pageRows = slicePage(data, page, pageSize)`；`Pagination.total = data.length`。
3. `paginationMode: 'remote'`：不切片，`pageRows = data`；翻页/改 pageSize **只发事件**，由宿主更换 `data`；`Pagination.total = total`（缺省时开发环境 `console.warn`，回退 `data.length`）。
4. 改 `pageSize` 时页码归一到 `1`（与独立 `Pagination` 一致）。
5. 虚拟滚动（若开启）只基于 `pageRows`。

### 4.3 与源 props 对照（摘要）

| 源（Farris） | 目标 |
|--------------|------|
| `selection.mode` / `multiple` / `showCheckbox` | `selectionMode` |
| `selection.selectedKeys` / `onSelectionUpdate` | `selectedKeys` / `onSelectedKeysChange` |
| `selection` HYBRID / Ctrl 多选 | **不做** |
| `pagination` 对象 / boolean | `pagination` + 扁平 `page` / `pageSize` / `paginationMode` |
| 本地 page demo | `pagination` + `paginationMode: 'local'` |
| page-remote demo | `pagination` + `paginationMode: 'remote'` + 受控 `page`/`total`/`data` |

---

## 5. 布局

```text
VirtualGrid
├── Header
│   ├── 选择列（可选）— 表头 Checkbox（仅 multiple）
│   ├── 序号列（可选，P0）
│   └── 数据列…
├── Body（pageRows；可选 virtual）
│   └── 每行：行 Checkbox | 序号 | 单元格…
└── Footer（pagination === true）
    └── Pagination（公开组件）
```

选择列宽度固定较窄（如 48px），与序号列视觉对齐；实现 plan 写死具体 class。

---

## 6. 错误与边界

| 情况 | 行为 |
|------|------|
| `data` / 选中为空 | 空表；全选为未选 |
| `idField` 缺失或不唯一 | 沿用 P0：开发环境 warn；选中稳定性依赖唯一 id（文档标明） |
| remote 未传 `total` | warn + 回退 `data.length` |
| `selectionMode: 'single'` | 不渲染表头 Checkbox |
| `selectionMode: 'none'` | 不渲染选择列、不处理选中 |
| 与 `onRowClick` | 并存；Checkbox 点击不冒泡触发行点击选中 |

---

## 7. 视觉

- 沿用 P0 表格皮肤 + 已有 Checkbox / Pagination 样式。
- 底栏与表格之间保留小间距（如 `mt-2` / `gap`），不引入新主题色。

---

## 8. 测试与完成定义

| 层 | 内容 |
|----|------|
| Vitest 双端 | 多选 toggle；单选替换/取消；本地全选整表；远端全选当前页；翻页保留 selectedKeys；本地切片行数；远端翻页不切片只回调；改 pageSize 回第 1 页；Checkbox 点击不触发 rowClick |
| Storybook | `Selection`、`SelectionSingle`、`PaginationLocal`、`PaginationRemote`（双端） |
| 手工 | 本地/远端翻页与全选手感（验收清单，不阻塞合入） |

**完成定义**：双端导出更新、测试绿、上述 Story 可演示；只消费公开 Checkbox/Pagination API。

---

## 9. 实现顺序（摘要）

1. React：扩展 VirtualGrid 失败测试 → 实现选中 + 分页接线 → 更新 stories。  
2. Vue：对称实现与测试、stories。  
3. 更新 roadmap：链接 P1 计划；「当前应执行」指向 P1 完成后的下一项（P2 或下一批计划）。

详细任务见后续 `docs/superpowers/plans/2026-07-10-virtual-grid-p1.md`（writing-plans）。
