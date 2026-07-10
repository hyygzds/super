# VirtualGrid P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 P0 `VirtualGrid` 上接线选中（single/multiple + 全选）与分页（local 切片 + remote 事件），双端行为对齐，只消费公开 `Checkbox` / `Pagination`。

**Architecture:** UI 内直接接线；复用 `@component-ai/grid-core` 的 `toggleKey` / `selectAllKeys` / `clearKeys` / `isAllSelected` / `isIndeterminate` / `slicePage`；不新增 core 模块。选择列在序号列之前；底栏挂载公开 Pagination。

**Tech Stack:** TypeScript、React 19、Vue 3.5、TSX、Vite 8、Vitest、Testing Library / Vue Test Utils、Tailwind v4、`@component-ai/grid-core`

**规格来源:** [`docs/superpowers/specs/2026-07-10-virtual-grid-p1-design.md`](../specs/2026-07-10-virtual-grid-p1-design.md)  
**工作目录:** `D:\AMyWork\code\super-component\.worktrees\grid-core`（`feature/grid-core`）  
**包管理:** **pnpm** only

---

## 文件结构

| 路径 | 职责 |
|------|------|
| `packages/react-ui/src/components/VirtualGrid.tsx` | 扩展 props + 选中列 + 分页派生 + Pagination |
| `packages/react-ui/src/components/VirtualGrid.test.tsx` | 追加 P1 测试（保留 P0） |
| `packages/react-ui/src/components/VirtualGrid.stories.tsx` | 追加 Selection / Pagination stories |
| `packages/vue-ui/src/components/VirtualGrid.tsx` | 对称实现 |
| `packages/vue-ui/src/components/VirtualGrid.test.tsx` | 追加 P1 测试 |
| `packages/vue-ui/src/components/VirtualGrid.stories.tsx` | 对称 stories |
| `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md` | 链接本计划 |

**共享约定（写死）**

- 选择列宽：`w-12`（48px），居中
- `selectionMode` 默认 `'none'`；`pagination` 默认 `false`；`paginationMode` 默认 `'local'`
- 全选 scope：local（或未开分页）= 整表 `data` 的 id；remote = 当前 `data` 的 id
- 表头全选再点（已全选或半选）→ `clearKeys()`（清空全部 selectedKeys）
- 序号：全局序号 = `(page - 1) * pageSize + indexInPageRows + 1`（未开分页时 page=1、pageSize 无关，即 `rowIndex + 1`）
- 空状态：基于 **原始** `data.length === 0`（不是 pageRows）
- Checkbox：`aria-label` 表头用「全选」，行用「选择行 {id}」；点击处 `stopPropagation`
- Pagination 容器：`data-testid="virtual-grid-pagination"`，`className="mt-2 shrink-0"`

---

