# VirtualGrid P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已完成的 `VirtualGrid` P0（基础表 + 纵向虚拟滚动）之上接线 **选中（Checkbox）** 与 **本地分页（Pagination）**，均只消费两个依赖件已导出的公开 API（对齐 spec §5 硬约束），不重新实现任何 UI 或状态机。

**Architecture:** 选中状态机（`toggleKey`/`selectAllKeys`/`clearKeys`/`isAllSelected`/`isIndeterminate`）与分页切片（`slicePage`）均已在 `@component-ai/grid-core` 落地并测过；`VirtualGrid` 只做「计算 + 渲染」的胶水：维护受控/非受控的 `selectedKeys`/`page`/`pageSize`，调用 core 纯函数得到下一状态，再把结果渲染为同包内已交付的 `Checkbox`（选中列/全选表头）与 `Pagination`（表格下方分页条）。三者同属一个包（`react-ui`/`vue-ui`），组件间是包内相对路径 import，不引入新的跨包依赖。

**范围收窄（本批次只做 CheckboxOnly 语义）：** 源 Farris 的 `selection.mode` 有 `CheckboxOnly` 与 `Hybrid`（后者支持点击整行 + Ctrl/Shift 多选）。P1 只实现 **点击选中列 checkbox 才能选中**，行点击/Ctrl 多选留作后续批次 TBD，避免一次性引入复杂的键盘修饰符事件逻辑，符合 writing-plans 的粒度约束。

**选中范围口径（需要一个明确决策，写死避免歧义）：** 全选/`indeterminate` 的统计范围 = **当前渲染页的行**（分页关闭时 = 全部 `data`；分页开启时 = 当前页切片），不是跨全部页。`selectedKeys` 本身仍是全量数据的 key 集合，跨页切换不会丢失已选行（分页只影响「全选」按钮的统计范围与展示窗口，不影响 `selectedKeys` 内容）——对应下面 Task 2 的「跨页保留」测试用例。

**行号口径：** 开启 `showRowNumber`/`aria-rowindex` 时，序号相对**当前渲染页**从 1 开始（分页表格的常见默认行为，例如 Element Plus / Ant Design 默认也是页内从 1 开始编号）；`aria-rowcount` 同样反映当前页行数 + 表头。

**Tech Stack:** TypeScript、React 19、Vue 3.5、TSX、Vite 8、Vitest、Testing Library / Vue Test Utils、Tailwind v4、`@component-ai/grid-core`

**规格来源:** [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](../specs/2026-07-09-virtual-grid-migration-design.md) §6（P1 行）、§5、§9  
**路线图:** [`2026-07-09-virtual-grid-roadmap.md`](./2026-07-09-virtual-grid-roadmap.md)（顺序 6）  
**前置（均已完成）:** grid-core 选中/分页纯函数、双端 `Checkbox`、双端 `Pagination`、双端 `VirtualGrid` P0。

**源能力对照：** `packages/ui-vue/demos/virtual-grid/selection.vue`（`selection: { showCheckbox, mode, selectedKeys, multiple }`）、`page.vue`（`pagination: { currentPage, totalItems, pageSize, pageList }`）。目标库按扁平 props 命名（对齐 Pagination/Checkbox 自身的扁平 props 风格，不引入嵌套配置对象）。

---

## API 契约（新增 props，附加在 P0 已有 props 之上）

| 概念 | React | Vue | 说明 |
|------|-------|-----|------|
| 开启选中列 | `selectable?: boolean`（默认 `false`） | 同 | |
| 单选/多选 | `multiple?: boolean`（默认 `true`） | 同 | |
| 选中的 key 集合 | `selectedKeys?: string[]` / `defaultSelectedKeys?: string[]`（默认 `[]`） | 同 | key 来自 `idField`（复用 P0 已有的 `rowKey` 兜底逻辑） |
| 表头「全选」列 | `showSelectAll?: boolean`（默认 `true`，仅 `multiple` 时生效） | 同 | |
| 选中变更事件 | `onSelectedKeysChange?: (keys: string[]) => void` | `update:selectedKeys`（`(keys: string[]) => void`） | |
| 开启本地分页 | `pagination?: boolean`（默认 `false`） | 同 | |
| 当前页 | `page?: number` / `defaultPage?: number`（默认 `1`） | 同 | |
| 每页条数 | `pageSize?: number` / `defaultPageSize?: number`（默认 `10`） | 同 | |
| 每页条数可选项 | `pageSizeOptions?: number[]`（透传给内部 `Pagination`） | 同 | |
| 分页变更事件 | `onPageChange?`/`onPageSizeChange?` | `update:page`/`update:pageSize` | |

