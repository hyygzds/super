# Form P3 — 嵌套路径 / Form.List / validateTrigger 设计规格

**日期**：2026-08-14  
**状态**：已定稿（验证收口任务；范围来自交付目标）  
**关联实现**：`@component-ai/form-core`、`@component-ai/react-ui`、`@component-ai/vue-ui`  
**Roadmap 索引**：[`docs/superpowers/plans/2026-07-13-form-roadmap.md`](../plans/2026-07-13-form-roadmap.md)

---

## 1. 背景与目标

P0–P2 已交付扁平 `name` 的 Form/FormItem 与原子控件。业务表单需要：

- 嵌套字段路径（对象 / 数组）
- 动态数组字段（`Form.List`）
- 可配置校验触发（blur / change）
- 依赖字段变更时联动重校验（如确认密码）

**成功标准**

- `name="user.email"` / `name={['users', 0, 'name']}` 读写嵌套 `values`
- `Form.List` 可增删数组项；子 `FormItem` 相对路径正确收集
- `validateTrigger` 支持 `blur`（默认）与 `change`
- `dependencies` 在依赖字段值变化后重跑本字段校验
- React / Vue 行为对齐；`form-core` 承载路径与依赖逻辑

---

## 2. 非目标

- JSON Schema 驱动渲染
- `dependencies` 的深度监听（仅字段值 `setFieldValue` 触发）
- List 拖拽排序、虚拟列表
- 修改 P0 默认行为：未指定时仍为 **blur 校验、change 不校验**

---

## 3. 路径约定

| 形式 | 示例 | 归一化 key |
|------|------|------------|
| 点分字符串 | `user.address.city` | `user.address.city` |
| 下标 | `users.0.name` 或 `users[0].name` | `users.0.name` |
| 数组 NamePath | `['users', 0, 'name']` | `users.0.name` |

- Store 的字段注册表以 **归一化 string key** 为键
- `values` 树为嵌套对象/数组（非扁平 `"user.email"` 顶层键）
- 无点号的单段名保持 P0 扁平行为

`form-core` 导出：`parseNamePath`、`joinNamePath`、`getValueAtPath`、`setValueAtPath`、`normalizeNamePath`

---

## 4. Store 扩展

在既有 `createFormStore` 上：

1. `getFieldValue` / `setFieldValue` / `setFieldsValue` / `resetFields` 走路径工具读写嵌套树
2. `registerField(name, { rules?, dependencies? })`；`dependencies` 为其它字段的 NamePath 列表
3. `setFieldValue(name, value)` 之后：对该字段上登记了 `dependencies` 包含 `name` 的字段调用 `validateField`（异步 fire-and-forget，与手动校验相同）
4. `getFieldsValue()` 返回整棵嵌套 `values` 快照

---

## 5. FormItem API 增量

| Prop | 说明 |
|------|------|
| `name` | `string \| Array<string \| number>`（NamePath） |
| `validateTrigger` | `'blur' \| 'change' \| Array<'blur' \| 'change'>`；默认 `'blur'` |
| `dependencies` | `Array<string \| Array<string \| number>>`；依赖字段变更时重校验本字段 |

校验触发：

- 含 `blur` → 子控件 blur 时 `validateField`
- 含 `change` → 设值后 `validateField`
- 默认仅 `blur`（与 P0 一致）

List 上下文：若存在 `Form.List` 提供的 list name，且 `name` 为相对 NamePath（数组或以相对段开头），则拼成 `listName + name`。

---

## 6. Form.List

### React

```tsx
<Form.List name="users">
  {(fields, { add, remove }) => (
    <>
      {fields.map((field) => (
        <div key={field.key}>
          <FormItem name={[field.name, "first"]}>
            <Input />
          </FormItem>
          <button type="button" onClick={() => remove(field.name)}>删除</button>
        </div>
      ))}
      <button type="button" onClick={() => add()}>添加</button>
    </>
  )}
</Form.List>
```

- `fields`: `{ key: number; name: number }[]`（`name` 为当前下标；`key` 稳定递增）
- `add(defaultValue?)`：向数组末尾 push（默认 `{}`）
- `remove(index)`：按索引 splice
- 通过 React context 提供 `listName`，供 FormItem 拼接相对路径
- 挂到 `Form.List`（与 `FormItem` 并列导出亦可 `FormList`）

### Vue

同语义：默认插槽为函数，或具名 scoped slot `default` 接收 `{ fields, add, remove }`；`FormList` 组件 + `Form.List` 别名（若 TSX 允许则挂属性）。

---

## 7. 测试

| 层 | 覆盖 |
|----|------|
| form-core | 路径 get/set、嵌套 validate、dependencies 重校验、数组路径 |
| React Form | 嵌套 submit、validateTrigger=change、dependencies、Form.List add/remove |
| Vue Form | 与 React 镜像 |

---

## 8. 完成定义

- form-core / react-ui / vue-ui 构建与相关单测通过
- Story 至少各一端演示嵌套 + List + change 触发（目视确认仍属人工）
- Roadmap 增加 P3 行并链到本规格与实现计划
