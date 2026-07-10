# VirtualGrid P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 P1 `VirtualGrid` 上交付左/右固定列与横向滚动（CSS sticky），选择列与序号列始终左固定；双端行为对齐。

**Architecture:** `grid-core` 扩展 `GridColumn.fixed` + 纯函数 `computeStickyLayout`（偏移可单测）；React/Vue VirtualGrid 按布局结果对表头/单元格套 `position: sticky` 与 left/right。不拆三栏 DOM；不做 autoHeight。

**Tech Stack:** TypeScript、React 19、Vue 3.5、TSX、Vite 8、Vitest、Testing Library / Vue Test Utils、Tailwind v4、`@component-ai/grid-core`

**规格来源:** [`docs/superpowers/specs/2026-07-10-virtual-grid-p2-design.md`](../specs/2026-07-10-virtual-grid-p2-design.md)  
**工作目录:** `D:\AMyWork\code\super-component\.worktrees\grid-core`（`feature/grid-core`）  
**包管理:** **pnpm** only

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/grid-core/src/types.ts` | `GridColumn.fixed?` |
| `packages/grid-core/src/sticky-layout.ts` | `computeStickyLayout` |
| `packages/grid-core/src/sticky-layout.test.ts` | 偏移单测 |
| `packages/grid-core/src/index.ts` | 导出 |
| `packages/react-ui/src/components/VirtualGrid.tsx` | sticky 接线 |
| `packages/react-ui/src/components/VirtualGrid.test.tsx` | P2 测试 |
| `packages/react-ui/src/components/VirtualGrid.stories.tsx` | Fixed* stories |
| `packages/vue-ui/src/components/VirtualGrid.tsx` | 对称 |
| `packages/vue-ui/src/components/VirtualGrid.test.tsx` | 对称测试 |
| `packages/vue-ui/src/components/VirtualGrid.stories.tsx` | 对称 stories |
| `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md` | 链接本计划 |

**共享约定（写死）**

- 选择列宽 `48`，序号列宽 `56`，数据列默认宽 `120`
- 行内数据列 DOM 顺序：`left-fixed…` → `scrollable…` → `right-fixed…`（同组内保持 columns 相对顺序）
- sticky class：`sticky` + 不透明底；左固定区最右列 `shadow-[2px_0_4px_-2px_rgba(15,23,42,0.12)]`；右固定区最左列 `shadow-[-2px_0_4px_-2px_rgba(15,23,42,0.12)]`
- z-index：表头固定 `z-30`，表体固定 `z-20`，普通 `z-0`
- `data-sticky="left"|"right"` 便于测试查询

---

### Task 1: grid-core — `fixed` 类型 + `computeStickyLayout`

**Files:**
- Modify: `packages/grid-core/src/types.ts`
- Create: `packages/grid-core/src/sticky-layout.ts`
- Create: `packages/grid-core/src/sticky-layout.test.ts`
- Modify: `packages/grid-core/src/index.ts`

- [ ] **Step 1: 失败测试**

```ts
import { describe, expect, it } from "vitest";
import { computeStickyLayout } from "./sticky-layout";

