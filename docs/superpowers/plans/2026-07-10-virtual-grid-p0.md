# VirtualGrid P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@component-ai/react-ui` 与 `@component-ai/vue-ui` 交付 P0 `VirtualGrid`：基础表（列/数据/表头/边框/斑马纹/序号/空状态/固定行高）+ 默认关闭的纵向虚拟滚动 + 单元格/表头模板。

**Architecture:** 双端薄 UI；可见列过滤与行渲染在 UI 包内；`enableVirtual` 为 true 时用 `@component-ai/grid-core` 的 `computeVirtualWindow`（overscan=2）。不接线 Checkbox/Pagination。

**Tech Stack:** TypeScript、React 19、Vue 3.5、TSX、Vite 8、Vitest、Testing Library / Vue Test Utils、Tailwind v4、`@component-ai/grid-core`

**规格来源:** [`docs/superpowers/specs/2026-07-10-virtual-grid-p0-design.md`](../specs/2026-07-10-virtual-grid-p0-design.md)  
**工作目录:** `D:\AMyWork\code\super-component\.worktrees\grid-core`（`feature/grid-core`）  
**包管理:** **pnpm** only（`pnpm --filter @component-ai/react-ui test` 等）

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
| `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md` | 链接本计划 |

**共享约定（双端一致）**

- 默认：`rowHeight=36`、`idField='id'`、`showHeader=true`、`bordered=true`、`stripe=false`、`showRowNumber=true`、`enableVirtual=false`
- 序号列宽：`56px`，居中
- 空状态文案：`暂无数据`
- 可见列：`!hidden`；若 `column.children?.length`，开发环境 `console.warn`，**不展开**，该列本身若不 hidden 仍按叶子渲染（忽略 children）
- 虚拟：`overscan: 2`；body 需可测高度（组件根 `className`/`style` 由宿主给高度；内部 body `flex-1 min-h-0 overflow-auto`）

---

### Task 1: React VirtualGrid — 失败测试

**Files:**
- Create: `packages/react-ui/src/components/VirtualGrid.test.tsx`

- [ ] **Step 1: 编写失败测试**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtualGrid } from "./VirtualGrid";

const columns = [
  { field: "code", title: "编号", width: 120 },
  { field: "name", title: "名称", width: 120 },
];

const data = [
  { id: "1", code: "0001", name: "Sagi" },
  { id: "2", code: "0002", name: "Nancy" },
];

describe("VirtualGrid (React)", () => {
  it("renders headers and cell text", () => {
    render(<VirtualGrid data={data} columns={columns} showRowNumber={false} />);
    expect(screen.getByText("编号")).toBeInTheDocument();
    expect(screen.getByText("名称")).toBeInTheDocument();
    expect(screen.getByText("0001")).toBeInTheDocument();
    expect(screen.getByText("Nancy")).toBeInTheDocument();
  });

  it("hides hidden columns", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          { field: "code", title: "编号" },
          { field: "name", title: "名称", hidden: true },
        ]}
        showRowNumber={false}
      />,
    );
    expect(screen.getByText("编号")).toBeInTheDocument();
    expect(screen.queryByText("名称")).not.toBeInTheDocument();
    expect(screen.queryByText("Sagi")).not.toBeInTheDocument();
  });

  it("shows empty state when data is empty", () => {
    render(<VirtualGrid data={[]} columns={columns} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("shows row numbers when enabled", () => {
    render(<VirtualGrid data={data} columns={columns} showRowNumber />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("uses column render for cells", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          {
            field: "name",
            title: "名称",
            render: ({ row }) => <span>Hi-{String(row.name)}</span>,
          },
        ]}
        showRowNumber={false}
      />,
    );
    expect(screen.getByText("Hi-Sagi")).toBeInTheDocument();
  });

  it("calls onRowClick with row data", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        onRowClick={onRowClick}
      />,
    );
    await user.click(screen.getByText("0001"));
    expect(onRowClick).toHaveBeenCalled();
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: "1", code: "0001" });
  });

  it("virtual mode renders fewer DOM rows than data length", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      code: `c${i}`,
      name: `n${i}`,
    }));
    const { container } = render(
      <div style={{ height: 200 }}>
        <VirtualGrid
          data={many}
          columns={columns}
          enableVirtual
          rowHeight={36}
          showRowNumber={false}
          className="h-full"
        />
      </div>,
    );
    // Body rows: each data row is a [role=row] inside the grid
    const grid = container.querySelector('[data-testid="virtual-grid"]');
    expect(grid).toBeTruthy();
    const rows = within(grid as HTMLElement).queryAllByRole("row");
    // header row + visible body rows; body should be << 200
    const bodyRows = rows.filter((r) => r.getAttribute("data-row-index") != null);
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(bodyRows.length).toBeLessThan(80);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @component-ai/react-ui test -- src/components/VirtualGrid.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.test.tsx
git commit -m "test(react-ui): add failing VirtualGrid P0 tests"
```

---

### Task 2: React VirtualGrid — 实现

**Files:**
- Create: `packages/react-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [ ] **Step 1: 实现组件**

