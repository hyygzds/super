# Form 体系 — 实现计划总览（Roadmap）

> **For agentic workers:** 本文件是索引，不是逐步执行清单。按下列子计划顺序执行；每个子计划内使用 `subagent-driven-development` 或 `executing-plans`。写子计划前若尚未有详细 plan，先用 `writing-plans` 基于规格生成。

**规格来源:** [`docs/superpowers/specs/2026-07-13-form-system-design.md`](../specs/2026-07-13-form-system-design.md)

**仓库根目录:** `D:\AMyWork\code\super-component`（下文命令均相对此根目录）

---

## 为何拆成多份计划

规格覆盖「共享 form-core + Form/FormItem + 多个原子控件」。单文件塞进全部实现会导致计划不可执行。每个子计划结束时都应有：**可构建包 / 可跑测试 / 可演示 Story（若适用）**。

---

## 子计划顺序（硬依赖）

| 顺序 | 计划文件 | 交付物 | 阻塞关系 |
|------|----------|--------|----------|
| 1 | [`2026-07-13-form-core-and-form.md`](./2026-07-13-form-core-and-form.md) | `@component-ai/form-core` + 双端 `Form` / `FormItem`（P0） | 无 |
| 2 | *待写* `YYYY-MM-DD-input-controls.md` | 双端 `Input` / `InputNumber` / `Textarea`（P1） | 建议在 Form 接线 Story 前；可与 1 部分并行，但完整 Form demo 依赖本项 |
| 3 | *待写* `YYYY-MM-DD-choice-controls.md` | 双端 `Radio`/`RadioGroup` / `Switch` + Checkbox/Select 接入 Story（P2） | 依赖 1；控件本身可不依赖 Form，接入 Story 依赖 1 |

**规则（来自 spec §5）：** 原子控件必须先作为完整库组件合入；Form 只消费公开 API。P0 可用原生 input 验证接线，P1 起 Story 改用库组件。

---

## form-core 演进策略

- **Plan 1（P0）** 一次落地：字段注册、rules runner（含异步 validator）、blur/submit 触发、命令式 API 所需 store 方法。
- 嵌套路径、schema 引擎等不在本 roadmap；若需要另开规格。

---

## 当前应执行

1. 执行 [`2026-07-13-form-core-and-form.md`](./2026-07-13-form-core-and-form.md)（P0）
2. 再用 `writing-plans` 编写并执行 P1 输入控件计划
3. 再写 P2 选择类控件 + 接入 Story

---

## 与 VirtualGrid roadmap 的交叉

- VirtualGrid 所需「完整 Input」由本体系 **P1** 交付，见 [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md) 中 Input 行。
- VirtualGrid P5（编辑）依赖本体系 Input 类控件公开 API。

---

## 完成定义（整项）

见规格 §12：P0–P2 全部完成、双端可演示、单测通过、依赖件均已完整导出。本 roadmap 全部子计划勾选完成即满足。
