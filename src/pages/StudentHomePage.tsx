import { ArrowRight, Compass, Layers3, Sparkles } from "lucide-react";
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
  const actionDetail = explorer ? "从一个你感兴趣的真实问题开始，不需要立即确定职业。" : "先看清目标需要什么，再把差距拆成一个学期能完成的行动。";
  const stageLabel = explorer ? "探索阶段" : `${paths[profile.targetPath]}准备中`;

  return <PageShell>
    <section className="workbench-heading"><div><span className="section-kicker">{stageLabel} / {profile.major}</span><h1>你好，先让今天<br />多一个确定的动作。</h1><p>未来不必一次决定。完成一件真实的小事，再用它调整下一步。</p></div><div className="workbench-mark"><span>WEEK</span><strong>03</strong><small>本周行动</small></div></section>
    <ActionFocusCard completed={completed} cta={tasks.length ? "继续我的行动" : "开始生成建议"} description={actionDetail} task={nextTask} title={actionTitle} to={actionRoute} total={tasks.length} />
    <section className="workbench-strip"><ProgressRail current={explorer ? awakening.activeStep - 1 : completed} detail={explorer ? "完成六步探索后，再决定是否深入某个方向。" : "任务完成越多，你的准备度证据越完整。"} label={explorer ? "方向探索" : "成长计划"} total={explorer ? 6 : Math.max(tasks.length, 3)} /><div className="workbench-context"><Compass size={20} /><div><span className="signal-label">当前焦点</span><strong>{explorer ? "找到一个值得验证的方向" : `向 ${paths[profile.targetPath]} 靠近`}</strong><Link to={explorer ? "/student/awakening" : "/student/matching"}>查看完整建议 <ArrowRight size={15} /></Link></div></div></section>
    <section className="signal-metric-grid"><SignalMetric detail={explorer ? "先用行动获得反馈，而不是追求一个正确答案。" : "基于目标岗位与自评能力生成，可随时重算。"} label={explorer ? "探索状态" : "计划状态"} value={explorer ? `${awakening.activeStep}/6` : `${completed}/${tasks.length || 0}`} /><SignalMetric detail={explorer ? "兴趣与价值会参与方向推荐，不会成为限制。" : "每一个待补能力都对应课程、项目或实践证据。"} label="你正在积累" tone="neutral" value={explorer ? "方向证据" : "能力证据"} /><SignalMetric detail="重置只会清除当前浏览器里的本地演示内容。" label="数据边界" tone="warm" value="本地保存" /></section>
    <AiCoachCard input={{ profile, nextAction: { title: nextTask?.title ?? actionTitle, detail: nextTask?.detail ?? actionDetail } }} />
    <section className="workbench-bottom"><article><Layers3 size={22} /><span className="section-kicker">为什么这样安排</span><h2>{explorer ? "先感受，再判断。" : "先解释，再补齐。"}</h2><p>{explorer ? "兴趣、价值和专业场景只负责提出候选方向；真正让你更了解自己的，是接下来完成的访谈、作品或体验。" : "岗位匹配不是录取概率。它只把目标要求翻译为优先补齐的能力与可展示的成果。"}</p></article><article><Sparkles size={22} /><span className="section-kicker">下一次回来</span><h2>完成、记录、再调整。</h2><p>完成任务后写一条复盘。它会让下一个推荐不只是更长的清单，而是基于你真实体验的判断。</p><Link className="button button-secondary" to={explorer ? "/student/awakening" : "/student/roadmap"}>{explorer ? "继续方向探索" : "打开行动计划"} <ArrowRight size={16} /></Link></article></section>
  </PageShell>;
}
