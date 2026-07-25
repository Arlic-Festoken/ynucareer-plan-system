import { ArrowRight, Bot, Check, CircleAlert, Clock3, LoaderCircle, Route, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCoachStatus, type CoachStatus } from "../api/careerCoach";
import { requestDirectionCandidates, requestPersonalizedPlan } from "../api/careerPlanner";
import PageShell from "../components/common/PageShell";
import TaskList from "../components/common/TaskList";
import type { ActionTask, AiActionPlan, AiDirectionCandidate } from "../domain";
import { preserveTaskProgress, recommendDirections } from "../services/recommendation";
import { useCareerStore } from "../store/careerStore";

const sceneOptions = ["教育科技", "人工智能应用", "数据与商业", "智慧医疗", "智能制造", "数字公共服务"];

function toTasks(candidate: AiDirectionCandidate, tasks: AiActionPlan["tasks"]): ActionTask[] {
  return tasks.map((task, index) => ({
    id: `ai-plan-${candidate.id}-${index + 1}`,
    title: task.title,
    detail: task.detail,
    category: task.category,
    priority: task.priority,
    semester: task.week,
    completed: false,
    evidence: [`计划产出：${task.evidence}`, `方向：${candidate.title}`],
  }));
}

export default function AiPlanningPage() {
  const profile = useCareerStore((state) => state.profile);
  const aiPlanning = useCareerStore((state) => state.aiPlanning);
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const awakening = useCareerStore((state) => state.awakening);
  const setAiPlanning = useCareerStore((state) => state.setAiPlanning);
  const setRoadmapTasks = useCareerStore((state) => state.setRoadmapTasks);
  const setAwakening = useCareerStore((state) => state.setAwakening);
  const [status, setStatus] = useState<CoachStatus>("unavailable");
  const [checking, setChecking] = useState(true);
  const [directionLoading, setDirectionLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const selected = aiPlanning.directionResult?.candidates.find((item) => item.id === aiPlanning.selectedCandidateId) ?? null;
  const ruleDirections = useMemo(() => recommendDirections(profile).slice(0, 3), [profile]);

  useEffect(() => {
    const controller = new AbortController();
    getCoachStatus(controller.signal).then((next) => { setStatus(next); setChecking(false); });
    return () => controller.abort();
  }, []);

  const context = {
    profile,
    preferredScenes: aiPlanning.preferredScenes,
    strengthEvidence: aiPlanning.strengthEvidence,
    constraints: aiPlanning.constraints,
    timeBudgetHours: aiPlanning.timeBudgetHours,
  };

  function toggleScene(scene: string) {
    const next = aiPlanning.preferredScenes.includes(scene)
      ? aiPlanning.preferredScenes.filter((item) => item !== scene)
      : [...aiPlanning.preferredScenes, scene].slice(0, 3);
    setAiPlanning({ preferredScenes: next, directionResult: null, selectedCandidateId: null, actionPlan: null });
  }

  async function generateDirections() {
    setDirectionLoading(true);
    setError("");
    setSaved(false);
    try {
      const response = await requestDirectionCandidates(context);
      setAiPlanning({ directionResult: response.result, selectedCandidateId: null, actionPlan: null, generatedAt: response.generatedAt });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 方向分析暂时不可用，请稍后重试。");
    } finally {
      setDirectionLoading(false);
    }
  }

  async function generatePlan() {
    if (!selected) return;
    setPlanLoading(true);
    setError("");
    setSaved(false);
    try {
      const response = await requestPersonalizedPlan({ ...context, selectedDirection: selected, horizonWeeks: aiPlanning.horizonWeeks });
      setAiPlanning({ actionPlan: response.result, generatedAt: response.generatedAt });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 行动计划暂时不可用，请稍后重试。");
    } finally {
      setPlanLoading(false);
    }
  }

  function savePlan() {
    if (!selected || !aiPlanning.actionPlan) return;
    const nextTasks = toTasks(selected, aiPlanning.actionPlan.tasks);
    if (profile.grade <= 2) {
      setAwakening({
        selectedDirectionId: selected.id,
        actionTasks: preserveTaskProgress(nextTasks, awakening.actionTasks),
      });
    } else {
      setRoadmapTasks(preserveTaskProgress(nextTasks, roadmapTasks));
    }
    setSaved(true);
  }

  const previewTasks = aiPlanning.actionPlan ? toTasks(selected as AiDirectionCandidate, aiPlanning.actionPlan.tasks) : [];

  return <PageShell eyebrow="DeepSeek · 个性化规划" title="把宽泛兴趣，缩小成可以验证的方向。" description="AI 结合画像与现实约束提出候选；最终选择仍由你的真实行动决定。">
    <section className="ai-planner-intro">
      <div><Bot size={26} /><div><span className="section-kicker">两阶段规划</span><h2>先细分方向，再生成行动。</h2><p>方向候选会说明适配依据、取舍和验证信号；行动计划会按你的可用时间拆解。</p></div></div>
      <div className={`ai-service-chip is-${status}`}>{checking ? <><LoaderCircle className="is-spinning" size={15} />检查服务</> : status === "ready" ? <><Check size={15} />DeepSeek 已连接</> : <><CircleAlert size={15} />AI 未连接</>}</div>
    </section>

    <section className="ai-context-panel">
      <div className="ai-context-heading"><div><span className="section-kicker">01 · 补充上下文</span><h2>补充经历和现实限制。</h2></div></div>
      <fieldset><legend>想优先接近的场景（最多 3 个）</legend><div className="option-chips">{sceneOptions.map((scene) => <label key={scene}><input checked={aiPlanning.preferredScenes.includes(scene)} onChange={() => toggleScene(scene)} type="checkbox" /><span>{scene}</span></label>)}</div></fieldset>
      <div className="ai-context-fields">
        <label>已有经历或优势证据<textarea maxLength={600} onChange={(event) => setAiPlanning({ strengthEvidence: event.target.value, directionResult: null, selectedCandidateId: null, actionPlan: null })} placeholder="例如：做过校园数据可视化项目，负责需求梳理和数据清洗。" rows={4} value={aiPlanning.strengthEvidence} /></label>
        <label>现实限制或需要避开的情况<textarea maxLength={500} onChange={(event) => setAiPlanning({ constraints: event.target.value, directionResult: null, selectedCandidateId: null, actionPlan: null })} placeholder="例如：每周课业较多，希望先用低成本项目验证。" rows={4} value={aiPlanning.constraints} /></label>
      </div>
      <label className="ai-time-budget"><span><Clock3 size={16} />每周可投入时间</span><input aria-label="每周可投入时间" max="20" min="2" onChange={(event) => setAiPlanning({ timeBudgetHours: Number(event.target.value), actionPlan: null })} type="range" value={aiPlanning.timeBudgetHours} /><output>{aiPlanning.timeBudgetHours} 小时</output></label>
      {status === "ready" ? <button className="button button-primary" disabled={directionLoading} onClick={generateDirections} type="button">{directionLoading ? <><LoaderCircle className="is-spinning" size={17} />正在细分方向</> : <><Sparkles size={17} />生成 3 个细分方向</>}</button> : <div className="ai-fallback"><CircleAlert size={18} /><div><strong>{checking ? "正在检查 AI 服务" : "DeepSeek 尚未配置"}</strong><p>规则引擎仍建议先比较：{ruleDirections.map((item) => item.title).join("、")}。配置服务端密钥后可生成更细的候选。</p></div></div>}
      {error && <p className="ai-error" role="alert"><CircleAlert size={16} />{error}</p>}
    </section>

    {aiPlanning.directionResult && <section className="ai-direction-section">
      <div className="ai-section-heading"><div><span className="section-kicker">02 · 方向候选</span><h2>比较问题场景，不只比较岗位名称。</h2><p>{aiPlanning.directionResult.overview}</p></div><Target size={28} /></div>
      <div className="ai-direction-grid">{aiPlanning.directionResult.candidates.map((candidate) => <button aria-pressed={selected?.id === candidate.id} className={selected?.id === candidate.id ? "ai-direction-card is-selected" : "ai-direction-card"} key={candidate.id} onClick={() => { setAiPlanning({ selectedCandidateId: candidate.id, actionPlan: null }); setSaved(false); }} type="button">
        <span className="ai-fit-label">{candidate.fit}</span><strong>{candidate.title}</strong><small>{candidate.specialization}</small><p>{candidate.rationale}</p>
        <dl><div><dt>可能处理</dt><dd>{candidate.problemExamples.join(" · ")}</dd></div><div><dt>需要验证</dt><dd>{candidate.evidenceNeeded.join(" · ")}</dd></div></dl>
        <div className="ai-tradeoff"><span>现实取舍</span>{candidate.tradeoffs}</div>
        <div className="ai-first-experiment"><Sparkles size={15} /><div><span>第一次验证</span><b>{candidate.firstExperiment.title}</b><small>{candidate.firstExperiment.successSignal}</small></div></div>
      </button>)}</div>
      <p className="ai-reflection-question">{aiPlanning.directionResult.reflectionQuestion}</p>
    </section>}

    {selected && <section className="ai-plan-builder">
      <div><span className="section-kicker">03 · 个性化行动</span><h2>围绕「{selected.title}」生成可执行计划。</h2><p>先做方向验证，再补能力与作品证据。</p></div>
      <label>计划周期<select aria-label="计划周期" onChange={(event) => setAiPlanning({ horizonWeeks: Number(event.target.value), actionPlan: null })} value={aiPlanning.horizonWeeks}><option value="4">4 周快速验证</option><option value="8">8 周完整推进</option><option value="12">12 周深度积累</option></select></label>
      <button className="button button-primary" disabled={planLoading} onClick={generatePlan} type="button">{planLoading ? <><LoaderCircle className="is-spinning" size={17} />正在生成计划</> : <><Route size={17} />生成个性化行动计划</>}</button>
    </section>}

    {aiPlanning.actionPlan && selected && <section className="ai-plan-result">
      <div className="ai-section-heading"><div><span className="section-kicker">DeepSeek 规划结果</span><h2>{aiPlanning.actionPlan.objective}</h2><p>{aiPlanning.actionPlan.strategy}</p></div><span className="ai-plan-count">{aiPlanning.actionPlan.tasks.length}<small>项行动</small></span></div>
      <TaskList readOnly tasks={previewTasks} />
      <div className="ai-checkpoints"><div><span className="section-kicker">复盘节点</span>{aiPlanning.actionPlan.checkpoints.map((item) => <p key={`${item.week}-${item.question}`}><strong>{item.week}</strong>{item.question}</p>)}</div>{aiPlanning.actionPlan.risks.length > 0 && <div><span className="section-kicker">注意偏差</span>{aiPlanning.actionPlan.risks.map((risk) => <p key={risk}>{risk}</p>)}</div>}</div>
      <div className="ai-save-plan"><button className="button button-primary" onClick={savePlan} type="button"><Check size={17} />保存到行动计划</button>{saved && <Link className="button button-secondary" to="/student/roadmap">已保存，查看行动计划 <ArrowRight size={16} /></Link>}</div>
    </section>}
  </PageShell>;
}
