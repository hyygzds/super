# VirtualGrid Column Freeze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let VirtualGrid freeze columns from the header (and keep static `fixed`), including while virtualized.

**Architecture:** Pure freeze-state helpers live in `@component-ai/grid-core`. React/Vue VirtualGrid resolve effective `fixed` before layout, wire header pin buttons to `nextFrozenState` with controlled/uncontrolled `frozen`, and offset the virtual body with `padding-top` instead of `transform`.

**Tech Stack:** TypeScript, Vitest, Testing Library / Vue Test Utils, Tailwind v4.

## Global Constraints

- Shared algorithms go in `grid-core`; UI packages only render and glue.
- Controlled prop wins: `frozen ?? uncontrolledFrozen`.
- React `onFrozenChange` ↔ Vue `update:frozen`.
- Vue components stay `defineComponent` + TSX.
- TDD: failing test first, then minimal implementation.
- Do not mutate the caller's `columns` or `data`.
- Do not use `transform` on the virtual body wrapper (breaks sticky).

---

### Task 1: grid-core freeze

**Files:**
- Create: `packages/grid-core/src/freeze.ts`
- Create: `packages/grid-core/src/freeze.test.ts`
- Modify: `packages/grid-core/src/types.ts`
- Modify: `packages/grid-core/src/index.ts`

**Interfaces:**
- Produces: `FixedSide`, `FrozenState`, `resolveColumnFixed`, `nextFrozenState`, `setColumnFrozen`

- [x] **Step 1: Write the failing core tests**

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/grid-core -- src/freeze.test.ts`

RED: `Cannot find module './freeze'`

- [x] **Step 3: Implement freeze helpers and export them**

- [x] **Step 4: Run tests to verify they pass**

GREEN: `Test Files 1 passed (1) / Tests 7 passed`

---

### Task 2: React VirtualGrid freeze

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.test.tsx`
- Modify: `packages/react-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/react-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: Write failing React tests** (click cycle + sticky, controlled, no button without freezable, static `fixed` still works, virtual body uses padding-top)

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/react-ui -- src/components/VirtualGrid.test.tsx`

RED: 3 failed | 44 passed — missing `左侧冻结名称` / sticky / `data-vg-virtual-body`

- [x] **Step 3: Wire frozen state, resolveColumnFixed into layout, freezable headers, virtual padding-top**

- [x] **Step 4: Run tests to verify they pass; add Freeze story**

GREEN: `Tests 47 passed (47)`

---

### Task 3: Vue VirtualGrid freeze

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.test.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [x] **Step 1: Write failing Vue tests** (mirror React)

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/vue-ui -- src/components/VirtualGrid.test.tsx`

RED: 3 failed | 45 passed — missing freeze button / sticky / `data-vg-virtual-body`

- [x] **Step 3: Wire the same semantics**

- [x] **Step 4: Run tests to verify they pass; add Freeze story**

GREEN: `Tests 48 passed (48)`

---

### Task 4: Roadmap + verify

**Files:**
- Modify: `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md`

- [x] **Step 1: Link this plan from the roadmap**

- [x] **Step 2: Run targeted tests + package builds**

`grid-core` tests: `10 passed (10) / Tests 55 passed`.  
`grid-core` / `react-ui` / `vue-ui` `vite build` all exited 0.
