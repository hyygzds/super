# Storybook 双应用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 monorepo 中新增 `apps/storybook-react` 与 `apps/storybook-vue`，从 workspace 引用 `@component-ai/react-ui` / `@component-ai/vue-ui`，为 Button、Select、Tabs 各提供至少 1 条 CSF3 story，根目录可 `npm run storybook:react` / `storybook:vue` 启动。

**Architecture:** 根 `package.json` 的 `workspaces` 增加 `apps/*`；两应用独立 Storybook 8 + Vite；`preview` 引入组件库 **源** `style.css`（见 Task 2 说明，避免强依赖先 `build` 出 `dist`）；Vite 链合并 `@tailwindcss/vite` 与包 `src` 的 `@source` 扫描。Stories 放在 `packages/*/src/**/*.stories.tsx`（或 `.stories.ts`），`main` 的 `stories` glob 指回 packages。

**Tech Stack:** Storybook 8、Vite 8、React 19、Vue 3.5、Tailwind v4（`@tailwindcss/vite`）、TypeScript。

**规格来源:** [`docs/superpowers/specs/2026-05-07-storybook-docs-design.md`](../specs/2026-05-07-storybook-docs-design.md)

---

## 文件结构（新建 / 修改）

| 路径 | 职责 |
|------|------|
| `package.json`（根） | `workspaces`: `packages/*`, `apps/*`；`storybook:react`、`storybook:vue`、`build-storybook:*` |
| `apps/storybook-react/package.json` | 依赖 workspace `@component-ai/react-ui`、`@storybook/react-vite`、`storybook`、`@tailwindcss/vite` 等 |
| `apps/storybook-react/.storybook/main.ts` | stories glob、framework、`viteFinal` 合并 Tailwind |
| `apps/storybook-react/.storybook/preview.ts` | 全局样式 + 可选 layout |
| `packages/react-ui/src/components/Button.stories.tsx` | Button stories |
| `packages/react-ui/src/components/Select.stories.tsx` | Select stories |
| `packages/react-ui/src/components/Tabs.stories.tsx` | Tabs stories |
| `apps/storybook-vue/` | 镜像结构，`@storybook/vue3-vite`、`@vitejs/plugin-vue-jsx` |
| `packages/vue-ui/src/components/*.stories.tsx` | Vue 侧三组件 stories |
| `README.md`（根，可选补一节） | 如何启动 Storybook；说明二期文档站 |

---

### Task 1: 扩展 workspaces 并占位目录

**Files:**
- Modify: `package.json`（根）

- [ ] **Step 1: 修改 workspaces**

将根目录 `package.json` 中 `"workspaces"` 改为：

```json
"workspaces": ["packages/*", "apps/*"]
```

- [ ] **Step 2: 安装依赖刷新 lockfile**

Run:

```bash
cd /path/to/component-ai
npm install
```

Expected: `package-lock.json` 更新且无报错。

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add apps/* workspaces for Storybook"
```

---

### Task 2: 初始化 `apps/storybook-react`

**Files:**
- Create: `apps/storybook-react/package.json`
- Create: `apps/storybook-react/.storybook/main.ts`
- Create: `apps/storybook-react/.storybook/preview.ts`
- Create: `apps/storybook-react/tsconfig.json`（若 CLI 未生成则手写最小 JSON）

- [ ] **Step 1: 创建 package.json**

在 `apps/storybook-react/package.json`：

```json
{
  "name": "@component-ai/storybook-react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build -o storybook-static"
  }
}
```

（devDependencies 在下一步一次性安装。）

- [ ] **Step 2: 安装 Storybook 与依赖**

Run（路径按仓库根）：

```bash
npm install -D storybook @storybook/react-vite @storybook/addon-essentials @tailwindcss/vite react react-dom @vitejs/plugin-react -w @component-ai/storybook-react
npm install @component-ai/react-ui -w @component-ai/storybook-react
```

若 `@storybook/addon-essentials` 与 SB9 冲突，以 **`storybook` 与 `@storybook/react-vite` 同主版本** 为准（例如均为 `^8.6.0`），按 `npm ls storybook` 解析。

- [ ] **Step 3: `storybook init` 可选**

若更偏好自动化：在 `apps/storybook-react` 内执行 `npx storybook@latest init --yes`，再 **手工合并** 下方 `main.ts` / `preview.ts` 与 tailwind，避免覆盖 workspace 逻辑。

- [ ] **Step 4: `.storybook/main.ts`**

Create `apps/storybook-react/.storybook/main.ts`：

```ts
import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(__dirname, "..", "..", "..");

const config: StorybookConfig = {
  stories: [
    join(monorepoRoot, "packages/react-ui/src/**/*.stories.@(ts|tsx)"),
  ],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      server: {
        fs: { allow: [monorepoRoot] },
      },
    });
  },
};

