# VirtualGrid P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@component-ai/react-ui` 与 `@component-ai/vue-ui` 中交付 **VirtualGrid P0**：基础表格渲染（列配置、数据、表头、边框/斑马纹、序号列、空状态、固定行高）+ 纵向虚拟滚动（对齐源 `enableVirtual` / `virtual` 语义）。双端行为对齐，视觉为 Tailwind 新皮肤（不复刻 Farris CSS）。

**Architecture:** UI 层不做虚拟窗口计算，直接消费 `@component-ai/grid-core` 的 `computeVirtualWindow`（已在 `5b828af` 落地，纯函数、已测）。表格**不使用原生 `<table>`**，改用 CSS Grid 的 div 行/列结构（`display:grid` + 每行同一份 `gridTemplateColumns`），原因：虚拟滚动需要对渲染中的行做 `transform: translateY()` 定位，`<table>` 的行无法脱离表格流做绝对定位/位移，源 Farris VirtualGrid 自身也是非 `<table>` 的 row/cell 组件架构（见 `packages/ui-vue/components/virtual-grid/src/core/row`、`components/cell`）。无障碍上补 ARIA `role="table"/"row"/"columnheader"/"cell"` 与 `aria-rowcount`/`aria-rowindex`，让虚拟滚动下只渲染窗口内行时 AT 仍能感知总行数与当前行的真实序号（业界虚拟列表 a11y 通行做法）。

本批次**不包含**：选中/Checkbox 接线（P1）、分页接线（P1）、列模板/自动行高/固定列（P2）、分组/合并（P3）、树/异步加载（P4）、编辑（P5）。这些均在后续子计划中，遵守 spec §5 硬约束（依赖件先完整交付再接线）。

**Tech Stack:** TypeScript、React 19、Vue 3.5、TSX、Vite 8、Vitest、Testing Library / Vue Test Utils、Tailwind v4、`@component-ai/grid-core`

**规格来源:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md) §6（P0 行）、§7、§8、§10  
**路线图:** [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md)（顺序 5）  
**前置:** [`2026-07-09-grid-core.md`](./2026-07-09-grid-core.md) 已完成（`computeVirtualWindow` 可用）。**不依赖** Pagination / Checkbox（P1 才需要）。

**源能力对照（本批次覆盖的 demo 场景）：** `basic`、`stripe`、`virtual`、`show-row-number`（源文件见 `packages/ui-vue/demos/virtual-grid/*.vue`，源 prop 为 `data` / `columns` / `row-height` / `enable-virtual` / `stripe`；目标库按 §8 原则用等价语义命名，不强求字面一致）。

---

## API 契约（双端对齐）

行数据类型统一为 `Record<string, unknown>`（不做泛型组件，对齐仓库现有 `Select` 的非泛型运行时实现习惯）。

| 概念 | React | Vue | 说明 |
|------|-------|-----|------|
| 列配置 | `columns: GridColumn[]`（必填，复用 `@component-ai/grid-core` 的 `GridColumn`） | 同 | `{ field, title, width?, hidden?, children? }`；P0 忽略 `children`（表头分组是 P3） |
| 数据 | `data: Record<string, unknown>[]`（必填） | 同 | |
| 行唯一键字段 | `idField?: string`（默认 `"id"`） | 同 | 缺失时按絕对索引兜底为 key，不抛错 |
| 固定行高 | `rowHeight?: number`（默认 `36`） | 同 | 像素；P0 仅支持固定行高（自动行高是 P2） |
| 容器高度 | `height?: number \| string` | 同 | 数值时按 `px`；虚拟滚动要求数值型 `height`（P0 不做 `ResizeObserver` 自动测量，交给 P2） |
| 开启纵向虚拟滚动 | `virtual?: boolean`（默认 `false`） | 同 | 对齐源 `enableVirtual` 的能力，命名跟随目标库习惯 |
| overscan | `overscan?: number`（默认 `4`） | 同 | 上下额外渲染行数 |
| 边框 | `bordered?: boolean`（默认 `true`） | 同 | |
| 斑马纹 | `stripe?: boolean`（默认 `false`） | 同 | |
| 序号列 | `showRowNumber?: boolean`（默认 `false`） | 同 | 序号为数据中的绝对位置（`absoluteIndex + 1`），不是虚拟窗口内的相对位置 |
| 空状态文案 | `emptyText?: ReactNode`（默认 `"暂无数据"`） | 默认 slot `#empty`，无 slot 时同默认文案 | Vue 用 slot 是框架习惯（对齐 `Select` 的 `#empty`） |
| 样式 | `className?: string` | `class?: string` | |