### Task 1: React — P1 失败测试

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.test.tsx`

- [ ] **Step 1: 在现有 describe 末尾追加测试**（保留全部 P0 用例）

```tsx
  it("toggles multiple selection via row checkbox", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        defaultSelectedKeys={[]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "选择行 1" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["1"]);
  });

  it("replaces selection in single mode", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="single"
        defaultSelectedKeys={["1"]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    expect(screen.queryByRole("checkbox", { name: "全选" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "选择行 2" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["2"]);
  });

  it("select-all uses full data in local pagination", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    const many = [
      { id: "1", code: "a", name: "A" },
      { id: "2", code: "b", name: "B" },
      { id: "3", code: "c", name: "C" },
    ];
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        pagination
        paginationMode="local"
        defaultPageSize={2}
        defaultSelectedKeys={[]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "全选" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["1", "2", "3"]);
  });

  it("select-all uses current page data in remote mode", async () => {
    const user = userEvent.setup();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        pagination
        paginationMode="remote"
        total={100}
        page={1}
        pageSize={10}
        defaultSelectedKeys={[]}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "全选" }));
    expect(onSelectedKeysChange).toHaveBeenLastCalledWith(["1", "2"]);
  });

  it("keeps selectedKeys across local page change", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        pagination
        paginationMode="local"
        defaultPage={1}
        defaultPageSize={2}
        defaultSelectedKeys={["1"]}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "选择行 1" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.queryByRole("checkbox", { name: "选择行 1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "上一页" }));
    expect(screen.getByRole("checkbox", { name: "选择行 1" })).toBeChecked();
  });

  it("slices rows in local pagination", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        pagination
        paginationMode="local"
        defaultPage={1}
        defaultPageSize={2}
      />,
    );
    expect(screen.getByText("n1")).toBeInTheDocument();
    expect(screen.getByText("n2")).toBeInTheDocument();
    expect(screen.queryByText("n3")).not.toBeInTheDocument();
    expect(screen.getByTestId("virtual-grid-pagination")).toBeInTheDocument();
  });

  it("does not slice in remote mode and emits page change", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        pagination
        paginationMode="remote"
        total={50}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText("Sagi")).toBeInTheDocument();
    expect(screen.getByText("Nancy")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("resets to page 1 when pageSize changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    render(
      <VirtualGrid
        data={many}
        columns={columns}
        showRowNumber={false}
        pagination
        paginationMode="local"
        defaultPage={2}
        defaultPageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    const select = within(screen.getByTestId("virtual-grid-pagination")).getByLabelText(
      "每页条数",
    );
    await user.selectOptions(select, "20");
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("does not fire onRowClick when clicking row checkbox", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onSelectedKeysChange = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        selectionMode="multiple"
        onRowClick={onRowClick}
        onSelectedKeysChange={onSelectedKeysChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "选择行 1" }));
    expect(onSelectedKeysChange).toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: 确认失败**

```bash
pnpm --filter @component-ai/react-ui test -- src/components/VirtualGrid.test.tsx
```

Expected: 新增用例 FAIL（缺 props / 选择列 / 分页）。

- [ ] **Step 3: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.test.tsx
git commit -m "test(react-ui): add VirtualGrid P1 failing tests"
```

---

### Task 2: React — 实现选中 + 分页

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.tsx`

- [ ] **Step 1: 扩展 imports 与 props**

在文件顶部增加：

```tsx
import {
  clearKeys,
  computeVirtualWindow,
  isAllSelected,
  isIndeterminate,
  selectAllKeys,
  slicePage,
  toggleKey,
  type GridColumn,
} from "@component-ai/grid-core";
import { Checkbox } from "./Checkbox";
import { Pagination } from "./Pagination";
```

在 `VirtualGridProps` 中追加：

```tsx
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  pagination?: boolean;
  paginationMode?: "local" | "remote";
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  defaultPageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  total?: number;
  pageSizeOptions?: number[];
```

- [ ] **Step 2: 在组件内实现派生与交互（核心逻辑）**

解构新 props，默认值：`selectionMode="none"`、`pagination=false`、`paginationMode="local"`、`defaultPage=1`、`defaultPageSize=10`、`defaultSelectedKeys=[]`。

```tsx
  const [innerKeys, setInnerKeys] = useState(defaultSelectedKeys);
  const [innerPage, setInnerPage] = useState(defaultPage);
  const [innerSize, setInnerSize] = useState(defaultPageSize);

  const selectedKeys = selectedKeysProp !== undefined ? selectedKeysProp : innerKeys;
  const page = pageProp !== undefined ? pageProp : innerPage;
  const pageSize = pageSizeProp !== undefined ? pageSizeProp : innerSize;

  const showSelection = selectionMode !== "none";
  const multiple = selectionMode === "multiple";

  const paginationTotal =
    pagination && paginationMode === "remote"
      ? (totalProp ?? data.length)
      : data.length;

  useEffect(() => {
    if (
      pagination &&
      paginationMode === "remote" &&
      totalProp === undefined &&
      isNodeDevelopment()
    ) {
      console.warn(
        "[VirtualGrid] paginationMode=remote without `total`; falling back to data.length",
      );
    }
  }, [pagination, paginationMode, totalProp, data.length]);

  const pageRows = useMemo(() => {
    if (!pagination) return data;
    if (paginationMode === "remote") return data;
    return slicePage(data, {
      pageIndex: page,
      pageSize,
      total: data.length,
    });
  }, [pagination, paginationMode, data, page, pageSize]);

  // scopeKeys：local 时 data 为整表；remote 时 data 为当前页 → 一律用 data 的 id
  const scopeKeys = useMemo(
    () => data.map((row, index) => rowKey(row, index, idField)),
    [data, idField],
  );

  function setSelectedKeys(next: string[]) {
    if (selectedKeysProp === undefined) setInnerKeys(next);
    onSelectedKeysChange?.(next);
  }

  function setPage(next: number) {
    if (pageProp === undefined) setInnerPage(next);
    onPageChange?.(next);
  }

  function setPageSize(next: number) {
    if (pageSizeProp === undefined) setInnerSize(next);
    onPageSizeChange?.(next);
    if (pageProp === undefined) setInnerPage(1);
    onPageChange?.(1);
  }

  function onToggleRow(key: string) {
    setSelectedKeys(toggleKey(selectedKeys, key, multiple));
  }

  function onToggleAll() {
    if (isAllSelected(selectedKeys, scopeKeys) || isIndeterminate(selectedKeys, scopeKeys)) {
      setSelectedKeys(clearKeys());
    } else {
      setSelectedKeys(selectAllKeys(scopeKeys));
    }
  }
```

将虚拟窗口与渲染的 `data` 全部改为基于 `pageRows`：

```tsx
  const windowResult = useMemo(
    () =>
      computeVirtualWindow({
        enabled: enableVirtual,
        rowCount: pageRows.length,
        rowHeight,
        scrollTop,
        viewportHeight: Math.max(viewportHeight, 1),
        overscan: 2,
      }),
    [enableVirtual, pageRows.length, rowHeight, scrollTop, viewportHeight],
  );

  const slice = pageRows.slice(windowResult.startIndex, windowResult.endIndex);
```

空状态仍用 `data.length === 0`。

表头在序号列前插入选择列；行同理。选择列单元格：

```tsx
<div
  className="flex w-12 shrink-0 items-center justify-center border-r border-slate-100"
  role="gridcell"
  onClick={(e) => e.stopPropagation()}
>
  <Checkbox
    aria-label={`选择行 ${key}`}
    checked={selectedKeys.includes(key)}
    onCheckedChange={() => onToggleRow(key)}
  />
</div>
```

表头（仅 `multiple`）：

```tsx
<div className="flex w-12 shrink-0 items-center justify-center border-r border-slate-200" role="columnheader">
  <Checkbox
    aria-label="全选"
    checked={isAllSelected(selectedKeys, scopeKeys)}
    indeterminate={isIndeterminate(selectedKeys, scopeKeys)}
    onCheckedChange={() => onToggleAll()}
  />
</div>
```

`single` 时表头选择列渲染空占位（同宽 `w-12`），保持列对齐。

序号显示：

```tsx
const displayIndex =
  (pagination ? (page - 1) * pageSize : 0) + rowIndex + 1;
```

其中 `rowIndex` 为 `pageRows` 内下标（`start + i`）。

根布局改为外层包一层 flex column，表格主体 `flex-1 min-h-0`，底栏：

```tsx
{pagination ? (
  <div data-testid="virtual-grid-pagination" className="mt-2 shrink-0">
    <Pagination
      total={paginationTotal}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  </div>
) : null}
```

注意：受控 `page`/`pageSize` 时把 props 传给 Pagination；非受控时也传当前派生值（VirtualGrid 已内部 state），Pagination 用受控接口即可（始终传 `page` + `pageSize`）。

- [ ] **Step 3: 测试通过**

```bash
pnpm --filter @component-ai/react-ui test -- src/components/VirtualGrid.test.tsx
```

Expected: 全部 PASS。若 Pagination 的 pageSize 控件不是 `combobox`，按实际 role 调整测试（先看 Pagination 实现：`<select aria-label="每页条数">`）。

检查 Pagination 中 select 的 accessible name；若测试里 `getByRole("combobox")` 失败，改为：

```tsx
within(screen.getByTestId("virtual-grid-pagination")).getByLabelText("每页条数")
```

- [ ] **Step 4: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.tsx
git commit -m "feat(react-ui): VirtualGrid P1 selection and pagination"
```

---

### Task 3: React — P1 Stories

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.stories.tsx`

- [ ] **Step 1: 追加 stories**

- `Selection`：`selectionMode="multiple"`，受控 `selectedKeys`，约 8 行数据  
- `SelectionSingle`：`selectionMode="single"`  
- `PaginationLocal`：`pagination` + `paginationMode="local"`，≥25 行，`defaultPageSize={10}`  
- `PaginationRemote`：受控 `page`/`pageSize`/`total`/`data`；`onPageChange` / `onPageSizeChange` 内模拟切片换 `data`（story 内用 `useState` 持有全量，按页 slice 传给 grid）

- [ ] **Step 2: Commit**

```bash
git add packages/react-ui/src/components/VirtualGrid.stories.tsx
git commit -m "docs(react-ui): add VirtualGrid P1 stories"
```

---

### Task 4: Vue — P1 失败测试

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.test.tsx`

- [ ] **Step 1: 追加对等测试**（VTU）

```tsx
  it("emits update:selectedKeys on row checkbox", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns,
        showRowNumber: false,
        selectionMode: "multiple",
        defaultSelectedKeys: [],
      },
    });
    const box = wrapper.find('input[aria-label="选择行 1"]');
    await box.setValue(true);
    expect(wrapper.emitted("update:selectedKeys")?.at(-1)).toEqual([["1"]]);
  });

  it("select-all uses full data in local pagination", async () => {
    const many = [
      { id: "1", code: "a", name: "A" },
      { id: "2", code: "b", name: "B" },
      { id: "3", code: "c", name: "C" },
    ];
    const wrapper = mount(VirtualGrid, {
      props: {
        data: many,
        columns,
        showRowNumber: false,
        selectionMode: "multiple",
        pagination: true,
        paginationMode: "local",
        defaultPageSize: 2,
        defaultSelectedKeys: [],
      },
    });
    expect(wrapper.text()).toContain("A");
    expect(wrapper.text()).not.toContain("C");
    await wrapper.find('input[aria-label="全选"]').setValue(true);
    expect(wrapper.emitted("update:selectedKeys")?.at(-1)).toEqual([
      ["1", "2", "3"],
    ]);
  });

  it("slices in local pagination", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      code: `c${i + 1}`,
      name: `n${i + 1}`,
    }));
    const wrapper = mount(VirtualGrid, {
      props: {
        data: many,
        columns,
        showRowNumber: false,
        pagination: true,
        paginationMode: "local",
        defaultPage: 1,
        defaultPageSize: 2,
      },
    });
    expect(wrapper.text()).toContain("n1");
    expect(wrapper.text()).not.toContain("n3");
    expect(wrapper.find('[data-testid="virtual-grid-pagination"]').exists()).toBe(
      true,
    );
  });

  it("remote page change emits update:page without slicing away rows", async () => {
    const wrapper = mount(VirtualGrid, {
      props: {
        data,
        columns,
        showRowNumber: false,
        pagination: true,
        paginationMode: "remote",
        total: 50,
        page: 1,
        pageSize: 10,
      },
    });
    expect(wrapper.text()).toContain("Sagi");
    expect(wrapper.text()).toContain("Nancy");
    await wrapper
      .find('[data-testid="virtual-grid-pagination"] button[aria-label="下一页"]')
      .trigger("click");
    expect(wrapper.emitted("update:page")?.at(-1)).toEqual([2]);
  });
