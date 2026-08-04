# Unified Career Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-manual:subagent-driven-development (recommended) or superpowers-manual:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overlapping student feature navigation with four coherent workspaces—今天、规划、行动、成长—while preserving every existing function, route capability, permission boundary, and saved state.

**Architecture:** Add a small workspace routing layer and shared tabs, then compose existing page logic into task-oriented workspace pages. Old URLs remain compatibility entries that render the correct workspace section. Existing stores, API clients, domain types, and server routes remain authoritative; the refactor changes presentation and routing, not business data.

**Tech Stack:** React 19, TypeScript, React Router 7, Zustand, Vitest, Playwright, Vite, existing CSS token system.

---

## File Structure

### Create

- `src/services/workspaceRoutes.ts` — workspace types, route resolution, section parsing, and legacy route mapping.
- `src/services/workspaceRoutes.test.ts` — deterministic route and section tests.
- `src/components/workspaces/WorkspaceTabs.tsx` — accessible desktop/mobile section navigation.
- `src/components/workspaces/PlanningSummary.tsx` — one shared summary of the current planning state.
- `src/pages/PlanningWorkspacePage.tsx` — direction, learning, and generation sections.
- `src/pages/ActionWorkspacePage.tsx` — week, all, resources, and new-action sections.
- `src/pages/GrowthWorkspacePage.tsx` — ability, evidence summary, and background entry.

### Modify

- `src/App.tsx` — add stable workspace routes and preserve legacy routes.
- `src/components/common/PageShell.tsx` — replace module navigation with the four workspaces and add account/notification actions.
- `src/pages/StudentHomePage.tsx` — become the authoritative 今天 workspace.
- `src/pages/AwakeningPage.tsx` — export reusable direction content.
- `src/pages/MatchingPage.tsx` — export reusable direction content and remove repeated full ability explanation.
- `src/pages/LearningPathPage.tsx` — export reusable learning content.
- `src/pages/AiPlanningPage.tsx` — export reusable generation content.
- `src/pages/RoadmapPage.tsx` — export action list/new-action sections and remove duplicate weekly hero when embedded.
- `src/pages/OpportunityBoardPage.tsx` — export reusable resource section.
- `src/pages/AbilityProfilePage.tsx` — export reusable ability content.
- `src/pages/AdminDashboardPage.tsx` — keep one new-resource entry.
- `src/styles/globals.css` — unified workspace tabs, summaries, cards, responsive rules, and removal of obsolete quick-link styling.
- `e2e/release.spec.ts` — workspace navigation, route compatibility, and end-to-end student flow.
- `e2e/navigation.spec.ts` — update old direct-navigation assumptions.
- `scripts/release-visual-audit.mjs` — capture the four workspaces and teacher tabs on desktop/mobile.

## Task 1: Workspace route model

**Files:**
- Create: `src/services/workspaceRoutes.ts`
- Create: `src/services/workspaceRoutes.test.ts`

- [ ] **Step 1: Write failing route tests**

```ts
import { describe, expect, it } from "vitest";
import { legacyWorkspaceTarget, normalizeWorkspaceSection } from "./workspaceRoutes";

describe("workspace routes", () => {
  it("maps every legacy student feature to one workspace section", () => {
    expect(legacyWorkspaceTarget("/student/home")).toBe("/student/today");
    expect(legacyWorkspaceTarget("/student/matching")).toBe("/student/plan?section=direction");
    expect(legacyWorkspaceTarget("/student/learning-path")).toBe("/student/plan?section=learning");
    expect(legacyWorkspaceTarget("/student/ai-planning")).toBe("/student/plan?section=generate");
    expect(legacyWorkspaceTarget("/student/roadmap")).toBe("/student/actions?section=all");
    expect(legacyWorkspaceTarget("/student/opportunities")).toBe("/student/actions?section=resources");
    expect(legacyWorkspaceTarget("/student/abilities")).toBe("/student/growth");
  });

  it("falls back from invalid sections", () => {
    expect(normalizeWorkspaceSection("plan", "unknown")).toBe("direction");
    expect(normalizeWorkspaceSection("actions", null)).toBe("week");
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```powershell
npx vitest run src/services/workspaceRoutes.test.ts
```

Expected: FAIL because `workspaceRoutes.ts` does not exist.

- [ ] **Step 3: Implement the route model**

```ts
export type StudentWorkspace = "today" | "plan" | "actions" | "growth";
export type PlanSection = "direction" | "learning" | "generate";
export type ActionSection = "week" | "all" | "resources" | "new";

