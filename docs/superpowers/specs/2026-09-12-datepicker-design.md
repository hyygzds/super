# DatePicker（日期选择）— 设计规格（Design Spec）

**日期**：2026-09-12  
**状态**：已定稿  
**关联实现**：`@component-ai/form-core`、`@component-ai/react-ui`、`@component-ai/vue-ui`  
**来源**：GitHub issue #15「日期组件不完整」

---

## 1. 背景与目标

表单规格 [`2026-07-13-form-system-design.md`](./2026-07-13-form-system-design.md) §2 将 `DatePicker` 列为后续单独立项。仓库已有完整 `Input` / `Form`，但没有可独立使用的日期控件：`Input` 的 `type` 仅 `text | password | search`，业务无法用公开 API 选日期。

**成功标准**

- 输入框 + 月历弹层，点选一天得到 `YYYY-MM-DD` 字符串（本地日历日，不用 `Date` 对象，避免时区偏移）。
- `value` 受控 / `defaultValue` 非受控，受控优先。
- React / Vue 行为对齐；视觉走现有 Tailwind 皮肤。
- 日历网格、解析/格式化、区间判断等纯算法落在 `form-core`，双端只做渲染与交互胶水。
- 文本框使用已导出的 `Input`，不内嵌半成品输入框。

---

## 2. 非目标（本期不做）

- 时间选择（`DateTimePicker`）、日期范围（`DateRangePicker`）、多选日期。
- 农历、周数、季度、十年面板。
- 自定义日期格式（展示与值都固定 `YYYY-MM-DD`）。
- `disabledDate` 函数（只用 `min` / `max`）。
- 完整 i18n（星期/按钮默认中文）。
- Form.Item 专项 Story（控件必须能独立使用；Form 可后续用公开 `value` / `modelValue` 接入）。
- 像素级复刻 Farris / Ant Design 外观。

---

## 3. 架构选型

考虑过三种做法：

| 方案 | 说明 | 结论 |
|------|------|------|
| **1. form-core 日历算法 + 双端 DatePicker** | 网格/解析/区间是跨框架纯函数；UI 薄适配 | **采用** |
| 2. 新开 `@component-ai/date-core` | 单组件不够摊一个包 | 不采用 |
| 3. 只给 `Input` 加 `type="date"` | 原生控件各浏览器不一致，也无法对齐月历/禁用日/今日 | 不采用（「日期组件不完整」） |

---

## 4. 值与日历语义

- 对外值：`string`，合法值为 `YYYY-MM-DD` 或 `""`（空）。
- 解析：严格匹配 `^\d{4}-\d{2}-\d{2}$` 且为真实公历日（拒绝 `2026-02-31`）。按**本地日历**解释，不经 UTC。
- 月历：6×7 = 42 格；星期从周日开始，表头 `日 一 二 三 四 五 六`。
- 邻月日期照常渲染（弱化样式），可点选；点选后值变为该日，可见月切到该日所在月。
- `min` / `max`（同为 `YYYY-MM-DD`）：区间外格子 `disabled`，不可选；非法或空的 min/max 忽略。
- 「今天」：本地当天 ISO；若落在 min/max 外则按钮禁用。
- 打开弹层时，可见月 = 当前值所在月；值为空则用今天所在月。

手输：

- 聚焦后输入框为草稿，不立刻 `onChange`。
- 失焦：草稿为 `""` 或合法且在区间内的 ISO → 提交；否则回显当前值且不发变更。
- 点清除：立即提交 `""`。
- 点格子 / 「今天」：立即提交并关层。

---

## 5. API

### 5.1 值

| 概念 | React | Vue |
|------|-------|-----|
| 受控 | `value?: string` | `modelValue?: string` |
| 非受控初始 | `defaultValue?: string`（默认 `""`） | `defaultModelValue?: string`（默认 `""`） |
| 变更 | `onChange(next: string)` | `update:modelValue`（payload `string`） |
| 失焦 | `onBlur?(event)` | `blur` |

