# DatePicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `form-core` 落地日历纯函数，并在 React / Vue 交付完整可独立使用的 `DatePicker`（输入 + 月历），修复 issue #15「日期组件不完整」。

**Architecture:** 共享核心 + 双端薄适配。`parseIsoDate` / `buildMonthGrid` / `isIsoDateInRange` 等放 `@component-ai/form-core`；两端 `DatePicker` 只做 Input 接线、弹层与点击。值是 `YYYY-MM-DD` 字符串，不用 `Date` 对象。

**Tech Stack:** TypeScript、Vitest（node / jsdom）、React Testing Library、Vue Test Utils、Tailwind v4、已导出 `Input`

## Global Constraints

- 受控优先：`value` / `modelValue` 有值时不写内部 state；变更一律回调。
- React `onChange` ↔ Vue `update:modelValue`。
- Vue：`defineComponent` + TSX，不用 SFC。
- 只消费已导出 `Input`，不内嵌半成品输入框。
- 禁止新 npm 依赖（无 dayjs / date-fns）。
- TDD：先失败测试，再实现。

**规格：** [`docs/superpowers/specs/2026-09-12-datepicker-design.md`](../specs/2026-09-12-datepicker-design.md)

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/form-core/src/date-calendar.ts` | 日历纯函数 |
| `packages/form-core/src/date-calendar.test.ts` | 纯函数测试 |
| `packages/form-core/src/index.ts` | 导出 |
| `packages/react-ui/src/components/DatePicker.tsx` | React DatePicker |
| `packages/react-ui/src/components/DatePicker.test.tsx` | React 测试 |
| `packages/react-ui/src/components/DatePicker.stories.tsx` | React Story |
| `packages/vue-ui/src/components/DatePicker.tsx` | Vue DatePicker |
| `packages/vue-ui/src/components/DatePicker.test.tsx` | Vue 测试 |
| `packages/vue-ui/src/components/DatePicker.stories.tsx` | Vue Story |
| `packages/*/src/index.ts` | 导出组件 |
| `docs/superpowers/plans/2026-07-13-form-roadmap.md` | 增加 DatePicker 指针 |

---

### Task 1: form-core 日历算法

**Files:**
- Create: `packages/form-core/src/date-calendar.test.ts`
- Create: `packages/form-core/src/date-calendar.ts`
- Modify: `packages/form-core/src/index.ts`

- [x] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  compareIsoDate,
  daysInMonth,
  formatIsoDate,
  isIsoDateInRange,
  isValidIsoDate,
  parseIsoDate,
  todayIso,
  visibleMonthFromValue,
} from "./date-calendar";

describe("date-calendar", () => {
  it("parses and formats valid ISO dates", () => {
    expect(parseIsoDate("2026-03-15")).toEqual({ y: 2026, m: 3, d: 15 });
    expect(formatIsoDate({ y: 2026, m: 3, d: 15 })).toBe("2026-03-15");
    expect(isValidIsoDate("2026-03-15")).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseIsoDate("2026-2-1")).toBeNull();
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(isValidIsoDate("not-a-date")).toBe(false);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it("builds a 42-cell Sunday-start grid for January 2026", () => {
    const cells = buildMonthGrid(2026, 1);
    expect(cells).toHaveLength(42);
    expect(cells[0]).toMatchObject({
      iso: "2025-12-28",
      day: 28,
      inCurrentMonth: false,
    });
    expect(cells[4]).toMatchObject({
      iso: "2026-01-01",
      day: 1,
      inCurrentMonth: true,
    });
    expect(cells[41].iso).toBe("2026-02-07");
  });

  it("marks cells outside min/max as disabled", () => {
    const cells = buildMonthGrid(2026, 3, {
      min: "2026-03-10",
      max: "2026-03-20",
    });
    expect(cells.find((c) => c.iso === "2026-03-09")?.disabled).toBe(true);
    expect(cells.find((c) => c.iso === "2026-03-10")?.disabled).toBe(false);
    expect(cells.find((c) => c.iso === "2026-03-21")?.disabled).toBe(true);
  });

  it("compares and clamps ISO dates in range", () => {
    expect(compareIsoDate("2026-01-02", "2026-01-01")).toBe(1);
    expect(isIsoDateInRange("2026-03-15", "2026-03-10", "2026-03-20")).toBe(true);
    expect(isIsoDateInRange("2026-03-09", "2026-03-10")).toBe(false);
  });

  it("adds months across year boundaries and clamps the day", () => {
    expect(addMonths({ y: 2026, m: 1, d: 31 }, 1)).toEqual({
      y: 2026,
      m: 2,
      d: 28,
    });
    expect(addMonths({ y: 2025, m: 12, d: 15 }, 1)).toEqual({
      y: 2026,
      m: 1,
      d: 15,
    });
  });

  it("derives visible month from value or today", () => {
    expect(visibleMonthFromValue("2024-07-04")).toEqual({ y: 2024, m: 7 });
    expect(todayIso(new Date(2026, 8, 12))).toBe("2026-09-12");
    expect(visibleMonthFromValue("", new Date(2026, 8, 12))).toEqual({
      y: 2026,
      m: 9,
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test -w @component-ai/form-core -- src/date-calendar.test.ts`  
RED: `Cannot find module './date-calendar'`

- [x] **Step 3: Implement `date-calendar.ts` and export from `index.ts`**

- [x] **Step 4: Run tests and make sure they pass**

Run: `npm run test -w @component-ai/form-core -- src/date-calendar.test.ts`  
GREEN: 7 passed

---

### Task 2: React DatePicker

**Files:**
- Create: `packages/react-ui/src/components/DatePicker.test.tsx`
- Create: `packages/react-ui/src/components/DatePicker.tsx`
- Create: `packages/react-ui/src/components/DatePicker.stories.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: Write failing React tests**

覆盖：非受控展示 `defaultValue`；点「打开日历」后点 15 日提交 `2026-03-15` 并关层；受控 `value` 不内部翻转；`min`/`max` 禁选；`disabled` 不能开层；`clearable` 清空；「今天」提交本地当天。

- [x] **Step 2: Run to verify RED**

Run: `npm run test -w @component-ai/react-ui -- src/components/DatePicker.test.tsx`  
RED: Failed to resolve import `./DatePicker`

- [x] **Step 3: Implement React DatePicker using `Input` + form-core helpers**

- [x] **Step 4: GREEN + stories `Basic` / `Controlled` / `MinMax` / `Disabled` + export**

GREEN: 6 passed

---

### Task 3: Vue DatePicker

**Files:**
- Create: `packages/vue-ui/src/components/DatePicker.test.tsx`
- Create: `packages/vue-ui/src/components/DatePicker.tsx`
- Create: `packages/vue-ui/src/components/DatePicker.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [x] **Step 1: Write failing Vue tests mirroring React (`modelValue` / `update:modelValue`)**

- [x] **Step 2: RED then implement `defineComponent` + TSX**

RED: Failed to resolve import `./DatePicker`

- [x] **Step 3: GREEN + stories + export**

GREEN: 7 passed

---

### Task 4: Roadmap 指针与构建

- [x] 在 `2026-07-13-form-roadmap.md` 增加 DatePicker 独立后续项（已完成指针）
- [x] `npm run test -w @component-ai/form-core` — 4 files / 34 tests passed
- [x] `npm run test -w @component-ai/react-ui -- src/components/DatePicker.test.tsx` — 6 passed
- [x] `npm run test -w @component-ai/vue-ui -- src/components/DatePicker.test.tsx` — 7 passed
- [x] `npm run build -w @component-ai/form-core` — built
- [x] `npm run build -w @component-ai/react-ui` — built（既有 VirtualGrid/grid-core dts 噪音，非本变更）
- [x] `npm run build -w @component-ai/vue-ui` — built（同上）

---

## Self-review

1. Spec coverage：值模式、月历、min/max、清除、今天、Input 复用、非目标均有任务。
2. 无 TBD /「类似 Task N」。
3. 类型：`string` 空值为 `""`；Vue 事件名为 `update:modelValue`。