const legacyTargets: Record<string, string> = {
  "/student/home": "/student/today",
  "/student/awakening": "/student/plan?section=direction",
  "/student/matching": "/student/plan?section=direction",
  "/student/learning-path": "/student/plan?section=learning",
  "/student/ai-planning": "/student/plan?section=generate",
  "/student/roadmap": "/student/actions?section=all",
  "/student/opportunities": "/student/actions?section=resources",
  "/student/abilities": "/student/growth",
};

export function legacyWorkspaceTarget(pathname: string) {
  return legacyTargets[pathname] ?? null;
}

export function normalizeWorkspaceSection(workspace: "plan" | "actions", value: string | null) {
  const allowed = workspace === "plan"
    ? ["direction", "learning", "generate"]
    : ["week", "all", "resources", "new"];
  return allowed.includes(value ?? "") ? value! : workspace === "plan" ? "direction" : "week";
}
```

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
npx vitest run src/services/workspaceRoutes.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/services/workspaceRoutes.ts src/services/workspaceRoutes.test.ts
git commit -m "feat: add student workspace route model"
```

## Task 2: Shared workspace navigation

**Files:**
- Create: `src/components/workspaces/WorkspaceTabs.tsx`
- Modify: `src/components/common/PageShell.tsx`
- Modify: `src/styles/globals.css`
- Test: `e2e/release.spec.ts`

- [ ] **Step 1: Add a failing mobile navigation assertion**

Add to the mobile workspace test:

```ts
await expect(page.getByRole("navigation", { name: "移动端主导航" }).getByRole("link"))
  .toHaveCount(4);
await expect(page.getByRole("link", { name: "今天" })).toBeVisible();
await expect(page.getByRole("link", { name: "规划" })).toBeVisible();
await expect(page.getByRole("link", { name: "行动" })).toBeVisible();
await expect(page.getByRole("link", { name: "成长" })).toBeVisible();
```

- [ ] **Step 2: Run the focused E2E and verify failure**

Run:

```powershell
npx playwright test e2e/release.spec.ts --grep "mobile navigation"
```

Expected: FAIL because the current fourth item is “更多”.

- [ ] **Step 3: Create `WorkspaceTabs`**

```tsx
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export type WorkspaceTab = {
  to: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
};

export default function WorkspaceTabs({ label, tabs }: { label: string; tabs: WorkspaceTab[] }) {
  return <nav aria-label={label} className="workspace-tabs">
    {tabs.map(({ to, label: tabLabel, detail, icon: Icon }) => <NavLink key={to} to={to}>
      <Icon size={17} />
      <span><strong>{tabLabel}</strong>{detail && <small>{detail}</small>}</span>
    </NavLink>)}
  </nav>;
}
```

- [ ] **Step 4: Replace student primary navigation in `PageShell`**

Use the following student entries and remove the student “更多” sheet:

```ts
const studentNav: NavItem[] = [
  { to: "/student/today", label: "今天", icon: Compass, mobile: true },
  { to: "/student/plan", label: "规划", icon: Network, mobile: true },
  { to: "/student/actions", label: "行动", icon: ClipboardCheck, mobile: true },
  { to: "/student/growth", label: "成长", icon: BarChart3, mobile: true },
];
```

Keep teacher navigation independent. Add topbar links for notifications and account profile:

```tsx
<div className="app-topbar-actions">
  {!isTeacher && <NavLink aria-label="通知" className="icon-button" to="/student/notifications"><Bell size={17} /></NavLink>}
  <NavLink aria-label="个人资料" className="icon-button" to="/account/profile"><UserRound size={17} /></NavLink>
  {themeButton}
</div>
```

