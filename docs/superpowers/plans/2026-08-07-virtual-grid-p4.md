# VirtualGrid P4: Tree / Async loadData / Expandable Rows

> **For agentic workers:** Use subagent-driven-development or executing-plans.

**Goal:** 树形数据扁平化与展开/折叠、树多选级联、异步 `loadData`、行扩展（expandable）；双端。

**规格:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md) §6–§10  
**路线图:** [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md)

## Locked decisions

- `tree` 开启后，`data` 为嵌套 `children`（字段名 `childrenField`，默认 `"children"`）。
- 树展开：`expandedKeys` / `defaultExpandedKeys` / `onExpandedKeysChange`（Vue：`update:expandedKeys`）。
- 级联：`cascadeChild`（选父选子孙）、`cascadeParent`（选子更新父 indeterminate/选中）；复用 Checkbox indeterminate。
- `loadData?(row) => Promise<rows>`：展开时尚无子节点时拉取，写入内部 children 缓存。
- 行扩展：`expandable` + `expandedRowKeys` + `renderExpandedRow` / Vue `#expand`；与树展开 keys **分离**。
- 分页作用于**当前可见扁平列表**（含已展开节点），与规格约定一致。

## Tasks

1. grid-core `tree.ts`：flatten / toggleExpand / cascade select helpers + tests  
2. React VirtualGrid wiring + Tree / LoadAsync / ExpandRow stories  
3. Vue mirror  
4. roadmap + verify  
