import { ArrowRight, Bell, CalendarDays, CheckCircle2, Compass, Gauge, Network, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStudentDashboard, type StudentDashboard } from "../api/pilot";
import AiCoachCard from "../components/common/AiCoachCard";
import PageShell from "../components/common/PageShell";
import { abilityLabels } from "../data/catalog";
import type { DashboardAction } from "../domain";
import { useCareerStore } from "../store/careerStore";

const paths = { employment: "就业", recommendation: "推免", postgraduate: "考研", "civil-service": "考公" };
const confidenceLabels = { low: "自评起点", medium: "证据积累中", high: "高可信画像" };

export default function StudentHomePage() {
  const profile = useCareerStore((state) => state.profile);
  const awakening = useCareerStore((state) => state.awakening);
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const explorer = profile.grade <= 2;
  const localTasks = explorer ? awakening.actionTasks : roadmapTasks;
  const completed = localTasks.filter((task) => task.completed).length;
  const fallbackAction: DashboardAction = {
    id: "fallback",
    title: explorer ? "生成一份 AI 主线计划" : "选择一个参照目标",
    detail: explorer ? "基于已保存的方向画像，细分方向并形成可验证行动。" : "对照岗位或升学路径，把差距拆成本学期行动。",
    reason: explorer ? "当前规划主线" : `${paths[profile.targetPath]}准备`,
    href: explorer ? "/student/ai-planning" : "/student/matching",
    dueDate: "",
    priority: 0,
    status: "planned",
  };

  useEffect(() => {
    let active = true;
    void getStudentDashboard().then((result) => {
      if (active) setDashboard(result);
    }).catch((reason: unknown) => {
      if (active) setDashboardError(reason instanceof Error ? reason.message : "工作台同步暂不可用。");
    });
    return () => { active = false; };
  }, []);

  const actions = dashboard?.actions.length ? dashboard.actions : [fallbackAction];
  const weakest = useMemo(() => {
    if (!dashboard) return null;
    return Object.entries(dashboard.abilityProfile.combinedScore).sort((left, right) => left[1] - right[1])[0];
  }, [dashboard]);
  const dateLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());

  return <PageShell>
    <section className="today-heading">
      <div><span className="section-kicker">{profile.major} · {explorer ? "规划起步" : `${paths[profile.targetPath]}准备中`}</span><h1>今天，先推进<br />最重要的一步。</h1><p>{dateLabel} · 工作台按截止时间、教师反馈和能力缺口排序。</p></div>
      <div className="today-status"><CalendarDays size={19} /><span>本周完成</span><strong>{completed}</strong><small>{localTasks.length ? `共 ${localTasks.length} 项本地历史计划` : "等待第一项行动"}</small></div>
    </section>

    <section className="today-grid">
      <article className="today-actions">
        <div className="section-heading"><div><span className="section-kicker"><Compass size={15} /> 今日焦点</span><h2>最值得处理的三件事</h2></div>{dashboard?.unreadNotifications ? <Link className="notification-badge" to="/student/notifications"><Bell size={14} />{dashboard.unreadNotifications} 条新反馈</Link> : null}</div>
        <div className="today-action-list">{actions.map((action, index) => <Link key={action.id} to={action.href}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div><small>{action.reason}</small><strong>{action.title}</strong><p>{action.detail}</p></div>
          <ArrowRight size={18} />
        </Link>)}</div>
      </article>
      <aside className="ability-snapshot">
        <div><span className="section-kicker"><Gauge size={15} /> 七维能力</span><h2>{dashboard ? confidenceLabels[dashboard.abilityProfile.confidence] : "正在建立画像"}</h2><p>{dashboard?.abilityProfile.confidence === "low" ? "当前主要来自自评。提交并核验真实成果后，可信度才会提升。" : "画像同时参考自评和教师核验成果。"}</p></div>
        {weakest && <div className="ability-focus"><span>当前优先积累</span><strong>{abilityLabels[weakest[0] as keyof typeof abilityLabels]}</strong><i><b style={{ width: `${weakest[1]}%` }} /></i><small>{weakest[1]} / 100</small></div>}
        <Link className="button button-secondary" to="/student/abilities">查看并更新能力画像 <ArrowRight size={15} /></Link>
      </aside>
    </section>

    <section className="workbench-quick-links">
      <Link to="/student/learning-path"><span><Network size={18} />专业学习路径</span><strong>导入培养方案，生成升学与算法路线</strong><ArrowRight size={16} /></Link>
      <Link to="/student/opportunities"><span><Sparkles size={18} />校内资源</span><strong>把能力缺口接到真实机会</strong><ArrowRight size={16} /></Link>
      <Link to="/student/roadmap"><span><CheckCircle2 size={18} />行动中心</span><strong>集中查看计划、进展与复盘</strong><ArrowRight size={16} /></Link>
      <Link to={explorer ? "/student/ai-planning" : "/student/matching"}><span><Compass size={18} />{explorer ? "AI 规划" : "目标诊断"}</span><strong>{explorer ? "从方向画像生成唯一主线计划" : "重新比较路径和参照目标"}</strong><ArrowRight size={16} /></Link>
    </section>

    {dashboardError && <p className="sync-note" role="status">{dashboardError} 本地历史计划仍可继续使用。</p>}
    <AiCoachCard input={{ profile, nextAction: { title: actions[0]?.title ?? fallbackAction.title, detail: actions[0]?.detail ?? fallbackAction.detail } }} />
  </PageShell>;
}
