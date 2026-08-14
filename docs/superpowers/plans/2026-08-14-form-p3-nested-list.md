# Form P3 — Nested paths / Form.List / validateTrigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nested NamePath support, Form.List, validateTrigger (blur/change), and dependency revalidation on top of Form P0–P2.

**Architecture:** Path helpers live in `@component-ai/form-core`; `createFormStore` reads/writes nested values and tracks `dependencies`. React/Vue FormItem resolve NamePath (+ List context), honor `validateTrigger`, and register dependencies. `Form.List` manages array field rows via store get/set.

**Tech Stack:** TypeScript, Vitest, Testing Library / Vue Test Utils, Tailwind v4 (unchanged visuals).

## Global Constraints

- Preserve P0 default: validate on blur only unless `validateTrigger` includes `change`
- Flat single-segment names keep working
- Vue: `defineComponent` + TSX; React ↔ Vue event/API parity
- TDD: RED then GREEN; agent may check automated steps; do not check Storybook visual or git commit steps

---

### Task 1: form-core path helpers

**Files:**
- Create: `packages/form-core/src/name-path.ts`
- Create: `packages/form-core/src/name-path.test.ts`
- Modify: `packages/form-core/src/index.ts`

**Interfaces:**
- Produces: `NamePath`, `parseNamePath`, `joinNamePath`, `normalizeNamePath`, `getValueAtPath`, `setValueAtPath`

- [ ] **Step 1: Write failing path tests** (parse, get, set, normalize bracket/dot/array)
- [ ] **Step 2: Run RED** — `npm test -w @component-ai/form-core -- src/name-path.test.ts`
- [ ] **Step 3: Implement `name-path.ts` and export**
- [ ] **Step 4: Run GREEN**

---

### Task 2: form-core store nested + dependencies

**Files:**
- Modify: `packages/form-core/src/create-form-store.ts`
- Modify: `packages/form-core/src/create-form-store.test.ts`
- Modify: `packages/form-core/src/types.ts` (if needed)

**Interfaces:**
- Consumes: path helpers
- Produces: nested get/set; `registerField(..., { dependencies? })`; dependency revalidate on `setFieldValue`

- [ ] **Step 1: Write failing store tests** (nested values, deps revalidate)
- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement store changes**
- [ ] **Step 4: Run GREEN** — full `npm test -w @component-ai/form-core`

---

### Task 3: React FormItem + Form.List

**Files:**
- Modify: `packages/react-ui/src/components/Form.tsx`
- Modify: `packages/react-ui/src/components/Form.test.tsx`
- Modify: `packages/react-ui/src/components/Form.stories.tsx`
- Modify: `packages/react-ui/src/index.ts`

- [ ] **Step 1: Write failing React tests** (nested submit, change trigger, deps, List add/remove)
- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement FormItem + Form.List + exports**
- [ ] **Step 4: Run GREEN** — `npm test -w @component-ai/react-ui -- src/components/Form.test.tsx`

---

### Task 4: Vue FormItem + Form.List

**Files:**
- Modify: `packages/vue-ui/src/components/Form.tsx`
- Modify: `packages/vue-ui/src/components/Form.test.tsx`
- Modify: `packages/vue-ui/src/components/Form.stories.tsx`
- Modify: `packages/vue-ui/src/index.ts`

- [ ] **Step 1: Write failing Vue mirror tests**
- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement Vue FormItem + FormList**
- [ ] **Step 4: Run GREEN** — `npm test -w @component-ai/vue-ui -- src/components/Form.test.tsx`

---

### Task 5: Build + roadmap

**Files:**
- Modify: `docs/superpowers/plans/2026-07-13-form-roadmap.md`

- [ ] **Step 1: Update roadmap** with P3 row linking spec + this plan
- [ ] **Step 2: `npm run build -w @component-ai/form-core`**
- [ ] **Step 3: `npm run build -w @component-ai/react-ui`**
- [ ] **Step 4: `npm run build -w @component-ai/vue-ui`**
- [ ] **Step 5: Commit** (user/cloud explicitly requested) with Form P3 message

## Self-review

- In scope: nested paths, Form.List, validateTrigger, dependencies
- Out of scope: schema engine, drag-sort List, Form-level validateTrigger default override beyond FormItem
