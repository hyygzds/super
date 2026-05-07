# Tabs 实现计划 — 按 Task 追加 Reviewer 协议

执行计划：`docs/superpowers/plans/2026-05-07-tabs.md`  
设计规格：`docs/superpowers/specs/2026-05-07-tabs-design.md`

---

## 流程（每个 Task 完成后强制执行）

顺序：**实现合并 → Spec 合规评审 → 代码质量评审 → 标记 Task 完成 → 进入下一 Task**。

不允许：Spec 未通过就做代码质量评审；评审未闭环就开下一 Task。

---

## Reviewer A — Spec 合规（对照设计规格）

由评审者（人或子代理）逐条勾选；任一项 **不符合** 则退回实现。

### Task 1 — Vitest / 工具链（react-ui）

- [ ] `vitest` + `@testing-library/react` + `jsdom` + `test`/`test:watch` 脚本可用。
- [ ] 测试文件不会被打进 **库的 d.ts**（构建配置排除 `*.test.*` 或等价手段）。

### Task 2 — 失败测试先行

- [ ] 存在覆盖「默认激活 + 点击切换」的用例，且在实现前曾失败、实现后通过。

### Task 3 — React Tabs 实现

- [ ] 四个导出：`Tabs`、`TabsList`、`TabsTrigger`、`TabsPanel`。
- [ ] `orientation`：`horizontal` | `vertical`；`TabsList` 上 `aria-orientation` 一致。
- [ ] 受控：`value !== undefined`（与 Select 一致）；非受控：`defaultValue` / 首项可用规则。
- [ ] **自动激活**：Trigger `onFocus` 更新当前值。
- [ ] 键盘：横向仅 Left/Right；纵向仅 Up/Down；Home/End；正交方向箭头不切换。
- [ ] ARIA：`tablist` / `tab` / `tabpanel`、`aria-selected`、`tabIndex` 0/-1、`aria-labelledby`、`hidden` 非激活面板。
- [ ] 视觉：横向底部强调、纵向左侧强调；禁用样式与焦点环与库内一致。
- [ ] 重复 `value`：开发环境 `console.warn`。

### Task 4 — React 补充测试

- [ ] 覆盖「箭头跳过禁用 Tab」或等价键盘行为。

### Task 5–6 — vue-ui Vitest + Tabs

- [ ] 与 React **行为与 API 语义对齐**（`modelValue` / `update:modelValue` / `class`）。
- [ ] `npm run test -w @component-ai/vue-ui` 与 `npm run build -w @component-ai/vue-ui` 通过。

### Task 7 — 文档索引

- [ ] `docs/tabs-index.md` 链到规格与计划。

---

## Reviewer B — 代码质量

- [ ] **边界**：无无关重构；未改 Button/Select 对外契约。
- [ ] **类型**：`npm run build -w @component-ai/react-ui`（及 vue-ui）无 TS 错误；组件源码避免未声明的 `process`（优先 `import.meta.env.DEV`）。
- [ ] **测试**：对带 `hidden` 的 `tabpanel` 查询使用 `{ hidden: true }`，或通过文本定位 DOM 节点（避免默认可访问性树排除导致误报）。
- [ ] **重复与复杂度**：注册顺序用可预测的 React state，避免脆弱依赖。
- [ ] **提交**：粒度清晰（feat / test / chore / docs）。

---

## 子代理提示词（可直接粘贴）

### Spec reviewer

```text
你是 Spec 合规评审。只读 docs/superpowers/specs/2026-05-07-tabs-design.md 与当前 Task 相关 diff。
列出：符合项 / 不符合项（须引用规格章节）。不符合则给出最小修改建议。不要写实现代码除非仅为示例一行。
```

### Code quality reviewer

```text
你是代码质量评审。对照仓库现有 Button/Select 风格，检查可读性、类型安全、测试可靠性、构建配置（尤其 d.ts 是否排除测试）。
列出：问题严重程度 + 建议；不要求重写架构除非存在明显缺陷。
```

---

## 评审快照（2026-05-07）

- Task 1–2 已提交；Task 3 实现曾在工作区但未闭环。
- **代码质量**：建议在 `vite.config.ts` 的 `vite-plugin-dts` 中 **exclude** `**/*.test.*` 与 `vitest.setup.ts`；`Tabs` 内开发告警使用 **`import.meta.env.DEV`**。
- **测试**：隐藏面板可用 `getByRole(..., { hidden: true })` 或 `getByText(...).closest('[role="tabpanel"]')`。