**行为（对齐 spec §10 错误与边界表）**

- `columns` / `data` 为空 → 正常渲染表头（`data` 为空）或空表头（`columns` 为空的边界，P0 不强制处理，留给使用者传非空 `columns`），**不抛错**。
- `virtual=true` 但 `height` 非数值 → 开发环境 `console.warn`，**自动降级为非虚拟渲染**（渲染全部行），不崩溃、不裁剪数据。
- `idField` 对应字段缺失或不唯一 → 不校验、不抛错（P0 范围内跳过 spec §10 的 `console.warn` 校验，记入 Self-review 的 TBD，避免范围膨胀）。
- 虚拟滚动窗口计算完全委托 `computeVirtualWindow`，UI 层只负责：维护 `scrollTop`（滚动容器的 `onScroll`/`@scroll`）与把结果（`startIndex`/`endIndex`/`offsetY`/`totalHeight`）映射为 DOM 结构，不重复实现窗口算法。

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/react-ui/src/components/VirtualGrid.tsx` | React VirtualGrid |
| `packages/react-ui/src/components/VirtualGrid.test.tsx` | RTL 测试 |
| `packages/react-ui/src/components/VirtualGrid.stories.tsx` | Storybook |
| `packages/react-ui/src/index.ts` | 导出 |
| `packages/vue-ui/src/components/VirtualGrid.tsx` | Vue VirtualGrid |
| `packages/vue-ui/src/components/VirtualGrid.test.tsx` | VTU 测试 |
| `packages/vue-ui/src/components/VirtualGrid.stories.tsx` | Storybook |
| `packages/vue-ui/src/index.ts` | 导出 |

两包已在 Pagination 计划中把 `@component-ai/grid-core` 加入 `dependencies` 与 vite `external`，本计划**无需**再改 `package.json` / `vite.config.ts`。

---

### Task 1: React VirtualGrid — 失败测试

**Files:**
- Create: `packages/react-ui/src/components/VirtualGrid.test.tsx`

- [x] **Step 1: 编写失败测试**

Create `packages/react-ui/src/components/VirtualGrid.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { VirtualGrid, type VirtualGridColumn } from "./VirtualGrid";

const columns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "name", title: "名称" },
];

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${i + 1}`,
  }));
}

describe("VirtualGrid (React)", () => {
  it("renders header titles and body cells for basic data", () => {
    render(<VirtualGrid columns={columns} data={makeRows(3)} />);
    expect(screen.getByRole("columnheader", { name: "标识" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "名称" })).toBeInTheDocument();
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("Row 3")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(1 + 3); // header + 3 rows
  });

  it("renders empty state text when data is empty", () => {
    render(<VirtualGrid columns={columns} data={[]} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("applies stripe styling to alternate body rows", () => {
    render(<VirtualGrid columns={columns} data={makeRows(4)} stripe />);
    const rows = screen.getAllByRole("row").slice(1); // drop header
    expect(rows[0].className).not.toMatch(/bg-slate-50/);
    expect(rows[1].className).toMatch(/bg-slate-50/);
  });

  it("renders sequential absolute row numbers when showRowNumber is set", () => {
    render(<VirtualGrid columns={columns} data={makeRows(3)} showRowNumber />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("1")).toBeInTheDocument();
    expect(within(rows[2]).getByText("3")).toBeInTheDocument();
  });

  it("renders all rows when virtual is disabled, even with many rows", () => {
    render(<VirtualGrid columns={columns} data={makeRows(200)} />);
    expect(screen.getAllByRole("row")).toHaveLength(1 + 200);
  });

  it("renders only a windowed subset when virtual + height are set, and updates on scroll", () => {
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(200)}
        virtual
        height={100}
        rowHeight={20}
        overscan={1}
      />,
    );
    const rowsBefore = screen.getAllByRole("row").slice(1);
    expect(rowsBefore.length).toBeLessThan(200);
    expect(screen.queryByText("Row 150")).not.toBeInTheDocument();

    const scroller = screen.getByRole("rowgroup");
    fireEvent.scroll(scroller, { target: { scrollTop: 20 * 149 } });

    expect(screen.getByText("Row 150")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run:

```bash
npm run test -w @component-ai/react-ui -- src/components/VirtualGrid.test.tsx
```

Expected: FAIL（`VirtualGrid` 模块不存在）。

---

### Task 2: React VirtualGrid — 实现 + 导出

**Files:**
- Create: `packages/react-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: 实现组件**