export default config;
```

- [ ] **Step 5: `.storybook/preview.ts`**

使用 **包源码** `style.css`，使未执行 `build` 时样式仍完整（与规格「与组件一致」一致；`package.json` 的 `exports` 若仅指向 `dist`，直接 import 包名可能踩空）。

Create `apps/storybook-react/.storybook/preview.ts`：

```ts
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
推荐使用 **静态相对路径**（从 `apps/storybook-react/.storybook` 到仓库根下 `packages/react-ui/src/style.css` 为三级 `../`）：

```ts
import "../../../packages/react-ui/src/style.css";

export const parameters = {
  layout: "centered",
};
```

- [ ] **Step 6: 根脚本**

根 `package.json` 的 `scripts` 增加：

```json
"storybook:react": "npm run storybook -w @component-ai/storybook-react",
"build-storybook:react": "npm run build-storybook -w @component-ai/storybook-react"
```

- [ ] **Step 7: 验证启动**

Run:

```bash
npm run storybook:react
```

Expected: Storybook 打开且无构建致命错误（侧边栏可能尚空，下一 Task 补 stories）。

- [ ] **Step 8: Commit**

```bash
git add apps/storybook-react package.json package-lock.json
git commit -m "feat(storybook): add React Storybook app"
```

---

### Task 3: React — Button / Select / Tabs stories

**Files:**
- Create: `packages/react-ui/src/components/Button.stories.tsx`
- Create: `packages/react-ui/src/components/Select.stories.tsx`
- Create: `packages/react-ui/src/components/Tabs.stories.tsx`

- [ ] **Step 1: Button.stories.tsx**

Create `packages/react-ui/src/components/Button.stories.tsx`：

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "React/Button",
  component: Button,
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary", children: "Primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Secondary" },
};
```

- [ ] **Step 2: Select.stories.tsx**（静态 options）

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Select } from "./Select";

const meta = {
  title: "React/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => {
    const [v, setV] = useState<string | undefined>();
    return (
      <div className="w-72">
        <Select
          options={[
            { value: "a", label: "选项 A" },
            { value: "b", label: "选项 B" },
          ]}
          value={v}
          onChange={setV}
          placeholder="请选择"
        />
      </div>
    );
  },
};
```

- [ ] **Step 3: Tabs.stories.tsx**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "./Tabs";

