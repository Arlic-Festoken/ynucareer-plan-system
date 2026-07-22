import { ArrowRight, Check, CircleDot, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";

const outcomes = [
  ["01", "从一件小行动开始", "不要求你现在决定职业，只做一件能获得真实反馈的事。"],
  ["02", "把体验变成证据", "一次访谈、作品或复盘，都会更新你下一次选择的依据。"],
  ["03", "需要时再看差距", "高年级可以对照目标岗位，把差距拆成可完成的计划。"],
];

export default function LandingPage() {
  return <PageShell>
    <section className="landing-hero">
      <div className="landing-copy"><span className="section-kicker"><Sparkles size={15} /> 面向大学生的行动型生涯工具</span><h1>不急着决定未来。<br /><em>先做下一件值得做的事。</em></h1><p>向前不是替你选职业，而是把“我接下来该做什么”变成一份可以执行、可以复盘、可以调整的行动计划。</p><div className="hero-actions"><Link className="button button-primary" to="/onboarding">开始建立我的计划 <ArrowRight size={18} /></Link><a className="button button-quiet" href="#how-it-works">先看看怎么运作</a></div><div className="privacy-inline"><ShieldCheck size={17} /> 无需登录；资料只保存在当前浏览器；可随时重置。</div></div>
      <aside className="hero-signal" aria-label="行动计划预览"><div className="signal-topline"><span>THIS WEEK / 01</span><i>计划正常</i></div><div className="signal-hero"><span>今天的下一步</span><strong>去完成一次<br />真实访谈。</strong><p>和一位从业者聊 30 分钟，确认你真正想解决的问题。</p></div><div className="signal-task"><span><Check size={15} /></span><div><strong>准备三个访谈问题</strong><small>预计 10 分钟 · 已完成</small></div></div><div className="signal-task"><span><CircleDot size={15} /></span><div><strong>联系一位数据分析从业者</strong><small>预计 15 分钟 · 进行中</small></div></div><div className="signal-footer"><span>完成后获得</span><strong>一条方向证据 + 下一步建议</strong></div></aside>
    </section>
    <section className="landing-proof"><div><span className="section-kicker">它解决什么</span><h2>你不缺信息。<br />你缺的是一条能开始的路径。</h2></div><div className="proof-grid">{outcomes.map(([number, title, detail]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{detail}</p></article>)}</div></section>
    <section className="role-paths" id="how-it-works"><div className="role-path-copy"><span className="section-kicker">按阶段工作</span><h2>同一个系统，<br />但不把同一套问题问给所有人。</h2><p>低年级先做探索，高年级先对照目标，研究生让科研与职业准备并行。教师看到的是明确标注的匿名模拟样本。</p></div><div className="role-path-list"><Link to="/onboarding"><span>01</span><div><strong>低年级：找到值得验证的方向</strong><small>价值、兴趣、场景、行动、反思</small></div><ArrowRight size={18} /></Link><Link to="/onboarding"><span>02</span><div><strong>高年级：看清目标与能力差距</strong><small>岗位参照、解释、路线图、证据</small></div><ArrowRight size={18} /></Link><Link to="/onboarding"><span>03</span><div><strong>研究生：让成果走向场景</strong><small>成果映射、科研线、职业线</small></div><ArrowRight size={18} /></Link></div></section>
    <section className="teacher-callout"><Compass size={24} /><div><span className="section-kicker">教师与指导者</span><h2>从匿名样本中看见资源缺口，而不是看见个人隐私。</h2><p>查看筛选、聚合和教学建议的演示方式。</p></div><Link className="button button-secondary" to="/teacher/dashboard">打开教师模拟洞察 <ArrowRight size={16} /></Link></section>
  </PageShell>;
}
