# Detailed Action Plan Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-manual:subagent-driven-development (recommended) or superpowers-manual:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing server-authoritative action archive into a detailed, prioritized, progressively disclosed personal plan with an Apple × Anthropic visual style.

**Architecture:** Keep the schema-8 API unchanged. Add a pure presentation service that converts existing action fields into focus ranking, schedule labels, three-step guidance, and completion standards; render it through a focused action-card component while `RoadmapPage` remains responsible for network state. Strengthen AI task copy inside the existing JSON contract so detailed guidance survives import without a database migration.

**Tech Stack:** React 19, TypeScript 5.9, React Router, Lucide React, Vitest, Testing Library, Playwright, Vite, existing Node/SQLite API.

---

## File map

- Create `src/services/actionPlan.ts`: pure action-plan formatting, focus ranking, summary calculation, and AI detail merging.
- Create `src/services/actionPlan.test.ts`: deterministic unit coverage for all presentation rules.
- Create `src/components/product/ActionPlanCard.tsx`: accessible progressive-disclosure action card.
- Modify `src/pages/RoadmapPage.tsx`: orchestration, plan overview, focus action, detailed manual composer, and existing API actions.
- Modify `server/planner.mjs`: require ordered micro-steps and measurable evidence in the current JSON fields.
- Modify `server/planner.test.ts`: lock the stronger prompt and retain structural/interview safeguards.
- Modify `src/pages/AiPlanningPage.tsx`: retain the AI completion standard when tasks are imported.
- Modify `e2e/navigation.spec.ts`: verify the detailed plan and manual action persistence.
- Modify `src/styles/globals.css`: scoped Apple × Anthropic action-plan styling and responsive behavior.
- Modify `scripts/release-visual-audit.mjs`: add dark/reduced-motion and 200% action-plan captures.

The existing dirty files `.gitignore`, `package.json`, `src/App.tsx`, `src/pages/LoginPage.tsx`, `e2e/auth.spec.ts`, `.env.tencent`, and `deploy/tencent/*` are outside this plan and must not be staged.

### Task 1: Build the pure action-plan presentation model

**Files:**
- Create: `src/services/actionPlan.test.ts`
- Create: `src/services/actionPlan.ts`

- [ ] **Step 1: Write the failing presentation-model tests**

Create `src/services/actionPlan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ActionItem } from "../domain";
import {
  mergeActionDetail,
  presentAction,
  selectFocusAction,
  summarizeActions,
} from "./actionPlan";

function action(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "action-1",
    title: "完成岗位能力对照",
    detail: "对照三个公开岗位描述，整理共同能力要求。",
    category: "career",
    priority: "medium",
    lane: "career",
    source: "rule",
    sourceId: "rule-1",
    status: "planned",
    dueDate: "",
    reflection: "",
    trace: {
      generator: "rule",
      promptVersion: "",
      ruleVersion: "career-rules-0.7.0",
      model: "",
      generatedAt: "",
      resourceIds: [],
      autonomous: true,
    },
    createdAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-07-28T00:00:00.000Z",
    ...overrides,
  };
}

describe("action plan presentation", () => {
  it("selects returned work before active and planned work", () => {
    const focus = selectFocusAction([
      action({ id: "planned", status: "planned" }),
      action({ id: "active", status: "in_progress" }),
      action({ id: "returned", status: "changes_requested" }),
    ], new Date("2026-07-28T00:00:00.000Z"));
    expect(focus?.id).toBe("returned");
  });

  it("uses a near due date before an undated planned action", () => {
    const focus = selectFocusAction([
      action({ id: "undated" }),
      action({ id: "dated", dueDate: "2026-07-30" }),
    ], new Date("2026-07-28T00:00:00.000Z"));
    expect(focus?.id).toBe("dated");
  });

  it("creates three explicit steps and a non-fictional schedule label", () => {
    const result = presentAction(
      action({ category: "project", dueDate: "2026-08-15" }),
      new Date("2026-07-28T00:00:00.000Z"),
    );
    expect(result.steps).toHaveLength(3);
    expect(result.scheduleLabel).toBe("8月15日截止");
    expect(result.timebox).toBe("2–3 次深度工作");
    expect(result.sourceLabel).toBe("规则计划");
  });

  it("extracts an AI completion standard from the existing detail field", () => {
    const result = presentAction(action({
      source: "ai",
      detail: "先整理数据，再完成分析。\n完成标准：提交一页含三项发现的报告。",
    }));
    expect(result.description).toBe("先整理数据，再完成分析。");
    expect(result.completionStandard).toBe("提交一页含三项发现的报告。");
  });

  it("summarizes action states without treating review as complete", () => {
    expect(summarizeActions([
      action({ id: "one", status: "in_progress" }),
      action({ id: "two", status: "submitted" }),
      action({ id: "three", status: "completed" }),
    ])).toEqual({ total: 3, active: 1, submitted: 1, completed: 1 });
  });

  it("merges AI evidence into a server-safe detail string", () => {
    const result = mergeActionDetail("准备材料；完成分析；整理结论。", "提交一页成果记录");
    expect(result).toContain("\n完成标准：提交一页成果记录");
    expect(result.length).toBeLessThanOrEqual(500);
  });
});
```