- [ ] **Step 5: Add tab and topbar styles**

```css
.workspace-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
}
.workspace-tabs a {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 9px 12px;
  border-radius: 11px;
  color: var(--muted);
}
.workspace-tabs a.active {
  background: var(--surface-soft);
  color: var(--ink);
}
.workspace-tabs strong,
.workspace-tabs small { display: block; }
.workspace-tabs small { margin-top: 2px; color: var(--faint); font-size: 9px; }
.app-topbar-actions { display: flex; align-items: center; gap: 4px; }
```

- [ ] **Step 6: Run type, lint, and focused E2E**

```powershell
npm run typecheck
npm run lint
npx playwright test e2e/release.spec.ts --grep "mobile navigation"
```

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/components/workspaces/WorkspaceTabs.tsx src/components/common/PageShell.tsx src/styles/globals.css e2e/release.spec.ts
git commit -m "feat: unify student workspace navigation"
```

## Task 3: Authoritative 今天 workspace

**Files:**
- Modify: `src/pages/StudentHomePage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/globals.css`
- Test: `e2e/navigation.spec.ts`

- [ ] **Step 1: Write a failing today-page test**

```ts
test("today workspace shows one next action without duplicating the full roadmap", async ({ page }) => {
  await onboardRole(page, "高年级学生");
  await page.goto("/student/today");
  await expect(page.getByRole("heading", { name: /今天/ })).toBeVisible();
  await expect(page.locator(".today-primary-action")).toHaveCount(1);
  await expect(page.locator(".workbench-quick-links a")).toHaveCount(3);
  await expect(page.getByText("完整计划")).toHaveCount(0);
});
```

- [ ] **Step 2: Verify failure**

```powershell
npx playwright test e2e/navigation.spec.ts --grep "today workspace"
```

Expected: FAIL because `/student/today` is not registered.

- [ ] **Step 3: Register the stable route**

In `src/App.tsx` add:

```tsx
<Route path="/student/today" element={<AuthRoute><RoleRoute allowed={["freshman", "junior"]}><StudentHomePage /></RoleRoute></AuthRoute>} />
```

Keep `/student/home` as a compatibility route to the same component during this task.

- [ ] **Step 4: Refactor the home hierarchy**

Use one main action, two compact secondary actions, and three workspace links:

```tsx
<section className="today-primary-action">
  <span className="section-kicker">下一步</span>
  <h2>{actions[0]?.title ?? "先完成方向规划"}</h2>
  <p>{actions[0]?.detail ?? "规划会把目标变成可以开始的行动。"}</p>
  <Link className="button button-primary" to={actions[0]?.href ?? "/student/plan"}>
    继续处理 <ArrowRight size={16} />
  </Link>
</section>
<div className="today-secondary-actions">
  {actions.slice(1, 3).map((action) => <Link key={action.id} to={action.href}>
    <strong>{action.title}</strong><span>{action.detail}</span><ArrowRight size={15} />
  </Link>)}
</div>
<section className="workbench-quick-links">
  <Link to="/student/plan">规划<strong>确定方向与学习路线</strong></Link>
  <Link to="/student/actions">行动<strong>推进任务与校内机会</strong></Link>
  <Link to="/student/growth">成长<strong>查看能力与核验证据</strong></Link>
