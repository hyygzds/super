# Transfer（穿梭框）— 设计规格（Design Spec）

**日期**：2026-09-09  
**状态**：已定稿  
**关联实现**：`@component-ai/react-ui`、`@component-ai/vue-ui`  
**来源**：GitHub issue #3「缺少穿梭框组件」

---

## 1. 背景与目标

业务需要在两组数据之间搬移条目（权限、角色、待选/已选）。仓库已有完整 `Checkbox` 与 `Button`，按依赖件硬约束应先交付独立 `Transfer`，再被 Form 等消费。

**成功标准**

- 左栏为未选（源），右栏为已选（目标）；勾选后用中间按钮搬移。
- `targetKeys` 受控 / `defaultTargetKeys` 非受控，受控优先。
- React / Vue 行为对齐；视觉走现有 Tailwind 皮肤。
- 只消费已导出的 `Checkbox`、`Button` 公开 API，不内嵌半成品勾选/按钮。

---

## 2. 非目标（本期不做）

- 搜索过滤、分页、虚拟滚动。
- 单向模式、拖拽排序、树形数据。
- 自定义单元格渲染 / 插槽体系（可用 `title` 文案即可）。
- `Form.Item` 接线 Story（控件必须能独立使用；Form 接入可后续用公开 `value`/`modelValue`）。
- 像素级复刻 Farris / Ant Design 外观。

---

## 3. 架构选型

**方案 1（采用）：双端各自实现 UI，搬移算法内联在组件内。**  
分区逻辑只有「按 `targetKeys` 切左右 + 从勾选集合算出下一组 keys」，不值得新开 core 包，也不塞进 `grid-core` / `form-core`。

**方案 2（不采用）：独立 `@component-ai/transfer-core`。** 对单组件过重。

**方案 3（不采用）：只做 React。** 与库的双端约定冲突。

---

## 4. 数据与搬移语义

```ts
type TransferItem = {
  key: string;
  title: string;
  disabled?: boolean;
};
```

- `dataSource` 为全集，顺序保持 `dataSource` 原序。
- 左栏：`dataSource` 中 `key` 不在 `targetKeys` 的项。
- 右栏：`dataSource` 中 `key` 在 `targetKeys` 的项（按 `dataSource` 顺序，不按 `targetKeys` 插入序）。
- 面板内勾选是 **组件内部状态**，不是对外值。搬移成功后清空该方向已搬走项的勾选。
- 向右：把左栏已勾选且未 `disabled` 的 key 并入 `targetKeys`。
- 向左：把右栏已勾选且未 `disabled` 的 key 从 `targetKeys` 去掉。
- `disabled` 项：不可勾选、不参与全选、不能被搬移。
- 整表 `disabled`：所有勾选与按钮不可用。
- 未知 key（在 `targetKeys` 但不在 `dataSource`）忽略，不渲染。

---

## 5. API

### 5.1 共性

| 概念 | 说明 |
|------|------|
| `dataSource` | `TransferItem[]`，必填 |
| `titles` | `[string, string]`，默认 `['源列表', '目标列表']` |
| `disabled` | 整表禁用，默认 `false` |
| 样式 | React `className` / Vue `class` |

### 5.2 值（targetKeys）

| 概念 | React | Vue |
|------|-------|-----|
| 受控 | `targetKeys?: string[]` | `modelValue?: string[]` |
| 非受控初始 | `defaultTargetKeys?: string[]`（默认 `[]`） | `defaultModelValue?: string[]`（默认 `[]`） |
| 变更 | `onTargetKeysChange(next: string[])` | `update:modelValue`（payload `string[]`） |

受控优先：`targetKeys ?? uncontrolled`。变更 **一律** 触发回调，不管受控与否。

不另暴露 `onSelectChange`（面板勾选保持内部）。

### 5.3 操作按钮

中间两枚 `Button`（`variant="secondary"`）：

- 向右：文案 `>`，`aria-label="移到右侧"`；左栏无可搬项时 `disabled`。
- 向左：文案 `<`，`aria-label="移到左侧"`；右栏无可搬项时 `disabled`。

「可搬项」= 该栏已勾选且对应 item 未 disabled、且整表未 disabled。

---

## 6. 结构、无障碍与视觉

每栏：

- 表头：`Checkbox` 全选（`indeterminate` 当部分可选中项被勾选）+ 标题 + 可选中数量，如 `源列表 2/4`（已勾选 / 该栏未 disabled 项数）。全选只作用于未 disabled 项。
- 列表：`role="listbox"`，`aria-label` 用该栏标题；每项 `role="option"` + `Checkbox` + `title` 文本。
- 空列表：栏内 `暂无数据`。

根节点：`role="group"`，`aria-label="穿梭框"`（可被 `aria-label` prop 覆盖，默认该串）。

Tailwind：两栏等宽、边框 `border-slate-200`、中间按钮纵向排列，与 Form / Checkbox 的 slate/sky 色板一致。

---

## 7. 测试

| 层 | 覆盖 |
|----|------|
| React | 非受控 `defaultTargetKeys` 分栏；勾选后向右/向左搬移并回调；受控不擅自改显示；disabled 项不能勾选/搬移；整表 disabled；全选/半选 |
| Vue | 与 React 镜像（`modelValue` / `update:modelValue`） |

---

## 8. 完成定义

- 双端导出 `Transfer` 与 `TransferItem` 类型。
- Story：Basic（非受控）、Controlled、DisabledItems。
- 相关单测与 `react-ui` / `vue-ui` 构建通过。
- Storybook 目视确认（人工；agent 可代为浏览器走查但 checkbox 不勾）。

---

## 9. 文档与执行

- 实现计划：[`docs/superpowers/plans/2026-09-09-transfer.md`](../plans/2026-09-09-transfer.md)
- 不修改 VirtualGrid / Form roadmap；本组件独立交付。
