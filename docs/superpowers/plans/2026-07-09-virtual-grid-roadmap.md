# VirtualGrid 迁移 · 分计划索引（Roadmap）

> **For agentic workers:** 按表中顺序执行各计划；推荐同一会话用 `subagent-driven-development`，或另开会话用 `executing-plans`。

**总设计:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md)

**工作目录:** `D:\\AMyWork\\code\\super-component` 的 git worktree（见各计划正文）

---

## 使用说明

每个编号计划是一份可独立执行的 writing-plans 产物（含 TDD 步骤）。依赖关系见下表。**包管理 / 命令 / Story 约定**见各计划正文。

---

## 计划索引

| 序号 | 计划文件 | 内容 | 依赖 |
|------|----------|------|------|
| 1 | [`2026-07-09-grid-core.md`](./2026-07-09-grid-core.md) | `@component-ai/grid-core` 虚拟窗口 + 分页切片 + 选中辅助（P0/P1 核心） | 无 |
| 2 | [`2026-07-09-pagination.md`](./2026-07-09-pagination.md) | 双端完整 `Pagination` 组件 | 建议 1 完成后 |
| 3 | [`2026-07-09-checkbox.md`](./2026-07-09-checkbox.md) | 双端完整 `Checkbox` / `CheckboxGroup` | 建议在 VirtualGrid P1 前 |
| 4 | [`2026-07-10-input.md`](./2026-07-10-input.md) | 双端完整 `Input` | VirtualGrid P5 前 |
| 5 | [`2026-07-10-virtual-grid-p0.md`](./2026-07-10-virtual-grid-p0.md) | VirtualGrid 基础表 + 虚拟滚动骨架 | 计划 1 |
| 6 | [`2026-07-10-virtual-grid-p1.md`](./2026-07-10-virtual-grid-p1.md) | 选中 + 分页集成 | 计划 1、2、3、5 |
| 7 | [`2026-07-10-virtual-grid-p2.md`](./2026-07-10-virtual-grid-p2.md) | 固定列与横向滚动 | 计划 5 |
| 8 | *待写* `YYYY-MM-DD-virtual-grid-p3.md` | 分组/合并等高级展示 | 计划 5，可能扩展 grid-core |
| 9 | *待写* `YYYY-MM-DD-virtual-grid-p4.md` | 树形与层级数据 | 计划 5、3，可能扩展 grid-core |
| 10 | *待写* `YYYY-MM-DD-virtual-grid-p5.md` | 单元格编辑等 | 计划 4、2、5 |

**总设计 spec §5 约定：** 依赖组件先作为独立 UI 库组件交付，再接入 VirtualGrid。

---

## grid-core 扩展策略

- **Plan 1** 覆盖 P0/P1 所需的虚拟窗口 / 分页 / 选中辅助
- P2 增加轻量 `computeStickyLayout`（列 `fixed` 偏移）
- P3/P4 若需新算法，另开 **grid-core 扩展计划**（`group` / `span` / `tree`），纯 TS + Vitest

---

## 当前应执行

1. ~~完成 [`2026-07-09-grid-core.md`](./2026-07-09-grid-core.md)~~
2. ~~完成 [`2026-07-09-pagination.md`](./2026-07-09-pagination.md)~~
3. ~~完成 [`2026-07-09-checkbox.md`](./2026-07-09-checkbox.md)~~
4. ~~完成 [`2026-07-10-virtual-grid-p0.md`](./2026-07-10-virtual-grid-p0.md)~~
5. ~~完成 [`2026-07-10-input.md`](./2026-07-10-input.md)~~
6. ~~完成 [`2026-07-10-virtual-grid-p1.md`](./2026-07-10-virtual-grid-p1.md)~~
7. ~~完成 [`2026-07-10-virtual-grid-p2.md`](./2026-07-10-virtual-grid-p2.md)~~
8. 下一优先：VirtualGrid P3（分组/合并）或自动行高详细计划

---

## 完成判定（迁移整体）

对照总设计 §12：P0–P5 Storybook 场景与能力对齐后，再归档本 roadmap 与总设计。