**行为**

- `selectable` 时，每行前追加一个固定宽度（40px）的选中列；`showRowNumber` 序号列排在选中列之后（列顺序：`[选中列?][序号列?][数据列...]`）。
- 点击行内 checkbox：始终调用 `toggleKey(selectedKeys, key, multiple)`，不关心 `Checkbox` 回调传回的布尔值（`toggleKey` 本身是纯粹的「存在则移除、不存在则加入/替换」，见 `grid-core/src/selection.ts`）。
- 点击表头「全选」checkbox：`isAllSelected(selectedKeys, 当前页 keys)` 为真时调用 `clearKeys()`，否则调用 `selectAllKeys(当前页 keys)`；表头 `indeterminate = isIndeterminate(selectedKeys, 当前页 keys)`。
- `pagination` 开启时，`VirtualGrid` 内部用 `slicePage(data, { pageIndex, pageSize, total: data.length })` 切出当前页数据，之后的虚拟滚动/渲染/选中统计全部基于这份切片（变量整体从 P0 的 `data` 改为 `pagedRows`）；`Pagination` 的 `total` 仍用完整 `data.length`。
- 分页切换时把虚拟滚动的 `scrollTop` 重置为 `0`（避免翻页后残留旧页的滚动位置导致虚拟窗口计算错位）。
- `Pagination` 渲染在表格根节点内、`rowgroup` 滚动容器**之外**的独立区域，不随行滚动。

---

## 文件结构（只改，不新增文件）

| 路径 | 改动 |
|------|------|
| `packages/react-ui/src/components/VirtualGrid.tsx` | 追加选中 + 分页逻辑，`import { Checkbox } from "./Checkbox"`、`import { Pagination } from "./Pagination"` |
| `packages/react-ui/src/components/VirtualGrid.test.tsx` | 追加用例 |
| `packages/react-ui/src/components/VirtualGrid.stories.tsx` | 追加 `Selection`/`Pagination` story |
| `packages/vue-ui/src/components/VirtualGrid.tsx` | 同上（Vue 版） |
| `packages/vue-ui/src/components/VirtualGrid.test.tsx` | 追加用例 |
| `packages/vue-ui/src/components/VirtualGrid.stories.tsx` | 追加 story |

无需改 `package.json` / `vite.config.ts` / grid-core（选中与分页纯函数均已存在）。

---

### Task 1: React VirtualGrid — 追加失败测试（选中 + 分页）

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.test.tsx`

- [x] **Step 1: 追加失败测试**

在现有 `describe("VirtualGrid (React)", ...)` 内追加（复用文件顶部已有的 `columns`/`makeRows`）：

```tsx
describe("VirtualGrid (React) selection", () => {
  it("toggles a row's selection via its checkbox and reports the new key set", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(3)}
        selectable
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    const checkboxIn = (row: HTMLElement) =>
      within(row).getByRole("checkbox");

    await user.click(checkboxIn(rows[0]));
    expect(onSelectedKeysChange).toHaveBeenCalledWith(["1"]);
  });

  it("selects/clears all current-page rows via the header checkbox, with indeterminate in between", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid columns={columns} data={makeRows(3)} selectable defaultSelectedKeys={["1"]} />,
    );
    const header = screen.getAllByRole("row")[0];
    const headerCheckbox = within(header).getByRole(
      "checkbox",
    ) as HTMLInputElement;
    expect(headerCheckbox.indeterminate).toBe(true);

    await user.click(headerCheckbox);
    const rows = screen.getAllByRole("row").slice(1);
    rows.forEach((row) => {
      expect(
        (within(row).getByRole("checkbox") as HTMLInputElement).checked,
      ).toBe(true);
    });

    await user.click(headerCheckbox);
    rows.forEach((row) => {
      expect(
        (within(row).getByRole("checkbox") as HTMLInputElement).checked,
      ).toBe(false);
    });
  });

  it("controlled selectedKeys renders checked rows without mutating on click", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(2)}
        selectable
        selectedKeys={["1"]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(
      (within(rows[0]).getByRole("checkbox") as HTMLInputElement).checked,
    ).toBe(true);

    await user.click(within(rows[0]).getByRole("checkbox"));
    expect(onSelectedKeysChange).toHaveBeenCalledWith([]);
    // controlled: prop 未变，视图仍保持父组件传入的值
    expect(
      (within(rows[0]).getByRole("checkbox") as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("single mode replaces the previous selection instead of accumulating", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(3)}
        selectable
        multiple={false}
        defaultSelectedKeys={["1"]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    await user.click(within(rows[1]).getByRole("checkbox"));
    expect(onSelectedKeysChange).toHaveBeenCalledWith(["2"]);
  });
});