describe("computeStickyLayout", () => {
  it("orders left, scrollable, then right and computes offsets", () => {
    const layout = computeStickyLayout({
      columns: [
        { field: "a", title: "A", width: 100, fixed: "left" },
        { field: "b", title: "B", width: 110 },
        { field: "c", title: "C", width: 120, fixed: "right" },
        { field: "d", title: "D", width: 130, fixed: "left" },
      ],
      showSelection: true,
      showRowNumber: true,
    });

    expect(layout.dataFields).toEqual(["a", "d", "b", "c"]);
    expect(layout.selection?.left).toBe(0);
    expect(layout.rowNumber?.left).toBe(48);
    expect(layout.byField.a).toEqual({
      sticky: "left",
      offset: 48 + 56,
      isEdge: false,
    });
    expect(layout.byField.d).toEqual({
      sticky: "left",
      offset: 48 + 56 + 100,
      isEdge: true,
    });
    expect(layout.byField.b).toEqual({ sticky: false });
    expect(layout.byField.c).toEqual({
      sticky: "right",
      offset: 0,
      isEdge: true,
    });
  });

  it("skips hidden columns", () => {
    const layout = computeStickyLayout({
      columns: [
        { field: "a", title: "A", width: 100, fixed: "left", hidden: true },
        { field: "b", title: "B", width: 110, fixed: "left" },
      ],
      showSelection: false,
      showRowNumber: false,
    });
    expect(layout.dataFields).toEqual(["b"]);
    expect(layout.byField.b.offset).toBe(0);
    expect(layout.byField.a).toBeUndefined();
  });

  it("supports selection-only left sticky", () => {
    const layout = computeStickyLayout({
      columns: [{ field: "a", title: "A", width: 100 }],
      showSelection: true,
      showRowNumber: false,
    });
    expect(layout.selection?.left).toBe(0);
    expect(layout.rowNumber).toBeUndefined();
    expect(layout.byField.a).toEqual({ sticky: false });
  });
});
```

- [ ] **Step 2: 确认失败**

```bash
pnpm --filter @component-ai/grid-core test -- src/sticky-layout.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: 实现**

`types.ts` — `GridColumn` 增加 `fixed?: "left" | "right"`。

`sticky-layout.ts`：

```ts
import type { GridColumn } from "./types";

const SELECTION_WIDTH = 48;
const ROW_NUMBER_WIDTH = 56;
const DEFAULT_COL_WIDTH = 120;

export type StickyLayoutInput = {
  columns: GridColumn[];
  showSelection: boolean;
  showRowNumber: boolean;
};

export type StickyFieldInfo =
  | { sticky: false }
  | { sticky: "left" | "right"; offset: number; isEdge: boolean };

export type StickyLayout = {
  dataFields: string[];
  selection?: { left: number };
  rowNumber?: { left: number };
  byField: Record<string, StickyFieldInfo>;
  widthOf: (field: string) => number;
};

export function computeStickyLayout(input: StickyLayoutInput): StickyLayout {
  const visible = input.columns.filter((c) => !c.hidden);
  const widthOf = (field: string) => {
    const col = visible.find((c) => c.field === field);
    return col?.width ?? DEFAULT_COL_WIDTH;
  };

  const leftCols = visible.filter((c) => c.fixed === "left");
  const rightCols = visible.filter((c) => c.fixed === "right");
  const midCols = visible.filter((c) => c.fixed !== "left" && c.fixed !== "right");
  const dataFields = [
    ...leftCols.map((c) => c.field),
    ...midCols.map((c) => c.field),
    ...rightCols.map((c) => c.field),
  ];

  const byField: Record<string, StickyFieldInfo> = {};
  let left = 0;
  const selection = input.showSelection
    ? { left: 0 }
    : undefined;
  if (input.showSelection) left += SELECTION_WIDTH;

  const rowNumber = input.showRowNumber ? { left } : undefined;
  if (input.showRowNumber) left += ROW_NUMBER_WIDTH;

  leftCols.forEach((col, i) => {
    byField[col.field] = {
      sticky: "left",
      offset: left,
      isEdge: i === leftCols.length - 1,
    };
    left += col.width ?? DEFAULT_COL_WIDTH;
  });

  midCols.forEach((col) => {
    byField[col.field] = { sticky: false };
  });

  let right = 0;
  for (let i = rightCols.length - 1; i >= 0; i--) {
    const col = rightCols[i]!;
    byField[col.field] = {
      sticky: "right",
      offset: right,
      isEdge: i === 0,
    };
    right += col.width ?? DEFAULT_COL_WIDTH;
  }

  return { dataFields, selection, rowNumber, byField, widthOf };
}
```

Export from `index.ts`：`computeStickyLayout` 及类型。

- [ ] **Step 4: 测试通过并 commit**

```bash
pnpm --filter @component-ai/grid-core test
pnpm --filter @component-ai/grid-core build
git add packages/grid-core/src/types.ts packages/grid-core/src/sticky-layout.ts packages/grid-core/src/sticky-layout.test.ts packages/grid-core/src/index.ts
git commit -m "feat(grid-core): add column fixed and sticky layout helper"
```

