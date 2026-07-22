import { ArrowRight, CheckCircle2, Search, SlidersHorizontal, Sparkles, Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import AbilityRadar from "../components/charts/AbilityRadar";
import { abilityKeys, type AbilityKey } from "../domain";
import { abilityLabels, jobs, pathwayGuidance } from "../data/catalog";
import { buildPathwayTasks, buildRoadmap, calculateMatch } from "../services/recommendation";
import { useCareerStore } from "../store/careerStore";

const pathwayEntries = Object.entries(pathwayGuidance) as Array<[keyof typeof pathwayGuidance, (typeof pathwayGuidance)[keyof typeof pathwayGuidance]]>;

export default function MatchingPage() {
  const [query, setQuery] = useState("");
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
  const visibleJobs = useMemo(() => normalizedQuery
    ? jobs.filter((item) => [item.title, item.industry, item.description].some((value) => value.toLocaleLowerCase("zh-CN").includes(normalizedQuery)))
    : jobs, [normalizedQuery]);
  const generate = () => setRoadmapTasks(profile.targetPath === "employment" ? buildRoadmap(profile, diagnosis) : buildPathwayTasks(profile.targetPath));

  return <PageShell eyebrow="高年级决策" title="先选一个参照目标，再把差距变成行动。" description="这里的准备度只用于自我诊断。它不是录取、求职或任何未来结果的概率。">
    <section className="path-selector" aria-label="当前优先路径">{pathwayEntries.map(([key, item]) => <button className={profile.targetPath === key ? "is-active" : ""} key={key} onClick={() => updateProfile({ targetPath: key })} type="button"><span>{item.label}</span><small>{item.description}</small></button>)}</section>
    {profile.targetPath !== "employment" ? <section className="alternative-path"><div><span className="section-kicker">当前路径 / {pathway.label}</span><h2>{pathway.description}</h2><ol>{pathway.tasks.map((task) => <li key={task}>{task}</li>)}</ol></div><aside><span className="signal-label">下一步</span><strong>生成本学期行动计划</strong><p>计划可以继续修改，完成后请把成果和复盘留下来。</p><button className="button button-primary" onClick={generate} type="button">生成{pathway.label}行动计划 <ArrowRight size={16} /></button>{roadmapTasks.length > 0 && <Link className="button button-quiet" to="/student/roadmap">查看已生成计划</Link>}</aside></section> : <>
      <section className="diagnosis-layout"><div className="target-picker"><span className="section-kicker">选择一个参照岗位</span><h2>选择一个想靠近的岗位</h2><p>这不是承诺。它只是帮助你识别应该优先积累哪类证据。</p><label className="job-search"><span><Search size={16} />岗位搜索</span><div><input onChange={(event) => setQuery(event.target.value)} placeholder="搜索岗位、行业或工作内容" type="search" value={query} />{query && <button aria-label="清空岗位搜索" onClick={() => setQuery("")} type="button"><X size={15} /></button>}</div><small aria-live="polite">{visibleJobs.length} 个结果</small></label><div className="job-options">{visibleJobs.map((item) => <button className={item.id === job.id ? "is-selected" : ""} key={item.id} onClick={() => setSelectedJobId(item.id)} type="button"><span>{item.industry}</span><strong>{item.title}</strong><p>{item.description}</p></button>)}{visibleJobs.length === 0 && <div className="job-empty"><Search size={20} /><strong>没有找到匹配岗位</strong><p>换一个更宽的关键词，例如“数据”“教育”或“AI”。</p><button className="button button-quiet" onClick={() => setQuery("")} type="button">清空搜索</button></div>}</div></div>
        <aside className="match-signal-panel"><span className="signal-label">准备度 / 规则计算</span><strong className="match-score">{diagnosis.score}</strong><p>{diagnosis.benchmark}</p><i /><small>来自你当前自评与岗位能力要求的加权比较</small><AbilityRadar current={profile.abilityScores} required={job.requiredAbilities} /></aside></section>
      <section className="diagnosis-explainer"><div><span className="section-kicker">先看结论</span><h2>最值得补齐的三项证据</h2><p>{diagnosis.explanation}</p></div><div className="gap-list">{gaps.map((gap, index) => <article key={gap.ability}><span>0{index + 1}</span><div><strong>{abilityLabels[gap.ability]}</strong><p>{gap.explanation}</p></div><b>差 {gap.gap}</b></article>)}{!gaps.length && <article><CheckCircle2 size={20} /><div><strong>主要能力已覆盖</strong><p>下一步沉淀为作品、实践或能讲清楚的经历。</p></div></article>}</div></section>
      <section className="ability-tuning"><div><span className="section-kicker"><SlidersHorizontal size={15} />更新自评</span><h2>如实更新，结果会重新计算。</h2><p>这不是考试分数。只填写你现在能用成果或经历说明的水平。</p></div><div className="ability-control-list">{abilityKeys.map((key: AbilityKey) => <label key={key}><span>{abilityLabels[key]}</span><input aria-label={abilityLabels[key]} max="100" min="0" onChange={(event) => updateProfile({ abilityScores: { ...profile.abilityScores, [key]: Number(event.target.value) } })} type="range" value={profile.abilityScores[key]} /><output>{profile.abilityScores[key]}</output></label>)}</div></section>
      <section className="plan-cta"><div><Target size={25} /><div><span className="section-kicker">把诊断变成节奏</span><h2>不要同时补完所有能力。</h2><p>系统会从最关键的差距开始，为本学期和下一个阶段安排课程、项目、实践与表达证据。</p></div></div><div><button className="button button-primary" onClick={generate} type="button"><Sparkles size={16} />生成成长路线图</button>{roadmapTasks.length > 0 && <Link className="button button-quiet" to="/student/roadmap">查看已生成计划</Link>}</div></section>
    </>}
  </PageShell>;
}
