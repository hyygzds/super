# VirtualGrid P2 — 设计规格（Design Spec）

**日期**：2026-07-10  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`@component-ai/react-ui`、`@component-ai/vue-ui`、`@component-ai/grid-core`  
**总规格**：[`2026-07-09-virtual-grid-migration-design.md`](./2026-07-09-virtual-grid-migration-design.md)  
**前置**：[`2026-07-10-virtual-grid-p0-design.md`](./2026-07-10-virtual-grid-p0-design.md)、[`2026-07-10-virtual-grid-p1-design.md`](./2026-07-10-virtual-grid-p1-design.md)  
**路线图**：[`../plans/2026-07-09-virtual-grid-roadmap.md`](../plans/2026-07-09-virtual-grid-roadmap.md)

---

## 1. 背景与目标

交付 VirtualGrid 迁移的 **P2（收窄范围）**：**固定列（左/右）+ 横向滚动**，与现有纵向虚拟、选中、分页共存。视觉沿用 Tailwind 新皮肤。

说明：总设计原文 P2 还含「列模板 / 自动行高」。列/单元格模板已在 **P0** 交付；**自动行高本期不做**，另开批次。

**成功标准**

- 列可声明 `fixed: 'left' | 'right'`，横向滚动时钉住。
- 开启选中 / 序号时，选择列与序号列**始终**左固定。
- 表头与表体 sticky 偏移一致；双端行为对齐。
- Vitest + Storybook 覆盖左/右/双侧固定场景。

---

## 2. 非目标（本期不做）

- 自动行高（`autoHeight`）。
- 三栏拆分 DOM（左 | 中 | 右独立滚动容器）。
- 列拖拽改宽、列冻结条拖动调整。
- 树、分组、合并、编辑。
- 为固定列单独扩大量 `grid-core` 公共 API（偏移可在 UI 内计算；重复严重时再抽私有 helper）。

---

## 3. 架构选型

采用 **CSS `position: sticky`（方案 1）**：

```text
可见列（!hidden）
  → 分区：leftFixed | scrollable | rightFixed
  → 左侧前置：选择列（若开）+ 序号列（若开）始终算 left sticky
  → 累计 left / right 偏移（px）

表头行 / 数据行（同一套列序与偏移）
  → 左固定：sticky; left: offset; 较高 z-index
  → 右固定：sticky; right: offset; 较高 z-index
  → 中间列：正常流

body（已有 overflow auto）
  → 纵向：P0/P1 虚拟窗口（pageRows）
  → 横向：同一容器滚动；sticky 列钉住
```

**不采用**：三栏拆分；本期强制把偏移算法升格为 grid-core 公开模块。

---

## 4. API

### 4.1 列字段

在 `@component-ai/grid-core` 的 `GridColumn` 上增加：

```ts
fixed?: "left" | "right";
```

| 值 | 行为 |
|----|------|
| 缺省 / `undefined` | 随横向滚动 |
| `'left'` | 左固定（在选择列/序号列之后，按 columns 顺序叠 sticky left） |
| `'right'` | 右固定（按从右到左累加 `right`） |

非法值：忽略；开发环境可 `console.warn`。

无新的 VirtualGrid 根级 props（不提供 `fixedLeftCount` 等）。

### 4.2 隐式左固定

| 区域 | 宽度 | 条件 |
|------|------|------|
| 选择列 | `48px`（`w-12`） | `selectionMode !== 'none'` |
| 序号列 | `56px`（`w-14`） | `showRowNumber === true` |

二者始终 `position: sticky; left: …`，排在所有 `fixed: 'left'` 数据列之前。

---

## 5. 布局与偏移规则

**写死**

1. 仅 `!hidden` 的列参与布局与偏移。  
2. **左链**顺序：`[选择?] → [序号?] → [fixed:'left' 列按 columns 顺序]`。  
   每个节点的 `left` = 其左侧所有左链节点宽度之和。  
3. **右链**：所有 `fixed: 'right'` 的可见列；从**视觉最右侧**一列起 `right: 0`，向左累加宽度得到各列 `right`。列在行内的 DOM 顺序仍与 `columns` 一致（中间可滚动列夹在左右固定之间）。  
4. 列宽缺省：`120`（与 P0 一致）。  
5. 分隔：左固定区右缘、右固定区左缘加浅阴影；z-index 表头固定 > 表体固定 > 普通单元格（实现 plan 写死具体 class / z 值）。  
6. 表头与表体使用**同一套**偏移计算结果，避免错位。

**行内列渲染顺序（写死）**

```text
选择? | 序号? | left-fixed data… | scrollable data… | right-fixed data…
```

（`right-fixed` 在 columns 中的相对顺序保持不变，只是贴在行尾侧用 sticky right。）

---

## 6. 与现有能力的关系

| 能力 | 关系 |
|------|------|
| 纵向虚拟 | 不变；窗口仍基于 `pageRows` |
| 分页 / 选中 | 不变；选择列参与左 sticky |
| 横向滚动 | body 容器 `overflow: auto`（已有）；内容总宽超过容器时出现横滚 |
| 分页底栏 | 在表格卡片外，不参与横向 sticky |
| 模板 render/slot | 固定列单元格同样适用 |

---

## 7. 错误与边界

| 情况 | 行为 |
|------|------|
| 无 fixed、未开选中/序号 | 与 P1 相同 |
| 仅开选中/序号 | 仅这两列 sticky left |
| 所有数据列都左固定 | 允许；可能无横向滚动条 |
| 列宽总和 < 容器宽 | sticky 仍正确 |
| `enableVirtual` + 固定列 | 支持 |
| 同一列不能同时左右固定 | API 只有一个 `fixed` 字段 |

---

## 8. 视觉

- 沿用 P0/P1 slate / sky 体系。  
- 固定列背景不透明（`bg-white` / 表头 `bg-slate-50`，斑马纹行用对应底），避免横滚时透出下层单元格。  
- 阴影克制，不引入新主题色。

---

## 9. 测试与完成定义

| 层 | 内容 |
|----|------|
| Vitest 双端 | 左固定列带 `position: sticky` 与预期 `left`；选择列/序号列 sticky；右固定带预期 `right`；`hidden` 不进偏移链；有固定列时总内容宽度仍可横滚（可测 style / class） |
| Storybook | `FixedLeft`、`FixedRight`、`FixedBoth`（限宽容器 + 选中 + 序号 + 多列） |
| 手工 | 横滚时表头/表体对齐、阴影分隔（验收清单，不阻塞合入） |

**完成定义**：双端导出类型含 `fixed`；测试绿；上述 Story 可演示；无 autoHeight、无三栏拆分。

---

## 10. 实现顺序（摘要）

1. `grid-core`：`GridColumn` 增加 `fixed?`（类型 + 如有导出文档）。  
2. React：偏移计算 + sticky 接线 + 失败测试先行 → stories。  
3. Vue：对称实现 + 测试 + stories。  
4. 更新 roadmap：链接 P2 计划；勾选完成后指向下一批（P3 或 autoHeight）。

详细任务见后续 `docs/superpowers/plans/2026-07-10-virtual-grid-p2.md`（writing-plans）。