---

### Task 2: React — P2 失败测试

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.test.tsx`

- [ ] **Step 1: 追加测试**（保留既有用例）

```tsx
  it("applies sticky left to selection, row number, and fixed left columns", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          { field: "code", title: "编号", width: 100, fixed: "left" },
          { field: "name", title: "名称", width: 200 },
        ]}
        selectionMode="multiple"
        showRowNumber
      />,
    );
    const selection = screen.getByRole("checkbox", { name: "全选" }).closest(
      '[data-sticky="left"]',
    );
    expect(selection).toHaveStyle({ position: "sticky", left: "0px" });

    const rowNumberHeader = screen.getByText("#").closest('[data-sticky="left"]');
    expect(rowNumberHeader).toHaveStyle({ position: "sticky", left: "48px" });

    const codeHeader = screen.getByText("编号").closest('[data-sticky="left"]');
    expect(codeHeader).toHaveStyle({
      position: "sticky",
      left: `${48 + 56}px`,
    });
  });

  it("applies sticky right to fixed right columns", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          { field: "code", title: "编号", width: 100 },
          { field: "name", title: "名称", width: 120, fixed: "right" },
        ]}
        showRowNumber={false}
        selectionMode="none"
      />,
    );
    const nameHeader = screen.getByText("名称").closest('[data-sticky="right"]');
    expect(nameHeader).toHaveStyle({ position: "sticky", right: "0px" });
  });

  it("renders data columns in left-mid-right order", () => {
    render(
      <VirtualGrid
        data={[{ id: "1", a: "A", b: "B", c: "C" }]}
        columns={[
          { field: "a", title: "A", width: 80, fixed: "left" },
          { field: "b", title: "B", width: 80 },
          { field: "c", title: "C", width: 80, fixed: "right" },
        ]}
        showRowNumber={false}
      />,
    );
    const headers = screen.getAllByRole("columnheader").map((el) => el.textContent);
    expect(headers).toEqual(["A", "B", "C"]);
  });
```

- [ ] **Step 2: 确认失败并 commit**

```bash
pnpm --filter @component-ai/react-ui test -- src/components/VirtualGrid.test.tsx
git add packages/react-ui/src/components/VirtualGrid.test.tsx
git commit -m "test(react-ui): add VirtualGrid P2 sticky failing tests"
```

---

### Task 3: React — sticky 接线

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.tsx`

- [ ] **Step 1: 接入 `computeStickyLayout`**

```tsx
import { computeStickyLayout, ... } from "@component-ai/grid-core";
```

在渲染前：

```tsx
const sticky = useMemo(
  () =>
    computeStickyLayout({
      columns: visibleColumns,
      showSelection,
      showRowNumber,
    }),
  [visibleColumns, showSelection, showRowNumber],
);

const orderedColumns = useMemo(
  () =>
    sticky.dataFields
      .map((field) => visibleColumns.find((c) => c.field === field)!)
      .filter(Boolean),
  [sticky.dataFields, visibleColumns],
);
```

表头/表体：

- 选择列容器：若 `sticky.selection`，加 `style={{ position: "sticky", left: sticky.selection.left, zIndex: isHeader ? 30 : 20 }}`、`data-sticky="left"`、不透明底、`className` 含既有 `w-12`。
- 序号列：同理用 `sticky.rowNumber`。
- 数据列：遍历 `orderedColumns`（不再直接 `visibleColumns.map`）；若 `byField[field].sticky === 'left'|'right'`，设对应 `left`/`right`、`data-sticky`、边缘阴影（`isEdge`）、z-index、不透明底（表头 `bg-slate-50`，表体随斑马 `bg-white`/`bg-slate-50`）。

保证表头与表体都用同一 `sticky` / `orderedColumns`。

- [ ] **Step 2: 测试通过**

```bash
pnpm --filter @component-ai/react-ui test -- src/components/VirtualGrid.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.tsx
git commit -m "feat(react-ui): VirtualGrid P2 sticky fixed columns"
```

---

