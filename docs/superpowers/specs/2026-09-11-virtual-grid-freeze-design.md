# VirtualGrid 列冻结 — 设计规格

**日期**：2026-09-11  
**状态**：已定稿（issue #12）  
**来源**：[#12 表格不能冻结列](https://github.com/hyygzds/super/issues/12)

---

## 1. 背景与目标

VirtualGrid P2 已有开发者静态配置 `columns[].fixed: "left" | "right"`（sticky）。但：

1. 使用者无法像排序 / 筛选那样从表头切换冻结；
2. 纵向虚拟滚动用 `transform: translateY` 包住表体，会形成 sticky 包含块，**横向滚动时表体冻结列不会钉住**。

因此产品观感是「表格不能冻结列」。

**成功标准**

- 叶子列可声明 `freezable`；点击表头冻结按钮在「无 → 左冻 → 右冻 → 无」间循环。
- `columns[].fixed` 仍作为静态初值 / 未写入 `frozen` 时的回退。
- React / Vue 行为一致；受控 / 非受控双模式。
- 虚拟滚动下表体冻结列在横向滚动时仍 `position: sticky`（不用 transform 做纵向偏移）。
- 表头有可见冻结指示，按钮可访问。

---

## 2. 非目标

- 冻结行（横向表头以外的「冻结前 N 行」）。
- 拖拽列调整冻结分界、列重排。
- 独立 Popover / 列菜单。
- 把 `fixed` 从列配置里删掉（既有 FixedColumns Story 与 API 保留）。

---

## 3. 方案选择

| 方案 | 说明 | 取舍 |
|------|------|------|
| A. 只修虚拟滚动 sticky | 静态 `fixed` 开始真正钉住 | 仍无法从表头操作，和 sort / filter 不一致 |
| B. 受控 `frozen` + 表头按钮 + 修 sticky（推荐） | 与 `sort` / `filters` 同一套受控模型 | 第一期只做左右循环，足够解决「能冻结」 |
| C. Excel 式「冻结至此列」+ 分栏同步滚动 | 完整表格产品能力 | 改动面大，超出 issue |

采用 **B**。

---

## 4. API 契约

### 4.1 冻结状态

```ts
type FixedSide = "left" | "right";
type FrozenState = Record<string, FixedSide | null>;
```

键为列 `field`。缺省键表示回退到 `columns[].fixed`。显式 `null` 表示取消冻结（覆盖列上的 `fixed`）。

### 4.2 列

- `fixed?: "left" | "right"` — 已有。静态冻结；当 `frozen` 未写该键时生效。
- `freezable?: boolean` — 叶子列显示冻结按钮；默认 `false`。分组表头（有 `children`）不显示。

### 4.3 表格

| React | Vue | 语义 |
|-------|-----|------|
| `frozen` | `frozen` | 受控当前冻结 |
| `defaultFrozen` | `defaultFrozen` | 非受控初值 |
| `onFrozenChange` | `update:frozen` | 任意点击后都回调，无论是否受控 |

受控优先：`frozen ?? uncontrolledFrozen`。

### 4.4 点击循环

对字段 `field`，以**有效冻结**（`resolveColumnFixed`）为当前值：

1. 当前无冻结 → `{ ...frozen, [field]: "left" }`
2. 当前左冻 → `{ ...frozen, [field]: "right" }`
3. 当前右冻 → `{ ...frozen, [field]: null }`

不回写调用方的 `columns` / `data`。

### 4.5 按钮文案

| 有效冻结 | `aria-label`（下一动作） | 可见指示 |
|----------|--------------------------|----------|
| 无 | `左侧冻结${title}` | `⇔` |
| 左 | `右侧冻结${title}` | `⇤` |
| 右 | `取消冻结${title}` | `⇥` |

`aria-pressed` 在有效冻结非空时为 `true`。

---

## 5. `@component-ai/grid-core`

纯函数（无 DOM）：

- `resolveColumnFixed(field, columnFixed, frozen)` — 有效 `FixedSide | undefined`
- `nextFrozenState(frozen, field, columnFixed?)` — 循环下一状态
- `setColumnFrozen(frozen, field, side)` — 写入 / 覆盖；`side === null` 时记 `null`

布局仍在 UI 层用 sticky；core 只管理状态叠加。

---

## 6. UI 接线

- 用 `resolveColumnFixed` 得到的有效 `fixed` 再建列布局（左右 sticky 偏移算法不变）。
- 虚拟表体纵向偏移改用 **`padding-top`（或等价 spacer）**，禁止在表体包裹层上使用 `transform`，以免打断 sticky。
- 远端模式不改变冻结行为（冻结是布局，不是数据变换）。

---

## 7. 测试

- core：回退 / 显式 null 覆盖 / 循环 / `setColumnFrozen`
- React / Vue：点击循环并改变 header sticky；受控不本地生效；无 `freezable` 无按钮；`fixed` 静态仍生效；虚拟表体无 `transform`、有 `padding-top`

---

## 8. Storybook

- 保留 `FixedColumns`（静态 `fixed`）
- 新增 `Freeze`：`freezable` 列 + 足够宽的横向滚动，并可开 `virtual`
