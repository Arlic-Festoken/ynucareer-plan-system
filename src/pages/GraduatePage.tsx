import { Beaker, BriefcaseBusiness, Link2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import TaskList from "../components/common/TaskList";
import ProgressRail from "../components/product/ProgressRail";
import { abilityKeys } from "../domain";
import { abilityLabels, researchIndustries, researchOutcomeLabels } from "../data/catalog";
import { buildGraduateTimeline, mapResearchEvidence, preserveTaskProgress } from "../services/recommendation";
import { useCareerStore } from "../store/careerStore";

export default function GraduatePage() {
  const research = useCareerStore((state) => state.research);
  const setResearch = useCareerStore((state) => state.setResearch);
  const addResearchOutcome = useCareerStore((state) => state.addResearchOutcome);
  const removeResearchOutcome = useCareerStore((state) => state.removeResearchOutcome);
  const updateResearchTask = useCareerStore((state) => state.updateResearchTask);
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [outcomeType, setOutcomeType] = useState<"paper" | "patent" | "project" | "competition">("paper");
  const [planError, setPlanError] = useState("");
  const evidence = useMemo(() => mapResearchEvidence(research.outcomes), [research.outcomes]);
  const completed = [...research.researchTasks, ...research.careerTasks].filter((task) => task.completed).length;
  const total = research.researchTasks.length + research.careerTasks.length;
  function addOutcome(event: React.FormEvent) { event.preventDefault(); if (!outcomeTitle.trim()) return; addResearchOutcome({ id: `outcome-${Date.now()}`, type: outcomeType, title: outcomeTitle.trim() }); setOutcomeTitle(""); }
  function generate() {
    if (!research.focus.trim() || !research.industry.trim()) {
      setPlanError("请先填写研究方向和希望靠近的产业或场景，再生成双线计划。");
      return;
    }
    setPlanError("");
    const next = buildGraduateTimeline(research.focus, research.industry, research.outcomes);
    setResearch({
      researchTasks: preserveTaskProgress(next.researchTasks, research.researchTasks),
      careerTasks: preserveTaskProgress(next.careerTasks, research.careerTasks),
    });
  }

  return <PageShell eyebrow="研究生导航" title="让研究成果既能留下来，也能走出去。" description="把科研与职业准备放进同一份双线计划。">
    <section className="graduate-hero"><div><span className="section-kicker">两条线，同一个方向</span><h2>研究推进 × 职业准备</h2><p>填写研究方向和目标产业。</p></div><ProgressRail current={completed} detail={total ? "完成后可复盘。" : "生成未来八周计划。"} label="双线进度" total={total || 6} /></section>
    <section className="graduate-input-grid"><article><Beaker size={22} /><span className="section-kicker">研究起点</span><h2>我正在研究什么</h2><label>研究方向<input aria-invalid={Boolean(planError && !research.focus.trim())} onChange={(event) => { setResearch({ focus: event.target.value }); setPlanError(""); }} placeholder="例如：面向学习分析的生成式 AI" value={research.focus} /></label><label>希望靠近的产业或场景<input aria-invalid={Boolean(planError && !research.industry.trim())} onChange={(event) => { setResearch({ industry: event.target.value }); setPlanError(""); }} placeholder="例如：教育科技、智慧医疗或智能制造" value={research.industry} /></label><div className="research-context-list">{researchIndustries.map((item) => <div key={item.research}><strong>{item.research}</strong><span>{item.industries.join(" · ")}</span></div>)}</div></article><article><Link2 size={22} /><span className="section-kicker">成果证据</span><h2>我已经做成了什么</h2><form className="outcome-capture" onSubmit={addOutcome}><select aria-label="成果类型" onChange={(event) => setOutcomeType(event.target.value as typeof outcomeType)} value={outcomeType}>{Object.entries(researchOutcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label="成果名称" onChange={(event) => setOutcomeTitle(event.target.value)} placeholder="例如：完成学习行为预测项目" required value={outcomeTitle} /><button className="button button-secondary" type="submit"><Plus size={16} />添加</button></form><div className="outcome-cards">{research.outcomes.length ? research.outcomes.map((outcome) => <div key={outcome.id}><span>{researchOutcomeLabels[outcome.type]}</span><strong>{outcome.title}</strong><button aria-label={`删除 ${outcome.title}`} onClick={() => removeResearchOutcome(outcome.id)} type="button"><Trash2 size={15} /></button></div>) : <p>先记录正在推进的项目、论文或比赛。</p>}</div></article></section>
    <section className="research-evidence"><div><span className="section-kicker">成果如何被看见</span><h2>把成果翻译为能力证据。</h2><p>依据成果类型生成，用于表达前自查。</p></div><div className="evidence-bars">{abilityKeys.map((key) => <div key={key}><span>{abilityLabels[key]}</span><i><b style={{ width: `${evidence.scores[key]}%` }} /></i><strong>{evidence.scores[key]}</strong></div>)}</div><ul>{evidence.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section className="dual-plan-section"><div className="dual-plan-head"><div><span className="section-kicker">接下来八周</span><h2>并行，而不是互相挤压。</h2></div><button className="button button-primary" onClick={generate} type="button">生成我的双线计划</button></div>{planError && <p className="form-error graduate-plan-error" role="alert">{planError}</p>}<div className="dual-lanes"><article className="research-lane"><div className="lane-heading"><Beaker size={20} /><h3>研究线</h3></div><TaskList emptyMessage="填写研究方向后生成研究里程碑。" onSaveReflection={(task, reflection) => updateResearchTask("researchTasks", task.id, { reflection })} onToggle={(task) => updateResearchTask("researchTasks", task.id, { completed: !task.completed })} tasks={research.researchTasks} /></article><article className="career-lane"><div className="lane-heading"><BriefcaseBusiness size={20} /><h3>职业线</h3></div><TaskList emptyMessage="填写目标产业后生成职业准备任务。" onSaveReflection={(task, reflection) => updateResearchTask("careerTasks", task.id, { reflection })} onToggle={(task) => updateResearchTask("careerTasks", task.id, { completed: !task.completed })} tasks={research.careerTasks} /></article></div></section>
  </PageShell>;
}