Create `packages/react-ui/src/components/VirtualGrid.tsx`:

```tsx
import { computeVirtualWindow, type GridColumn } from "@component-ai/grid-core";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

export type VirtualGridColumn = GridColumn;

export type VirtualGridProps = {
  columns: VirtualGridColumn[];
  data: Record<string, unknown>[];
  idField?: string;
  rowHeight?: number;
  height?: number | string;
  virtual?: boolean;
  overscan?: number;
  bordered?: boolean;
  stripe?: boolean;
  showRowNumber?: boolean;
  emptyText?: ReactNode;
  className?: string;
};

const ROW_NUMBER_WIDTH = 48;

function isNodeDevelopment(): boolean {
  const proc = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } })
    .process;
  return proc?.env?.NODE_ENV === "development";
}

function toCssHeight(height: number | string): string {
  return typeof height === "number" ? `${height}px` : height;
}

export function VirtualGrid({
  columns,
  data,
  idField = "id",
  rowHeight = 36,
  height,
  virtual = false,
  overscan = 4,
  bordered = true,
  stripe = false,
  showRowNumber = false,
  emptyText = "暂无数据",
  className = "",
}: VirtualGridProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  const canVirtualize = virtual && typeof height === "number";
  if (virtual && typeof height !== "number" && isNodeDevelopment()) {
    console.warn(
      "VirtualGrid: `virtual` requires a numeric `height` prop; falling back to non-virtual rendering.",
    );
  }

  const win = computeVirtualWindow({
    enabled: canVirtualize,
    rowCount: data.length,
    rowHeight,
    scrollTop,
    viewportHeight: canVirtualize ? (height as number) : 0,
    overscan,
  });

  const gridTemplateColumns = useMemo(() => {
    const widths = visibleColumns.map((c) => (c.width ? `${c.width}px` : "1fr"));
    return (showRowNumber ? [`${ROW_NUMBER_WIDTH}px`, ...widths] : widths).join(" ");
  }, [visibleColumns, showRowNumber]);

  function rowKey(row: Record<string, unknown>, absoluteIndex: number): string {
    const v = row[idField];
    return v !== undefined && v !== null ? String(v) : String(absoluteIndex);
  }

  const rootCls =
    `inline-block w-full overflow-hidden rounded-lg text-sm text-slate-800 ${
      bordered ? "border border-slate-200" : ""
    } ${className}`.trim();
  const cellBase = `flex items-center overflow-hidden px-3 py-2 truncate ${
    bordered ? "border-b border-slate-200" : ""
  }`;

  function renderRow(row: Record<string, unknown>, absoluteIndex: number) {
    return (
      <div
        key={rowKey(row, absoluteIndex)}
        role="row"
        aria-rowindex={absoluteIndex + 2}
        style={{ display: "grid", gridTemplateColumns, height: rowHeight }}
        className={stripe && absoluteIndex % 2 === 1 ? "bg-slate-50" : ""}
      >
        {showRowNumber ? (
          <div role="cell" className={cellBase}>
            {absoluteIndex + 1}
          </div>
        ) : null}
        {visibleColumns.map((col) => (
          <div key={col.field} role="cell" className={cellBase}>
            {String(row[col.field] ?? "")}
          </div>
        ))}
      </div>
    );
  }

  const headerStyle: CSSProperties = { display: "grid", gridTemplateColumns };

  return (
    <div className={rootCls} role="table" aria-rowcount={data.length + 1}>
      <div role="row" aria-rowindex={1} style={headerStyle} className="bg-slate-50 font-medium">
        {showRowNumber ? (
          <div role="columnheader" className={cellBase} aria-label="序号">
            #
          </div>
        ) : null}
        {visibleColumns.map((col) => (
          <div key={col.field} role="columnheader" className={cellBase}>
            {col.title}
          </div>
        ))}
      </div>
      <div
        role="rowgroup"
        className="relative overflow-y-auto"
        style={height !== undefined ? { height: toCssHeight(height) } : undefined}
        onScroll={(e) => {
          if (canVirtualize) setScrollTop(e.currentTarget.scrollTop);
        }}
      >
        {data.length === 0 ? (
          <div className="px-3 py-6 text-center text-slate-400">{emptyText}</div>
        ) : canVirtualize ? (
          <div style={{ height: win.totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${win.offsetY}px)` }}>
              {data
                .slice(win.startIndex, win.endIndex)
                .map((row, i) => renderRow(row, win.startIndex + i))}
            </div>
          </div>
        ) : (
          data.map((row, absoluteIndex) => renderRow(row, absoluteIndex))
        )}
      </div>
    </div>
  );
}
```

注意：`aria-rowindex` 从 `2` 起（`1` 是表头行），与 `aria-rowcount = data.length + 1` 对齐，即使虚拟滚动只渲染窗口内的行，AT 仍能通过 `aria-rowindex` 得知该行在完整数据集中的真实位置。

- [x] **Step 2: 导出**

在 `packages/react-ui/src/index.ts` 追加：

```ts
export { VirtualGrid } from "./components/VirtualGrid";
export type { VirtualGridProps, VirtualGridColumn } from "./components/VirtualGrid";
```

- [x] **Step 3: 跑测试确认通过**

Run:

```bash
npm run test -w @component-ai/react-ui -- src/components/VirtualGrid.test.tsx
```

Expected: PASS（6 个用例）。

- [ ] **Step 4: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.tsx packages/react-ui/src/components/VirtualGrid.test.tsx packages/react-ui/src/index.ts
git commit -m "feat(react-ui): add VirtualGrid P0 (basic table + vertical virtualization)"
```

