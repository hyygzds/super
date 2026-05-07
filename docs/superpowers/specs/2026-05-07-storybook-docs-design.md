# Storybook 与文档站 — 设计规格（Design Spec）

**日期**：2026-05-07  
**状态**：已定稿（brainstorming §1–§2 口头确认）  
**关联仓库**：`component-ai` monorepo（`@component-ai/react-ui`、`@component-ai/vue-ui`）

---

## 1. 背景与目标

为组件库提供 **可视化开发与演示（Storybook）**，并在路线图上有 **对外文档站（第二期）**。第一期 **优先交付 Storybook**；文档站 **不阻塞** Storybook，仅做占位或 README 说明。

**成功标准（第一期）**

- `apps/storybook-react` 可启动，展示至少 **Button、Select、Tabs** 各 ≥1 条 story。
- `apps/storybook-vue` 可启动，同上针对 Vue 包。
- Story 中组件样式与 **各包 `style.css`** 一致（Tailwind 类生效）。
- React / Vue **两套 Storybook 进程分离**（独立应用），脚本清晰。

---

## 2. 非目标（第一期不做）

- **文档站落地**（VitePress / Astro 等完整站点）；仅允许 README / `docs/` 中 roadmap 一句话指向二期。
- Chromatic、可视化回归、Storybook 部署流水线（可后置）。
- 将 React 与 Vue 强行 **合并为单一 Storybook 实例**（工具链与维护成本过高）。

---

## 3. 仓库与目录结构

| 路径 | 职责 |
|------|------|
| `apps/storybook-react/` | React Storybook（Vite），依赖 workspace `@component-ai/react-ui` |
| `apps/storybook-vue/` | Vue 3 Storybook（Vite），依赖 workspace `@component-ai/vue-ui` |
| `packages/react-ui/src/**/*.stories.tsx` | React 组件旁 story（推荐） |
| `packages/vue-ui/src/**/*.stories.tsx` | Vue 组件旁 story（推荐） |

根 `package.json` **workspaces** 增加 `apps/*`（与现有 `packages/*` 并列）。

---

## 4. Storybook 技术选型

| 栈 | 包 / 约定 |
|----|------------|
| React | `@storybook/react-vite`，与 React 19 peer 区间兼容 |
| Vue | `@storybook/vue3-vite`，TSX 组件需 **`@vitejs/plugin-vue-jsx`**（与 `vue-ui` 一致） |
| 样式 | Tailwind **v4**，与各包一致使用 **`@tailwindcss/vite`** |

---

## 5. 样式与 Tailwind

**入口**

- 在每个应用的 `.storybook/preview.ts`（或 `preview.tsx`）中 **全局引入一次**：
  - React app：`import '@component-ai/react-ui/style.css'`
  - Vue app：`import '@component-ai/vue-ui/style.css'`

**内容扫描**

- 避免 story / 组件中的类名被漏扫：在对应 Storybook 的 Vite 配置或应用入口 CSS 中，使 Tailwind **@source**（或 v4 等价配置）包含 **`packages/react-ui/src/**`** 或 **`packages/vue-ui/src/**`** 下 relevant 扩展名（含 `.tsx`、`.ts`）。

**隔离**

- 若预览页默认 margin 与组件冲突，仅在 Storybook 的 **decorator / preview 布局** 增加包裹 `div` 与最小布局类，**不修改** 组件库源码。

---

## 6. Story 编写约定

- 使用 **CSF3**（`Meta`、`StoryObj`）；Vue 侧同理。
- **`title`** 建议带前缀区分栈，例如 `'React/Button'`、`'Vue/Button'`，避免侧边栏混淆。
- **Button / Select / Tabs**：第一期以 **静态展示 + 基本交互** 为主；复杂 `play` 函数与 E2E 级交互 **非必须**。

---

## 7. npm scripts（根目录建议）

| Script | 含义 |
|--------|------|
| `storybook:react` | 启动 React Storybook |
| `storybook:vue` | 启动 Vue Storybook |
| （可选）`build-storybook:react` / `build-storybook:vue` | 静态导出，供二期 CI 使用 |

具体命令在实现计划中写死为 `npm run storybook -w <app>` 等形式。

---

## 8. 第二期：文档站（本规格仅预留）

- **技术候选**：VitePress（Markdown 友好）或 Astro（更灵活）。
- **内容策略**：安装步骤、`style.css` 引入、各组件 API 链接到现有 `docs/select-*.md` 等；**不与 Storybook 重复维护整段代码**时可采用「Storybook iframe / 外链」或「仅文档保留精简示例」。
- **触发条件**：Storybook 中 API 稳定至少一轮迭代后再启动文档站工程。

---

## 9. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-07 | 初版：Storybook 双应用优先、文档站二期、Tailwind 与 preview 约定。 |

---

## 10. 自检（spec self-review）

- **占位符**：无 TBD。
- **与口头 brainstorm 一致性**：双 Storybook、包内 stories、第一期不做完整文档站 — 一致。
- **范围**：第一期可单独验收 Storybook；文档站明确二期。
- **歧义**：若 workspace 尚未包含 `apps/*`，实现计划第一步为扩展 workspaces 与 lockfile — 已隐含。