受控优先：`value ?? uncontrolled`。变更一律触发回调，不管受控与否。

### 5.2 其它

| 概念 | 说明 |
|------|------|
| `placeholder` | 默认 `请选择日期` |
| `clearable` | 默认 `false`；有值且未 disabled 时显示清除（走 `Input` 公开 API） |
| `disabled` | 整控件禁用：不能打开月历、不能输入、不能清除 |
| `min` / `max` | 可选 `YYYY-MM-DD` |
| `id` | 传到内部 `Input` |
| 样式 | React `className` / Vue `class` |

不另暴露 `format`、`picker`、`showToday` 开关（今日按钮始终在面板底部）。

### 5.3 form-core 导出

```ts
type CalendarYmd = { y: number; m: number; d: number }; // m = 1–12
type CalendarCell = {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
  disabled: boolean;
};

parseIsoDate(value: string): CalendarYmd | null
formatIsoDate(ymd: CalendarYmd): string
isValidIsoDate(value: string): boolean
compareIsoDate(a: string, b: string): number | null
isIsoDateInRange(value: string, min?: string, max?: string): boolean
addMonths(ymd: CalendarYmd, delta: number): CalendarYmd
daysInMonth(y: number, m: number): number
todayIso(now?: Date): string
visibleMonthFromValue(value: string, now?: Date): { y: number; m: number }
buildMonthGrid(year: number, month: number, options?: {
  min?: string;
  max?: string;
  weekStartsOn?: 0 | 1; // 默认 0（周日）
}): CalendarCell[]
```

---

## 6. 结构、无障碍与视觉

根节点：`relative` 容器。

- 文本：已导出 `Input`（`type="text"`，`placeholder` / `clearable` / `disabled` / `id` 下传）。
- 日历按钮：`type="button"`，`aria-label="打开日历"`，`aria-expanded`，`aria-haspopup="dialog"`；点输入框或按钮均可开层（disabled 除外）。
- 弹层：`role="dialog"`，`aria-label="选择日期"`。点组件外 `pointerdown` 关闭（对齐 `Select`）。
- 月导航：上一年 / 上一月 / 「2026年3月」 / 下一月 / 下一年，按钮 `aria-label` 分别为 `上一年` `上一月` `下一月` `下一年`。
- 日期表：`role="grid"`；星期行 + 6 行格子；选中格 `aria-selected="true"`；禁用格 `aria-disabled="true"`。
- 底部：`今天` 按钮。
- Escape 关层。

Tailwind：边框 `border-slate-200/300`，选中日 `bg-sky-600 text-white`，今日未选中描边 `ring-1 ring-sky-600`，邻月 `text-slate-400`，与 Input / Select 的 slate/sky 色板一致。

---

## 7. 测试

| 层 | 覆盖 |
|----|------|
| form-core | 解析合法/非法日；2 月闰年；`buildMonthGrid` 起止格与 42 格；min/max 禁用；`addMonths` 跨年与夹日 |
| React | 非受控 `defaultValue` 展示；点格提交并关层；受控不内部翻转；min/max 不可选；disabled；clearable；今天 |
| Vue | 与 React 镜像（`modelValue` / `update:modelValue`） |

---

## 8. 完成定义

- `form-core` 导出日历纯函数；双端导出 `DatePicker`。
- Story：Basic、Controlled、MinMax、Disabled。
- 相关单测与 `form-core` / `react-ui` / `vue-ui` 构建通过。
- Storybook 目视确认（人工；agent 可代为浏览器走查但 checkbox 不勾）。

---

## 9. 文档与执行

- 实现计划：[`docs/superpowers/plans/2026-09-12-datepicker.md`](../plans/2026-09-12-datepicker.md)
- 在 Form roadmap 增加独立后续项指针，不改 P0–P3 已完成结论。
