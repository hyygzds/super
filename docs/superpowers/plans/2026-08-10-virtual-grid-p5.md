# VirtualGrid P5: Cell/Row Edit + Remote Pagination

> **For agentic workers:** Use subagent-driven-development or executing-plans.

**Goal:** 单元格编辑、行编辑（消费完整 `Input`）、远端分页/加载；双端。

**规格:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md) §6  
**路线图:** [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md)  
**前置:** Form P1 `Input` 已交付。

## Locked decisions

### Editing

- `editMode?: "cell" | "row"`（默认 `"cell"`）；需 `editable` 或列 `editable`。
- 列扩展：`editable?: boolean`（默认跟随表级 `editable`）。
- **单元格编辑：** 双击可编辑单元格 → 内嵌 `Input`；Enter/blur 提交，Esc 取消。
- **行编辑：** `editingRowKey` / `defaultEditingRowKey`；该行可编辑列全部为 Input；提供「保存」「取消」（首列或操作区）。
- 事件：`onCellChange({ rowKey, field, value, row })`；行模式另有 `onRowSave(row)` / `onRowCancel(rowKey)`。
- 编辑态与树展开 keys 分离；`spanMethod` 开启时仍可编辑可见叶单元格。

### Remote pagination

- `remote?: boolean`（默认 `false`）：为 true 时**不做本地 `slicePage`**，`data` 即当前页。
- `total?: number`：远端总条数，传给 Pagination；缺省时用 `data.length`。
- `loading?: boolean`：表体上方/遮罩轻量 loading 文案。
- 沿用 `page` / `pageSize` / `onPageChange` / `onPageSizeChange`；宿主负责拉数。

## Stories

`EditCell`、`EditRow`、`RemotePagination`（双端）

## Tasks

1. React VirtualGrid + tests/stories  
2. Vue mirror  
3. roadmap + verify + push  
