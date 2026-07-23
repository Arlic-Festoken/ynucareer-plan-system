import { ArrowRight, Check, CircleDot, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";

const outcomes = [
  ["01", "从一件小行动开始", "做一件能获得真实反馈的事。"],
  ["02", "把体验变成证据", "用访谈、作品或复盘更新判断。"],
  ["03", "需要时再看差距", "对照目标，把差距拆成计划。"],
];

export default function LandingPage() {
  return <PageShell>
    <section className="landing-hero">
      <div className="landing-copy"><span className="section-kicker"><Sparkles size={15} /> 大学生行动型生涯工具</span><h1>不急着决定未来。<br /><em>先做下一件值得做的事。</em></h1><p>把下一步变成可执行、可复盘的行动。</p><div className="hero-actions"><Link className="button button-primary" to="/onboarding">开始建立我的计划 <ArrowRight size={18} /></Link><a className="button button-quiet" href="#how-it-works">看看怎么运作</a></div><div className="privacy-inline"><ShieldCheck size={17} /> 无需登录 · 仅存本机 · 可随时重置</div></div>
      <aside className="hero-signal" aria-label="行动计划预览"><div className="signal-topline"><span>THIS WEEK / 01</span><i>计划正常</i></div><div className="signal-hero"><span>今天的下一步</span><strong>去完成一次<br />真实访谈。</strong><p>和从业者聊 30 分钟，验证方向。</p></div><div className="signal-task"><span><Check size={15} /></span><div><strong>准备三个访谈问题</strong><small>预计 10 分钟 · 已完成</small></div></div><div className="signal-task"><span><CircleDot size={15} /></span><div><strong>联系一位数据分析从业者</strong><small>预计 15 分钟 · 进行中</small></div></div><div className="signal-footer"><span>完成后获得</span><strong>方向证据 + 下一步建议</strong></div></aside>
    </section>
    <section className="landing-proof"><div><span className="section-kicker">它解决什么</span><h2>你不缺信息。<br />你缺的是一条能开始的路径。</h2></div><div className="proof-grid">{outcomes.map(([number, title, detail]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{detail}</p></article>)}</div></section>
    <section className="role-paths" id="how-it-works"><div className="role-path-copy"><span className="section-kicker">按阶段工作</span><h2>不同阶段，<br />只做当下最重要的事。</h2><p>低年级探索，高年级对照目标，研究生双线推进。</p></div><div className="role-path-list"><Link to="/onboarding"><span>01</span><div><strong>低年级：找到值得验证的方向</strong><small>价值、兴趣、场景、行动、反思</small></div><ArrowRight size={18} /></Link><Link to="/onboarding"><span>02</span><div><strong>高年级：看清目标与能力差距</strong><small>岗位参照、解释、路线图、证据</small></div><ArrowRight size={18} /></Link><Link to="/onboarding"><span>03</span><div><strong>研究生：让成果走向场景</strong><small>成果映射、科研线、职业线</small></div><ArrowRight size={18} /></Link></div></section>
    <section className="teacher-callout"><Compass size={24} /><div><span className="section-kicker">教师与指导者</span><h2>从模拟群体信号中识别资源缺口。</h2></div><Link className="button button-secondary" to="/teacher/dashboard">打开教师模拟洞察 <ArrowRight size={16} /></Link></section>
  </PageShell>;
}