</section>
```

- [ ] **Step 5: Add compact responsive styles**

```css
.today-primary-action { padding: clamp(24px, 4vw, 38px); border-radius: 24px; background: var(--night); color: #f7eee7; }
.today-secondary-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
.today-secondary-actions a { display: grid; grid-template-columns: 1fr auto; gap: 5px 12px; padding: 16px; border: 1px solid var(--line); border-radius: 15px; background: var(--surface); }
@media (max-width: 720px) {
  .today-secondary-actions { grid-template-columns: 1fr; }
  .today-primary-action { padding: 21px; }
}
```

- [ ] **Step 6: Run the focused flow**

```powershell
npx playwright test e2e/navigation.spec.ts --grep "today workspace"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/StudentHomePage.tsx src/App.tsx src/styles/globals.css e2e/navigation.spec.ts
git commit -m "feat: make today the authoritative student start"
```

## Task 4: Planning workspace

**Files:**
- Create: `src/components/workspaces/PlanningSummary.tsx`
- Create: `src/pages/PlanningWorkspacePage.tsx`
- Modify: `src/pages/AwakeningPage.tsx`
- Modify: `src/pages/MatchingPage.tsx`
- Modify: `src/pages/LearningPathPage.tsx`
- Modify: `src/pages/AiPlanningPage.tsx`
- Modify: `src/App.tsx`
- Test: `e2e/release.spec.ts`

- [ ] **Step 1: Add a failing planning navigation test**

```ts
test("planning workspace keeps direction learning and generation in one shell", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.goto("/student/plan");
  await expect(page.getByRole("navigation", { name: "规划步骤" })).toBeVisible();
  await expect(page.getByRole("link", { name: /方向/ })).toBeVisible();
  await page.getByRole("link", { name: /学习/ }).click();
  await expect(page).toHaveURL(/section=learning/);
  await expect(page.getByRole("heading", { name: "一键导入培养方案" })).toBeVisible();
  await page.getByRole("link", { name: /生成/ }).click();
  await expect(page.getByRole("heading", { name: "补充经历和现实限制。" })).toBeVisible();
});
```

- [ ] **Step 2: Verify failure**

```powershell
npx playwright test e2e/release.spec.ts --grep "planning workspace"
```

Expected: FAIL because `/student/plan` is absent.

- [ ] **Step 3: Export shell-free content**

Perform a mechanical extraction without changing the copied JSX:

- In `AwakeningPage.tsx`, move the current `<section className="explore-top">` and `<section className="explore-layout">` siblings into exported `AwakeningContent`; the default export wraps `<AwakeningContent />` in the current `PageShell`.
- In `MatchingPage.tsx`, move the current content beginning with `<section className="path-selector">` and ending with the final planning CTA into exported `MatchingContent`; the default export retains the current `PageShell` title and renders `<MatchingContent />`.
- In `LearningPathPage.tsx`, move the current content beginning with `<section className="path-setup-grid">` and ending with `path-empty-state` into exported `LearningPathContent`; all hooks and handlers stay inside that exported function.
- In `AiPlanningPage.tsx`, move the current content beginning with `ai-planner-intro` and ending with `ai-plan-result` into exported `AiPlanningContent`; all AI health, direction, plan, and save hooks stay inside that exported function.

The four default wrappers become:

```tsx
export default function AwakeningPage() {
  return <PageShell eyebrow="低年级探索" title="先回答一个真实的问题，再决定是否走远。" description="用六步把兴趣和体验变成方向证据。"><AwakeningContent /></PageShell>;
}
export default function MatchingPage() {
  return <PageShell eyebrow="高年级决策" title="先选一个参照目标，再把差距变成行动。" description="准备度仅用于自我诊断，不代表录取或求职概率。"><MatchingContent /></PageShell>;
}
export default function LearningPathPage() {
  return <PageShell eyebrow="培养方案驱动规划" title="从专业课出发，走到研究生与算法岗位。" description="导入培养方案并生成可解释、可存储的学习路径。"><LearningPathContent /></PageShell>;
}
export default function AiPlanningPage() {
  return <PageShell eyebrow="DeepSeek · 个性化规划" title="把宽泛兴趣，缩小成可以验证的方向。" description="AI 结合画像与现实约束提出候选。"><AiPlanningContent /></PageShell>;
}
```

No new state or API call is added to these wrappers.

- [ ] **Step 4: Create one shared planning summary**

```tsx
export default function PlanningSummary() {
  const profile = useCareerStore((state) => state.profile);
  const learningPath = useCareerStore((state) => state.learningPath);
  return <section className="planning-summary">
    <div><span>当前阶段</span><strong>{profile.grade <= 2 ? "方向探索" : "目标决策"}</strong></div>
    <div><span>优先路径</span><strong>{pathwayGuidance[profile.targetPath].label}</strong></div>
    <div><span>学习路线</span><strong>{learningPath.plan?.targetRole ?? "待生成"}</strong></div>
  </section>;
}
```

- [ ] **Step 5: Create `PlanningWorkspacePage`**

```tsx
export default function PlanningWorkspacePage() {
  const [searchParams] = useSearchParams();
  const profile = useCareerStore((state) => state.profile);
  const section = normalizeWorkspaceSection("plan", searchParams.get("section"));
  const tabs = [
    { to: "/student/plan?section=direction", label: "方向", detail: "探索与目标诊断", icon: Target },
    { to: "/student/plan?section=learning", label: "学习", detail: "培养方案与路径", icon: Network },
    { to: "/student/plan?section=generate", label: "生成", detail: "规则与 AI 辅助", icon: Sparkles },
  ];
  return <PageShell eyebrow="规划工作区" title="先确定方向，再安排学习与行动。" description="方向、学习路径和计划生成共享同一份画像。">
    <WorkspaceTabs label="规划步骤" tabs={tabs} />
    <PlanningSummary />
    {section === "direction" && (profile.grade <= 2 ? <AwakeningContent /> : <MatchingContent />)}
    {section === "learning" && <LearningPathContent />}
    {section === "generate" && <AiPlanningContent />}
  </PageShell>;
}
```

- [ ] **Step 6: Register the route and compatibility targets**

```tsx
<Route path="/student/plan" element={<AuthRoute><RoleRoute allowed={["freshman", "junior"]}><PlanningWorkspacePage /></RoleRoute></AuthRoute>} />
```

For legacy routes, render `PlanningWorkspacePage` with a fixed compatibility section or redirect with `Navigate` while preserving `next` behavior.

- [ ] **Step 7: Run planning tests**

```powershell
npm run typecheck
npx playwright test e2e/release.spec.ts --grep "planning workspace|curriculum import|DeepSeek"
```

Expected: planning, curriculum, and AI tests PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/components/workspaces/PlanningSummary.tsx src/pages/PlanningWorkspacePage.tsx src/pages/AwakeningPage.tsx src/pages/MatchingPage.tsx src/pages/LearningPathPage.tsx src/pages/AiPlanningPage.tsx src/App.tsx e2e/release.spec.ts
git commit -m "feat: combine direction learning and plan generation"
```

