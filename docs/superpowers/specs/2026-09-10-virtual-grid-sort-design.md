# VirtualGrid 列排序 — 设计规格

**日期**：2026-09-10  
**状态**：已定稿（issue #6）  
**来源**：[#6 表格数据不能排序](https://github.com/hyygzds/super/issues/6)

---

## 1. 背景与目标

VirtualGrid 已覆盖 P0–P5（基础表、虚拟滚动、选中、分页、分组、树、编辑、远端分页），但**没有按列排序**。数据量较大时，用户无法按某一列升序 / 降序查看。

**成功标准**

- 列可声明 `sortable`；点击表头在「无排序 → 升序 → 降序 → 无排序」间循环。
- 本地数据在分组 / 树扁平化 / 分页之前排序；远端模式只发事件、不改本地行序。
- React / Vue 行为一致；受控 / 非受控双模式。
- 表头有可见排序指示，并带 `aria-sort`。

---

## 2. 非目标

- 多列组合排序（shift-click 叠列）。
- 独立筛选 / 搜索。
- 服务端排序协议（URL、查询参数）；远端只暴露 `sort` 变更，由宿主拉数。
- 自定义排序图标主题系统。

---

## 3. 方案选择

| 方案 | 说明 | 取舍 |
|------|------|------|
| A. 仅本地改 `data` 引用 | 组件直接 mute / 回写 data | 破坏受控 data，远端无法接 |
| B. 受控 `sort` + core 纯函数排序（推荐） | 状态与行序分离；remote 时不排序 | 与 page / selectedKeys 一致 |
| C. 多列 sort 数组 | 完整表格产品能力 | 超出 issue 范围 |

采用 **B**。

---

## 4. API 契约

### 4.1 排序状态

```ts
type SortOrder = "asc" | "desc";
type SortState = { field: string; order: SortOrder };
```

`null` / `undefined` 表示未排序。同一时刻只排序一列。

### 4.2 列

- `sortable?: boolean` — 叶子列可点表头排序；默认 `false`。分组表头（有 `children`）不可排序。
- `sorter?: (a: unknown, b: unknown) => number` — 可选自定义比较（比较的是该列单元格值）。未提供时用 core 默认比较。

### 4.3 表格

| React | Vue | 语义 |
|-------|-----|------|
| `sort` | `sort` | 受控当前排序 |
| `defaultSort` | `defaultSort` | 非受控初值 |
| `onSortChange` | `update:sort` | 任意点击后都回调，无论是否受控 |

受控优先：`sort ?? uncontrolledSort`。

### 4.4 点击循环

对字段 `field`：

1. 当前不是该列 → `{ field, order: "asc" }`
2. 当前该列升序 → `{ field, order: "desc" }`
3. 当前该列降序 → `null`

---

## 5. `@component-ai/grid-core`

新增纯函数（无 DOM）：

- `nextSortState(current, field)` — 上表循环。
- `compareCellValues(a, b)` — 默认比较：`null`/`undefined`/`""` 置后；两数按数值；两 `Date` 按时间；其余 `String(...).localeCompare(..., { numeric: true, sensitivity: "base" })`。
- `sortRows(rows, sort, options?)` — 稳定排序（并列保原相对序）。`sort` 为空则返回原数组引用。`options.compare` 覆盖默认比较；`options.childrenField` 存在时递归排序每层兄弟节点（树）。

**不放入 core**：表头按钮、箭头、ARIA。

---

## 6. 数据流

```text
data
  → sortRows（!remote 且存在 sort）
  → tree flatten / groupBy
  → 本地分页切片
  → 虚拟窗口
```

- **本地分页**：先全量排序再切片；换排序时把 page 置为 1（与改 pageSize 一致）。
- **远端 `remote`**：不调用 `sortRows`；只更新 / 抛出 `sort`，由宿主按新排序拉数。
- **分组**：对源数据排序后再 `buildGroupedRows`（组顺序随首次出现变化）。
- **树**：按兄弟层排序，再 flatten。
- **不回写 `data`**。

---

## 7. UI / 无障碍

- 仅 `sortable` 叶子列表头可点；内容为标题 + 装饰性指示（↕ / ↑ / ↓），指示 `aria-hidden`。
- 可点表头用 `<button type="button">`，列头 `role="columnheader"` 保留，可访问名仍是列标题。
- `aria-sort`：`none` | `ascending` | `descending`（仅当前排序列非 `none`，其余 sortable 列为 `none`）。
- 未声明 `sortable` 的列行为与现在完全一致。

---

## 8. 测试

| 层 | 内容 |
|----|------|
| grid-core | `nextSortState` 循环；数值 / 字符串 / 空值；稳定排序；树兄弟排序；`sort` 为空不改引用 |
| React / Vue | 点击循环、行序、受控 / 非受控、分页重置、remote 不改序、`aria-sort` |

---

## 9. Storybook

双端各增加 `Sort` story：多列 `sortable`，含数字与字符串，数据量足以看出升/降序。
