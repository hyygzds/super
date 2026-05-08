# Select 组件 — 开发者 API 参考

**包**：`@component-ai/react-ui` · `@component-ai/vue-ui`  
**关联文档**：[PRD](./select-prd.md) · [交互稿](./select-interaction-spec.md)

---

## 1. 源码位置

| 栈 | 路径 |
|----|------|
| React | `packages/react-ui/src/components/Select.tsx` |
| Vue | `packages/vue-ui/src/components/Select.tsx` |

入口导出：

- React：`Select`、`SelectProps<T>`
- Vue：默认导出组件名 `Select`，另导出类型 `SelectLoadFn`

---

## 2. 样式（必做）

```text
import "@component-ai/react-ui/style.css";
/* 或 */
import "@component-ai/vue-ui/style.css";
```

未引入则 Tailwind 工具类不会作用于组件 DOM。

---

## 3. 类型与受控约定

- **选中值**：均为 **`string`**（由 `getOptionValue` 决定；默认映射会把 `number` 等 `String(...)`）。
- **React 受控**：传入 `value`（且类型上为 `string | undefined`）即视为受控；内部用 `value !== undefined` 判断（注意：`undefined` 与非受控切换）。
- **Vue 受控**：使用 `v-model` / `modelValue`；是否受控以实现为准（见包内 props）。
- **Vue 根节点 class**：prop 名为 **`class`**（非 `className`）。

---

## 4. Props / 事件对照表

| 能力 | React (`SelectProps<T>`) | Vue |
|------|---------------------------|-----|
| 同步选项 | `options?: T[]` | `options`，默认 `[]` |
| 异步加载 | `loadOptions?` | `loadOptions?`，类型 `SelectLoadFn` |
| 映射 | `getOptionValue` / `getOptionLabel` / `getOptionDisabled` | 同名可选 props |
| 本地过滤 | `filterOption?(item, query)` | 同名 |
| 搜索框 | `filterable?`，**默认 `true`** | 同名 |
| 防抖 | `debounceMs?`，**默认 `300`** | 同名 |
| 受控值 | `value?: string` | `modelValue?: string` |
| 非受控初值 | `defaultValue?: string` | `defaultModelValue?: string` |
| 变更 | `onChange?(string \| undefined)` | `update:modelValue`、`change` |
| 占位 | `placeholder?`，默认「请选择」 | 同名 |
| 禁用 | `disabled?` | 同名 |
| 根 class | `className?` | `class?`，默认 `""` |
| 空状态 UI | `emptyContent?: ReactNode` | 插槽 `#empty` |

---

## 5. `loadOptions`（异步）

```ts
type LoadInput = {
  query: string;
  signal: AbortSignal;
};

// React：SelectProps<T>['loadOptions']
// Vue：SelectLoadFn（包入口导出）
type LoadOptions = (input: LoadInput) => Promise<T[]>;
```

行为摘要：

- 面板 **打开** 且存在 `loadOptions` 时会发起请求；**初始 `query` 为空字符串** 也会触发（便于拉首屏数据）。
- **非空** `query` 在输入过程中经 **`debounceMs`** 防抖后再触发；**空字符串**路径下 **`debouncedQuery` 立即为 `''`**，不因防抖推迟首开（与实现对齐）。
- 新请求开始前会 **abort** 上一轮 `signal`；组件卸载时同样中止。
- 业务侧应将 `signal` 传给 `fetch` 等；捕获并忽略 **`AbortError`**。
- 请求失败或非中止错误：当前实现将列表置为 **`[]`**（参见 PRD）。

---

## 6. 默认选项字段（无自定义映射时）

对象项：

- **`value`**：存在则 `String(value)`（`number` 允许）。
- **`label`**：存在且为 string 则作为展示文案；否则回退到 value 规则。
- **`disabled`**：truthy 则禁用。

非对象：整体 `String(item)` 同时充当 value 与 label。

---

## 7. 数据源互斥

- **仅** `options`：纯前端列表 + 可选本地过滤。
- **存在** `loadOptions`：**不以 `options` 合并结果**；列表仅为异步返回集合。

---

## 8. 示例

### 8.1 React — 同步

```tsx
import { Select } from "@component-ai/react-ui";
import "@component-ai/react-ui/style.css";

<Select
  options={[
    { value: "a", label: "选项 A" },
    { value: "b", label: "选项 B", disabled: true },
  ]}
  value={value}
  onChange={setValue}
/>;
```

### 8.2 React — 异步搜索

```tsx
<Select
  loadOptions={async ({ query, signal }) => {
    const res = await fetch(`/api/options?q=${encodeURIComponent(query)}`, {
      signal,
    });
    return res.json();
  }}
  getOptionValue={(row: { id: string }) => row.id}
  getOptionLabel={(row: { name: string }) => row.name}
/>
```

### 8.3 Vue — `v-model`

```vue
<script setup lang="ts">
import { Select } from "@component-ai/vue-ui";
import "@component-ai/vue-ui/style.css";
import { ref } from "vue";
import type { SelectLoadFn } from "@component-ai/vue-ui";

const selected = ref<string>();

const loadOptions: SelectLoadFn = async ({ query, signal }) => {
  const res = await fetch(`/api/options?q=${encodeURIComponent(query)}`, {
    signal,
  });
  return res.json();
};
</script>

<template>
  <Select v-model="selected" :load-options="loadOptions" class="w-72" />
</template>
```

---

## 9. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-07 | 从总文档拆出 API；与当前实现对齐。 |
