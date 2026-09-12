# DatePicker（日期选择）— 设计规格（Design Spec）

**日期**：2026-09-12  
**状态**：已定稿  
**关联实现**：`@component-ai/form-core`、`@component-ai/react-ui`、`@component-ai/vue-ui`  
**来源**：GitHub issue #15「日期组件不完整」

---

## 1. 背景与目标

表单体系规格将 `DatePicker` / `TimePicker` 列为后续单项。仓库现有 `Input` 只支持 `text` / `password` / `search`，没有可独立使用的日期控件，业务表单无法稳定选择日期。

**成功标准**

- 用户可打开月历、点选一天，得到 `YYYY-MM-DD` 字符串。
- `value` 受控 / `defaultValue` 非受控，受控优先；变更一律回调。
- React / Vue 行为对齐；视觉走现有 Tailwind 皮肤。
- 日历网格算法放在 `form-core`，双端只做渲染与交互胶水。
- 触发框只消费已导出的 `Input` 公开 API；翻月 / 今天只消费已导出的 `Button`。

---

## 2. 非目标（本期不做）

- 时间选择、日期时间、日期范围、多选日期。
- 自定义格式（仅 `YYYY-MM-DD`）、周起始可配、农历、快捷区间。
- 年/月独立选择面板（本期用上一月 / 下一月翻页）。
- 完整 i18n（默认中文星期与「今天」）。
- 像素级复刻 Farris / Ant Design 外观。

---

## 3. 架构选型

**方案 1（采用）：`form-core` 纯函数生成月历网格 + 双端薄 DatePicker。**  
解析、格式化、翻月、范围判断、6×7 网格是跨框架算法，应进 `form-core`，与 `grid-core` 的共享核心策略一致。

**方案 2（不采用）：双端各自写日历算法。** 行为易分叉。

**方案 3（不采用）：只包一层原生 `input[type=date]`。** 浏览器皮肤与交互不一致，无法对齐双端 Story / 测试，也解释不了「不完整」——原生控件本身就不可作为库组件交付。

---

## 4. 值与日历语义

- 对外值：`string`，合法日历日用 `YYYY-MM-DD`，空值用 `""`。
- 非法字符串（`2026-02-31`、缺零、乱码）视为空，不渲染为选中。
- 周起始：**周一**（ISO / 国内习惯）。
- `buildMonthGrid(year, month)` 固定返回 **42** 个格子（6 周 × 7 天），含上月末与下月初日；`inCurrentMonth` 标记是否属于 `month`（1–12）。
- 打开面板时，展示月 = 当前合法值所在月，否则本地今天所在月。
- 点选当前月或相邻月格子：写入该日 ISO 并关闭面板。
- `minDate` / `maxDate`（可选，ISO）：范围外格子 disabled，不可选；「今天」若越界也 disabled。
- 翻月只改面板视图，不改值。

---

## 5. API

### 5.1 共性

| 概念 | 说明 |
|------|------|
| `placeholder` | 默认 `请选择日期` |
| `disabled` | 整控件禁用，默认 `false` |
| `clearable` | 默认 `true`；走 `Input` 的清除按钮，清空为 `""` |
| `minDate` / `maxDate` | 可选 `YYYY-MM-DD` |
| 样式 | React `className` / Vue `class` |
| `id` | 传给内部 `Input` |

### 5.2 值

| 概念 | React | Vue |
|------|-------|-----|
| 受控 | `value?: string` | `modelValue?: string` |
| 非受控初始 | `defaultValue?: string`（默认 `""`） | `defaultModelValue?: string`（默认 `""`） |
| 变更 | `onChange(next: string)` | `update:modelValue` |
| 失焦 | `onBlur` | `blur` |

受控优先：`value ?? uncontrolled`。变更 **一律** 触发回调。

### 5.3 Input 补齐

DatePicker 触发框使用只读 `Input`，避免把半截输入当成日期。本期给双端 `Input` 增加公开 `readOnly`（默认 `false`），DatePicker 传入 `readOnly`。

---

## 6. 结构、无障碍与视觉

- 根：`relative` 容器，`aria-label` 默认 `日期选择`。
- 触发：只读 `Input` + 一枚 `Button`（`variant="ghost"`，`aria-label="打开日历"`，`aria-expanded` / `aria-haspopup="dialog"`）。点击输入框或该按钮打开/切换面板。
- 面板：`role="dialog"`，`aria-label="选择日期"`。点击外部或 Escape 关闭。
- 月标题：`2026年9月`；左右翻月按钮 `aria-label="上个月"` / `下个月`。
- 日网格：`role="grid"`；星期行 `一二三四五六日`；日按钮 `aria-label` 用 ISO 日。选中日 `aria-selected="true"`。
- 「今天」按钮：`aria-label="今天"`，写入本地今天并关面板（越界则 disabled）。
- Tailwind：slate / sky，与 Input / Select 面板一致（白底、边框、阴影）。

---

## 7. 测试

| 层 | 覆盖 |
|----|------|
| form-core | 解析/格式化；2026-09 网格从周一对齐且含 42 格；翻月跨年；范围判断 |
| Input | `readOnly` 时不可改值 |
| React DatePicker | 非受控选日回调；受控不擅自改显示；清除；min/max 不可选；关面板 |
| Vue DatePicker | 与 React 镜像（`modelValue` / `update:modelValue`） |

---

## 8. 完成定义

- 双端导出 `DatePicker`；Story 可演示基础 / 受控 / 范围。
- 上表测试通过；`form-core` / `react-ui` / `vue-ui` 可构建。
- Form 可用公开 `value`/`onChange`（或 Vue `modelValue`）接入，本期不强制新增 Form Story。

---

## 9. Self-review

- 无 TBD。范围仅单日选择，与 issue「日期组件不完整」对齐，不把 TimePicker / Range 塞进来。
- 值只用 ISO 字符串，避免 Date 对象时区歧义。
- `Input.readOnly` 是依赖件公开 API 补齐，不是 DatePicker 内私有伪输入框。
