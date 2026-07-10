# VirtualGrid 迁移 — 实现计划总览（Roadmap）

> **For agentic workers:** 本文件是索引，不是逐步执行清单。按下列子计划顺序执行；每个子计划内使用 `subagent-driven-development` 或 `executing-plans`。

**规格来源:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md)

**仓库根目录:** `D:\AMyWork\code\super-component`（下文命令均相对此根目录）

---

## 为何拆成多份计划

规格覆盖多个可独立交付的子系统。单文件塞进「grid-core + Pagination + Checkbox + Input + VirtualGrid P0–P5」会导致计划不可执行且违反 writing-plans 粒度。每个子计划结束时都应有：**可构建包 / 可跑测试 / 可演示 Story（若适用）**。

---

## 子计划顺序（硬依赖）

| 顺序 | 计划文件 | 交付物 | 阻塞关系 |
|------|----------|--------|----------|
| 1 | [`2026-07-09-grid-core.md`](./2026-07-09-grid-core.md) | `@component-ai/grid-core`：类型 + 虚拟窗口 + 分页切片 + 选中状态机（P0/P1 所需） | 无 |
| 2 | [`2026-07-09-pagination.md`](./2026-07-09-pagination.md) | 双端完整 `Pagination` 组件 | 无（可与 1 并行） |
| 3 | [`2026-07-09-checkbox.md`](./2026-07-09-checkbox.md) | 双端完整 `Checkbox` / `CheckboxGroup` | 建议在 VirtualGrid P1 前 |
| 4 | *待写* `YYYY-MM-DD-input.md` | 双端完整 `Input` | VirtualGrid P5 前 |
| 5 | *待写* `YYYY-MM-DD-virtual-grid-p0.md` | VirtualGrid 基础表 + 虚拟滚动（双端） | 依赖 1 |
| 6 | *待写* `YYYY-MM-DD-virtual-grid-p1.md` | 选中 + 分页接线 | 依赖 1、2、3、5 |
| 7 | *待写* `YYYY-MM-DD-virtual-grid-p2.md` | 模板、自动行高、固定列 | 依赖 5 |
| 8 | *待写* `YYYY-MM-DD-virtual-grid-p3.md` | 表头/数据分组、合并单元格 | 依赖 5；扩展 grid-core |
| 9 | *待写* `YYYY-MM-DD-virtual-grid-p4.md` | 树、异步加载、行扩展 | 依赖 5、3；扩展 grid-core |
| 10 | *待写* `YYYY-MM-DD-virtual-grid-p5.md` | 编辑、远端分页 | 依赖 4、2、5 |

**规则（来自 spec §5）：** 凡表格依赖的 UI 组件，必须先作为完整库组件合入，再写「接到 VirtualGrid」的任务。

---

## grid-core 演进策略

- **Plan 1** 只落地 P0/P1 所需纯函数，避免一次写完树/分组/span。
- P3/P4 子计划开头增加 **grid-core 扩展任务**（`group`、`span`、`tree`），仍保持纯 TS + Vitest。

---

## 当前应执行

1. ~~完成 [`2026-07-09-grid-core.md`](./2026-07-09-grid-core.md)~~
2. ~~完成 [`2026-07-09-pagination.md`](./2026-07-09-pagination.md)~~
3. 执行 [`2026-07-09-checkbox.md`](./2026-07-09-checkbox.md)
4. 其后：VirtualGrid P0 详细计划，或 Input（P5 前）

---

## 完成定义（整项迁移）

见规格 §12：P0–P5 Storybook 双端可演示、单测通过、依赖件均已完整导出。本 roadmap 全部子计划勾选完成即满足。