---

### Task 3: React VirtualGrid Storybook

**Files:**
- Create: `packages/react-ui/src/components/VirtualGrid.stories.tsx`

- [x] **Step 1: 编写 stories**

对齐源 demo 场景 `basic`、`stripe`、`virtual`、`show-row-number`：

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { VirtualGrid, type VirtualGridColumn } from "./VirtualGrid";

const columns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "code", title: "编号", width: 100 },
  { field: "name", title: "名称", width: 120 },
  { field: "fullName", title: "全称" },
];

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    code: String(i + 1).padStart(4, "0"),
    name: `Name ${i + 1}`,
    fullName: `Full Name ${i + 1}`,
  }));
}

const meta = {
  title: "React/VirtualGrid",
  component: VirtualGrid,
  tags: ["autodocs"],
} satisfies Meta<typeof VirtualGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: { columns, data: makeRows(10) },
};

export const Stripe: Story = {
  args: { columns, data: makeRows(10), stripe: true },
};

export const ShowRowNumber: Story = {
  args: { columns, data: makeRows(10), showRowNumber: true },
};

export const Empty: Story = {
  args: { columns, data: [] },
};

export const Virtual: Story = {
  args: {
    columns,
    data: makeRows(5000),
    virtual: true,
    height: 400,
    rowHeight: 36,
  },
};
```

- [ ] **Step 2: 本地打开 Storybook 目视确认（手工）**

Run:

```bash
npm run storybook:react
```

Expected: `React/VirtualGrid` 下五条 story 可交互；`Virtual` story 中 5000 行滚动流畅，滚动条高度与 5000 行总高一致。

- [ ] **Step 3: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.stories.tsx
git commit -m "docs(react-ui): add VirtualGrid stories"
```