Create `packages/react-ui/src/components/VirtualGrid.tsx`:

```tsx
import {
  computeVirtualWindow,
  type GridColumn,
} from "@component-ai/grid-core";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

function isNodeDevelopment(): boolean {
  const proc = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } })
    .process;
  return proc?.env?.NODE_ENV === "development";
}

export type VirtualGridColumn<T = Record<string, unknown>> = GridColumn & {
  render?: (ctx: {
    row: T;
    column: VirtualGridColumn<T>;
    rowIndex: number;
  }) => ReactNode;
  renderHeader?: (column: VirtualGridColumn<T>) => ReactNode;
};

export type VirtualGridProps<T = Record<string, unknown>> = {
  data: T[];
  columns: VirtualGridColumn<T>[];
  idField?: string;
  showHeader?: boolean;
  bordered?: boolean;
  stripe?: boolean;
  showRowNumber?: boolean;
  rowHeight?: number;
  enableVirtual?: boolean;
  className?: string;
  emptyText?: string;
  renderCell?: (ctx: {
    row: T;
    column: VirtualGridColumn<T>;
    rowIndex: number;
  }) => ReactNode;
  renderHeader?: (column: VirtualGridColumn<T>) => ReactNode;
  onRowClick?: (row: T, rowIndex: number, event: MouseEvent) => void;
};

function getVisibleColumns<T>(
  columns: VirtualGridColumn<T>[],
): VirtualGridColumn<T>[] {
  return columns.filter((col) => {
    if (col.children?.length && isNodeDevelopment()) {
      console.warn(
        `[VirtualGrid] column "${col.field}" has children; P0 ignores nested headers`,
      );
    }
    return !col.hidden;
  });
}

function rowKey<T extends Record<string, unknown>>(
  row: T,
  index: number,
  idField: string,
): string {
  const raw = row[idField];
  if (raw === undefined || raw === null || raw === "") {
    if (isNodeDevelopment()) {
      console.warn(`[VirtualGrid] missing idField "${idField}" at row ${index}`);
    }
    return `row-${index}`;
  }
  return String(raw);
}

export function VirtualGrid<T extends Record<string, unknown> = Record<string, unknown>>({
  data,
  columns,
  idField = "id",
  showHeader = true,
  bordered = true,
  stripe = false,
  showRowNumber = true,
  rowHeight = 36,
  enableVirtual = false,
  className = "",
  emptyText = "暂无数据",
  renderCell,
  renderHeader,
  onRowClick,
}: VirtualGridProps<T>) {
  const visibleColumns = useMemo(() => getVisibleColumns(columns), [columns]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const measure = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
  }, []);

  useEffect(() => {
    measure();
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const windowResult = useMemo(() => {
    return computeVirtualWindow({
      enabled: enableVirtual,
      rowCount: data.length,
      rowHeight,
      scrollTop,
      viewportHeight: Math.max(viewportHeight, 1),
      overscan: 2,
    });
  }, [enableVirtual, data.length, rowHeight, scrollTop, viewportHeight]);

  const start = windowResult.startIndex;
  const end = windowResult.endIndex;
  const slice = data.slice(start, end);

  function cellContent(row: T, column: VirtualGridColumn<T>, rowIndex: number) {
    if (column.render) return column.render({ row, column, rowIndex });
    if (renderCell) return renderCell({ row, column, rowIndex });
    const v = row[column.field as keyof T];
    return v == null ? "" : String(v);
  }

  function headerContent(column: VirtualGridColumn<T>) {
    if (column.renderHeader) return column.renderHeader(column);
    if (renderHeader) return renderHeader(column);
    return column.title;
  }

  const borderCls = bordered ? "border border-slate-200" : "border-0";
  const gridCls =
    `flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-white text-sm text-slate-900 ${borderCls} ${className}`.trim();

  return (
    <div data-testid="virtual-grid" className={gridCls} role="grid">
      {showHeader ? (
        <div
          className="flex shrink-0 border-b border-slate-200 bg-slate-50"
          role="row"
        >
          {showRowNumber ? (
            <div
              className="flex w-14 shrink-0 items-center justify-center border-r border-slate-200 px-1 font-medium text-slate-600"
              style={{ height: rowHeight }}
              role="columnheader"
            >
              #
            </div>
          ) : null}
          {visibleColumns.map((col) => (
            <div
              key={col.field}
              className="flex shrink-0 items-center border-r border-slate-200 px-3 font-medium text-slate-700 last:border-r-0"
              style={{
                width: col.width ?? 120,
                height: rowHeight,
              }}
              role="columnheader"
            >
              {headerContent(col)}
            </div>
          ))}
        </div>
      ) : null}

      <div
        ref={bodyRef}
        className="relative min-h-0 flex-1 overflow-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {data.length === 0 ? (
          <div className="flex h-full min-h-24 items-center justify-center text-slate-500">
            {emptyText}
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{
              height: enableVirtual
                ? windowResult.totalHeight
                : data.length * rowHeight,
            }}
          >
            <div
              className="absolute left-0 right-0"
              style={{
                transform: enableVirtual
                  ? `translateY(${windowResult.offsetY}px)`
                  : undefined,
                top: enableVirtual ? 0 : undefined,
              }}
            >
              {slice.map((row, i) => {
                const rowIndex = start + i;
                const zebra =
                  stripe && rowIndex % 2 === 1 ? "bg-slate-50" : "bg-white";
                return (
                  <div
                    key={rowKey(row, rowIndex, idField)}
                    role="row"
                    data-row-index={rowIndex}
                    className={`flex border-b border-slate-100 ${zebra} hover:bg-sky-50/60`}
                    style={{ height: rowHeight }}
                    onClick={(e) => onRowClick?.(row, rowIndex, e)}
                  >
                    {showRowNumber ? (
                      <div
                        className="flex w-14 shrink-0 items-center justify-center border-r border-slate-100 text-slate-500"
                        role="gridcell"
                      >
                        {rowIndex + 1}
                      </div>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <div
                        key={col.field}
                        className="flex shrink-0 items-center overflow-hidden border-r border-slate-100 px-3 text-ellipsis whitespace-nowrap last:border-r-0"
                        style={{ width: col.width ?? 120 }}
                        role="gridcell"
                      >
                        {cellContent(row, col, rowIndex)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

（若虚拟测试因 jsdom 中 `clientHeight` 为 0 导致 `bodyRows` 过多或过少：在测试里对 `bodyRef` 容器 mock `clientHeight`，或在组件 mount 后手动 `Object.defineProperty(body, 'clientHeight', { value: 200 })` 并 `dispatchEvent(new Event('scroll'))`。实现者可用最小改动让「`< 80` 行」断言稳定——例如当 `enableVirtual && viewportHeight===0` 时先按 `viewportHeight=200` 估算仅用于测试环境 **不推荐**；更稳妥是测试里：

```ts
const body = container.querySelector('[data-testid="virtual-grid"] .overflow-auto') as HTMLElement;
Object.defineProperty(body, "clientHeight", { configurable: true, value: 200 });
body.dispatchEvent(new Event("scroll"));
// rerender or flush — if needed expose a test id on body: data-testid="virtual-grid-body"
```

请在 body 根增加 `data-testid="virtual-grid-body"`，并在虚拟测试中 mock `clientHeight` 后再断言。）

**修订：** 给 body 加 `data-testid="virtual-grid-body"`。虚拟测试改为：

```tsx
it("virtual mode renders fewer DOM rows than data length", () => {
  const many = Array.from({ length: 200 }, (_, i) => ({
    id: String(i),
    code: `c${i}`,
    name: `n${i}`,
  }));
  const { container } = render(
    <div style={{ height: 200 }}>
      <VirtualGrid
        data={many}
        columns={columns}
        enableVirtual
        rowHeight={36}
        showRowNumber={false}
        className="h-[200px]"
      />
    </div>,
  );
  const body = container.querySelector(
    '[data-testid="virtual-grid-body"]',
  ) as HTMLElement;
  Object.defineProperty(body, "clientHeight", { configurable: true, value: 200 });
  body.scrollTop = 0;
  body.dispatchEvent(new Event("scroll"));
  // Force remeasure: trigger resize observer callback by dispatching if needed —
  // simplest path: re-render is automatic if scroll handler set state; also call measure via scroll.
  const grid = container.querySelector('[data-testid="virtual-grid"]') as HTMLElement;
  const bodyRows = within(grid).queryAllByRole("row").filter((r) =>
    r.hasAttribute("data-row-index"),
  );
  expect(bodyRows.length).toBeGreaterThan(0);
  expect(bodyRows.length).toBeLessThan(80);
});
```

若 ResizeObserver 未把 viewportHeight 更新，在 `onScroll` 里同时 `setViewportHeight(e.currentTarget.clientHeight)`。

- [ ] **Step 2: 导出**

```ts
export { VirtualGrid } from "./components/VirtualGrid";
export type {
  VirtualGridProps,
  VirtualGridColumn,
} from "./components/VirtualGrid";
```

- [ ] **Step 3: 测试通过**

```bash
pnpm --filter @component-ai/react-ui test -- src/components/VirtualGrid.test.tsx
pnpm --filter @component-ai/react-ui test
```

- [ ] **Step 4: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.tsx packages/react-ui/src/components/VirtualGrid.test.tsx packages/react-ui/src/index.ts
git commit -m "feat(react-ui): add VirtualGrid P0"
```