- [ ] **Step 2: Run the focused test and verify that it fails**

Run:

```powershell
npx vitest run src/services/actionPlan.test.ts
```

Expected: FAIL because `src/services/actionPlan.ts` does not exist.

- [ ] **Step 3: Implement the pure presentation service**

Create `src/services/actionPlan.ts`:

```ts
import type { ActionItem, ActionTask } from "../domain";

export type ActionPlanPresentation = {
  description: string;
  steps: [string, string, string];
  completionStandard: string;
  timebox: string;
  scheduleLabel: string;
  sourceLabel: string;
  isOverdue: boolean;
};

export type ActionPlanSummary = {
  total: number;
  active: number;
  submitted: number;
  completed: number;
};

const categoryGuides: Record<ActionTask["category"], Pick<ActionPlanPresentation, "steps" | "completionStandard" | "timebox">> = {
  course: {
    steps: ["圈定一个要掌握的知识点和参考材料", "完成学习并把关键方法整理成自己的话", "用练习、讲解或一页笔记检验理解"],
    completionStandard: "留下可回看的学习笔记、练习结果或知识卡。",
    timebox: "2 × 45 分钟",
  },
  project: {
    steps: ["写清问题、使用者和本次最小范围", "完成一个可运行或可展示的版本", "整理说明，并根据一次反馈修正"],
    completionStandard: "形成可展示的版本、链接或项目说明。",
    timebox: "2–3 次深度工作",
  },
  practice: {
    steps: ["确认场景、规则和本次观察重点", "完成一次真实操作并记录过程", "整理结果、问题和下一次改进"],
    completionStandard: "留下过程记录和一项可复用的结论。",
    timebox: "60–90 分钟",
  },
  reflection: {
    steps: ["回看本次行动的目标和实际过程", "写下证据、偏差与仍不确定的地方", "确定下一项继续、调整或停止的动作"],
    completionStandard: "形成一段有证据、有判断、有下一步的复盘。",
    timebox: "30 分钟",
  },
  research: {
    steps: ["明确研究问题和本次资料边界", "完成检索、分析或实验记录", "整理发现、限制与下一轮假设"],
    completionStandard: "留下可追溯的资料、数据或实验记录。",
    timebox: "2–4 小时",
  },
  career: {
    steps: ["选定一个公开目标作为参照", "对照要求与现有证据，标出关键差距", "把最大差距改写成下一项可执行行动"],
    completionStandard: "形成一份有来源的能力对照或决策记录。",
    timebox: "60–120 分钟",
  },
};

const sourceLabels: Record<ActionItem["source"], string> = {
  manual: "自主添加",
  rule: "规则计划",
  ai: "AI 规划",
  opportunity: "校内资源",
  research: "研究计划",
};

function dateValue(value: string) {
  return value ? Date.parse(`${value}T00:00:00Z`) : Number.POSITIVE_INFINITY;
}

function schedule(dueDate: string, today: Date) {
  if (!dueDate) return { label: "待安排", overdue: false };
  const [year, month, day] = dueDate.split("-").map(Number);
  const overdue = dateValue(dueDate) < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return { label: `${month}月${day}日${overdue ? "已到期" : "截止"}`, overdue };
}

export function mergeActionDetail(detail: string, evidence: string) {
  const suffix = evidence.trim() ? `\n完成标准：${evidence.trim()}` : "";
  return `${detail.trim().slice(0, Math.max(0, 500 - suffix.length))}${suffix}`.slice(0, 500);
}

export function presentAction(action: ActionItem, today = new Date()): ActionPlanPresentation {
  const [description, explicitStandard] = action.detail.split(/\n完成标准：/, 2);
  const guide = categoryGuides[action.category] || categoryGuides.practice;
  const due = schedule(action.dueDate, today);
  return {
    description: description.trim() || action.detail,
    steps: guide.steps,
    completionStandard: explicitStandard?.trim() || guide.completionStandard,
    timebox: guide.timebox,
    scheduleLabel: due.label,
    sourceLabel: sourceLabels[action.source] || "行动计划",
    isOverdue: due.overdue,
  };
}

export function selectFocusAction(actions: ActionItem[], today = new Date()) {
  const statusRank: Record<ActionItem["status"], number> = {
    changes_requested: 0,
    in_progress: 1,
    planned: 2,
    submitted: 3,
    completed: 4,
  };
  return [...actions]
    .filter((action) => !["submitted", "completed"].includes(action.status))
    .sort((left, right) =>
      statusRank[left.status] - statusRank[right.status]
      || dateValue(left.dueDate) - dateValue(right.dueDate)
      || left.createdAt.localeCompare(right.createdAt))[0] ?? null;
}

export function summarizeActions(actions: ActionItem[]): ActionPlanSummary {
  return {
    total: actions.length,
    active: actions.filter((action) => ["in_progress", "changes_requested"].includes(action.status)).length,
    submitted: actions.filter((action) => action.status === "submitted").length,
    completed: actions.filter((action) => action.status === "completed").length,
  };
}
```