describe("VirtualGrid (React) pagination", () => {
  it("renders only pageSize rows per page and shows the full total in Pagination", () => {
    render(
      <VirtualGrid columns={columns} data={makeRows(25)} pagination pageSize={10} />,
    );
    expect(screen.getAllByRole("row")).toHaveLength(1 + 10);
    expect(screen.getByText("共 25 条")).toBeInTheDocument();
  });

  it("navigates to the next page and shows the next slice of data", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid columns={columns} data={makeRows(25)} pagination pageSize={10} />,
    );
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.queryByText("Row 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一页" }));

    expect(screen.getByText("Row 11")).toBeInTheDocument();
    expect(screen.queryByText("Row 1")).not.toBeInTheDocument();
  });

  it("keeps selectedKeys across a page change", async () => {
    const user = userEvent.setup();
    render(
      <VirtualGrid
        columns={columns}
        data={makeRows(25)}
        selectable
        pagination
        pageSize={10}
      />,
    );
    const firstRow = screen.getAllByRole("row")[1];
    await user.click(within(firstRow).getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: "下一页" }));
    await user.click(screen.getByRole("button", { name: "上一页" }));

    const firstRowAgain = screen.getAllByRole("row")[1];
    expect(
      (within(firstRowAgain).getByRole("checkbox") as HTMLInputElement)
        .checked,
    ).toBe(true);
  });
});
```

- [x] **Step 2: 跑测试确认失败**

Run:

```bash
npm run test -w @component-ai/react-ui -- src/components/VirtualGrid.test.tsx
```

Expected: 新增用例 FAIL（`selectable`/`pagination` 相关 props 尚未生效），P0 原有 6 个用例应仍 PASS。

**Evidence (RED):** 7 failed / 6 passed（`Unable to find an accessible element with the role "checkbox"`、分页行数未按 `pageSize` 切片），确认新增 API 尚未实现。

---

### Task 2: React VirtualGrid — 实现选中 + 分页

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.tsx`

- [x] **Step 1: 扩展 props 与状态**

在 `VirtualGridProps` 追加 Task 所述的选中/分页 props；在组件内新增：

```tsx
import {
  computeVirtualWindow,
  clearKeys,
  isAllSelected,
  isIndeterminate,
  selectAllKeys,
  slicePage,
  toggleKey,
  type GridColumn,
} from "@component-ai/grid-core";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Checkbox } from "./Checkbox";
import { Pagination } from "./Pagination";
```

受控/非受控双模式（与 `Checkbox`/`Pagination` 自身的模式完全一致，这里在 `VirtualGrid` 层重新维护一份，因为 `VirtualGrid` 需要这些值参与 `pagedRows`/`allKeys` 计算，不能只做透传）：

```tsx
const [uncontrolledSelectedKeys, setUncontrolledSelectedKeys] =
  useState<string[]>(defaultSelectedKeys);
const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
const [uncontrolledPageSize, setUncontrolledPageSize] = useState(defaultPageSize);

const selectedKeys = selectedKeysProp ?? uncontrolledSelectedKeys;
const page = pageProp ?? uncontrolledPage;
const pageSize = pageSizeProp ?? uncontrolledPageSize;

function commitSelectedKeys(next: string[]) {
  if (selectedKeysProp === undefined) setUncontrolledSelectedKeys(next);
  onSelectedKeysChange?.(next);
}

function setPage(next: number) {
  if (pageProp === undefined) setUncontrolledPage(next);
  onPageChange?.(next);
}

function setPageSize(next: number) {
  if (pageSizeProp === undefined) setUncontrolledPageSize(next);
  onPageSizeChange?.(next);
  if (pageProp === undefined) setUncontrolledPage(1);
  onPageChange?.(1);
}

useEffect(() => {
  setScrollTop(0);
}, [page]);
```

- [x] **Step 2: 分页切片替换渲染数据源**