---

### Task 3: React VirtualGrid Storybook

**Files:**
- Create: `packages/react-ui/src/components/VirtualGrid.stories.tsx`

- [ ] **Step 1: Stories** — title `React/VirtualGrid`，至少：Basic、Stripe、ShowRowNumber、Empty、Virtual（1000 行）、CellTemplate、HeaderTemplate。容器高度示例：`className="h-80"`。

- [ ] **Step 2: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.stories.tsx
git commit -m "docs(react-ui): add VirtualGrid P0 stories"
```

---

### Task 4: Vue VirtualGrid — 失败测试

**Files:**
- Create: `packages/vue-ui/src/components/VirtualGrid.test.tsx`

- [ ] **Step 1: 失败测试**（与 React 对称的最小集）

```tsx
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { VirtualGrid } from "./VirtualGrid";

const columns = [
  { field: "code", title: "编号", width: 120 },
  { field: "name", title: "名称", width: 120 },
];

const data = [
  { id: "1", code: "0001", name: "Sagi" },
  { id: "2", code: "0002", name: "Nancy" },
];

describe("VirtualGrid (Vue)", () => {
  it("renders headers and cell text", () => {
    const wrapper = mount(VirtualGrid, {
      props: { data, columns, showRowNumber: false },
    });
    expect(wrapper.text()).toContain("编号");
    expect(wrapper.text()).toContain("0001");
    expect(wrapper.text()).toContain("Nancy");
  });

  it("shows empty state", () => {
    const wrapper = mount(VirtualGrid, {
      props: { data: [], columns },
    });
    expect(wrapper.text()).toContain("暂无数据");
  });

  it("emits rowClick", async () => {
    const wrapper = mount(VirtualGrid, {
      props: { data, columns, showRowNumber: false },
    });
    const cell = wrapper.findAll('[role="gridcell"]').find((c) =>
      c.text().includes("0001"),
    );
    await cell!.trigger("click");
    expect(wrapper.emitted("rowClick")?.[0]?.[0]).toMatchObject({
      id: "1",
      code: "0001",
    });
  });

  it("hides hidden columns", () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns: [
          { field: "code", title: "编号" },
          { field: "name", title: "名称", hidden: true },
        ],
        showRowNumber: false,
      },
    });
    expect(wrapper.text()).toContain("编号");
    expect(wrapper.text()).not.toContain("名称");
  });
});
```

- [ ] **Step 2: 确认失败并 commit**

```bash
pnpm --filter @component-ai/vue-ui test -- src/components/VirtualGrid.test.tsx
git add packages/vue-ui/src/components/VirtualGrid.test.tsx
git commit -m "test(vue-ui): add failing VirtualGrid P0 tests"
```

---

### Task 5: Vue VirtualGrid — 实现 + stories

**Files:**
- Create: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Create: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [ ] **Step 1: 实现** — `defineComponent` + TSX，行为对齐 React：`computeVirtualWindow`、`enableVirtual` 默认 false、slot `#cell` / `#header`（props 也可接受函数型 `render` 若列对象带函数——Vue 列上的函数字段可用）。

