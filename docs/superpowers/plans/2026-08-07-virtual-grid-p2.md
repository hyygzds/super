# VirtualGrid P2: Templates / Auto Height / Fixed Columns

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 P0/P1 VirtualGrid 上交付列/单元格模板、可变行高虚拟滚动（`autoHeight`）、固定列 + 横向滚动（双端）。

**Architecture:** `grid-core.computeVirtualWindow` 支持可选 `rowHeights`（prefix sum + 二分）；UI 用 ResizeObserver 填缓存。模板仅在 UI 层（React render / Vue slots）。固定列用 sticky + 同一滚动容器内 sticky header。

**规格:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md) §6–§8  
**路线图:** [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md)

---

## API（增量）

### grid-core

- `GridColumn.fixed?: "left" | "right"`
- `VirtualWindowInput.rowHeights?: Array<number | undefined>` — 缺省项用 `rowHeight`

### VirtualGrid UI

| Prop / 扩展 | 说明 |
|-------------|------|
| `autoHeight?: boolean` | 默认 `false`；`true` 时测量行高并（在 virtual 时）传 `rowHeights` |
| `columns[].render` / `renderHeader`（React） | 单元格 / 表头自定义 |
| `renderCell` / `renderHeader`（React 顶层兜底） | 可选 |
| Vue `#cell` / `#cell-{field}` / `#header` / `#header-{field}` | field 具名优先 |
| `columns[].fixed` | sticky 左右；无 width 时默认 120px |

---

## Tasks

### Task 1: grid-core

- [ ] `fixed` on `GridColumn`；`rowHeights` on input；可变高算法 + 测试

### Task 2: React VirtualGrid

- [ ] 模板、autoHeight 测量、sticky 固定列、header 进滚动容器、测试与 Story

### Task 3: Vue VirtualGrid

- [ ] 镜像 Task 2（slots）

### Task 4: Roadmap + verify

- [ ] 更新 roadmap；`npm test` / build

---

## 完成定义

- 双端 Story：`ColumnTemplate`/`CellTemplate`、`AutoHeight`、`FixedColumns`
- 可变行高虚拟与固定行高路径单测通过
- Storybook 目视与 commit 按用户要求
