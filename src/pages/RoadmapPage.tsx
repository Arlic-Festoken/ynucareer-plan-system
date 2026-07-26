import { ArrowRight, BadgeCheck, Circle, CheckCircle2, FileUp, LoaderCircle, Plus, Route, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createAction, getActions, submitActionEvidence, updateAction } from "../api/pilot";
import PageShell from "../components/common/PageShell";
import EmptyState from "../components/product/EmptyState";
import ProgressRail from "../components/product/ProgressRail";
import type { ActionItem } from "../domain";
import { useCareerStore } from "../store/careerStore";

const categoryLabels = { course: "课程", project: "项目", practice: "实践", reflection: "反思", research: "科研", career: "生涯" };
const statusLabels = { planned: "待开始", in_progress: "进行中", submitted: "待核验", completed: "已完成", changes_requested: "待补充" };

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
  const [title, setTitle] = useState("");
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

  const completed = actions.filter((action) => action.status === "completed").length;
  const groups = useMemo(() => {
    const lanes = new Map<string, ActionItem[]>();
    actions.forEach((action) => {
      const label = action.lane === "exploration" ? "方向探索" : action.lane === "research" ? "科研推进" : action.lane === "career" ? "职业准备" : "成长行动";
      lanes.set(label, [...(lanes.get(label) || []), action]);
    });
    return [...lanes.entries()];
  }, [actions]);

  async function patch(action: ActionItem, status: ActionItem["status"], nextReflection = action.reflection) {
    try {
      const result = await updateAction(action.id, { status, reflection: nextReflection });
      setActions((current) => current.map((item) => item.id === action.id ? result.action : item));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "行动更新失败。");
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      const { action } = await createAction({
        title: title.trim(),
        detail: "完成后记录成果或发现。",
        category: "practice",
        lane: localLane(explorer),
        source: "manual",
      });
      setActions((current) => [...current, action]);
      setTitle("");
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
  return <PageShell eyebrow="行动中心" title="让计划进入真实的时间。" description="跨设备保存行动、进展、成果与教师反馈；完成不等于自动获得能力分。">
    <section className="roadmap-overview"><div><Route size={27} /><div><span className="section-kicker">服务端行动档案</span><h2>{actions.length ? "你的行动正在积累证据" : "先生成一份有起点的计划"}</h2><p>{actions.length ? "推进状态、提交成果，再根据反馈调整。" : explorer ? "先完成方向探索。" : "先完成目标诊断。"}</p></div></div>{actions.length > 0 && <ProgressRail current={completed} label="已完成" total={actions.length} />}</section>
    {loading ? <div className="opportunity-loading" role="status"><LoaderCircle size={20} />正在同步行动…</div> : !actions.length ? <EmptyState action={explorer ? "去完成方向探索" : "去生成行动计划"} detail="生成后的任务会自动进入这里，并按账号跨设备保存。" title="这里还没有行动" to={entry} /> : <section className="authoritative-actions">{groups.map(([lane, items]) => <section key={lane}>
      <div className="roadmap-group-heading"><span>{lane}</span><p>{items.filter((item) => item.status === "completed").length} / {items.length} 已完成</p></div>
      <div className="action-item-list">{items.map((action) => <article className={`action-item is-${action.status}`} key={action.id}>
        <button aria-label={action.status === "completed" ? `${action.title}已完成` : `推进${action.title}`} className="task-toggle" disabled={["submitted", "completed"].includes(action.status)} onClick={() => void patch(action, action.status === "planned" ? "in_progress" : "completed")} type="button">{action.status === "completed" ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button>
        <div><span>{categoryLabels[action.category]} · {statusLabels[action.status]}{action.trace.autonomous ? " · 可自主完成" : ""}</span><strong>{action.title}</strong><p>{action.detail}</p>{action.reflection && <small>{action.reflection}</small>}</div>
        <div className="action-item-buttons">
          {action.source === "opportunity" && <Link to="/student/opportunities">查看资源 <ArrowRight size={14} /></Link>}
          {!["submitted", "completed"].includes(action.status) && <button onClick={() => { setEvidenceAction(action); setReflection(action.reflection); }} type="button"><FileUp size={14} />提交成果</button>}
          {action.status === "changes_requested" && <span>教师已退回，请补充后重新提交。</span>}
          {action.status === "submitted" && <span><BadgeCheck size={14} />等待核验</span>}
        </div>
      </article>)}</div>
    </section>)}</section>}
    <form className="quick-add" onSubmit={add}><div><span className="section-kicker">补充自己的行动</span><label>这周想推进的一件事<input onChange={(event) => setTitle(event.target.value)} placeholder="例如：完成一份数据作品说明" value={title} /></label></div><button className="button button-secondary" type="submit"><Plus size={17} />加入行动</button></form>
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
