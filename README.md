# component-ai

Monorepo for `@component-ai/react-ui` and `@component-ai/vue-ui` (Tailwind CSS).

## Storybook

Visual development and documentation for components:

| Command | Description |
|---------|-------------|
| `npm run storybook:react` | React Storybook (port **6006**) |
| `npm run storybook:vue` | Vue Storybook (port **6007**) |
| `npm run build-storybook:react` | Static build of the React app |
| `npm run build-storybook:vue` | Static build of the Vue app |

Component stories live next to source under `packages/*/src/components/*.stories.tsx`.

## Public docs site (phase 2)

A dedicated documentation site (e.g. VitePress or Astro) is planned as a follow-up after the Storybook API and examples stabilize. It will cover installation, `style.css` setup, and links to deeper design notes under `docs/`, without duplicating every Storybook example.

## Build

```bash
npm run build
```

Individual packages: `npm run build:react`, `npm run build:vue`.
