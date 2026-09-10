# VirtualGrid 列筛选 — 设计规格

**日期**：2026-09-10  
**状态**：已定稿（issue #10）  
**来源**：[#10 表格不能筛选数据](https://github.com/hyygzds/super/issues/10)

---

## 1. 背景与目标

VirtualGrid 已覆盖 P0–P5 与列排序（issue #6），但**没有按列筛选**。数据量较大时，用户无法快速收窄到关心的行。

**成功标准**

- 叶子列可声明 `filterable`；表头提供文本筛选框，按单元格值**包含**匹配（不区分大小写）。
- 多列同时有值时取 **AND**。
- 本地数据在排序 / 分组 / 树扁平化 / 分页之前过滤；远端模式只发事件、不改本地行集。
- React / Vue 行为一致；受控 / 非受控双模式。
- 筛选框可访问（`筛选${title}`）。

---

## 2. 非目标

- 数值区间、日期范围、枚举多选、操作符（等于 / 大于）。
- 表级全局搜索框（可后续用同一 `filters` 状态叠加）。
- 弹出层 / 独立 Filter 组件（仓库尚无 Popover；表头直接用已导出的 `Input`）。
- 服务端筛选协议；远端只暴露 `filters` 变更，由宿主拉数。

---

## 3. 方案选择

| 方案 | 说明 | 取舍 |
|------|------|------|
| A. 仅全局搜索框 | 一张表一个关键字扫所有列 | 不能按列收窄；和排序的「列级」交互不一致 |
| B. 受控 `filters` + core 纯函数 + 表头 Input（推荐） | 与 `sort` / `page` 同一套受控模型 | 第一期只做包含匹配，足够解决「快速找到某些数据」 |
| C. 表头漏斗 + 弹出层 + 多操作符 | 完整表格产品能力 | 依赖未交付的 Popover，超出 issue 范围 |

采用 **B**。

---

## 4. API 契约

### 4.1 筛选状态

```ts
type FilterState = Record<string, string>;
```

键为列 `field`，值为当前查询串。缺省键或空串 / 仅空白视为该列未激活。同一时刻可有多列激活，全部 AND。

### 4.2 列

- `filterable?: boolean` — 叶子列显示筛选框；默认 `false`。分组表头（有 `children`）不显示。
- `filter?: (value: unknown, query: string, row: Record<string, unknown>) => boolean` — 可选自定义谓词。未提供时用 core 默认包含匹配。

### 4.3 表格

| React | Vue | 语义 |
|-------|-----|------|
| `filters` | `filters` | 受控当前筛选 |
| `defaultFilters` | `defaultFilters` | 非受控初值 |
| `onFiltersChange` | `update:filters` | 输入变更都回调，无论是否受控 |

受控优先：`filters ?? uncontrolledFilters`。

### 4.4 写入规则

`setFilterValue(current, field, value)`：

- `value` 为空串时从下一状态删除该键。
- 否则写入 / 覆盖该键。
- 不回写调用方的 `data`。

---

## 5. `@component-ai/grid-core`

新增纯函数（无 DOM）：

- `cellContains(value, query)` — `query.trim()` 为空则视为通过；`null`/`undefined` 单元格不匹配非空查询；其余 `String(value).toLowerCase().includes(query.trim().toLowerCase())`。
- `activeFilterEntries(filters)` — 去掉空 / 空白项后的 `[field, query][]`。
- `setFilterValue(current, field, value)` — 见 §4.4。
- `filterRows(rows, filters, options?)` — 无激活项时返回原数组引用。`options.predicates?.[field]` 覆盖默认 `cellContains`。`options.childrenField` 存在时递归过滤子节点：节点留下当且仅当自身匹配 **或** 仍有被留下的子节点。

**不放入 core**：表头输入框、占位文案、ARIA。

---

## 6. 数据流

```text
data
  → filterRows（!remote 且存在激活筛选）
  → sortRows（!remote 且存在 sort）
  → tree flatten / groupBy
  → 本地分页切片
  → 虚拟窗口
```

- **本地分页**：先全量过滤再切片；筛选变更时把 page 置为 1（与改排序 / pageSize 一致）。
- **远端 `remote`**：不调用 `filterRows`；只更新 / 抛出 `filters`，由宿主按新条件拉数。
- **分组**：对过滤后的源数据再 `buildGroupedRows`。
- **树**：按子树规则过滤后再 flatten；祖先因后代命中而保留。
- **不回写 `data`**。

---

## 7. UI / 无障碍

- 仅 `filterable` 叶子列表头渲染已导出的 `Input`（`type="search"`、`clearable`、占位「筛选」）。
- 可访问名：`筛选${column.title}`（`sr-only` 标签包住 Input）。
- 筛选框在标题 / 排序按钮下方；点击输入不得触发表头排序。
- 未声明 `filterable` 的列行为与现在完全一致。

---

## 8. 测试

| 层 | 内容 |
|----|------|
| grid-core | 包含匹配大小写；空查询恒真；空值不匹配；多字段 AND；无激活项保引用；自定义谓词；树祖先保留 |
| React / Vue | 输入过滤行、清除恢复、受控 / 非受控、分页重置、remote 不改行集、无 `filterable` 无输入框 |

---

## 9. Storybook

双端各增加 `Filter` story：名称 / 城市可筛选，数据量足以看出收窄效果。