Vue 模板优先级：slot `#cell`（若提供）> `column` 无默认文本。为简单起见 P0 Vue：

- 支持 props 与 React 同名
- slots：`cell` 作用域 `{ row, column, rowIndex }`；`header` 作用域 `{ column }`
- emits：`rowClick` → `(row, rowIndex, event)`

Body：`data-testid="virtual-grid-body"`；根：`data-testid="virtual-grid"`。

- [ ] **Step 2: 导出 + stories**（title `Vue/VirtualGrid`，与 React 对称）

- [ ] **Step 3: 验证**

```bash
pnpm --filter @component-ai/vue-ui test
pnpm --filter @component-ai/react-ui test
pnpm --filter @component-ai/react-ui build
pnpm --filter @component-ai/vue-ui build
```

- [ ] **Step 4: Commit**

```bash
git add packages/vue-ui/src/components/VirtualGrid.tsx packages/vue-ui/src/components/VirtualGrid.stories.tsx packages/vue-ui/src/index.ts
git commit -m "feat(vue-ui): add VirtualGrid P0"
```

---

### Task 6: 更新路线图

**Files:**
- Modify: `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md`

- [ ] **Step 1:** 将第 5 行 P0 从「待写」改为链接本文件；「当前应执行」勾掉 P0 计划编写、指向实现或下一步 P1。

```markdown
| 5 | [`2026-07-10-virtual-grid-p0.md`](./2026-07-10-virtual-grid-p0.md) | VirtualGrid 基础表 + 虚拟滚动（双端） | 依赖 1 |
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md docs/superpowers/plans/2026-07-10-virtual-grid-p0.md
git commit -m "docs: add VirtualGrid P0 plan and link roadmap"
```

（本计划文件首次提交可与本 task 合并为一次 commit，若尚未提交。）

---

## Self-review

| Spec 项 | 任务 |
|---------|------|
| 基础表视觉与列/数据 | Task 2、5 |
| enableVirtual 默认 false | Task 2、5 |
| computeVirtualWindow | Task 2、5 |
| 模板 render/slot | Task 1–2、5 |
| 空状态 / hidden / 序号 / rowClick | Task 1–2、4–5 |
| Storybook | Task 3、5 |
| 不接 Checkbox/Pagination | 全计划 |

无 TBD。