## Task 5: Action workspace

**Files:**
- Create: `src/pages/ActionWorkspacePage.tsx`
- Modify: `src/pages/RoadmapPage.tsx`
- Modify: `src/pages/OpportunityBoardPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/globals.css`
- Test: `e2e/navigation.spec.ts`
- Test: `e2e/opportunities.spec.ts`

- [ ] **Step 1: Add a failing unified action-flow test**

```ts
test("actions and resources share one action workspace", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.goto("/student/actions");
  await expect(page.getByRole("navigation", { name: "行动视图" })).toBeVisible();
  await page.getByRole("link", { name: /找资源/ }).click();
  await expect(page).toHaveURL(/section=resources/);
  await expect(page.getByPlaceholder("搜索项目、课程、单位")).toBeVisible();
  await page.getByRole("link", { name: /全部行动/ }).click();
  await expect(page.locator(".action-item-list")).toBeVisible();
});
```

- [ ] **Step 2: Verify failure**

```powershell
npx playwright test e2e/navigation.spec.ts --grep "actions and resources"
```

Expected: FAIL because `/student/actions` is absent.

- [ ] **Step 3: Export action and resource content**

In `RoadmapPage.tsx`, name the three existing blocks and render them conditionally:

- `week`: the compact progress summary plus the prioritized first three `presentationItems`;
- `all`: `action-item-list` with every `presentationItem`;
- `new`: the current `quick-add` form and its existing submit handler.

Use this exact public signature:

```tsx
export type RoadmapSection = "week" | "all" | "new";

export declare function RoadmapContent({ section }: { section: RoadmapSection }): JSX.Element;
```

The function body contains the exact current JSX blocks identified above after moving the current state and handlers into `RoadmapContent`. The evidence dialog is rendered after all three conditional sections so every view can complete evidence submission. The default `RoadmapPage` renders `<RoadmapContent section="all" />` inside its current shell.

In `OpportunityBoardPage.tsx`, move everything between its `PageShell` tags into `OpportunityBoardContent`; keep the current resource-fetching hooks and participation handlers inside that export. The default page remains a shell wrapper until compatibility routes are completed.

- [ ] **Step 4: Create `ActionWorkspacePage`**

```tsx
export default function ActionWorkspacePage() {
  const [searchParams] = useSearchParams();
  const section = normalizeWorkspaceSection("actions", searchParams.get("section"));
  const tabs = [
    { to: "/student/actions?section=week", label: "本周", icon: Clock3 },
    { to: "/student/actions?section=all", label: "全部行动", icon: ClipboardCheck },
    { to: "/student/actions?section=resources", label: "找资源", icon: LibraryBig },
    { to: "/student/actions?section=new", label: "新增", icon: Plus },
  ];
  return <PageShell eyebrow="行动工作区" title="把计划、机会和成果放在一起。" description="推进状态、加入校内资源并留下可核验成果。">
    <WorkspaceTabs label="行动视图" tabs={tabs} />
    {section === "resources"
      ? <OpportunityBoardContent />
      : <RoadmapContent section={section as "week" | "all" | "new"} />}
  </PageShell>;
}
```

- [ ] **Step 5: Remove the duplicate focus hero**

Delete the large `roadmap-focus` section from embedded action content. The authoritative next action remains on `/student/today`. Preserve progress metrics as a compact header:

```tsx
<section className="action-progress-summary">
  <span>{metrics.completed} / {metrics.total} 已完成</span>
  <i><b style={{ width: `${metrics.progress}%` }} /></i>
  <strong>{metrics.active} 项正在推进</strong>
</section>
```

- [ ] **Step 6: Register routes and run existing resource loop**

```powershell
npm run typecheck
npx playwright test e2e/navigation.spec.ts --grep "actions and resources|higher-grade student"
npx playwright test e2e/opportunities.spec.ts
```

Expected: all tests PASS, including teacher verification.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/ActionWorkspacePage.tsx src/pages/RoadmapPage.tsx src/pages/OpportunityBoardPage.tsx src/App.tsx src/styles/globals.css e2e/navigation.spec.ts e2e/opportunities.spec.ts
git commit -m "feat: unify actions resources and evidence"
```

## Task 6: Growth workspace and ability de-duplication

**Files:**
- Create: `src/pages/GrowthWorkspacePage.tsx`
- Modify: `src/pages/AbilityProfilePage.tsx`
- Modify: `src/pages/MatchingPage.tsx`
- Modify: `src/pages/GraduatePage.tsx`
- Modify: `src/App.tsx`
- Test: `e2e/release.spec.ts`

- [ ] **Step 1: Add a failing growth test**

```ts
test("growth workspace is the single complete ability view", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.goto("/student/growth");
  await expect(page.getByRole("heading", { name: "自评是起点，证据决定可信度。" })).toBeVisible();
  await expect(page.locator(".ability-dimension")).toHaveCount(7);
  await expect(page.getByRole("link", { name: /个人资料/ })).toBeVisible();
});
```

- [ ] **Step 2: Verify failure**

```powershell
npx playwright test e2e/release.spec.ts --grep "growth workspace"
```

Expected: FAIL because `/student/growth` is absent.

- [ ] **Step 3: Export ability content and create growth page**

Move the current `ability-profile-summary`, `ability-profile-editor`, and `ability-next-step` sections, together with their current hooks and `save` handler, into exported `AbilityProfileContent`. The default ability page keeps its current `PageShell` and renders that export.

Create the growth wrapper:

```tsx
export default function GrowthWorkspacePage() {
  return <PageShell eyebrow="成长工作区" title="自评是起点，证据决定可信度。" description="能力、核验证据和学习背景使用同一份账号状态。">
    <AbilityProfileContent />
    <section className="growth-background-entry">
      <div><span className="section-kicker">学习背景</span><h2>让建议继续贴近你的真实情况。</h2></div>
      <Link className="button button-quiet" to="/account/profile">查看个人资料 <ArrowRight size={16} /></Link>
    </section>
  </PageShell>;
}
```

- [ ] **Step 4: Reduce repeated ability explanations**

In `MatchingContent`, keep the three target gaps and replace the large ability explainer with:

```tsx
<Link className="inline-workspace-link" to="/student/growth">
  完整七维能力与证据可信度 <ArrowRight size={14} />
