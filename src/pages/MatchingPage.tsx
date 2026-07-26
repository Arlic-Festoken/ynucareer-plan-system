import { ArrowRight, Bot, CheckCircle2, Search, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import AbilityRadar from "../components/charts/AbilityRadar";
import { abilityLabels, jobs, pathwayGuidance } from "../data/catalog";
import { buildPathwayTasks, buildRoadmap, calculateMatch, preserveTaskProgress } from "../services/recommendation";
import { useCareerStore } from "../store/careerStore";

const pathwayEntries = Object.entries(pathwayGuidance) as Array<[keyof typeof pathwayGuidance, (typeof pathwayGuidance)[keyof typeof pathwayGuidance]]>;
const industryFilters = ["全部", "人工智能", "教育科技", "智慧医疗", "智能制造", "数字经济"];

export default function MatchingPage() {
  const [query, setQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("全部");
  const profile = useCareerStore((state) => state.profile);
  const selectedJobId = useCareerStore((state) => state.selectedJobId);
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const updateProfile = useCareerStore((state) => state.updateProfile);
  const setSelectedJobId = useCareerStore((state) => state.setSelectedJobId);
  const setRoadmapTasks = useCareerStore((state) => state.setRoadmapTasks);
  const job = jobs.find((item) => item.id === selectedJobId) ?? jobs[0];
  const diagnosis = useMemo(() => calculateMatch(profile, job), [profile, job]);
  const pathway = pathwayGuidance[profile.targetPath];
  const gaps = diagnosis.gaps.filter((gap) => gap.gap > 0).slice(0, 3);
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const visibleJobs = useMemo(() => jobs.filter((item) => {
    const matchesQuery = !normalizedQuery || [item.title, item.industry, item.description].some((value) => value.toLocaleLowerCase("zh-CN").includes(normalizedQuery));
    const matchesIndustry = selectedIndustry === "全部" || item.industry.includes(selectedIndustry);
    return matchesQuery && matchesIndustry;
  }), [normalizedQuery, selectedIndustry]);
  const clearJobFilters = () => { setQuery(""); setSelectedIndustry("全部"); };
  const generate = () => {
    const nextTasks = profile.targetPath === "employment" ? buildRoadmap(profile, diagnosis) : buildPathwayTasks(profile.targetPath);
    setRoadmapTasks(preserveTaskProgress(nextTasks, roadmapTasks));
  };

  return <PageShell eyebrow="高年级决策" title="先选一个参照目标，再把差距变成行动。" description="准备度仅用于自我诊断，不代表录取或求职概率。">
    <section className="path-selector" aria-label="当前优先路径">{pathwayEntries.map(([key, item]) => <button className={profile.targetPath === key ? "is-active" : ""} key={key} onClick={() => updateProfile({ targetPath: key })} type="button"><span>{item.label}</span><small>{item.description}</small></button>)}</section>
    <section className="ai-planning-entry"><Bot size={22} /><div><span className="section-kicker">需要更细的选择</span><strong>用 DeepSeek 比较 3 个细分方向，再生成个性化计划。</strong><p>结合已有经历、现实限制和每周可投入时间。</p></div><Link className="button button-secondary" to="/student/ai-planning">进入 AI 规划 <ArrowRight size={16} /></Link></section>
    {profile.targetPath !== "employment" ? <section className="alternative-path"><div><span className="section-kicker">当前路径 / {pathway.label}</span><h2>{pathway.description}</h2><ol>{pathway.tasks.map((task) => <li key={task}>{task}</li>)}</ol></div><aside><span className="signal-label">下一步</span><strong>生成本学期行动计划</strong><p>完成后记录成果和复盘。</p><button className="button button-primary" onClick={generate} type="button">生成{pathway.label}行动计划 <ArrowRight size={16} /></button>{roadmapTasks.length > 0 && <Link className="button button-quiet" to="/student/roadmap">查看已生成计划</Link>}</aside></section> : <>
      <section className="diagnosis-layout"><div className="target-picker"><span className="section-kicker">选择一个参照岗位</span><h2>选择一个想靠近的岗位</h2><p>用于识别优先积累的证据。</p><div className="job-discovery-controls"><label className="job-search"><span><Search size={16} />岗位搜索</span><div><input onChange={(event) => setQuery(event.target.value)} placeholder="搜索岗位、行业或工作内容" type="search" value={query} />{query && <button aria-label="清空岗位搜索" onClick={() => setQuery("")} type="button"><X size={15} /></button>}</div></label><label className="job-industry-filter"><span>行业场景</span><select aria-label="行业场景" onChange={(event) => setSelectedIndustry(event.target.value)} value={selectedIndustry}>{industryFilters.map((industry) => <option key={industry}>{industry}</option>)}</select></label><small aria-live="polite">{visibleJobs.length} 个结果</small></div><div className="job-options">{visibleJobs.map((item) => <button className={item.id === job.id ? "is-selected" : ""} key={item.id} onClick={() => setSelectedJobId(item.id)} type="button"><span>{item.industry}</span><strong>{item.title}</strong><p>{item.description}</p></button>)}{visibleJobs.length === 0 && <div className="job-empty"><Search size={20} /><strong>没有找到匹配岗位</strong><p>换个关键词或行业。</p><button className="button button-quiet" onClick={clearJobFilters} type="button">清除筛选</button></div>}</div></div>
        <aside className="match-signal-panel"><span className="signal-label">准备度 / 规则计算</span><strong className="match-score">{diagnosis.score}</strong><p>{diagnosis.benchmark}</p><i /><small>自评与岗位要求的加权比较</small><AbilityRadar current={profile.abilityScores} required={job.requiredAbilities} /></aside></section>
      <section className="diagnosis-explainer"><div><span className="section-kicker">先看结论</span><h2>最值得补齐的三项证据</h2><p>{diagnosis.explanation}</p></div><div className="gap-list">{gaps.map((gap, index) => <article key={gap.ability}><span>0{index + 1}</span><div><strong>{abilityLabels[gap.ability]}</strong><p>{gap.explanation}</p></div><b>差 {gap.gap}</b></article>)}{!gaps.length && <article><CheckCircle2 size={20} /><div><strong>主要能力已覆盖</strong><p>下一步沉淀为作品、实践或能讲清楚的经历。</p></div></article>}</div></section>
      <section className="ability-profile-link"><ShieldCheck size={23} /><div><span className="section-kicker">结果依据</span><h2>岗位诊断使用七维能力画像。</h2><p>自评和教师核验证据分开保存；没有证据的维度不会被包装成高可信结论。</p></div><Link className="button button-secondary" to="/student/abilities">查看能力画像 <ArrowRight size={16} /></Link></section>
      <section className="plan-cta"><div><Target size={25} /><div><span className="section-kicker">把诊断变成节奏</span><h2>优先补最关键的差距。</h2><p>按课程、项目、实践与表达证据生成计划。</p></div></div><div><button className="button button-primary" onClick={generate} type="button"><Sparkles size={16} />生成成长路线图</button>{roadmapTasks.length > 0 && <Link className="button button-quiet" to="/student/roadmap">查看已生成计划</Link>}</div></section>
    </>}
  </PageShell>;
}
