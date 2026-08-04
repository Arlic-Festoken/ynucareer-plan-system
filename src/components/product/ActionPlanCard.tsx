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