把原来直接用 `data` 做虚拟窗口/渲染的地方，改为先算出 `pagedRows`：

```tsx
const pagedRows = useMemo(
  () =>
    pagination
      ? slicePage(data, { pageIndex: page, pageSize, total: data.length })
      : data,
  [data, pagination, page, pageSize],
);
```

`computeVirtualWindow` 的 `rowCount`、渲染 `.map`/`.slice` 的数据源、`aria-rowcount` 均从 `data` 改为 `pagedRows`。`rowKey`/`allKeys` 也基于 `pagedRows`：

```tsx
const allKeys = useMemo(
  () => pagedRows.map((row, i) => rowKey(row, i)),
  [pagedRows, idField],
);
```

- [x] **Step 3: 选中列渲染**

`gridTemplateColumns` 追加选中列宽度（放在最前面）：

```tsx
const SELECTION_WIDTH = 40;
// ...
const prefixed = [
  ...(selectable ? [`${SELECTION_WIDTH}px`] : []),
  ...(showRowNumber ? [`${ROW_NUMBER_WIDTH}px`] : []),
  ...widths,
];
```

表头行追加：

```tsx
{selectable ? (
  <div role="columnheader" className={cellBase}>
    {multiple && showSelectAll ? (
      <Checkbox
        checked={isAllSelected(selectedKeys, allKeys)}
        indeterminate={isIndeterminate(selectedKeys, allKeys)}
        onCheckedChange={() =>
          commitSelectedKeys(
            isAllSelected(selectedKeys, allKeys)
              ? clearKeys()
              : selectAllKeys(allKeys),
          )
        }
      >
        <span className="sr-only">全选</span>
      </Checkbox>
    ) : null}
  </div>
) : null}
```

`renderRow` 内追加（放在最前面，序号列之前）：

```tsx
{selectable ? (
  <div role="cell" className={cellBase}>
    <Checkbox
      checked={selectedKeys.includes(rowKey(row, absoluteIndex))}
      onCheckedChange={() =>
        commitSelectedKeys(
          toggleKey(selectedKeys, rowKey(row, absoluteIndex), multiple),
        )
      }
    >
      <span className="sr-only">选择第 {absoluteIndex + 1} 行</span>
    </Checkbox>
  </div>
) : null}
```

- [x] **Step 4: 分页条渲染**

`rowgroup` 滚动容器**之后**（root `</div>` 之前）追加：

```tsx
{pagination ? (
  <div
    className={`flex justify-end p-2 ${
      bordered ? "border-t border-slate-200" : ""
    }`}
  >
    <Pagination
      total={data.length}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  </div>
) : null}
```

- [x] **Step 5: 跑测试确认通过**

Run:

```bash
npm run test -w @component-ai/react-ui -- src/components/VirtualGrid.test.tsx
```

Expected: 全部用例（P0 的 6 个 + P1 新增 7 个 = 13 个）PASS。

**Evidence (GREEN):** `Test Files 1 passed (1)` / `Tests 13 passed (13)`。

- [ ] **Step 6: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.tsx packages/react-ui/src/components/VirtualGrid.test.tsx
git commit -m "feat(react-ui): wire selection and pagination into VirtualGrid (P1)"
```

---

### Task 3: React VirtualGrid Storybook — 追加 P1 story

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.stories.tsx`

- [x] **Step 1: 追加 stories**

```tsx
export const Selection: Story = {
  args: { columns, data: makeRows(10), selectable: true },
};

export const SelectionSingle: Story = {
  args: { columns, data: makeRows(10), selectable: true, multiple: false },
};

export const Pagination: Story = {
  args: { columns, data: makeRows(95), pagination: true, pageSize: 10 },
};

export const SelectionWithPagination: Story = {
  args: {
    columns,
    data: makeRows(95),
    selectable: true,
    pagination: true,
    pageSize: 10,
  },
};
```

（注意 story 名 `Pagination` 与导入的 `Pagination` 组件类型无冲突——story 文件内不需要 import 该组件本身，仅 `VirtualGrid`。）

- [ ] **Step 2: 本地打开 Storybook 目视确认（手工）**

Run:

```bash
npm run storybook:react
```

Expected：`Selection` 可勾选/全选/半选；`Pagination` 翻页后行内容变化；`SelectionWithPagination` 翻页后已勾选行在返回原页时保持勾选。