```

可再补：single 无全选、checkbox 不触发 `rowClick`（点击 checkbox 后 `rowClick` 未 emit）。

- [ ] **Step 2: 失败并 commit**

```bash
pnpm --filter @component-ai/vue-ui test -- src/components/VirtualGrid.test.tsx
git add packages/vue-ui/src/components/VirtualGrid.test.tsx
git commit -m "test(vue-ui): add VirtualGrid P1 failing tests"
```

---

### Task 5: Vue — 实现 + stories + 验证

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`

- [ ] **Step 1: 对称实现**

- props / emits：`selectionMode`、`selectedKeys` / `defaultSelectedKeys`、`update:selectedKeys`；`pagination`、`paginationMode`、`page` / `defaultPage` / `update:page`；`pageSize` / `defaultPageSize` / `update:pageSize`；`total`、`pageSizeOptions`
- 逻辑与 React 相同：`slicePage`、`toggleKey`、scope=`data` 的 id、公开 `Checkbox` / `Pagination`
- `inheritAttrs` 等保持 P0 习惯；Checkbox 的 `aria-label` 经 attrs 或显式 prop 传到 input（与 vue Checkbox 实现一致）

- [ ] **Step 2: Stories** — `Vue/VirtualGrid` 下追加与 React 同名的 Selection / SelectionSingle / PaginationLocal / PaginationRemote