---

### Task 4: Vue VirtualGrid — 失败测试

**Files:**
- Create: `packages/vue-ui/src/components/VirtualGrid.test.tsx`

- [x] **Step 1: 编写失败测试**

Create `packages/vue-ui/src/components/VirtualGrid.test.tsx`（用例与 React 版一一对应）：

```tsx
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { VirtualGrid } from "./VirtualGrid";
import type { VirtualGridColumn } from "./VirtualGrid";

const columns: VirtualGridColumn[] = [
  { field: "id", title: "标识", width: 80 },
  { field: "name", title: "名称" },
];

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${i + 1}`,
  }));
}

describe("VirtualGrid (Vue)", () => {
  it("renders header titles and body cells for basic data", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(3) },
    });
    expect(wrapper.find('[role="columnheader"]').text()).toContain("标识");
    expect(wrapper.text()).toContain("Row 1");
    expect(wrapper.text()).toContain("Row 3");
    expect(wrapper.findAll('[role="row"]')).toHaveLength(1 + 3);
  });

  it("renders empty state text when data is empty", () => {
    const wrapper = mount(VirtualGrid, { props: { columns, data: [] } });
    expect(wrapper.text()).toContain("暂无数据");
  });

  it("applies stripe styling to alternate body rows", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(4), stripe: true },
    });
    const rows = wrapper.findAll('[role="row"]').slice(1);
    expect(rows[0].classes()).not.toContain("bg-slate-50");
    expect(rows[1].classes()).toContain("bg-slate-50");
  });

  it("renders sequential absolute row numbers when showRowNumber is set", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(3), showRowNumber: true },
    });
    const rows = wrapper.findAll('[role="row"]').slice(1);
    expect(rows[0].text()).toContain("1");
    expect(rows[2].text()).toContain("3");
  });

  it("renders all rows when virtual is disabled, even with many rows", () => {
    const wrapper = mount(VirtualGrid, {
      props: { columns, data: makeRows(200) },
    });
    expect(wrapper.findAll('[role="row"]')).toHaveLength(1 + 200);
  });

  it("renders only a windowed subset when virtual + height are set, and updates on scroll", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        columns,
        data: makeRows(200),
        virtual: true,
        height: 100,
        rowHeight: 20,
        overscan: 1,
      },
    });
    const rowsBefore = wrapper.findAll('[role="row"]').slice(1);
    expect(rowsBefore.length).toBeLessThan(200);
    expect(wrapper.text()).not.toContain("Row 150");

    const scroller = wrapper.find('[role="rowgroup"]');
    (scroller.element as HTMLElement).scrollTop = 20 * 149;
    await scroller.trigger("scroll");

    expect(wrapper.text()).toContain("Row 150");
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run:

```bash
npm run test -w @component-ai/vue-ui -- src/components/VirtualGrid.test.tsx
```

Expected: FAIL。

---

### Task 5: Vue VirtualGrid — 实现 + 导出 + Storybook

**Files:**
- Create: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Create: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [x] **Step 1: 实现 Vue 组件**

Create `packages/vue-ui/src/components/VirtualGrid.tsx`，行为与 React 版对齐，`columns`/`data` 用 `PropType`（非泛型，对齐 `Select.tsx` 的 `unknown[]` 习惯）：