### Task 4: React — P2 Stories

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.stories.tsx`

- [ ] **Step 1:** 追加：

- `FixedLeft`：多列，`code`/`name` 左固定，`selectionMode="multiple"`，`showRowNumber`，外层 `className="h-80 w-[420px]"`（或包一层限宽 div）
- `FixedRight`：末列 `fixed: "right"`，限宽
- `FixedBoth`：左+右+中间多列，限宽以出现横滚

- [ ] **Step 2: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.stories.tsx
git commit -m "docs(react-ui): add VirtualGrid P2 fixed-column stories"
```

---

### Task 5: Vue — P2 测试 + 实现 + stories

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.test.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`

- [ ] **Step 1: 追加失败测试**（VTU，断言 `style` / `data-sticky`）

```tsx
  it("applies sticky left offsets for selection and fixed columns", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns: [
          { field: "code", title: "编号", width: 100, fixed: "left" },
          { field: "name", title: "名称", width: 200 },
        ],
        selectionMode: "multiple",
        showRowNumber: true,
      },
    });
    const selection = wrapper.find('[data-sticky="left"]');
    expect(selection.attributes("style") || "").toContain("left: 0px");
    const code = wrapper
      .findAll('[data-sticky="left"]')
      .find((n) => n.text().includes("编号"));
    expect(code?.attributes("style") || "").toContain(`left: ${48 + 56}px`);
  });

  it("applies sticky right for fixed right columns", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns: [
          { field: "code", title: "编号", width: 100 },
          { field: "name", title: "名称", width: 120, fixed: "right" },
        ],
        showRowNumber: false,
        selectionMode: "none",
      },
    });
    const name = wrapper.find('[data-sticky="right"]');
    expect(name.attributes("style") || "").toContain("right: 0px");
  });
```

先跑确认红，再实现（可同一任务内 TDD：先 commit 红测，再实现；或一次提交实现+绿测——**推荐分两次 commit**：`test(vue-ui): …` 然后 `feat(vue-ui): …`）。

- [ ] **Step 2: 对称实现** — 同 React：`computeStickyLayout`、`orderedColumns`、sticky style / `data-sticky` / 阴影 / z-index。

- [ ] **Step 3: Stories** — `FixedLeft` / `FixedRight` / `FixedBoth`

- [ ] **Step 4: 验证**

```bash
pnpm --filter @component-ai/grid-core test
pnpm --filter @component-ai/react-ui test
pnpm --filter @component-ai/vue-ui test
pnpm --filter @component-ai/grid-core build
pnpm --filter @component-ai/react-ui build
pnpm --filter @component-ai/vue-ui build
```

- [ ] **Step 5: Commit**（实现 + stories；若红测已单独提交则本步不含 test-only commit）

```bash
git add packages/vue-ui/src/components/VirtualGrid.tsx packages/vue-ui/src/components/VirtualGrid.test.tsx packages/vue-ui/src/components/VirtualGrid.stories.tsx
git commit -m "feat(vue-ui): VirtualGrid P2 sticky fixed columns"
```

---

### Task 6: 更新路线图

**Files:**
- Modify: `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md`（用 Node `fs.writeFileSync` 写 UTF-8，避免 PowerShell 损坏）

- [ ] **Step 1:** 第 7 行改为链接本计划；「当前应执行」在 P2 **全部实现完成后**勾掉 P2，并指向 P3 或 autoHeight。

执行本 Task 时若刚写完 plan、尚未实现：先只链接计划并写「执行 P2」；**实现全部完成后**再勾选。

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-10-virtual-grid-p2.md docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md
git commit -m "docs: add VirtualGrid P2 plan and update roadmap"
```

---

## Self-review

| Spec 项 | 任务 |
|---------|------|
| `GridColumn.fixed` | Task 1 |
| 选择列/序号始终左固定 | Task 1–3、5 |
| 左/右 sticky + 偏移 | Task 1–3、5 |
| 行内 left→mid→right 顺序 | Task 1–3 |
| Stories Fixed* | Task 4、5 |
| 无 autoHeight / 无三栏 | 全计划 |

无 TBD。
