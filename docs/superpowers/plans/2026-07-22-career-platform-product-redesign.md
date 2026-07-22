# Career Platform Product Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-manual:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing demonstration-like interface with a coherent action-first career navigation product for students, graduates, and teachers.

**Architecture:** Keep the existing React, Zustand and rules-engine boundaries. Introduce a compact visual system plus reusable action, progress and evidence components; route pages compose those components around existing persisted domain state. Add a reflection field to tasks so every recommended action produces user-visible evidence.

**Tech Stack:** React 19, TypeScript, React Router, Zustand persistence, Lucide, Recharts, Vite, Vitest, Playwright.

---

### Task 1: Establish the action-first visual foundation

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/components/common/PageShell.tsx`
- Modify: `src/App.tsx`
- Test: `e2e/navigation.spec.ts`

- [ ] **Step 1: Add visual tokens and responsive layout primitives**

Define `--surface`, `--surface-strong`, `--ink`, `--muted`, `--signal`, `--line`, `--radius-*`, and replace legacy glass/gradient shell styles with the light editorial canvas, dark signal panels, focus rings and mobile breakpoint.

```css
:root { --surface:#f6f7f4; --surface-strong:#101411; --ink:#111411; --signal:#76b900; --line:#dfe4dd; }
.signal-panel { background:var(--surface-strong); color:#f5f8f3; }
```

- [ ] **Step 2: Make the shell role-aware and compact**

Render a brand, stage badge, minimal role navigation and a mobile primary link. Preserve the skip link and add `aria-current` through `NavLink`.

- [ ] **Step 3: Replace the route fallback with an accessible loader**

Use a visually centered `role="status"` loader that announces the loading state in correct Chinese.

- [ ] **Step 4: Run the mobile shell regression**

Run: `npm run test:e2e -- --grep "mobile landing"`

Expected: one passing responsive test with no horizontal overflow.

### Task 2: Add reusable action, progress and evidence units

**Files:**
- Create: `src/components/product/ActionFocusCard.tsx`
- Create: `src/components/product/ProgressRail.tsx`
- Create: `src/components/product/SignalMetric.tsx`
- Create: `src/components/product/EmptyState.tsx`
- Modify: `src/domain.ts`
- Modify: `src/store/careerStore.ts`
- Test: `src/store/careerStore.test.ts`

- [ ] **Step 1: Write persistence tests for task reflection**

Add a task with `reflection: "..."`, invoke the store update action and assert the content survives a serialized state round trip.

```ts
expect(useCareerStore.getState().roadmapTasks[0].reflection).toBe("完成后发现……");
```

- [ ] **Step 2: Extend the domain and store**

Add optional `reflection` and `evidence` fields to `ActionTask`; add `updateActionTask` that updates an action list without losing the task type.

- [ ] **Step 3: Implement `ActionFocusCard`**

The component takes one task plus title/detail/CTA props, shows expected time and tangible output, and offers an explicit route or completion callback. It must render an empty action state when no task is available.

- [ ] **Step 4: Implement progress and signal components**

`ProgressRail` displays a bounded completed/total count; `SignalMetric` displays a label, number and explanatory detail; `EmptyState` has exactly one primary action.

- [ ] **Step 5: Run store tests**

Run: `npm run test -- src/store/careerStore.test.ts`

Expected: all existing migration/reset tests and the reflection test pass.

### Task 3: Rebuild public entry and two-step onboarding

**Files:**
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/pages/OnboardingPage.tsx`
- Modify: `src/data/catalog.ts`
- Test: `e2e/navigation.spec.ts`

- [ ] **Step 1: Replace the landing content hierarchy**

Present the product promise, a realistic “one action → one evidence → next decision” preview, role entry points and data boundary. Do not show decorative metric cards.

- [ ] **Step 2: Convert onboarding to a short decision board**

First step selects stage; second step selects major, pathway and two interest/value tags. Keep native radio/checkbox labels, field errors and keyboard navigation.

- [ ] **Step 3: Verify the low-grade entry flow**

Run: `npm run test:e2e -- --grep "low-grade student"`

Expected: onboarding leads to the student workbench and its primary action is available.

### Task 4: Rebuild the student workbench and exploration loop

**Files:**
- Modify: `src/pages/StudentHomePage.tsx`
- Modify: `src/pages/AwakeningPage.tsx`
- Modify: `src/pages/RoadmapPage.tsx`
- Modify: `src/components/common/TaskList.tsx`
- Test: `e2e/navigation.spec.ts`

- [ ] **Step 1: Compose the workbench around `ActionFocusCard`**

Use the first incomplete task as the primary action; secondary sections show stage, current direction and only two contextual signals. Keep the optional AI card below the deterministic next action.

- [ ] **Step 2: Make low-grade exploration a six-step evidence flow**

Give each step a plain-language prompt, a visible completed state and a specific artifact. Direction recommendations must show “why this direction” from interests/values.

- [ ] **Step 3: Make task completion collect a reflection**

On completion, open an inline, labeled reflection field; save it through the store. Existing completed state must remain clickable and readable after reload.

- [ ] **Step 4: Verify persisted task flow**

Run: `npm run test:e2e -- --grep "preserves a completed task"`

Expected: completing a task and reloading keeps the completion state.

### Task 5: Rebuild decision, roadmap and research experiences

**Files:**
- Modify: `src/pages/MatchingPage.tsx`
- Modify: `src/pages/RoadmapPage.tsx`
- Modify: `src/pages/GraduatePage.tsx`
- Modify: `src/components/charts/AbilityRadar.tsx`
- Test: `src/services/recommendation.test.ts`
- Test: `e2e/navigation.spec.ts`

- [ ] **Step 1: Make matching explainable before visual**

Render target selector, match state, top three gaps, explanations and one plan-generation action. Move the radar chart into a dark `SignalPanel` after the textual explanation.

- [ ] **Step 2: Organize roadmap by now / this term / next term**

Use the existing semester field to group tasks. Add status and evidence/reflection previews without changing rules-engine scoring.

- [ ] **Step 3: Rebuild graduate navigation as parallel lanes**

Place research milestones and employment preparation side by side on desktop and sequentially on mobile; preserve research outcome capture and evidence mapping.

- [ ] **Step 4: Run recommendation and graduate regressions**

Run: `npm run test -- src/services/recommendation.test.ts; npm run test:e2e -- --grep "graduate"`

Expected: deterministic rule results and the graduate dual-lane flow pass.

### Task 6: Rebuild the teacher sample dashboard and finish quality gates

**Files:**
- Modify: `src/pages/AdminDashboardPage.tsx`
- Modify: `src/components/charts/AdminCharts.tsx`
- Modify: `README.md`
- Test: `e2e/navigation.spec.ts`

- [ ] **Step 1: Present teacher insights as decisions, not decoration**

Keep the visible “脱敏模拟样本” disclaimer. Put filter controls first, then completion/shortfall/resource summaries and only the charts required to support the teaching recommendation.

- [ ] **Step 2: Update README product and visual behavior**

Document the local-only boundary, optional AI consent, startup commands and the redesigned role flow.

- [ ] **Step 3: Execute release verification**

Run: `npm run typecheck; npm run lint; npm run test; npm run test:e2e; npm run build; npm audit --omit=dev; docker compose config --quiet`

Expected: all commands exit 0, unit/E2E suites have no failures, and the build reports route-split assets.
