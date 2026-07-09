# Pagination 组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** �?`@component-ai/react-ui` �?`@component-ai/vue-ui` 中交�?**完整、可独立使用** �?`Pagination` 组件（受�?非受控页码与每页条数、上一�?下一页、页码按钮、每页条数切换），供后续 VirtualGrid 接线；双�?API 语义对齐，命名跟从目标库习惯�?

**Architecture:** 页码规范化可复用 `@component-ai/grid-core` �?`normalizePageSlice`（本计划�?grid-core 列为 UI �?dependency）。React 用函数组�?+ 受控判定；Vue �?`defineComponent` TSX + `modelValue` / `pageSize` �?`v-model` 约定。视觉为 Tailwind，对�?Button �?sky/slate 色板�?

**Tech Stack:** TypeScript、React 19、Vue 3.5、TSX、Vite 8、Vitest、Testing Library / Vue Test Utils、Tailwind v4、`@component-ai/grid-core`

**规格来源:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md) §5  
**路线�?** [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md)  
**前置:** [`2026-07-09-grid-core.md`](./2026-07-09-grid-core.md) 至少完成�?Task 3（`normalizePageSlice` 可用）。若并行开发，先合�?grid-core 再装依赖�?

---

## API 契约（双端对齐）

| 概念 | React | Vue |
|------|-------|-----|
| 当前页（1-based�?| `page` / `defaultPage` / `onPageChange` | `page` + `onPageChange`，或 `v-model:page`（`page` + `onUpdate:page`�?|
| 每页条数 | `pageSize` / `defaultPageSize` / `onPageSizeChange` | `pageSize` + `onUpdate:pageSize` |
| 总条�?| `total`（必填） | �?|
| 可选每页条�?| `pageSizeOptions?: number[]`，默�?`[10, 20, 50]` | �?|
| 禁用 | `disabled?: boolean` | �?|
| 样式 | `className?: string` | `class?: string` |

**行为**

- 页码始终�?`normalizePageSlice` 钳制�?`[1, pageCount]`�?
- 点击「上一�?/ 下一页」在边界禁用（`disabled` 属性或 `aria-disabled`）�?
- 切换 `pageSize` 时：保持尽量靠近当前数据窗口——将 `page` 重置�?`1`（简单、可测；文档写明）�?
- 展示文案默认中文：`�?{total} 条`；可�?`totalLabel?: (total: number) => string` 覆盖（可选，本计划实现该 prop）�?

**页码按钮策略（完整组件最小集�?*