- [ ] **Step 4: Run the focused test and verify that it passes**

Run:

```powershell
npx vitest run src/services/actionPlan.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Run typecheck and commit the pure model**

Run:

```powershell
npm run typecheck
git add -- src/services/actionPlan.ts src/services/actionPlan.test.ts
git diff --cached --check
git commit -m "feat: add detailed action plan presentation model"
```

Expected: typecheck exits 0; only the two action-plan service files are committed.

### Task 2: Render detailed action cards and the focus hierarchy

**Files:**
- Create: `src/components/product/ActionPlanCard.tsx`
- Modify: `e2e/navigation.spec.ts`
- Modify: `src/pages/RoadmapPage.tsx`

- [ ] **Step 1: Update the E2E flow so the desired experience fails first**

In the low-grade roadmap section of `e2e/navigation.spec.ts`, replace the one-field quick-add interaction with:

```ts
  await expect(page.getByText("计划概览")).toBeVisible();
  await expect(page.getByText("本周焦点")).toBeVisible();
  const generatedAction = page.locator(".action-item").filter({ hasText: "完成一个 API 调用小作品" });
  await generatedAction.getByText("查看执行蓝图").click();
  await expect(generatedAction.getByText("建议执行")).toBeVisible();
  await expect(generatedAction.locator(".action-blueprint-steps li")).toHaveCount(3);

  await page.getByLabel("行动名称").fill("完成一次实验室开放日观察记录");
  await page.getByLabel("具体说明").fill("观察开放日中的三个真实问题，整理成一页场景记录。");
  await page.getByLabel("行动类型").selectOption("practice");
  await page.getByLabel("截止日期").fill("2026-08-15");
  await page.getByRole("button", { name: "加入行动" }).click();
  await page.reload();
  const manualAction = page.locator(".action-item").filter({ hasText: "完成一次实验室开放日观察记录" });
  await expect(manualAction).toContainText("观察开放日中的三个真实问题");
  await expect(manualAction).toContainText("8月15日截止");