const meta = {
  title: "React/Tabs",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[480px]">
      <Tabs defaultValue="a">
        <TabsList aria-label="示例标签">
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">内容 A</TabsPanel>
        <TabsPanel value="b">内容 B</TabsPanel>
      </Tabs>
    </div>
  ),
};
```

- [ ] **Step 4: 运行 Storybook 目测**

```bash
npm run storybook:react
```

Expected: 侧边栏出现 React/Button、React/Select、React/Tabs；组件有 Tailwind 样式。

- [ ] **Step 5: Commit**

```bash
git add packages/react-ui/src/components/*.stories.tsx
git commit -m "feat(react-ui): add Storybook stories for Button, Select, Tabs"
```

---

### Task 4: 初始化 `apps/storybook-vue`

**Files:**
- Create: `apps/storybook-vue/package.json`
- Create: `apps/storybook-vue/.storybook/main.ts`
- Create: `apps/storybook-vue/.storybook/preview.ts`

- [ ] **Step 1: package.json**

与 React 对称，`name`: `@component-ai/storybook-vue`，scripts 端口可用 **6007**：`storybook dev -p 6007`。

- [ ] **Step 2: 安装**

```bash
npm install -D storybook @storybook/vue3-vite @storybook/addon-essentials @tailwindcss/vite vue @vitejs/plugin-vue @vitejs/plugin-vue-jsx -w @component-ai/storybook-vue
npm install @component-ai/vue-ui -w @component-ai/storybook-vue
```

- [ ] **Step 3: main.ts**

与 Task 2 类似，但：

- `framework.name`: `@storybook/vue3-vite`
- `stories`: `packages/vue-ui/src/**/*.stories.@(ts|tsx)`
- `viteFinal`：`plugins: [vue(), vueJsx(), tailwindcss()]`（从 `@vitejs/plugin-vue` / `@vitejs/plugin-vue-jsx` 导入）

示例骨架：

```ts
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import tailwindcss from "@tailwindcss/vite";
// ... mergeConfig 同上，plugins: [vue(), vueJsx(), tailwindcss()]
```

- [ ] **Step 4: preview.ts**

```ts
import "../../../packages/vue-ui/src/style.css";
```

- [ ] **Step 5: 根脚本**

```json
"storybook:vue": "npm run storybook -w @component-ai/storybook-vue",
"build-storybook:vue": "npm run build-storybook -w @component-ai/storybook-vue"
```

- [ ] **Step 6: 验证**

```bash
npm run storybook:vue
```

- [ ] **Step 7: Commit**

```bash
git add apps/storybook-vue package.json package-lock.json
git commit -m "feat(storybook): add Vue Storybook app"
```

---

### Task 5: Vue — Button / Select / Tabs stories

**Files:**
- Create: `packages/vue-ui/src/components/Button.stories.tsx`
- Create: `packages/vue-ui/src/components/Select.stories.tsx`
- Create: `packages/vue-ui/src/components/Tabs.stories.tsx`

Vue 3 Storybook CSF：使用 `import type { Meta, StoryObj } from '@storybook/vue3-vite'`（或当前 Storybook 文档推荐路径）；组件用默认导出 `Button`、`Select`、`Tabs` 等。

**Button** 可用 `render: () => <Button variant="primary">...</Button>`（TSX）或 template 字符串；与现有 `Button.tsx` 导出一致。

- [ ] **Step 1–3:** 各写一条最小 story，`title`: `'Vue/Button'` 等。

- [ ] **Step 4:** `npm run storybook:vue`，目测三则 story。

- [ ] **Step 5: Commit**

```bash
git add packages/vue-ui/src/components/*.stories.tsx
git commit -m "feat(vue-ui): add Storybook stories for Button, Select, Tabs"
```

---

### Task 6: 文档占位（规格 §8）

**Files:**
- Modify: `README.md`（根）或 Create: `docs/storybook.md`

- [ ] **Step 1:** 增加章节「Storybook」：`storybook:react`（:6006）、`storybook:vue`（:6007）；一句「对外文档站见 roadmap / 二期」。

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: Storybook usage and docs-site roadmap note"
```

---

## Self-review（计划 vs 规格）

| 规格章节 | Task |
|----------|------|
| 双应用、包内 stories | 2–5 |
| Tailwind + style | 2、4 preview + viteFinal |
| CSF3、title 前缀 | 3、5 |
| 根 scripts | 2、4 |
| 文档站二期 | Task 6 |

**占位符扫描：** 若 Storybook 8/9 API 差异，工程师以 `npx storybook@latest --version` 与官方迁移说明微调 `main.ts` 字段名，不改变 stories 路径策略。

---

## Execution handoff

**计划路径:** [`docs/superpowers/plans/2026-05-07-storybook-apps.md`](./2026-05-07-storybook-apps.md)

**执行方式（二选一）：**

1. **Subagent-Driven** — 每 Task 新子代理 + Task 间复核（superpowers:subagent-driven-development）。
2. **Inline** — 本会话顺序执行（superpowers:executing-plans）。

回复 **1** 或 **2** 开始落地；或自行按 Task 手动执行。
