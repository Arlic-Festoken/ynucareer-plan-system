import { ArrowRight, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ActionTask } from "../../domain";

type ActionFocusCardProps = {
  task?: ActionTask;
  title: string;
  description: string;
  to: string;
  cta: string;
  completed?: number;
  total?: number;
};

export default function ActionFocusCard({ task, title, description, to, cta, completed = 0, total = 0 }: ActionFocusCardProps) {
  const progress = total ? Math.round((completed / total) * 100) : 0;
  return <section className="action-focus" aria-label="当前优先行动">
    <div className="action-focus-main">
      <span className="section-kicker">现在最值得做</span>
      <h2>{task?.title ?? title}</h2>
      <p>{task?.detail ?? description}</p>
      <div className="action-proof"><span><Clock3 size={16} /> 约 30–45 分钟</span><span><FileCheck2 size={16} /> 留下一条可回看的记录</span></div>
      <Link className="button button-primary" to={to}>{cta}<ArrowRight size={17} /></Link>
    </div>
    <aside className="action-focus-aside">
      <span className="signal-label">本阶段进度</span>
      <strong>{total ? `${completed}/${total}` : "01"}</strong>
      <div className="signal-progress" aria-label={`本阶段完成 ${progress}%`}><i style={{ width: `${progress}%` }} /></div>
      <p>{task?.completed ? <><CheckCircle2 size={16} /> 已完成，记下收获。</> : "完成后留下方向证据。"}</p>
    </aside>
  </section>;
}
