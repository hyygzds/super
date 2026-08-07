# VirtualGrid P3: Header Groups / Data Groups / Merge Cells

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** 表头分组（`columns[].children`）、数据分组（`groupBy`）、合并单元格（`spanMethod`，关闭纵向虚拟）；双端。

**规格:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md) §6–§10  
**路线图:** [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md)

## Locked decisions

- 表头：`children` 树 → leaf 绑 body；多行 header + colspan
- `groupBy: string | string[]`：始终展开；先分组再对扁平行分页
- `spanMethod` 存在 → 关闭纵向虚拟；单层 CSS grid 定位 span

## Tasks

1. grid-core: `flattenLeafColumns` / `buildHeaderRows` / `buildGroupedRows` / `normalizeSpans` + tests
2. React VirtualGrid + stories/tests
3. Vue mirror
4. roadmap + verify

## Stories

`HeadGroup`、`GroupData`、`MergeCells`