```tsx
import {
  computeVirtualWindow,
  type GridColumn,
} from "@component-ai/grid-core";
import { computed, defineComponent, ref, type PropType } from "vue";

export type VirtualGridColumn = GridColumn;

const ROW_NUMBER_WIDTH = 48;

function toCssHeight(height: number | string): string {
  return typeof height === "number" ? `${height}px` : height;
}

export const VirtualGrid = defineComponent({
  name: "VirtualGrid",
  props: {
    columns: { type: Array as PropType<VirtualGridColumn[]>, required: true },
    data: {
      type: Array as PropType<Record<string, unknown>[]>,
      required: true,
    },
    idField: { type: String, default: "id" },
    rowHeight: { type: Number, default: 36 },
    height: { type: [Number, String] as PropType<number | string | undefined>, default: undefined },
    virtual: { type: Boolean, default: false },
    overscan: { type: Number, default: 4 },
    bordered: { type: Boolean, default: true },
    stripe: { type: Boolean, default: false },
    showRowNumber: { type: Boolean, default: false },
    emptyText: { type: String, default: "暂无数据" },
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    const scrollTop = ref(0);

    const visibleColumns = computed(() => props.columns.filter((c) => !c.hidden));

    const canVirtualize = computed(
      () => props.virtual && typeof props.height === "number",
    );

    if (
      props.virtual &&
      typeof props.height !== "number" &&
      import.meta.env?.DEV
    ) {
      console.warn(
        "VirtualGrid: `virtual` requires a numeric `height` prop; falling back to non-virtual rendering.",
      );
    }

    const win = computed(() =>
      computeVirtualWindow({
        enabled: canVirtualize.value,
        rowCount: props.data.length,
        rowHeight: props.rowHeight,
        scrollTop: scrollTop.value,
        viewportHeight: canVirtualize.value ? (props.height as number) : 0,
        overscan: props.overscan,
      }),
    );

    const gridTemplateColumns = computed(() => {
      const widths = visibleColumns.value.map((c) =>
        c.width ? `${c.width}px` : "1fr",
      );
      return (
        props.showRowNumber ? [`${ROW_NUMBER_WIDTH}px`, ...widths] : widths
      ).join(" ");
    });

    function rowKey(row: Record<string, unknown>, absoluteIndex: number): string {
      const v = row[props.idField];
      return v !== undefined && v !== null ? String(v) : String(absoluteIndex);
    }

    function onScroll(e: Event) {
      if (canVirtualize.value) {
        scrollTop.value = (e.currentTarget as HTMLElement).scrollTop;
      }
    }

    const cellBase = () =>
      `flex items-center overflow-hidden px-3 py-2 truncate ${
        props.bordered ? "border-b border-slate-200" : ""
      }`;

    function renderRow(row: Record<string, unknown>, absoluteIndex: number) {
      return (
        <div
          key={rowKey(row, absoluteIndex)}
          role="row"
          aria-rowindex={absoluteIndex + 2}
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplateColumns.value,
            height: `${props.rowHeight}px`,
          }}
          class={props.stripe && absoluteIndex % 2 === 1 ? "bg-slate-50" : ""}
        >
          {props.showRowNumber ? (
            <div role="cell" class={cellBase()}>
              {absoluteIndex + 1}
            </div>
          ) : null}
          {visibleColumns.value.map((col) => (
            <div key={col.field} role="cell" class={cellBase()}>
              {String(row[col.field] ?? "")}
            </div>
          ))}
        </div>
      );
    }

    return () => {
      const rootCls =
        `inline-block w-full overflow-hidden rounded-lg text-sm text-slate-800 ${
          props.bordered ? "border border-slate-200" : ""
        } ${props.class}`.trim();

      return (
        <div
          class={rootCls}
          role="table"
          aria-rowcount={props.data.length + 1}
        >
          <div
            role="row"
            aria-rowindex={1}
            style={{ display: "grid", gridTemplateColumns: gridTemplateColumns.value }}
            class="bg-slate-50 font-medium"
          >
            {props.showRowNumber ? (
              <div role="columnheader" class={cellBase()} aria-label="序号">
                #
              </div>
            ) : null}
            {visibleColumns.value.map((col) => (
              <div key={col.field} role="columnheader" class={cellBase()}>
                {col.title}
              </div>
            ))}
          </div>
          <div
            role="rowgroup"
            class="relative overflow-y-auto"
            style={
              props.height !== undefined
                ? { height: toCssHeight(props.height) }
                : undefined
            }
            onScroll={onScroll}
          >
            {props.data.length === 0 ? (
              <div class="px-3 py-6 text-center text-slate-400">
                {slots.empty?.() ?? props.emptyText}
              </div>
            ) : canVirtualize.value ? (
              <div style={{ height: `${win.value.totalHeight}px`, position: "relative" }}>
                <div style={{ transform: `translateY(${win.value.offsetY}px)` }}>
                  {props.data
                    .slice(win.value.startIndex, win.value.endIndex)
                    .map((row, i) => renderRow(row, win.value.startIndex + i))}
                </div>
              </div>
            ) : (
              props.data.map((row, absoluteIndex) => renderRow(row, absoluteIndex))
            )}
          </div>
        </div>
      );
    };
  },
});
```