- [ ] **Step 3: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.stories.tsx
git commit -m "docs(react-ui): add VirtualGrid P1 selection/pagination stories"
```

---

### Task 4: Vue VirtualGrid — 追加失败测试（选中 + 分页）

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.test.tsx`

- [x] **Step 1: 追加失败测试**

用例与 Task 1 逐条对应，改用 `@vue/test-utils` 的 `mount`/`findAll`/`trigger`，事件断言改为 `wrapper.emitted("update:selectedKeys")`/`wrapper.emitted("update:page")`。

- [x] **Step 2: 跑测试确认失败**

Run:

```bash
npm run test -w @component-ai/vue-ui -- src/components/VirtualGrid.test.tsx
```

Expected: 新增用例 FAIL，P0 原有 6 个用例仍 PASS。

**Evidence (RED):** 7 failed / 6 passed（`Cannot call setValue/element on an empty DOMWrapper`、分页行数未按 `pageSize` 切片）。

---

### Task 5: Vue VirtualGrid — 实现选中 + 分页 + Storybook

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`

- [x] **Step 1: 实现**

逻辑与 React 版一一对应：

- props 追加 `selectable`/`multiple`/`selectedKeys`/`defaultSelectedKeys`/`showSelectAll`/`pagination`/`page`/`defaultPage`/`pageSize`/`defaultPageSize`/`pageSizeOptions`
- emits 追加 `update:selectedKeys`/`update:page`/`update:pageSize`
- `setup` 内用 `ref` 维护非受控 `selectedKeys`/`page`/`pageSize`，`computed` 派生受控优先值
- `import { Checkbox } from "./Checkbox"; import { Pagination } from "./Pagination";`，渲染函数里用 `<Checkbox modelValue={...} onUpdate:modelValue={...}>`、`<Pagination page={...} onUpdate:page={...} .../>`
- `watch(() => page.value, () => { scrollTop.value = 0; })` 对齐 React 的翻页重置滚动

- [x] **Step 2: stories**

追加 `Selection`/`SelectionSingle`/`Pagination`/`SelectionWithPagination`，写法参照 P0 已有的 Vue stories（`render: () => <VirtualGrid ... />`）。

- [x] **Step 3: 跑测试 + 双端构建验证**

Run:

```bash
npm run test -w @component-ai/vue-ui -- src/components/VirtualGrid.test.tsx
npm run build -w @component-ai/react-ui
npm run build -w @component-ai/vue-ui
```

Expected: 测试 PASS（13 个用例）；两端 build 成功无报错。

**Evidence:** Vue `Test Files 1 passed / Tests 13 passed`；全量 `react-ui`（24 tests）与 `vue-ui`（20 tests）测试套件全绿；`vite build` 两端均成功（`react-ui` dist/index.js 21.64 kB，`vue-ui` dist/index.js 25.77 kB）。

- [ ] **Step 4: Commit**

```bash
git add packages/vue-ui/src/components/VirtualGrid.tsx packages/vue-ui/src/components/VirtualGrid.test.tsx packages/vue-ui/src/components/VirtualGrid.stories.tsx
git commit -m "feat(vue-ui): wire selection and pagination into VirtualGrid (P1)"
```

---

## Self-review

| Spec / 约束 | 覆盖 |
|---------------|------|
| §6 P1（多选/单选/selectedKeys/全选 + 分页） | Task 2/5；级联（树用）留给 P4（树形批次，需要 parent/child 关系，本计划未做） |
| §5 依赖件先完整交付再接线 | 是——只消费 `Checkbox`/`Pagination`/grid-core 已导出的公开 API，无新 UI 逻辑 |
| §9 数据流（受控优先，非受控内部维护） | Task 2/5：`selectedKeys`/`page`/`pageSize` 三者均遵循同一双模式 |
| 双端语义对齐 | Task 1/4 测试逐条对应；React `onXChange` ↔ Vue `update:x` |
| Storybook 双端可视 | Task 3/5 |

**已知范围收窄（TBD，留给后续批次）：**

- `Hybrid` 选中模式（行点击 + Ctrl/Shift 多选）——留给需要时单独开一个小计划，不在 P1。
- 树形级联选中（父子联动）——依赖树扁平化（P4），本计划不做。
- 全选的统计范围锁定为「当前渲染页」，如果后续需要「跨全部页全选」，需要新增一个显式 prop（如 `selectAllScope`）区分，本计划不引入。
- 远端分页（`page-remote` demo）留给 P5，与本地 `slicePage` 分页是两套语义。
