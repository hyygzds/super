# AGENTS.md

本文件面向在本仓库工作的 AI agent，说明工程结构、约定与工作方式。人类贡献者也可参考，但优化目标是让 agent 快速建立正确上下文。

## 这个仓库是什么

`component-ai` 是一个 **React + Vue 双端组件库 monorepo**（Tailwind CSS v4 皮肤），当前主线工作是把 `farris-vue`（`D:\Code\Farris\farris-vue`，另一仓库）里的组件按**能力对齐、视觉重做**的方式迁移进来，起点是 `VirtualGrid`（高性能表格）及其依赖件。`farris-vue` 是**源工程**（读它了解要迁的能力/API 语义），本仓库是**目标工程**（不追求像素级复刻 Farris 外观，只对齐行为语义）。

## Monorepo 结构

```
super-component/
├── packages/
│   ├── grid-core/     # 框架无关的纯 TS 核心：虚拟窗口、分页切片、选中状态机
│   ├── react-ui/      # @component-ai/react-ui —— React 组件 + Tailwind
│   └── vue-ui/        # @component-ai/vue-ui —— Vue 3 组件 + Tailwind
├── apps/
│   ├── storybook-react/  # React Storybook（端口 6006）
│   └── storybook-vue/    # Vue Storybook（端口 6007）
└── docs/
    ├── superpowers/specs/   # 设计规格（做什么、为什么）
    └── superpowers/plans/   # 实现计划（怎么做，含 TDD 步骤 + checkbox）
```

npm workspaces：`packages/*` + `apps/*`。三个包互相独立发布/构建，`react-ui`/`vue-ui` 都依赖 `grid-core`（`dependencies`，非 peer）。

### 架构选型：共享核心 + 双端薄适配

- **`@component-ai/grid-core`**：纯 TypeScript，无 React/Vue/DOM。存放虚拟滚动窗口计算、本地分页切片、选中状态机等**跨框架可复用的算法**。Vitest（`environment: "node"`）测。
- **`@component-ai/react-ui`** / **`@component-ai/vue-ui`**：只做「渲染 + 交互胶水」，把 `grid-core` 的纯函数结果画成 UI。两端**行为语义一致**，但各自遵循自己框架的惯用法（不强行对齐实现细节）。

新增跨框架算法（如树扁平化、合并单元格计算）应先加进 `grid-core`，双端复用，而不是各写一份。

## 已有组件（当前状态）

