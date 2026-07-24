import { ArrowRight, Check, CircleDot, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";

const outcomes = [
  ["01", "方向候选", "结合年级、专业、兴趣与价值，给出值得验证的方向。"],
  ["02", "能力差距", "对照目标岗位或升学路径，解释最该先补什么。"],
  ["03", "行动计划", "把结论转成任务，支持完成、复盘和持续调整。"],
];

export default function LandingPage() {
  return <PageShell>
    <section className="landing-hero">
      <div className="landing-copy">
        <span className="section-kicker"><Sparkles size={15} /> 云南大学 · 生涯发展导航</span>
        <h1><span>找到方向，</span><strong>看清差距，完成行动。</strong></h1>
        <p>按你的年级和目标，生成方向探索、岗位匹配与成长任务。</p>
        <div className="hero-actions"><Link className="button button-primary" to="/onboarding">生成我的行动计划 <ArrowRight size={18} /></Link><a className="button button-quiet" href="#how-it-works">查看适用阶段</a></div>
        <div className="privacy-inline"><ShieldCheck size={17} /> 安全账号同步 · 不采集学号与成绩</div>
      </div>
      <aside className="hero-signal" aria-label="行动计划预览">
        <div className="signal-topline"><span>PERSONAL PLAN / 01</span><i>本地生成</i></div>
        <div className="signal-profile"><span>高年级 · 就业准备</span><strong>数据分析方向</strong></div>
        <div className="signal-hero"><span>当前优先行动</span><strong>完成一次真实<br />岗位访谈</strong><p>验证岗位日常、能力要求和你的兴趣是否匹配。</p></div>
        <div className="signal-task"><span><Check size={15} /></span><div><strong>准备 3 个访谈问题</strong><small>10 分钟 · 已完成</small></div></div>
        <div className="signal-task"><span><CircleDot size={15} /></span><div><strong>联系 1 位相关从业者</strong><small>15 分钟 · 待进行</small></div></div>
        <div className="signal-footer"><span>完成后更新</span><strong>方向证据 · 能力差距 · 下一步</strong></div>
      </aside>
    </section>
    <section className="landing-proof">
      <div className="landing-section-head"><div><span className="section-kicker">进入系统后</span><h2>得到结果，不是再做一份测评。</h2></div><p>每个结论都对应一个可执行的下一步。</p></div>
      <div className="proof-grid">{outcomes.map(([number, title, detail]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{detail}</p></article>)}</div>
    </section>
    <section className="role-paths" id="how-it-works">
      <div className="role-path-copy"><span className="section-kicker">选择当前阶段</span><h2>按阶段进入对应工作流。</h2><p>只呈现与你现在有关的任务。</p></div>
      <div className="role-path-list"><Link to="/onboarding"><span>01</span><div><strong>低年级 · 探索方向</strong><small>价值与兴趣 → 场景 → 真实行动</small></div><ArrowRight size={18} /></Link><Link to="/onboarding"><span>02</span><div><strong>高年级 · 路径决策</strong><small>岗位或升学目标 → 差距 → 路线图</small></div><ArrowRight size={18} /></Link><Link to="/onboarding"><span>03</span><div><strong>研究生 · 双线导航</strong><small>科研成果 → 能力证据 → 职业准备</small></div><ArrowRight size={18} /></Link></div>
    </section>
    <section className="teacher-callout"><Compass size={24} /><div><span className="section-kicker">教师与指导者</span><h2>查看脱敏模拟群体的阶段、短板与资源需求。</h2></div><Link className="button button-secondary" to="/teacher/dashboard">进入教师端 <ArrowRight size={16} /></Link></section>
  </PageShell>;
}