```

- [ ] **Step 2: Run the focused E2E test and verify that it fails**

Run:

```powershell
npx playwright test e2e/navigation.spec.ts --grep "low-grade student"
```

Expected: FAIL because the overview, focus, blueprint, and detailed composer do not exist.

- [ ] **Step 3: Create the accessible action card**

Create `src/components/product/ActionPlanCard.tsx`:

```tsx
import { ArrowRight, BadgeCheck, CalendarDays, ChevronDown, Circle, CheckCircle2, FileUp, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";
import type { ActionItem } from "../../domain";
import { presentAction } from "../../services/actionPlan";

const categoryLabels = { course: "课程", project: "项目", practice: "实践", reflection: "反思", research: "科研", career: "生涯" };
const statusLabels = { planned: "待开始", in_progress: "进行中", submitted: "待核验", completed: "已完成", changes_requested: "待补充" };

type ActionPlanCardProps = {
  action: ActionItem;
  index: number;
  onAdvance: (action: ActionItem) => void;
  onEvidence: (action: ActionItem) => void;
};

export default function ActionPlanCard({ action, index, onAdvance, onEvidence }: ActionPlanCardProps) {
  const copy = presentAction(action);
  const locked = ["submitted", "completed"].includes(action.status);
  return <article className={`action-item is-${action.status}`}>
    <button
      aria-label={action.status === "completed" ? `${action.title}已完成` : `推进${action.title}`}
      className="task-toggle"
      disabled={locked}
      onClick={() => onAdvance(action)}
      type="button"
    >
      {action.status === "completed" ? <CheckCircle2 size={21} /> : <Circle size={21} />}
    </button>
    <div className="action-item-copy">
      <div className="action-item-meta">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{categoryLabels[action.category]}</span>
        <span>{statusLabels[action.status]}</span>
        <span className={copy.isOverdue ? "is-overdue" : ""}><CalendarDays size={12} />{copy.scheduleLabel}</span>
      </div>
      <strong className="action-item-title">{action.title}</strong>
      <p>{copy.description}</p>
      {action.reflection && <blockquote>{action.reflection}</blockquote>}
      <details className="action-blueprint">
        <summary>查看执行蓝图 <ChevronDown size={15} /></summary>
        <div className="action-blueprint-grid">
          <aside>
            <span><TimerReset size={15} />建议投入</span>
            <strong>{copy.timebox}</strong>
            <small>{copy.sourceLabel}{action.trace.autonomous ? " · 可自主完成" : ""}</small>
          </aside>
          <div>
            <span className="section-kicker">建议执行</span>
            <ol className="action-blueprint-steps">{copy.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <div className="action-completion-standard"><BadgeCheck size={17} /><div><span>完成标准</span><strong>{copy.completionStandard}</strong></div></div>
          </div>
        </div>
      </details>
    </div>
    <div className="action-item-buttons">
      {action.source === "opportunity" && <Link to="/student/opportunities">查看资源 <ArrowRight size={14} /></Link>}
      {!locked && <button onClick={() => onEvidence(action)} type="button"><FileUp size={14} />提交成果</button>}
      {action.status === "changes_requested" && <span>教师已退回，请补充后重新提交。</span>}
      {action.status === "submitted" && <span><BadgeCheck size={14} />等待核验</span>}
    </div>
  </article>;
}
```

- [ ] **Step 4: Rebuild `RoadmapPage` around overview, focus, and detailed creation**

In `src/pages/RoadmapPage.tsx`:

1. Import `CalendarDays`, `Clock3`, `Layers3`, and `ActionPlanCard`.
2. Import `presentAction`, `selectFocusAction`, and `summarizeActions`.
3. Replace the `title` state with:

```ts
  const [draft, setDraft] = useState({
    title: "",
    detail: "",
    category: "practice" as ActionItem["category"],
    dueDate: "",
  });
```

4. Add the derived view state:

```ts
  const summary = useMemo(() => summarizeActions(actions), [actions]);
  const focusAction = useMemo(() => selectFocusAction(actions), [actions]);
  const focusCopy = focusAction ? presentAction(focusAction) : null;
```

5. Replace `add` with:

```ts
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.detail.trim()) return;
    try {
      const { action } = await createAction({
        title: draft.title.trim(),
        detail: draft.detail.trim(),
        category: draft.category,
        dueDate: draft.dueDate,
        lane: localLane(explorer),
        source: "manual",
      });
      setActions((current) => [...current, action]);
      setDraft({ title: "", detail: "", category: "practice", dueDate: "" });
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "行动添加失败。");
    }
  }
```

6. Add one handler shared by the focus card and list:

```ts
  function advance(action: ActionItem) {
    if (action.status === "changes_requested") {
      setEvidenceAction(action);
      setReflection(action.reflection);
      return;
    }
    void patch(action, action.status === "planned" ? "in_progress" : "completed");
  }