- [ ] **Step 3: 验证**

```bash
pnpm --filter @component-ai/react-ui test
pnpm --filter @component-ai/vue-ui test
pnpm --filter @component-ai/react-ui build
pnpm --filter @component-ai/vue-ui build
```

Expected: 测试全绿；build 成功（stories 的既有 TS 告警可忽略，与 P0 相同）。

- [ ] **Step 4: Commit**

```bash
git add packages/vue-ui/src/components/VirtualGrid.tsx packages/vue-ui/src/components/VirtualGrid.stories.tsx packages/vue-ui/src/components/VirtualGrid.test.tsx
git commit -m "feat(vue-ui): VirtualGrid P1 selection and pagination"
```

---

### Task 6: 更新路线图

**Files:**
- Modify: `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md`

- [ ] **Step 1:** 用 **Node.js `fs.writeFileSync(..., 'utf8')`** 写回完整 UTF-8 内容（避免 PowerShell 编码损坏）。将第 6 行从「待写」改为：

```markdown
| 6 | [`2026-07-10-virtual-grid-p1.md`](./2026-07-10-virtual-grid-p1.md) | 选中 + 分页集成 | 计划 1、2、3、5 |
```

「当前应执行」：

```markdown
5. ~~完成 [`2026-07-10-input.md`](./2026-07-10-input.md)~~
6. ~~完成 [`2026-07-10-virtual-grid-p1.md`](./2026-07-10-virtual-grid-p1.md)~~
7. 下一优先：VirtualGrid P2（固定列与横向滚动）详细计划
```

（若执行本 Task 时 P1 实现尚未完成，则第 6 步先只链接计划文件，勾选留到实现全部完成后由执行者更新；**本计划执行结束时必须勾掉 P1**。）

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-10-virtual-grid-p1.md docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md
git commit -m "docs: add VirtualGrid P1 plan and update roadmap"
```

（若本 plan 文件已在更早提交，则只 commit roadmap。）

---

## Self-review

| Spec 项 | 任务 |
|---------|------|
| single / multiple / none | Task 1–2、4–5 |
| 本地全选整表 / 远端全选当前页 | Task 1–2（scope=`data`） |
| 翻页保留 selectedKeys | Task 1 |
| local slice + remote 事件 | Task 1–2、4–5 |
| 改 pageSize → page 1 | Task 1–2 |
| Checkbox 不触发 rowClick | Task 1 |
| Stories | Task 3、5 |
| 不扩 core / 无 HYBRID / 无树级联 | 全计划 |

无 TBD。Pagination 的 pageSize 控件查询方式以运行时 accessible name 为准（计划已给回退选择器）。
