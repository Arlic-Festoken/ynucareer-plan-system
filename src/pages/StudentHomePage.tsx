import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import AiCoachCard from "../components/common/AiCoachCard";
import ActionFocusCard from "../components/product/ActionFocusCard";
import ProgressRail from "../components/product/ProgressRail";
import SignalMetric from "../components/product/SignalMetric";
import PageShell from "../components/common/PageShell";
import { useCareerStore } from "../store/careerStore";

const paths = { employment: "就业", recommendation: "推免", postgraduate: "考研", "civil-service": "考公" };

export default function StudentHomePage() {
  const profile = useCareerStore((state) => state.profile);
  const awakening = useCareerStore((state) => state.awakening);
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const explorer = profile.grade <= 2;
  const tasks = explorer ? awakening.actionTasks : roadmapTasks;
  const completed = tasks.filter((task) => task.completed).length;
  const nextTask = tasks.find((task) => !task.completed);
  const actionRoute = explorer ? "/student/awakening" : (tasks.length ? "/student/roadmap" : "/student/matching");
  const actionTitle = explorer ? "完成一次 10 分钟方向探索" : "选择一个目标岗位并生成计划";
  const actionDetail = explorer ? "从一个真实问题开始验证方向。" : "对照目标，把差距拆成学期行动。";
  const stageLabel = explorer ? "探索阶段" : `${paths[profile.targetPath]}准备中`;

  return <PageShell>
    <section className="workbench-heading"><div><span className="section-kicker">{stageLabel} / {profile.major}</span><h1>你好，先让今天<br />多一个确定的动作。</h1><p>完成一件小事，再调整下一步。</p></div><div className="workbench-mark"><span>WEEK</span><strong>03</strong><small>本周行动</small></div></section>
    <ActionFocusCard completed={completed} cta={tasks.length ? "继续我的行动" : "开始生成建议"} description={actionDetail} task={nextTask} title={actionTitle} to={actionRoute} total={tasks.length} />
    <section className="workbench-strip"><ProgressRail current={explorer ? awakening.activeStep - 1 : completed} detail={explorer ? "完成六步，获得方向候选。" : "完成任务，积累准备证据。"} label={explorer ? "方向探索" : "成长计划"} total={explorer ? 6 : Math.max(tasks.length, 3)} /><div className="workbench-context"><Compass size={20} /><div><span className="signal-label">当前焦点</span><strong>{explorer ? "找到一个值得验证的方向" : `向 ${paths[profile.targetPath]} 靠近`}</strong><Link to={explorer ? "/student/awakening" : "/student/matching"}>查看完整建议 <ArrowRight size={15} /></Link></div></div></section>
    <section className="signal-metric-grid"><SignalMetric detail={explorer ? "用行动验证方向。" : "可随时重新计算。"} label={explorer ? "探索状态" : "计划状态"} value={explorer ? `${awakening.activeStep}/6` : `${completed}/${tasks.length || 0}`} /><SignalMetric detail={explorer ? "来自兴趣与真实体验。" : "来自课程、项目与实践。"} label="你正在积累" tone="neutral" value={explorer ? "方向证据" : "能力证据"} /><SignalMetric detail="登录后自动保存。" label="数据状态" tone="warm" value="账号同步" /></section>
    <AiCoachCard input={{ profile, nextAction: { title: nextTask?.title ?? actionTitle, detail: nextTask?.detail ?? actionDetail } }} />
  </PageShell>;
}
