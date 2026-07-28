import { ArrowRight, CalendarDays, Clock3, FileUp, Layers3, LoaderCircle, Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createAction, getActions, submitActionEvidence, updateAction } from "../api/pilot";
import PageShell from "../components/common/PageShell";
import ActionPlanCard from "../components/product/ActionPlanCard";
import EmptyState from "../components/product/EmptyState";
import ProgressRail from "../components/product/ProgressRail";
import type { ActionItem } from "../domain";
import { presentAction, selectFocusAction, summarizeActions } from "../services/actionPlan";
import { useCareerStore } from "../store/careerStore";

const categoryLabels = { course: "课程", project: "项目", practice: "实践", reflection: "反思", research: "科研", career: "生涯" };

function localLane(explorer: boolean) {
  return explorer ? "exploration" as const : "growth" as const;
}

export default function RoadmapPage() {
  const profile = useCareerStore((state) => state.profile);
  const awakening = useCareerStore((state) => state.awakening);
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    detail: "",
    category: "practice" as ActionItem["category"],
    dueDate: "",
  });
  const [evidenceAction, setEvidenceAction] = useState<ActionItem | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [reflection, setReflection] = useState("");
  const explorer = profile.grade <= 2;
  const localTasks = explorer ? awakening.actionTasks : roadmapTasks;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let remote = (await getActions()).actions;
        if (!remote.length && localTasks.length) {
          const imported = await Promise.all(localTasks.map((task) => createAction({
            title: task.title,
            detail: task.detail,
            category: task.category,
            lane: localLane(explorer),
            source: task.id.startsWith("ai-plan-") ? "ai" : "rule",
            sourceId: task.id,
            dueDate: task.dueDate,
            trace: task.provenance,
          }).then(({ action }) => task.completed ? updateAction(action.id, { status: "completed", reflection: task.reflection || "" }).then((result) => result.action) : action)));
          remote = imported;
        }
        if (active) setActions(remote);
      } catch (reason) {
        if (active) setMessage(reason instanceof Error ? reason.message : "行动同步暂不可用。");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [explorer, localTasks]);

  const groups = useMemo(() => {
    const lanes = new Map<string, ActionItem[]>();
    actions.forEach((action) => {
      const label = action.lane === "exploration" ? "方向探索" : action.lane === "research" ? "科研推进" : action.lane === "career" ? "职业准备" : "成长行动";
      lanes.set(label, [...(lanes.get(label) || []), action]);
    });
    return [...lanes.entries()];
  }, [actions]);
  const summary = useMemo(() => summarizeActions(actions), [actions]);
  const focusAction = useMemo(() => selectFocusAction(actions), [actions]);
  const focusCopy = focusAction ? presentAction(focusAction) : null;

  async function patch(action: ActionItem, status: ActionItem["status"], nextReflection = action.reflection) {
    try {
      const result = await updateAction(action.id, { status, reflection: nextReflection });
      setActions((current) => current.map((item) => item.id === action.id ? result.action : item));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "行动更新失败。");
    }
  }

  function openEvidence(action: ActionItem) {
    setEvidenceAction(action);
    setReflection(action.reflection);
  }

  function advance(action: ActionItem) {
    if (action.status === "changes_requested") {
      openEvidence(action);
      return;
    }
    void patch(action, action.status === "planned" ? "in_progress" : "completed");
  }

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

  async function submitEvidence(event: React.FormEvent) {
    event.preventDefault();
    if (!evidenceAction) return;
    try {
      await submitActionEvidence({
        actionItemId: evidenceAction.id,
        description: evidenceDescription,
        evidenceUrl,
        reflection,
      });
      setActions((current) => current.map((action) => action.id === evidenceAction.id ? { ...action, status: "submitted" } : action));
      setEvidenceAction(null);
      setEvidenceDescription("");
      setEvidenceUrl("");
      setReflection("");
      setMessage("成果已提交，将由有权限的教师匿名核验。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "成果提交失败。");
    }
  }

  const entry = explorer ? "/student/awakening" : "/student/matching";
  return <PageShell eyebrow="行动中心" title="让计划进入真实的时间。" description="安排下一步、推进状态并留下成果；完成不等于自动获得能力分。">
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
          <button className="button button-quiet" onClick={() => openEvidence(focusAction)} type="button">
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
          <ActionPlanCard action={action} index={index} key={action.id} onAdvance={advance} onEvidence={openEvidence} />)}
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

    {evidenceAction && <div className="modal-backdrop" role="presentation"><form aria-label="提交行动成果" className="evidence-dialog" onSubmit={submitEvidence}>
      <div><div><span className="section-kicker">成果核验</span><h2>{evidenceAction.title}</h2></div><button aria-label="关闭" onClick={() => setEvidenceAction(null)} type="button"><X size={18} /></button></div>
      <label>成果说明<textarea maxLength={600} onChange={(event) => setEvidenceDescription(event.target.value)} placeholder="说明完成内容、承担部分和结果。" required rows={4} value={evidenceDescription} /></label>
      <label>公开成果链接（可选）<input onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." type="url" value={evidenceUrl} /></label>
      <label>行动反思<textarea maxLength={600} onChange={(event) => setReflection(event.target.value)} placeholder="这一步验证或改变了什么？" required rows={4} value={reflection} /></label>
      <div><button className="button button-quiet" onClick={() => setEvidenceAction(null)} type="button">取消</button><button className="button button-primary" type="submit"><Save size={15} />提交核验</button></div>
    </form></div>}
    {message && <p className="save-message" role="status">{message}</p>}
  </PageShell>;
}