```

7. Replace the current overview/list/quick-add JSX with:

```tsx
  <section aria-labelledby="plan-overview-title" className="plan-overview">
    <div className="plan-overview-heading">
      <div><span className="section-kicker">计划概览</span><h2 id="plan-overview-title">把目标拆成能完成的下一步。</h2></div>
      <ProgressRail current={summary.completed} label="已完成" total={summary.total} />
    </div>
    <div className="plan-metrics" aria-label="行动状态统计">
      <div><span>全部行动</span><strong>{summary.total}</strong></div>
      <div><span>正在推进</span><strong>{summary.active}</strong></div>
      <div><span>等待核验</span><strong>{summary.submitted}</strong></div>
      <div><span>已经完成</span><strong>{summary.completed}</strong></div>
    </div>
  </section>

  {focusAction && focusCopy && <section className="roadmap-focus">
    <div>
      <span className="section-kicker">本周焦点</span>
      <h2>{focusAction.title}</h2>
      <p>{focusCopy.description}</p>
      <div className="roadmap-focus-actions">
        <button className="button button-primary" onClick={() => advance(focusAction)} type="button">
          {focusAction.status === "changes_requested" ? "补充成果" : focusAction.status === "planned" ? "开始行动" : "标记完成"}
          <ArrowRight size={16} />
        </button>
        <button className="button button-quiet" onClick={() => { setEvidenceAction(focusAction); setReflection(focusAction.reflection); }} type="button">
          <FileUp size={15} />提交成果
        </button>
      </div>
    </div>
    <aside>
      <div><Clock3 size={17} /><span>建议投入</span><strong>{focusCopy.timebox}</strong></div>
      <div><CalendarDays size={17} /><span>计划时间</span><strong>{focusCopy.scheduleLabel}</strong></div>
      <div><Layers3 size={17} /><span>完成标准</span><strong>{focusCopy.completionStandard}</strong></div>
    </aside>
  </section>}

  {loading ? <div className="opportunity-loading" role="status"><LoaderCircle size={20} />正在同步行动…</div> : !actions.length
    ? <EmptyState action={explorer ? "去完成方向探索" : "去生成行动计划"} detail="生成后的任务会自动进入这里，并按账号跨设备保存。" title="这里还没有行动" to={entry} />
    : <section className="authoritative-actions">{groups.map(([lane, items]) => <section key={lane}>
      <div className="roadmap-group-heading"><span>{lane}</span><p>{items.filter((item) => item.status === "completed").length} / {items.length} 已完成</p></div>
      <div className="action-item-list">{items.map((action, index) =>
        <ActionPlanCard action={action} index={index} key={action.id} onAdvance={advance} onEvidence={(item) => { setEvidenceAction(item); setReflection(item.reflection); }} />)}
      </div>
    </section>)}</section>}

  <form className="quick-add" onSubmit={add}>
    <header><div><span className="section-kicker">添加自己的行动</span><h2>把模糊想法写成能开始的一步。</h2></div><Plus size={22} /></header>
    <div className="quick-add-grid">
      <label>行动名称<input maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：完成一份数据作品说明" required value={draft.title} /></label>
      <label className="quick-add-detail">具体说明<textarea maxLength={500} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} placeholder="写清要做什么、使用什么材料，以及准备留下什么结果。" required rows={3} value={draft.detail} /></label>
      <label>行动类型<select onChange={(event) => setDraft({ ...draft, category: event.target.value as ActionItem["category"] })} value={draft.category}>
        {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>截止日期（可选）<input onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} type="date" value={draft.dueDate} /></label>
    </div>
    <footer><span>新增后可继续推进、提交成果和记录反思。</span><button className="button button-secondary" type="submit"><Plus size={17} />加入行动</button></footer>
  </form>
```

Keep the existing evidence dialog and message rendering after this block.

- [ ] **Step 5: Run unit, type, and focused E2E checks**

Run:

```powershell
npm run typecheck
npx vitest run src/services/actionPlan.test.ts
npx playwright test e2e/navigation.spec.ts --grep "low-grade student|higher-grade student"
```

Expected: typecheck exits 0; 6 unit tests PASS; both selected E2E tests PASS.

- [ ] **Step 6: Commit the functional action-plan redesign**

Run:

```powershell
git add -- src/components/product/ActionPlanCard.tsx src/pages/RoadmapPage.tsx e2e/navigation.spec.ts
git diff --cached --check
git commit -m "feat: make action plans detailed and prioritized"
```

Expected: only the new card, roadmap page, and navigation test are committed.

### Task 3: Make AI-generated tasks preserve detailed execution and evidence

**Files:**
- Modify: `server/planner.test.ts`
- Modify: `server/planner.mjs`
- Modify: `src/pages/AiPlanningPage.tsx`

- [ ] **Step 1: Add a failing prompt contract assertion**

After `expect(request.max_tokens).toBe(2200);` in `server/planner.test.ts`, add:

```ts
    expect(request.messages[0].content).toContain("准备、执行、整理");
    expect(request.messages[0].content).toContain("可核验");
```

- [ ] **Step 2: Run the planner test and verify that it fails**

Run:

```powershell
npx vitest run server/planner.test.ts
```

Expected: FAIL because the current action-plan system prompt does not contain the stronger wording.

- [ ] **Step 3: Strengthen the existing JSON-field requirements**

In `buildActionPlanRequest` in `server/planner.mjs`, replace the generic task sentence with:

```js
      "计划必须先验证方向，再补能力和作品证据；每项任务要有明确产出，能被学生勾选完成。",
      "每个 detail 必须按准备、执行、整理三个顺序动作写清学生实际要做什么；每个 evidence 必须是可核验的文件、链接、记录或判断标准。",
```

Keep the JSON shape, limits, interview prohibition, and non-fiction safeguards unchanged.

- [ ] **Step 4: Preserve the completion standard during local and server import**

In `src/pages/AiPlanningPage.tsx`, import:

```ts
import { mergeActionDetail } from "../services/actionPlan";
```

Then change the task mapping field to:

```ts
    detail: mergeActionDetail(task.detail, task.evidence),
