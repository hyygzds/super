# VirtualGrid Column Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let VirtualGrid filter local (and notify remote) rows by filterable column text queries.

**Architecture:** Pure filter helpers live in `@component-ai/grid-core`. React/Vue VirtualGrid apply `filterRows` before sort/group/tree/page, and wire header `Input` to `setFilterValue` with controlled/uncontrolled `filters`.

**Tech Stack:** TypeScript, Vitest, Testing Library / Vue Test Utils, Tailwind v4, existing `Input`.

## Global Constraints

- Shared algorithms go in `grid-core`; UI packages only render and glue.
- Controlled prop wins: `filters ?? uncontrolledFilters`.
- React `onFiltersChange` ↔ Vue `update:filters`.
- Vue components stay `defineComponent` + TSX.
- TDD: failing test first, then minimal implementation.
- Do not mutate the caller's `data` array.
- Use the exported `Input` public API; do not invent a header-only filter control.

---

### Task 1: grid-core filter

**Files:**
- Create: `packages/grid-core/src/filter.ts`
- Create: `packages/grid-core/src/filter.test.ts`
- Modify: `packages/grid-core/src/types.ts`
- Modify: `packages/grid-core/src/index.ts`

**Interfaces:**
- Produces: `FilterState`, `FilterPredicate`, `cellContains`, `activeFilterEntries`, `setFilterValue`, `filterRows`

- [x] **Step 1: Write the failing core tests**

Add `packages/grid-core/src/filter.test.ts` covering contains, empty query, AND, identity, custom predicate, and tree ancestors.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/grid-core -- src/filter.test.ts`

RED: `Cannot find module './filter'`

- [x] **Step 3: Implement filter helpers and export them**

- [x] **Step 4: Run tests to verify they pass**

GREEN: `Test Files 1 passed (1) / Tests 8 passed`

---

### Task 2: React VirtualGrid filter

**Files:**
- Modify: `packages/react-ui/src/components/VirtualGrid.test.tsx`
- Modify: `packages/react-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/react-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [x] **Step 1: Write failing React tests** (type to filter, clear, controlled, page reset, remote no-filter, no input without filterable)

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/react-ui -- src/components/VirtualGrid.test.tsx`

RED: 5 failed | 38 passed — missing `筛选名称` filter input

- [x] **Step 3: Wire filters state, filterRows, filterable headers**

- [x] **Step 4: Run tests to verify they pass; add Filter story**

GREEN: `Tests 43 passed (43)`

---

### Task 3: Vue VirtualGrid filter

**Files:**
- Modify: `packages/vue-ui/src/components/VirtualGrid.test.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.tsx`
- Modify: `packages/vue-ui/src/components/VirtualGrid.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [x] **Step 1: Write failing Vue tests** (mirror React)

- [x] **Step 2: Run tests to verify they fail**

Run: `npm run test -w @component-ai/vue-ui -- src/components/VirtualGrid.test.tsx`

RED: 5 failed | 39 passed — empty filter input / rows not filtered

- [x] **Step 3: Wire the same semantics**

- [x] **Step 4: Run tests to verify they pass; add Filter story**

GREEN: `Tests 44 passed (44)`

---

### Task 4: Roadmap + verify

**Files:**
- Modify: `docs/superpowers/plans/2026-07-09-virtual-grid-roadmap.md`

- [x] **Step 1: Link this plan from the roadmap**
- [x] **Step 2: Run grid-core, react-ui, vue-ui VirtualGrid tests and package builds**

Evidence: grid-core 9 files / 48 tests passed; React VirtualGrid 43 passed; Vue VirtualGrid 44 passed; `vite build` for grid-core / react-ui / vue-ui exited 0.

---

## Self-review

- Spec coverage: contains, AND, local/remote, tree, pagination reset, a11y label, stories — each has a task.
- No operators, no popover, no global search box.
- Type names (`FilterState`, `filterRows`, `setFilterValue`) are consistent across tasks.
