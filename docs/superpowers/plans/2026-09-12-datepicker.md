# DatePicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 双端交付独立 `DatePicker`：只读输入、月历弹层、`YYYY-MM-DD` 受控/非受控、清除与 min/max。

**Architecture:** 日历网格与 ISO 日期纯函数放 `@component-ai/form-core`。React / Vue 只做 Input + Button 胶水与弹层。`Input` 补 `readOnly`。不新开 core 包。

**Tech Stack:** TypeScript、React 19、Vue 3.5 TSX、Vitest、Testing Library / Vue Test Utils、Tailwind v4

**规格来源:** [`docs/superpowers/specs/2026-09-12-datepicker-design.md`](../specs/2026-09-12-datepicker-design.md)

## Global Constraints

- 值是 `YYYY-MM-DD` 字符串，未选为 `""`
- 受控优先：`valueProp ?? uncontrolled`（Vue：`modelValue ?? internal`）
- 变更一律回调，不管受控与否
- Vue：`defineComponent` + TSX；`PropType`；`emits` + `emit`
- 只消费已导出的 `Input`、`Button`；禁止自绘冒充依赖件
- 周起始周一；默认中文文案
- TDD：RED 再 GREEN；agent 可勾选自动化步骤；勿勾选 Storybook 目视与 git commit

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/form-core/src/date.ts` | ISO 解析/格式化、月历网格 |
| `packages/form-core/src/date.test.ts` | core 测试 |
| `packages/form-core/src/index.ts` | 导出日期 API |
| `packages/react-ui/src/components/Input.tsx` | 增加 `readOnly` |
| `packages/vue-ui/src/components/Input.tsx` | 增加 `readOnly` |
| `packages/react-ui/src/components/DatePicker.tsx` | React DatePicker |
| `packages/react-ui/src/components/DatePicker.test.tsx` | React 测试 |
| `packages/react-ui/src/components/DatePicker.stories.tsx` | React Story |
| `packages/vue-ui/src/components/DatePicker.tsx` | Vue DatePicker |
| `packages/vue-ui/src/components/DatePicker.test.tsx` | Vue 测试 |
| `packages/vue-ui/src/components/DatePicker.stories.tsx` | Vue Story |
| `packages/*/src/index.ts` | 导出 `DatePicker` |
| `AGENTS.md` / Form roadmap | 登记组件 |

---

### Task 1: form-core 日期纯函数

**Files:**
- Create: `packages/form-core/src/date.ts`
- Create: `packages/form-core/src/date.test.ts`
- Modify: `packages/form-core/src/index.ts`

**Produces:** `parseIsoDate`, `formatIsoDate`, `addMonths`, `isDateInRange`, `buildMonthGrid`, types `CalendarCell`, `CalendarGrid`

- [x] **Step 1: 写失败测试**

RED: `Cannot find module './date'`

```ts
import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  formatIsoDate,
  parseIsoDate,
} from "./date";

describe("date helpers", () => {
  it("parses and formats local ISO dates", () => {
    expect(parseIsoDate("2026-09-12")?.getFullYear()).toBe(2026);
    expect(parseIsoDate("2026-09-12")?.getMonth()).toBe(8);
    expect(parseIsoDate("2026-09-12")?.getDate()).toBe(12);
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("nope")).toBeNull();
    expect(formatIsoDate(new Date(2026, 8, 12))).toBe("2026-09-12");
  });

  it("builds a Monday-start September 2026 grid", () => {
    const grid = buildMonthGrid(2026, 9);
    expect(grid.year).toBe(2026);
    expect(grid.month).toBe(9);
    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks[0]).toHaveLength(7);
    expect(grid.weeks[0][0]).toMatchObject({
      iso: "2026-08-31",
      day: 31,
      inMonth: false,
      disabled: false,
    });
    expect(grid.weeks[0][1]).toMatchObject({
      iso: "2026-09-01",
      day: 1,
      inMonth: true,
    });
  });

  it("disables cells outside min/max and adds months across years", () => {
    const grid = buildMonthGrid(2026, 9, {
      minDate: "2026-09-10",
      maxDate: "2026-09-20",
    });
    const flat = grid.weeks.flat();
    expect(flat.find((c) => c.iso === "2026-09-09")?.disabled).toBe(true);
    expect(flat.find((c) => c.iso === "2026-09-10")?.disabled).toBe(false);
    expect(flat.find((c) => c.iso === "2026-09-21")?.disabled).toBe(true);
    expect(formatIsoDate(addMonths(new Date(2026, 11, 15), 1))).toBe(
      "2027-01-15",
    );
  });
});
```

- [x] **Step 2: 跑测试确认 RED**

Run: `npm run test -w @component-ai/form-core -- src/date.test.ts`  
Expected: FAIL（模块不存在）— 已确认

- [x] **Step 3: 实现 date.ts 并导出**

- [x] **Step 4: 跑测试确认 GREEN**

Run: `npm run test -w @component-ai/form-core -- src/date.test.ts`  
GREEN: 3 passed

---

### Task 2: Input `readOnly` + React DatePicker

**Files:**
- Modify: `packages/react-ui/src/components/Input.tsx`
- Modify: `packages/react-ui/src/components/Input.test.tsx`
- Create: `packages/react-ui/src/components/DatePicker.test.tsx`
- Create: `packages/react-ui/src/components/DatePicker.tsx`
- Create: `packages/react-ui/src/components/DatePicker.stories.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: Input readOnly 失败测试 + DatePicker 失败测试**
- [x] **Step 2: RED**（DatePicker 模块不存在；Input 无 readonly）
- [x] **Step 3: 实现 Input.readOnly 与 DatePicker**
- [x] **Step 4: GREEN** `npm run test -w @component-ai/react-ui -- src/components/DatePicker.test.tsx src/components/Input.test.tsx` — 13 passed

DatePicker 必须：`Input` `readOnly` + `clearable`；月导航与「今天」用 `Button`；面板 `role="dialog"` `aria-label="日期选择"`；日按钮 `aria-label` 为 ISO。

---

### Task 3: Vue Input `readOnly` + DatePicker

**Files:** 镜像 Task 2 的 vue-ui 路径。

- [x] **Step 1–4:** 与 React 行为镜像（`modelValue` / `update:modelValue` / `blur`）— Vue DatePicker + Input 13 passed

---

### Task 4: 文档与构建

- [x] 更新 `AGENTS.md` 组件表与 Form roadmap
- [x] `npm run build -w @component-ai/form-core`、`build:react`、`build:vue`（exit 0）

## Self-review

- Spec §4–7 均有对应任务。
- 无 TBD。类型名与 Task 1 `Produces` 一致。