若 `import.meta.env?.DEV` 在 Vitest/Vite 环境类型上报错，改用与 React 版一致的 `process.env.NODE_ENV === "development"` 判断（两者在 Vite 构建中都可行；选一种并在两端保持同风格即可，不强制统一）。

- [x] **Step 2: 导出 + stories**

在 `packages/vue-ui/src/index.ts` 追加：

```ts
export { VirtualGrid } from "./components/VirtualGrid";
```

`VirtualGrid.stories.tsx` 参照 React 版对应 story（`Basic`/`Stripe`/`ShowRowNumber`/`Empty`/`Virtual`），`title: "Vue/VirtualGrid"`。

- [x] **Step 3: 跑测试 + 双端构建验证**

Run:

```bash
npm run test -w @component-ai/vue-ui -- src/components/VirtualGrid.test.tsx
npm run build -w @component-ai/react-ui
npm run build -w @component-ai/vue-ui
```

Expected: 测试 PASS（6 个用例）；两端 build 成功无报错。

- [ ] **Step 4: Commit**

```bash
git add packages/vue-ui/src/components/VirtualGrid.tsx packages/vue-ui/src/components/VirtualGrid.test.tsx packages/vue-ui/src/components/VirtualGrid.stories.tsx packages/vue-ui/src/index.ts
git commit -m "feat(vue-ui): add VirtualGrid P0 (basic table + vertical virtualization)"
```

---

## Self-review

| Spec / 约束 | 覆盖 |
|---------------|------|
| §6 P0 能力清单（基础表 + 纵向虚拟滚动） | Task 2 / Task 5：列/数据/表头/边框/斑马纹/序号/空状态/固定行高 + `computeVirtualWindow` 接线 |
| §5 依赖件先完整交付再接线 | 是——P0 不引入 Checkbox/Pagination，选中与分页留给 P1 |
| §7 grid-core 边界（虚拟窗口纯函数在 core，UI 只渲染） | 是——`computeVirtualWindow` 全权计算，组件只维护 `scrollTop` 并映射 DOM |
| §8 双端 API 语义对齐、命名跟随框架 | Task 1/Task 4 测试用例逐条对应；React `onScroll`/`useState`，Vue `@scroll`/`ref` |
| §10 边界行为（`virtual` 但无数值 `height` 时降级） | 已写入 API 契约「行为」表，两端实现均带 `console.warn` + 自动降级 |
| Storybook 双端可视，对齐源 demo 场景 | Task 3 / Task 5：`basic`/`stripe`/`virtual`/`show-row-number` |

**已知范围收窄（TBD，留给后续批次）：**

- `idField` 缺失/不唯一的 `console.warn` 校验（spec §10 提到但本计划未做，避免范围膨胀；不影响渲染正确性）。
- 自动行高、固定列 → P2。
- 表头分组（`GridColumn.children`）、数据分组、合并单元格 → P3（需扩展 grid-core）。
- 树、异步加载、行展开 → P4。
- 单元格/行编辑、远端分页 → P5。
- 选中（Checkbox 接线）、分页（Pagination 接线）→ P1，下一份计划。