- `pageCount <= 7`：显示全部页码按钮�?
- `pageCount > 7`：显�?`1 �?当前窗口 �?last`，当前页左右�?1 个邻居（共最�?7 个数字槽：首、省略、左邻、当前、右邻、省略、尾）。实现函�?`getPageItems(page, pageCount): Array<number | "ellipsis">` 放在组件文件内或同目�?`pagination-math.ts`（可双端各一份，或抽�?grid-core—�?*本计划放在各 UI 包内私有函数**，避免过早抽象）�?

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/react-ui/package.json` | 增加 dependency `@component-ai/grid-core` |
| `packages/react-ui/vite.config.ts` | `external` 增加 `@component-ai/grid-core` |
| `packages/react-ui/src/components/Pagination.tsx` | React Pagination |
| `packages/react-ui/src/components/Pagination.test.tsx` | RTL 测试 |
| `packages/react-ui/src/components/Pagination.stories.tsx` | Storybook |
| `packages/react-ui/src/index.ts` | 导出 |
| `packages/vue-ui/package.json` | dependency + 同上 |
| `packages/vue-ui/vite.config.ts` | external |
| `packages/vue-ui/src/components/Pagination.tsx` | Vue Pagination |
| `packages/vue-ui/src/components/Pagination.test.tsx` | VTU 测试 |
| `packages/vue-ui/src/components/Pagination.stories.tsx` | Storybook |
| `packages/vue-ui/src/index.ts` | 导出 |

---

### Task 1: �?grid-core 接入 UI 包构�?

**Files:**
- Modify: `packages/react-ui/package.json`
- Modify: `packages/vue-ui/package.json`
- Modify: `packages/react-ui/vite.config.ts`
- Modify: `packages/vue-ui/vite.config.ts`

- [x] **Step 1: 声明依赖**

�?`packages/react-ui/package.json` �?`packages/vue-ui/package.json` 增加�?

```json
"dependencies": {
  "@component-ai/grid-core": "1.0.0"
}
```

（workspace 协议：若 npm workspaces 需要，可用 `"*"` �?`"workspace:*"`——以本仓库现�?npm 版本为准；`npm install` �?lockfile 应解析到本地 `packages/grid-core`。）

- [x] **Step 2: Vite external**

`packages/react-ui/vite.config.ts` �?`rollupOptions.external` 改为�?

```ts
external: ["react", "react-dom", "react/jsx-runtime", "@component-ai/grid-core"],
```

`packages/vue-ui/vite.config.ts`�?

```ts
external: ["vue", "@component-ai/grid-core"],
```

- [x] **Step 3: 安装**

Run:

```bash
npm install
```

Expected: lockfile 更新，无报错�?

- [x] **Step 4: Commit**

```bash
git add packages/react-ui/package.json packages/vue-ui/package.json packages/react-ui/vite.config.ts packages/vue-ui/vite.config.ts package-lock.json
git commit -m "chore(ui): depend on @component-ai/grid-core"
```

---

### Task 2: React Pagination �?失败测试

**Files:**
- Create: `packages/react-ui/src/components/Pagination.test.tsx`

- [x] **Step 1: 编写失败测试**

Create `packages/react-ui/src/components/Pagination.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination (React)", () => {
  it("renders total and current page, navigates next/prev", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        total={95}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("�?95 �?)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一�? })).toBeEnabled();
    expect(screen.getByRole("button", { name: "上一�? })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "下一�? }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when a page number is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        total={30}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("resets to page 1 when page size changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        total={100}
        page={3}
        pageSize={10}
        pageSizeOptions={[10, 20]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText("每页条数"), "20");
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("supports uncontrolled defaultPage", async () => {
    const user = userEvent.setup();
    render(
      <Pagination total={50} defaultPage={2} defaultPageSize={10} />,
    );
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await user.click(screen.getByRole("button", { name: "下一�? }));
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
```

- [x] **Step 2: 跑测试确认失�?*

Run:

```bash
npm run test -w @component-ai/react-ui -- src/components/Pagination.test.tsx
```

Expected: FAIL �?`Pagination` 未导出�?

---

### Task 3: React Pagination �?实现

**Files:**
- Create: `packages/react-ui/src/components/Pagination.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: 实现组件**

Create `packages/react-ui/src/components/Pagination.tsx`:

```tsx
import { normalizePageSlice } from "@component-ai/grid-core";
import { useState, type SelectHTMLAttributes } from "react";

export type PaginationProps = {
  total: number;
  page?: number;
  defaultPage?: number;
  pageSize?: number;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
  totalLabel?: (total: number) => string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

function getPageItems(
  page: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(pageCount - 1, page + 1);
  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

export function Pagination({
  total,
  page: pageProp,
  defaultPage = 1,
  pageSize: pageSizeProp,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
  className = "",
  totalLabel = (t) => `�?${t} 条`,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
  const [uncontrolledSize, setUncontrolledSize] = useState(defaultPageSize);

  const pageSize = pageSizeProp ?? uncontrolledSize;
  const slice = normalizePageSlice({
    pageIndex: pageProp ?? uncontrolledPage,
    pageSize,
    total,
  });
  const page = slice.pageIndex;
  const pageCount = slice.pageCount;

  function setPage(next: number) {
    const normalized = normalizePageSlice({
      pageIndex: next,
      pageSize,
      total,
    }).pageIndex;
    if (pageProp === undefined) setUncontrolledPage(normalized);
    onPageChange?.(normalized);
  }

  function setPageSize(next: number) {
    if (pageSizeProp === undefined) setUncontrolledSize(next);
    onPageSizeChange?.(next);
    if (pageProp === undefined) setUncontrolledPage(1);
    onPageChange?.(1);
  }

  const items = getPageItems(page, pageCount);
  const navClass =
    "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm text-slate-800";
  const btnBase =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 disabled:pointer-events-none disabled:opacity-40 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
  const currentClass = "bg-sky-600 text-white hover:bg-sky-600";

  return (
    <nav
      className={`${navClass} ${className}`.trim()}
      aria-label="分页"
      data-disabled={disabled || undefined}
    >
      <span className="px-2 text-slate-600">{totalLabel(total)}</span>
      <button
        type="button"
        className={btnBase}
        disabled={disabled || page <= 1}
        aria-label="上一�?
        onClick={() => setPage(page - 1)}
      >
        上一�?
      </button>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-slate-400" aria-hidden>
            �?
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={`${btnBase} ${item === page ? currentClass : ""}`}
            aria-label={String(item)}
            aria-current={item === page ? "page" : undefined}
            disabled={disabled}
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className={btnBase}
        disabled={disabled || page >= pageCount}
        aria-label="下一�?
        onClick={() => setPage(page + 1)}
      >
        下一�?
      </button>
      <label className="ml-2 flex items-center gap-1 px-1 text-slate-600">
        <span className="sr-only">每页条数</span>
        <span aria-hidden>每页</span>
        <select
          aria-label="每页条数"
          className="rounded-md border border-slate-300 bg-white px-2 py-1"
          disabled={disabled}
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
```

（若 `sr-only` 未在库中定义，改�?`className="absolute w-px h-px overflow-hidden"` 或可见的「每页」文案已足够——测试用 `getByLabelText("每页条数")`。）

删除未使用的 `SelectHTMLAttributes` import（若复制时带入）�?

- [x] **Step 2: 导出**

�?`packages/react-ui/src/index.ts` 增加�?

```ts
export { Pagination } from "./components/Pagination";
export type { PaginationProps } from "./components/Pagination";
```

- [x] **Step 3: 跑测试确认通过**

Run:

```bash
npm run test -w @component-ai/react-ui -- src/components/Pagination.test.tsx
```

Expected: PASS。若 `toBeInTheDocument` 失败，确�?`vitest.setup.ts` 已加�?`@testing-library/jest-dom`（与 Tabs 相同）�?

- [x] **Step 4: Commit**

```bash
git add packages/react-ui/src/components/Pagination.tsx packages/react-ui/src/components/Pagination.test.tsx packages/react-ui/src/index.ts
git commit -m "feat(react-ui): add Pagination component"
```

---

### Task 4: React Pagination Storybook

**Files:**
- Create: `packages/react-ui/src/components/Pagination.stories.tsx`

- [x] **Step 1: 编写 stories**

参照现有 `Button.stories.tsx` �?CSF3 格式，至少包含：

- `Basic`：`total={95}` 受控或非受控
- `ManyPages`：`total={500}` `pageSize={10}` 展示省略�?
- `Disabled`：`disabled`

示例骨架�?

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Pagination } from "./Pagination";

const meta = {
  title: "Components/Pagination",
  component: Pagination,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: function Render() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    return (
      <Pagination
        total={95}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

export const ManyPages: Story = {
  args: { total: 500, defaultPage: 12, defaultPageSize: 10 },
};

export const Disabled: Story = {
  args: { total: 95, defaultPage: 2, disabled: true },
};
```

- [x] **Step 2: 本地打开 Storybook 目视确认（手工）**

Run:

```bash
npm run storybook:react
```

Expected: `Components/Pagination` 下三�?story 可交互�?

- [x] **Step 3: Commit**

```bash
git add packages/react-ui/src/components/Pagination.stories.tsx
git commit -m "docs(react-ui): add Pagination stories"
```

---

### Task 5: Vue Pagination �?失败测试

**Files:**
- Create: `packages/vue-ui/src/components/Pagination.test.tsx`

- [x] **Step 1: 编写失败测试**

Create `packages/vue-ui/src/components/Pagination.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Pagination } from "./Pagination";

describe("Pagination (Vue)", () => {
  it("emits update:page on next click", async () => {
    const wrapper = mount(Pagination, {
      props: {
        total: 95,
        page: 1,
        pageSize: 10,
      },
    });
    expect(wrapper.text()).toContain("�?95 �?);
    const next = wrapper.find('button[aria-label="下一�?]');
    expect((next.element as HTMLButtonElement).disabled).toBe(false);
    await next.trigger("click");
    expect(wrapper.emitted("update:page")?.[0]).toEqual([2]);
  });

  it("emits page size change and resets page to 1", async () => {
    const wrapper = mount(Pagination, {
      props: {
        total: 100,
        page: 3,
        pageSize: 10,
        pageSizeOptions: [10, 20],
      },
    });
    const select = wrapper.find('select[aria-label="每页条数"]');
    await select.setValue("20");
    expect(wrapper.emitted("update:pageSize")?.[0]).toEqual([20]);
    expect(wrapper.emitted("update:page")?.[0]).toEqual([1]);
  });
});
```

- [x] **Step 2: 跑测试确认失�?*

Run:

```bash
npm run test -w @component-ai/vue-ui -- src/components/Pagination.test.tsx
```

Expected: FAIL�?

---

### Task 6: Vue Pagination �?实现 + 导出 + Story

**Files:**
- Create: `packages/vue-ui/src/components/Pagination.tsx`
- Create: `packages/vue-ui/src/components/Pagination.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [x] **Step 1: 实现 Vue 组件**

Create `packages/vue-ui/src/components/Pagination.tsx`，行为与 React 对齐�?

- props：`total`、`page`、`pageSize`、`defaultPage`、`defaultPageSize`、`pageSizeOptions`、`disabled`、`class`、`totalLabel`
- emits：`update:page`、`update:pageSize`（及可�?`pageChange` 别名—�?*本计划只实现 `update:page` / `update:pageSize`**�?
- 受控：父传入 `page` / `pageSize` 时以 props 为准；未传则用内�?`ref` + default*

实现时复用与 React 相同�?`getPageItems` 逻辑（复制函数体，保持双端一致）。使�?`normalizePageSlice` from `@component-ai/grid-core`�?

结构示例（完整实现须可编译、通过 Task 5 测试）：

```tsx
import { normalizePageSlice } from "@component-ai/grid-core";
import { computed, defineComponent, ref, type PropType } from "vue";

function getPageItems(
  page: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(pageCount - 1, page + 1);
  if (left > 2) items.push("ellipsis");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < pageCount - 1) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

export const Pagination = defineComponent({
  name: "Pagination",
  props: {
    total: { type: Number, required: true },
    page: { type: Number, default: undefined },
    defaultPage: { type: Number, default: 1 },
    pageSize: { type: Number, default: undefined },
    defaultPageSize: { type: Number, default: 10 },
    pageSizeOptions: {
      type: Array as PropType<number[]>,
      default: () => [10, 20, 50],
    },
    disabled: { type: Boolean, default: false },
    class: { type: String, default: "" },
    totalLabel: {
      type: Function as PropType<(total: number) => string>,
      default: undefined,
    },
  },
  emits: ["update:page", "update:pageSize"],
  setup(props, { emit }) {
    const innerPage = ref(props.defaultPage);
    const innerSize = ref(props.defaultPageSize);

    const pageSize = computed(
      () => props.pageSize ?? innerSize.value,
    );
    const slice = computed(() =>
      normalizePageSlice({
        pageIndex: props.page ?? innerPage.value,
        pageSize: pageSize.value,
        total: props.total,
      }),
    );
    const label = computed(() =>
      (props.totalLabel ?? ((t: number) => `�?${t} 条`))(props.total),
    );

    function setPage(next: number) {
      const normalized = normalizePageSlice({
        pageIndex: next,
        pageSize: pageSize.value,
        total: props.total,
      }).pageIndex;
      if (props.page === undefined) innerPage.value = normalized;
      emit("update:page", normalized);
    }

    function setPageSize(next: number) {
      if (props.pageSize === undefined) innerSize.value = next;
      emit("update:pageSize", next);
      if (props.page === undefined) innerPage.value = 1;
      emit("update:page", 1);
    }

    return () => {
      const page = slice.value.pageIndex;
      const pageCount = slice.value.pageCount;
      const items = getPageItems(page, pageCount);
      const navClass =
        "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm text-slate-800";
      const btnBase =
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 disabled:pointer-events-none disabled:opacity-40 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
      const currentClass = "bg-sky-600 text-white hover:bg-sky-600";

      return (
        <nav
          class={`${navClass} ${props.class}`.trim()}
          aria-label="分页"
        >
          <span class="px-2 text-slate-600">{label.value}</span>
          <button
            type="button"
            class={btnBase}
            disabled={props.disabled || page <= 1}
            aria-label="上一�?
            onClick={() => setPage(page - 1)}
          >
            上一�?
          </button>
          {items.map((item, i) =>
            item === "ellipsis" ? (
              <span key={`e-${i}`} class="px-1 text-slate-400" aria-hidden>
                �?
              </span>
            ) : (
              <button
                key={item}
                type="button"
                class={`${btnBase} ${item === page ? currentClass : ""}`}
                aria-label={String(item)}
                aria-current={item === page ? "page" : undefined}
                disabled={props.disabled}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            class={btnBase}
            disabled={props.disabled || page >= pageCount}
            aria-label="下一�?
            onClick={() => setPage(page + 1)}
          >
            下一�?
          </button>
          <label class="ml-2 flex items-center gap-1 px-1 text-slate-600">
            <span>每页</span>
            <select
              aria-label="每页条数"
              class="rounded-md border border-slate-300 bg-white px-2 py-1"
              disabled={props.disabled}
              value={pageSize.value}
              onChange={(e: Event) =>
                setPageSize(Number((e.target as HTMLSelectElement).value))
              }
            >
              {props.pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </nav>
      );
    };
  },
});
```

- [x] **Step 2: 导出�?stories**

`packages/vue-ui/src/index.ts` 增加 `Pagination` 导出�?

`Pagination.stories.tsx` �?React 对称（`title: "Components/Pagination"`）�?

- [x] **Step 3: 测试 + 构建**

Run:

```bash
npm run test -w @component-ai/vue-ui -- src/components/Pagination.test.tsx
npm run build -w @component-ai/react-ui
npm run build -w @component-ai/vue-ui
```

Expected: 测试 PASS；两�?build 成功�?

- [x] **Step 4: Commit**

```bash
git add packages/vue-ui/src/components/Pagination.tsx packages/vue-ui/src/components/Pagination.test.tsx packages/vue-ui/src/components/Pagination.stories.tsx packages/vue-ui/src/index.ts
git commit -m "feat(vue-ui): add Pagination component"
```

---

## Self-review

| Spec / 路线�?| 覆盖 |
|---------------|------|
| §5 完整依赖件再接线 | 本计划交付完�?Pagination，不�?VirtualGrid |
| 双端 API 对齐 | Task 2�? |
| Storybook | Task 4�? |
| 使用 grid-core 分页规范�?| Task 1�?�? |

�?TBD。Checkbox / Input / VirtualGrid �?roadmap 后续计划�?