</Link>
```

In `GraduatePage`, keep only plan-specific evidence bars and add the same link. Do not remove research outcomes.

- [ ] **Step 5: Register route and run tests**

```powershell
npm run typecheck
npx playwright test e2e/release.spec.ts --grep "growth workspace|all four higher-grade"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/GrowthWorkspacePage.tsx src/pages/AbilityProfilePage.tsx src/pages/MatchingPage.tsx src/pages/GraduatePage.tsx src/App.tsx e2e/release.spec.ts
git commit -m "feat: make growth the authoritative ability view"
```

## Task 7: Teacher de-duplication and unified visual language

**Files:**
- Modify: `src/pages/AdminDashboardPage.tsx`
- Modify: `src/styles/globals.css`
- Test: `e2e/opportunities.spec.ts`
- Test: `scripts/release-visual-audit.mjs`

- [ ] **Step 1: Add a failing unique-entry assertion**

```ts
await page.goto("/teacher/dashboard");
await expect(page.getByRole("button", { name: "新建资源" })).toHaveCount(1);
```

- [ ] **Step 2: Verify failure**

```powershell
npx playwright test e2e/opportunities.spec.ts
```

Expected: FAIL when the current user can publish because two “新建资源” controls exist.

- [ ] **Step 3: Keep one authoritative create action**

Remove `staff-new-resource` from the global teacher tab row. Keep the resources-section toolbar button:

```tsx
<section className="staff-tabs" aria-label="教师工作区">
  {workspaceTabs.map(([value, label, Icon]) => <button
    className={tab === value ? "is-active" : ""}
    key={value}
    onClick={() => setTab(value)}
    type="button"
  >
    <Icon size={17} />
    {label}
    {value === "evidence" && pendingEvidence > 0 ? <span>{pendingEvidence}</span> : null}
    {value === "resources" && pendingResources > 0 ? <span>{pendingResources}</span> : null}
  </button>)}
</section>
```

- [ ] **Step 4: Normalize workspace tokens**

Add shared card and section variables, then replace one-off mobile values:

```css
:root {
  --workspace-gap: 16px;
  --workspace-card-radius: 18px;
  --workspace-card-padding: 20px;
}
.workspace-section {
  display: grid;
  gap: var(--workspace-gap);
}
.workspace-card {
  padding: var(--workspace-card-padding);
  border: 1px solid var(--line);
  border-radius: var(--workspace-card-radius);
  background: var(--surface);
}
@media (max-width: 720px) {
  :root {
    --workspace-gap: 10px;
    --workspace-card-radius: 16px;
    --workspace-card-padding: 16px;
  }
}
```

Apply these classes to new workspace summaries and cards; retain dark diagnostic cards only for the today primary action and route diagnosis.

- [ ] **Step 5: Update visual audit captures**

Replace separate legacy student captures with:

```js
await capture("student-today-desktop", "/student/today");
await capture("student-plan-direction-desktop", "/student/plan?section=direction");
await capture("student-plan-learning-mobile", "/student/plan?section=learning");
await capture("student-actions-mobile", "/student/actions?section=all");
await capture("student-resources-mobile", "/student/actions?section=resources");
await capture("student-growth-mobile", "/student/growth");
await capture("teacher-overview-mobile-dark", "/teacher/dashboard");
```

- [ ] **Step 6: Run teacher and visual checks**

```powershell
npx playwright test e2e/opportunities.spec.ts
npm run test:visual
```

Expected: teacher flow PASS; visual JSON has `failed: false`.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/AdminDashboardPage.tsx src/styles/globals.css e2e/opportunities.spec.ts scripts/release-visual-audit.mjs
git commit -m "style: unify student and teacher workspace layout"
```

