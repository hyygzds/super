# DatePicker（日期选择）— 设计规格（Design Spec）

**日期**：2026-09-12  
**状态**：已定稿  
**关联实现**：`@component-ai/form-core`、`@component-ai/react-ui`、`@component-ai/vue-ui`  
**来源**：GitHub issue #15「日期组件不完整」

---

## 1. 背景与目标

表单规格将 `DatePicker` 列为后续独立项（[`2026-07-13-form-system-design.md`](./2026-07-13-form-system-design.md) §2）。仓库已有完整 `Input` / `Button`，但没有可独立使用的日期选择器——业务只能用原生 `input[type=date]` 或手写日历，两端行为无法对齐。

**成功标准**

- 点击输入框打开月历，点某一天写入 `YYYY-MM-DD` 并关闭面板。
- `value` 受控 / `defaultValue` 非受控，受控优先；清空得到空字符串。
- React / Vue 行为对齐；视觉走现有 Tailwind 皮肤。
- 日历网格、解析/格式化等纯算法放在 `form-core`，双端只做渲染胶水。
- 只消费已导出的 `Input`、`Button` 公开 API，不内嵌半成品输入框/按钮。

---

## 2. 非目标（本期不做）

- 日期范围、日期时间、周/月/年面板、多选。
- 自定义 `format`（展示与值一律 `YYYY-MM-DD`）。
- 农历、时区、国际化包（默认中文文案；周起始周一）。
- `disabledDate` 函数、快捷区间、底部「确定」。
- `Form.Item` 接线 Story（控件必须能独立使用；Form 可后续用公开 `value` / `modelValue`）。
- 像素级复刻 Farris / Ant Design 外观。

---

## 3. 架构选型

**方案 1（采用）：`form-core` 纯函数 + 双端薄 UI。**  
日历网格、ISO 解析/格式化、月份加减、min/max 判定是跨框架算法，放入已有 `@component-ai/form-core`（两端已依赖），不新开 `date-core`。

**方案 2（不采用）：独立 `@component-ai/date-core`。** 对单组件过重。

**方案 3（不采用）：只做 React，或两端各写一份日历算法。** 与双端约定和共享核心策略冲突。

---

## 4. 值与日历语义

- 对外值是 **`string`**：合法日历日为 `YYYY-MM-DD`，未选为 `""`。不用 `Date` 对象（避免时区偏移把「当地日」错成前一天）。
- `parseIsoDate`：仅接受完整 `YYYY-MM-DD` 且能构成真实公历日（拒绝 `2026-02-31`）；否则 `null`。
- `formatIsoDate`：用本地年月日拼 `YYYY-MM-DD`，不走 `toISOString()`。
- 月历：给定 `year` + `month`（1–12），生成 **6×7** 格；周起始 **周一**；表头 `一 … 日`。
- 邻月日期照常渲染（弱化样式），可选中（除非越出 `minDate` / `maxDate`）。
- `minDate` / `maxDate` 为可选 `YYYY-MM-DD`；越界格 `disabled`，不可选。
- 打开面板时：有合法值则展示该值所在月，否则展示「今天」所在月。
- 点选合法日后：写入值、触发变更、**关闭面板**。
- 「今天」快捷：若今日未越界则写入今日并关闭；越界则按钮禁用。

---

## 5. API

### 5.1 共性

| 概念 | 说明 |
|------|------|
| `placeholder` | 默认 `请选择日期` |
| `disabled` | 整控件禁用：不能打开、不能清除，默认 `false` |
| `clearable` | 有值且未禁用时显示清除，默认 `true` |
| `minDate` / `maxDate` | 可选 `YYYY-MM-DD` |
| `id` | 传到内部 `Input`，供 `FormItem` `htmlFor` |
| 样式 | React `className` / Vue `class` |

`Input` 增加公开 `readOnly`（默认 `false`），供 DatePicker 展示值且禁止键盘改写。清除仍走 `Input` 已有 `clearable`。

### 5.2 值

| 概念 | React | Vue |
|------|-------|-----|
| 受控 | `value?: string` | `modelValue?: string` |
| 非受控初始 | `defaultValue?: string`（默认 `""`） | `defaultModelValue?: string`（默认 `""`） |
| 变更 | `onChange(next: string)` | `update:modelValue`（payload `string`） |
| 失焦 | `onBlur` | `blur` |

受控优先：`value ?? uncontrolled`。变更 **一律** 触发回调，不管受控与否。非法初始值按空字符串展示。

---

## 6. 结构、无障碍与视觉

- 根：`relative` 容器。
- 触发：导出的 `Input`（`readOnly`），点击/聚焦打开面板；`aria-haspopup="dialog"`、`aria-expanded`。
- 面板：`role="dialog"`，`aria-label="日期选择"`。点击外部或 `Escape` 关闭。
- 月导航：导出的 `Button` `variant="ghost"`，`aria-label` 为 `上个月` / `下个月`。标题 `YYYY年M月`。
- 日网格：`role="grid"`；日按钮 `role="gridcell"`，`aria-label` 用该日 `YYYY-MM-DD`，选中 `aria-selected="true"`，今日加 `data-today`。
- 底部「今天」：`Button` `variant="secondary"`，`aria-label="今天"`。
- 清除：`Input` 的 `aria-label="清除"`，写入 `""`；不因清除而强制打开面板。

Tailwind：slate/sky 色板，与 Input / Select 一致；选中日 `bg-sky-600 text-white`；今日未选中为 `ring-1 ring-sky-600`；邻月 `text-slate-400`。

---

## 7. 测试

| 层 | 覆盖 |
|----|------|
| form-core | `parseIsoDate` / `formatIsoDate`；`2026-09` 网格（1 日周二、周一起始含 8-31）；越界格 disabled；`addMonths` 跨年 |
| React | 非受控展示；打开后点日回调并关闭；受控不擅自改显示；清除为空串；disabled 不能开；minDate 日不可点；上个月翻页 |
| Vue | 与 React 镜像（`modelValue` / `update:modelValue`） |
| Input | `readOnly` 时不能键入改值 |

---

## 8. 完成定义

- `form-core` 导出日期纯函数与 `CalendarCell` / `CalendarGrid` 类型。
- 双端导出 `DatePicker`。
- Story：Basic、Controlled、Disabled、MinMax。
- 相关单测与 `form-core` / `react-ui` / `vue-ui` 构建通过。
- Storybook 目视确认（人工；agent 可代为浏览器走查但 checkbox 不勾）。

---

## 9. 文档与执行

- 实现计划：[`docs/superpowers/plans/2026-09-12-datepicker.md`](../plans/2026-09-12-datepicker.md)
- Form roadmap 增加 DatePicker 一行；不改 VirtualGrid roadmap。