| 组件 | react-ui | vue-ui | 说明 |
|------|----------|--------|------|
| `Button` | ✅ | ✅ | |
| `Select` | ✅ | ✅ | |
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsPanel` | ✅ | ✅ | |
| `Pagination` | ✅ | ✅ | 受控/非受控双模式；`grid-core` 的 `normalizePageSlice` |
| `Checkbox` | ✅ | ✅ | 受控/非受控 + `indeterminate` |
| `VirtualGrid` | ✅（P0+P1） | ✅（P0+P1） | 基础表 + 纵向虚拟滚动 + 选中 + 本地分页；分期迁移中，见下 |

`VirtualGrid` 是全仓库最大的迁移目标，按 P0–P5 分期（P0 基础表+虚拟滚动、P1 选中+分页 已完成；P2 模板/自动行高/固定列、P3 分组/合并、P4 树/懒加载、P5 编辑/远端分页 未开始）。分期与依赖关系见 [`docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md`](docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md)。

组件源码位置：`packages/{react-ui,vue-ui}/src/components/*.tsx`；同目录放 `*.test.tsx` 和 `*.stories.tsx`。两端导出清单见各包的 `src/index.ts`。

## 硬约束：依赖件先于消费者交付

来自 [`docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md`](docs/superpowers/specs/2026-07-09-virtual-grid-migration-design.md) §5，对所有「大组件依赖小组件」的场景通用（不止 VirtualGrid）：

1. 被依赖的基础组件（如 `Checkbox`、`Pagination`、`Input`）必须先作为**完整、可独立使用的库组件**交付：公开 API、双端行为对齐、Storybook、组件级测试。
2. 消费方（如 `VirtualGrid`）只允许调用依赖件**已导出的公开 API** 接线，不重新实现一份逻辑。
3. 禁止在大组件内部塞一个未导出的半成品控件冒充依赖件。

## API / 代码约定

- **受控/非受控双模式**：所有有「值」概念的组件（`Checkbox`、`Pagination` 的 page/pageSize、`VirtualGrid` 的 `selectedKeys`/`page`）都同时支持 `xxx`（受控）与 `defaultXxx`（非受控初始值），受控优先（`xxxProp ?? uncontrolledState`）。变更一律触发事件回调，不管受控与否。
- **React ↔ Vue 事件命名对应**：React 用 `onXChange`（如 `onSelectedKeysChange`），Vue 用 `update:x`（如 `update:selectedKeys`），语义一一对应，双端测试逐条镜像。
- **Vue 组件写法**：一律 `defineComponent` + TSX render 函数（不用 `<script setup>` SFC），props 用 `PropType`，事件走 `emits` 选项 + `emit(...)`；这是为了让组件在包内被打包为库、类型可导出。
- **列/行等结构化 prop 用扁平对象数组**，不用嵌套配置对象包一堆开关（对齐 `Pagination`/`Checkbox` 自身的扁平 props 风格，即使源 Farris 组件用的是嵌套 config）。
- **样式**：Tailwind v4，通过 `@tailwindcss/vite` 插件在库自身构建时内联提取到 `dist/style.css`（消费方需要额外 `import "@component-ai/react-ui/style.css"`）。不使用 CSS Modules / styled-components。
- **无障碍**：交互组件补 ARIA（`role`、`aria-checked`、`aria-rowindex` 等），可视但非语义的文案用 `sr-only`。

## 测试与构建

| 包 | 测试框架 | 关键命令 |
|----|----------|----------|
| `grid-core` | Vitest（node 环境，纯函数） | `npm run test -w @component-ai/grid-core` |
| `react-ui` | Vitest + Testing Library + `@testing-library/user-event` | `npm run test -w @component-ai/react-ui` |
| `vue-ui` | Vitest + `@vue/test-utils`（`mount`/`findAll`/`trigger`/`setValue`） | `npm run test -w @component-ai/vue-ui` |

常用根命令（PowerShell 下用 `;` 而非 `&&` 串联）：

```bash
npm run build              # 全部 workspace 构建（--if-present）
npm run build:react        # 只构建 react-ui
npm run build:vue          # 只构建 vue-ui
npm run build:grid-core    # 只构建 grid-core
npm run test:grid-core     # 只跑 grid-core 测试
npm run storybook:react    # React Storybook（:6006）
npm run storybook:vue      # Vue Storybook（:6007）
```

单包内也可以 `npm run test -w <pkg> -- <path/to/file>` 只跑一个测试文件；`npm run build -w <pkg>` 单独构建一个包（`vite build`，用 `vite-plugin-dts` 生成 `.d.ts`，ESM only）。

## 工作方式（计划优先，TDD 强制）

本仓库用 **superpowers 系列 skill**（`writing-plans` / `executing-plans` / `subagent-driven-development` / `brainstorming` 等）组织工作，不是 openspec：

1. **大功能先写 spec，再写 plan**：设计规格放 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`（做什么/为什么/API 契约/非目标），实现计划放 `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`（Task/Step 粒度、每步可执行、用 `- [ ]` checkbox 跟踪）。计划文件顶部固定写：`> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans ...`。
2. **一个大迁移拆成多份可独立交付的子计划**（参考 `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md` 的拆分方式），每份子计划结束时都应有：**可构建包 / 可跑测试 / 可演示 Story（若适用）**。范围收窄的取舍（哪些先不做）要在计划的 Self-review 里写清楚，别悄悄扩大或缩小范围。
3. **TDD 硬顺序**：新功能先写失败测试（RED，先跑一次确认真的失败、失败原因符合预期），再写实现（GREEN），计划文档里对应 Step 记录 RED/GREEN 的证据（测试输出摘要），而不是空口声称「已完成」。
4. **勾选 checkbox 的权限**：agent 完成的自动化步骤（写测试、写实现、跑测试、跑构建）勾 `[x]` 并附证据；**Storybook 目视确认等人工验证步骤、以及 `git commit` 步骤，agent 不要自行勾选**——commit 需要用户明确要求才执行，人工视觉验收需要用户确认后才勾。
5. **完成一个子计划后**，回到对应 roadmap 索引文件，把该行状态更新为完成并链接到实际文件（`*待写*` → 具体文件名）。

## 与 `farris-vue` 源工程的关系

- 源组件位置类比：`farris-vue` 里 `packages/ui-vue/components/<name>` 是实现，`packages/ui-vue/demos/<name>/*.vue` 是能力演示（迁移时应逐个 demo 场景对应一个 Storybook story，做到「同场景双端交互结果一致」）。
- 迁移时只对齐**行为语义**（API、可控性、交互结果），命名可以更贴近目标库现有习惯（如扁平 props），视觉全部走 Tailwind 新皮肤，不查 Farris 的 CSS/SCSS。
- 两仓库是独立的 git 仓库，互不影响版本控制；跨仓库参考纯粹是「读源码理解要迁什么」，不建立代码依赖。