```

Keep the existing `evidence` array so the AI preview still shows the planned output before saving.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```powershell
npx vitest run server/planner.test.ts src/services/actionPlan.test.ts
npm run typecheck
```

Expected: planner and action-plan tests PASS; typecheck exits 0.

- [ ] **Step 6: Commit the AI detail preservation**

Run:

```powershell
git add -- server/planner.mjs server/planner.test.ts src/pages/AiPlanningPage.tsx
git diff --cached --check
git commit -m "feat: preserve detailed AI action guidance"
```

Expected: only the planner and AI-planning files are committed.

### Task 4: Apply the Apple × Anthropic visual system and extend visual coverage

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `scripts/release-visual-audit.mjs`

- [ ] **Step 1: Replace the current authoritative-action style block**

In `src/styles/globals.css`, replace the block from `/* Authoritative action list */` through the current `.quick-add` field rules with scoped styles implementing:

```css
/* Detailed action plan */
.plan-overview { display: grid; gap: 16px; margin-bottom: 14px; padding: 24px; border: 1px solid var(--line); border-radius: 24px; background: var(--surface); box-shadow: 0 16px 44px rgba(62, 48, 36, .055); }
.plan-overview-heading { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 24px; align-items: end; }
.plan-overview-heading h2 { max-width: 620px; margin: 9px 0 0; font-size: clamp(24px, 2.6vw, 36px); letter-spacing: -.045em; }
.plan-overview .progress-rail { border: 0; padding: 0; background: transparent; }
.plan-metrics { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--line); }
.plan-metrics > div { display: grid; gap: 9px; padding: 17px 18px 0; border-left: 1px solid var(--line); }
.plan-metrics > div:first-child { padding-left: 0; border-left: 0; }
.plan-metrics span { color: var(--muted); font-size: 10px; }
.plan-metrics strong { font-size: 24px; letter-spacing: -.045em; }