## Task 8: Compatibility, complete regression, and documentation

**Files:**
- Modify: `src/App.tsx`
- Modify: `e2e/auth.spec.ts`
- Modify: `e2e/navigation.spec.ts`
- Modify: `e2e/release.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Add legacy deep-link coverage**

```ts
for (const [legacy, expected] of [
  ["/student/matching", /\/student\/plan\?section=direction/],
  ["/student/learning-path", /\/student\/plan\?section=learning/],
  ["/student/ai-planning", /\/student\/plan\?section=generate/],
  ["/student/roadmap", /\/student\/actions\?section=all/],
  ["/student/opportunities", /\/student\/actions\?section=resources/],
  ["/student/abilities", /\/student\/growth/],
] as const) {
  await page.goto(legacy);
  await expect(page).toHaveURL(expected);
}
```

- [ ] **Step 2: Run and verify failure before final route wiring**

```powershell
npx playwright test e2e/release.spec.ts --grep "legacy"
```

Expected: FAIL for any legacy route not yet mapped.

- [ ] **Step 3: Complete compatibility routes**

Use explicit `Navigate` elements after authentication/role guards:

```tsx
<Route path="/student/matching" element={<AuthRoute><Navigate replace to="/student/plan?section=direction" /></AuthRoute>} />
<Route path="/student/learning-path" element={<AuthRoute><Navigate replace to="/student/plan?section=learning" /></AuthRoute>} />
<Route path="/student/ai-planning" element={<AuthRoute><Navigate replace to="/student/plan?section=generate" /></AuthRoute>} />
<Route path="/student/roadmap" element={<AuthRoute><Navigate replace to="/student/actions?section=all" /></AuthRoute>} />
<Route path="/student/opportunities" element={<AuthRoute><Navigate replace to="/student/actions?section=resources" /></AuthRoute>} />
<Route path="/student/abilities" element={<AuthRoute><Navigate replace to="/student/growth" /></AuthRoute>} />
```

If `AuthRoute` cannot wrap `Navigate` because of its child type, add a small `LegacyWorkspaceRedirect` component that renders `Navigate` after the existing auth check.

- [ ] **Step 4: Update README navigation description**

Document:

```markdown
学生端按四个任务工作区组织：

- 今天：当前最重要的一步和反馈；
- 规划：方向、培养方案学习路径和可选 AI 生成；
- 行动：本周、全部行动、校内资源和成果；
- 成长：七维能力、核验证据和学习背景。

旧学生深链接会自动定位到对应工作区。
```

- [ ] **Step 5: Run full release gate**

```powershell
npm run check:release
```

Expected:

- server syntax PASS;
- TypeScript PASS;
- ESLint PASS;
- all Vitest tests PASS;
- all Playwright E2E tests PASS;
- visual audit returns `failed: false`;
- production build PASS;
- dependency audit passes with only the existing documented React Server Components exception.

- [ ] **Step 6: Verify Tencent subpath build**

```powershell
$env:VITE_APP_BASE='/career/'
$env:VITE_API_BASE='/career/api'
npx vite build --mode tencent
Select-String -LiteralPath dist/index.html -Pattern '/career/assets/'
```

Expected: build exits 0 and `dist/index.html` contains `/career/assets/`.

- [ ] **Step 7: Verify clean diff and commit**

```powershell
git diff --check
git status -sb
git add src/App.tsx e2e/auth.spec.ts e2e/navigation.spec.ts e2e/release.spec.ts README.md
git commit -m "test: verify unified career workspaces"
git status -sb
```

Expected: final status is clean on `codex/detailed-action-plan`.
