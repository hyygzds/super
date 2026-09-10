# VirtualGrid Column Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let VirtualGrid sort local (and notify remote) rows by a sortable column, ascending or descending.

**Architecture:** Pure sort state machine and stable sort live in `@component-ai/grid-core`. React/Vue VirtualGrid apply `sortRows` before group/tree/page, and wire header clicks to `nextSortState` with controlled/uncontrolled `sort`.

**Tech Stack:** TypeScript, Vitest, Testing Library / Vue Test Utils, Tailwind v4.

## Global Constraints

- Shared algorithms go in `grid-core`; UI packages only render and glue.
- Controlled prop wins: `sort ?? uncontrolledSort`.
- React `onSortChange` ↔ Vue `update:sort`.
- Vue components stay `defineComponent` + TSX.
- TDD: failing test first, then minimal implementation.
- Do not mutate the caller's `data` array.

---

### Task 1: grid-core sort

**Files:**
- Create: `packages/grid-core/src/sort.ts`
- Create: `packages/grid-core/src/sort.test.ts`
- Modify: `packages/grid-core/src/types.ts`
- Modify: `packages/grid-core/src/index.ts`

**Interfaces:**
- Produces: `SortOrder`, `SortState`, `nextSortState`, `compareCellValues`, `sortRows`

- [x] **Step 1: Write the failing core tests**

Add `packages/grid-core/src/sort.test.ts` covering cycle, default compare, stable sort, tree siblings, and identity when `sort` is null.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/grid-core -- src/sort.test.ts`

RED: `Cannot find module './sort'`

- [x] **Step 3: Implement sort helpers and export them**

- [x] **Step 4: Run tests to verify they pass**

GREEN: `Test Files 1 passed (1) / Tests 10 passed`

---

### Task 2: React VirtualGrid sort

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.test.tsx`
- Modify: `packages/react-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/react-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: Write failing React tests** (click cycle, row order, controlled, page reset, remote no-reorder, aria-sort)

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/react-ui -- src/components/VirtualGrid.test.tsx`

RED: 4 failed | 26 passed — missing `aria-sort` / sort button / reorder

- [x] **Step 3: Wire sort state, sortRows, sortable headers**

- [x] **Step 4: Run tests to verify they pass; add Sort story**

GREEN: `Tests 30 passed (30)`

---

### Task 3: Vue VirtualGrid sort

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.test.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [x] **Step 1: Write failing Vue tests** (mirror React)

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/vue-ui -- src/components/VirtualGrid.test.tsx`

RED: 4 failed | 27 passed — missing `aria-sort` / sort button / reorder

- [x] **Step 3: Wire the same semantics**

- [x] **Step 4: Run tests to verify they pass; add Sort story**

GREEN: `Tests 31 passed (31)`

---

### Task 4: Roadmap + verify

**Files:**
- Modify: `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md`

- [x] **Step 1: Link this plan from the roadmap**
- [x] **Step 2: Run grid-core, react-ui, vue-ui VirtualGrid tests and package builds**

Evidence: grid-core 8 files / 40 tests passed; React VirtualGrid 30 passed; Vue VirtualGrid 31 passed; `vite build` for grid-core / react-ui / vue-ui exited 0.

---

## Self-review

- Spec coverage: cycle, local/remote, tree, pagination reset, a11y, stories — each has a task.
- No multi-column sort, no filter.
- Type names (`SortState`, `nextSortState`, `sortRows`) are consistent across tasks.