.roadmap-focus { display: grid; grid-template-columns: minmax(0, 1fr) minmax(290px, .65fr); min-height: 330px; margin-bottom: 34px; overflow: hidden; border-radius: 26px; background: var(--night); color: #f7f1e9; box-shadow: 0 28px 70px rgba(36, 28, 22, .16); }
.roadmap-focus > div { display: flex; flex-direction: column; align-items: flex-start; padding: clamp(28px, 4vw, 46px); }
.roadmap-focus .section-kicker { color: #e99a77; }
.roadmap-focus h2 { max-width: 700px; margin: 20px 0 13px; font-size: clamp(31px, 4vw, 50px); line-height: 1.04; letter-spacing: -.055em; }
.roadmap-focus > div > p { max-width: 650px; margin: 0; color: #c9beb4; font-size: 14px; line-height: 1.72; }
.roadmap-focus-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: auto; padding-top: 28px; }
.roadmap-focus .button-primary { background: #f8f2ea; color: var(--night); }
.roadmap-focus .button-quiet { border-color: rgba(255,255,255,.2); color: #f8f2ea; }
.roadmap-focus > aside { display: grid; align-content: center; gap: 1px; padding: 24px; background: #342e29; }
.roadmap-focus > aside > div { display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; padding: 19px 10px; border-bottom: 1px solid rgba(255,255,255,.1); }
.roadmap-focus > aside > div:last-child { border-bottom: 0; }
.roadmap-focus aside svg { grid-row: 1 / 3; color: #e99a77; }
.roadmap-focus aside span { color: #a99e94; font-size: 10px; }
.roadmap-focus aside strong { color: #f2ebe3; font-size: 12px; line-height: 1.5; }

.authoritative-actions { display: grid; gap: 32px; }
.roadmap-group-heading { display: flex; align-items: center; justify-content: space-between; padding-bottom: 11px; border-bottom: 1px solid var(--line-strong); }
.roadmap-group-heading span { font-size: 14px; font-weight: 760; }
.roadmap-group-heading p { margin: 0; color: var(--faint); font-size: 10px; }
.action-item-list { display: grid; gap: 10px; margin-top: 12px; }
.action-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 15px; padding: 20px; border: 1px solid var(--line); border-radius: 20px; background: var(--surface); transition: border-color .18s ease, box-shadow .18s ease; }
.action-item:hover { border-color: var(--line-strong); box-shadow: 0 14px 38px rgba(62, 48, 36, .055); }
.action-item.is-completed { background: color-mix(in srgb, var(--surface-soft) 45%, var(--surface)); }
.action-item-copy { min-width: 0; }
.action-item-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: var(--faint); font: 700 9px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .035em; }
.action-item-meta span { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 4px 7px; border-radius: 999px; background: var(--surface-soft); }
.action-item-meta span:first-child { background: var(--ink); color: var(--surface); }
.action-item-meta .is-overdue { background: #fae3d8; color: #93452d; }
.action-item-title { display: block; margin: 14px 0 8px; font-size: 19px; letter-spacing: -.025em; }
.action-item-copy > p { max-width: 760px; margin: 0; color: var(--muted); font-size: 12px; line-height: 1.72; }
.action-item blockquote { margin: 12px 0 0; padding: 10px 12px; border-left: 2px solid var(--signal); background: var(--surface-soft); color: var(--muted); font-size: 11px; line-height: 1.55; }
.action-blueprint { margin-top: 15px; border-top: 1px solid var(--line); }
.action-blueprint summary { min-height: 44px; display: flex; align-items: center; gap: 6px; width: max-content; color: var(--signal-dark); font-size: 11px; font-weight: 760; cursor: pointer; list-style: none; }
.action-blueprint summary::-webkit-details-marker { display: none; }
.action-blueprint summary svg { transition: transform .18s ease; }
.action-blueprint[open] summary svg { transform: rotate(180deg); }
.action-blueprint-grid { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 22px; padding: 8px 0 4px; }
.action-blueprint-grid > aside { display: grid; align-content: start; gap: 7px; padding: 16px; border-radius: 14px; background: var(--surface-soft); }
.action-blueprint-grid aside span { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 10px; }
.action-blueprint-grid aside strong { font-size: 15px; }
.action-blueprint-grid aside small { color: var(--faint); font-size: 9px; line-height: 1.5; }
.action-blueprint-steps { display: grid; gap: 10px; margin: 12px 0 16px; padding: 0; list-style: none; counter-reset: action-step; }
.action-blueprint-steps li { counter-increment: action-step; display: grid; grid-template-columns: 25px minmax(0, 1fr); gap: 9px; align-items: start; color: var(--muted); font-size: 11px; line-height: 1.55; }
.action-blueprint-steps li::before { content: counter(action-step); width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid var(--line-strong); border-radius: 50%; color: var(--ink); font: 700 9px ui-monospace, monospace; }
.action-completion-standard { display: flex; gap: 10px; padding: 13px; border: 1px solid color-mix(in srgb, var(--signal) 30%, var(--line)); border-radius: 13px; background: color-mix(in srgb, var(--signal) 7%, var(--surface)); }
.action-completion-standard svg { color: var(--signal-dark); }
.action-completion-standard span, .action-completion-standard strong { display: block; }
.action-completion-standard span { margin-bottom: 4px; color: var(--faint); font-size: 9px; }
.action-completion-standard strong { font-size: 11px; line-height: 1.55; }
.action-item-buttons { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.action-item-buttons button, .action-item-buttons a { min-height: 40px; display: inline-flex; align-items: center; gap: 5px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--ink); font-size: 10px; }
.action-item-buttons > span { max-width: 170px; color: var(--muted); font-size: 10px; line-height: 1.45; }

.quick-add { display: grid; gap: 20px; margin-top: 34px; padding: 26px; border: 1px solid var(--line); border-radius: 24px; background: #ede4da; }
.quick-add > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.quick-add h2 { margin: 9px 0 0; font-size: 24px; letter-spacing: -.04em; }
.quick-add > header > svg { color: var(--signal-dark); }
.quick-add-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.quick-add-grid label, .composer-fields label, .resource-composer fieldset, .evidence-review-dialog fieldset, .evidence-dialog label { display: grid; gap: 7px; color: var(--muted); font-size: 11px; font-weight: 700; }
.quick-add-detail { grid-column: 1 / -1; }
.quick-add input, .quick-add select, .quick-add textarea, .composer-fields input, .composer-fields select, .composer-fields textarea, .evidence-dialog input, .evidence-dialog textarea, .evidence-review-dialog textarea, .rubric-grid select { width: 100%; padding: 11px 12px; border: 1px solid var(--line-strong); border-radius: 11px; background: var(--surface); color: var(--ink); }
.quick-add textarea { resize: vertical; }
.quick-add > footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.quick-add > footer > span { color: var(--muted); font-size: 10px; }
```

- [ ] **Step 2: Add responsive and dark-mode overrides**

Under the existing dark-theme rules, add:

```css
[data-theme="dark"] .quick-add { background: #332b25; }
[data-theme="dark"] .action-item-meta .is-overdue { background: #4b3025; color: #f0ad8d; }
[data-theme="dark"] .action-completion-standard { background: #332b25; }
```

Inside `@media (max-width: 720px)`, add or replace the relevant rules with:

```css
  .plan-overview { padding: 20px; }
  .plan-overview-heading, .roadmap-focus { grid-template-columns: 1fr; }
  .plan-overview-heading { gap: 18px; }
  .plan-metrics { grid-template-columns: repeat(2, 1fr); }
  .plan-metrics > div { padding: 14px 0 0; border-left: 0; }
  .plan-metrics > div:nth-child(even) { padding-left: 14px; border-left: 1px solid var(--line); }
  .roadmap-focus { min-height: 0; }
  .roadmap-focus > div { padding: 26px 22px; }
  .roadmap-focus h2 { font-size: 34px; }
  .roadmap-focus > aside { padding: 10px 20px 18px; }
  .action-item { grid-template-columns: auto minmax(0, 1fr); padding: 16px; }
  .action-item-buttons { grid-column: 2; justify-content: flex-start; }
  .action-blueprint-grid { grid-template-columns: 1fr; gap: 12px; }
  .quick-add { padding: 20px; }
  .quick-add-grid { grid-template-columns: 1fr; }
  .quick-add-detail { grid-column: auto; }
  .quick-add > footer { align-items: flex-start; flex-direction: column; }
```

- [ ] **Step 3: Add visual-audit coverage for the redesigned action center**

After the existing mobile roadmap capture in `scripts/release-visual-audit.mjs`, add:

```js
await page.evaluate(() => localStorage.setItem("career-theme", "dark"));
await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
await capture("07a-explorer-roadmap-dark-reduced-motion", "/student/roadmap");
await page.evaluate(() => localStorage.setItem("career-theme", "light"));
await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
await page.setViewportSize({ width: 1440, height: 1000 });
await capture("07b-explorer-roadmap-200-percent-zoom", "/student/roadmap", { zoom: 2 });
await page.evaluate(() => { document.body.style.zoom = "1"; });
```

Keep the existing desktop and 390px roadmap captures.

- [ ] **Step 4: Run style-adjacent checks and focused visual audit**

Run:

```powershell
npm run typecheck
npm run lint
npx playwright test e2e/navigation.spec.ts
npm run test:visual
```

Expected: typecheck and lint exit 0; navigation tests PASS; visual audit reports `"failed": false` with no overflow or console errors.

- [ ] **Step 5: Inspect the generated action-plan screenshots**

Open:

```text
test-results/release-audit/05-explorer-roadmap-desktop.png
test-results/release-audit/07-explorer-roadmap-mobile.png
test-results/release-audit/07a-explorer-roadmap-dark-reduced-motion.png
test-results/release-audit/07b-explorer-roadmap-200-percent-zoom.png
```

Verify the focus card is dominant, summary metrics remain secondary, detailed content does not overflow, the warm paper palette remains legible in dark mode, and 200% zoom retains every action.

- [ ] **Step 6: Commit the visual treatment**

Run:

```powershell
git add -- src/styles/globals.css scripts/release-visual-audit.mjs
git diff --cached --check
git commit -m "style: refine action plans with warm editorial UI"
```

Expected: only the stylesheet and visual-audit script are committed.

### Task 5: Run the release gate and verify repository scope

**Files:**
- Verify only; no new product files unless a check exposes a defect in the files above.

- [ ] **Step 1: Run the full release gate**

Run:

```powershell
npm run check:release
```

Expected: server syntax, TypeScript, ESLint, Vitest, Playwright E2E, visual audit, production build, and production dependency audit all exit 0.

- [ ] **Step 2: Verify the Tencent subpath build**

Run:

```powershell
npm run build:tencent
Select-String -LiteralPath "dist\index.html" -Pattern "/career/assets/"
```

Expected: build exits 0 and `dist/index.html` contains `/career/assets/`.

- [ ] **Step 3: Check diff hygiene and preserve pre-existing work**

Run:

```powershell
git diff --check
git status --short
git log -6 --oneline --decorate
```

Expected:

- no whitespace errors in this feature;
- `.env.tencent` remains untracked and is never staged or printed;
- pre-existing deployment/login changes remain outside this feature's commits;
- the design, presentation model, functional UI, AI copy, and visual commits appear at the top of the log.

- [ ] **Step 4: Record verified completion in Obsidian**

Append a concise `2026-07-28` section to:

```text
C:\Users\Aa133\Documents\Obsidian Vault\Codex\projects\职业规划导航平台.md
```

Record:

- the detailed action-plan information architecture;
- the no-schema-migration decision;
- exact automated and visual verification results;
- commit hashes created in this run;
- any remaining external production work without credentials.

If a required release check remains unresolved, add one concise entry to:

```text
C:\Users\Aa133\Documents\Obsidian Vault\Codex\agent\open-loops.md
```

Do not write secrets, invitation email addresses, tokens, or environment values.
