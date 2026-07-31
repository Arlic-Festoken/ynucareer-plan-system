import { ArrowRight, Bot, Check, CircleAlert, Clock3, LoaderCircle, Route, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCoachStatus, type CoachStatus } from "../api/careerCoach";
import { requestDirectionCandidates, requestPersonalizedPlan } from "../api/careerPlanner";
import { reconcileGeneratedActions } from "../api/pilot";
import PageShell from "../components/common/PageShell";
import TaskList from "../components/common/TaskList";
import { directions } from "../data/catalog";
import type { ActionTask, AiActionPlan, AiDirectionCandidate, GenerationTrace } from "../domain";
import { mergeActionDetail } from "../services/actionPlan";
import { mergeAiPrimaryPlan, type PlanFusionSummary } from "../services/planFusion";
import { recommendDirections } from "../services/recommendation";
import { aiPlanNeedsRefresh, useCareerStore } from "../store/careerStore";

const sceneOptions = ["教育科技", "人工智能应用", "数据与商业", "智慧医疗", "智能制造", "数字公共服务"];

function toTasks(candidate: AiDirectionCandidate, tasks: AiActionPlan["tasks"], trace?: GenerationTrace | null): ActionTask[] {
  return tasks.map((task, index) => ({
    id: `ai-plan-${candidate.id}-${index + 1}`,
    title: task.title,
    detail: mergeActionDetail(task.detail, task.evidence),
    category: task.category,
    priority: task.priority,
    semester: task.week,
    completed: false,
    evidence: [`计划产出：${task.evidence}`, `方向：${candidate.title}`],
    provenance: trace || undefined,
  }));
}

export default function AiPlanningPage() {
  const location = useLocation();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [fusionSummary, setFusionSummary] = useState<PlanFusionSummary | null>(null);
  const selected = aiPlanning.directionResult?.candidates.find((item) => item.id === aiPlanning.selectedCandidateId) ?? null;
  const calibratedDirection = directions.find((item) => item.id === awakening.selectedDirectionId) ?? null;
  const calibrationComplete = Boolean(awakening.calibratedAt || awakening.selectedDirectionId);
  const planNeedsRefresh = aiPlanNeedsRefresh(aiPlanning, awakening.revision);
  const calibrationJustUpdated = Boolean((location.state as { calibrationUpdated?: boolean } | null)?.calibrationUpdated);
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
    directionCalibration: {
      selectedDirectionTitle: calibratedDirection?.title || "",
      visionText: awakening.visionText,
      visionTags: awakening.visionTags,
      motivation: awakening.motivation,
      revision: awakening.revision,
    },
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
      setAiPlanning({ directionResult: response.result, selectedCandidateId: null, actionPlan: null, generatedAt: response.generatedAt, generationTrace: response.trace });
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
      setAiPlanning({ actionPlan: response.result, generatedAt: response.generatedAt, generationTrace: response.trace, generatedFromCalibrationRevision: awakening.revision });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 行动计划暂时不可用，请稍后重试。");
    } finally {
      setPlanLoading(false);
    }
  }

  async function savePlan() {
    if (!selected || !aiPlanning.actionPlan) return;
    const nextTasks = toTasks(selected, aiPlanning.actionPlan.tasks, aiPlanning.generationTrace);
    const existingTasks = profile.grade <= 2 ? awakening.actionTasks : roadmapTasks;
    const fusion = mergeAiPrimaryPlan(nextTasks, existingTasks);
    const lane = profile.grade <= 2 ? "exploration" as const : "growth" as const;
    setSaving(true);
    setError("");
    if (profile.grade <= 2) {
      setAwakening({
        actionTasks: fusion.tasks,
      });
    } else {
      setRoadmapTasks(fusion.tasks);
    }
    setFusionSummary(fusion.summary);
    try {
      await reconcileGeneratedActions({
        lane,
        actions: fusion.tasks.map((task) => ({
          title: task.title,
          detail: task.detail,
          category: task.category,
          lane,
          source: task.id.startsWith("ai-plan-") ? "ai" : "rule",
          sourceId: task.id,
          dueDate: task.dueDate,
          status: task.completed ? "completed" : "planned",
          reflection: task.reflection,
          trace: task.provenance,
        })),
      });
    } catch (reason) {
      setError(reason instanceof Error ? `计划已保存在本机；账号同步暂未完成：${reason.message}` : "计划已保存在本机；账号同步暂未完成。");
    } finally {
      setSaving(false);
      setSaved(true);
    }
  }

  const previewTasks = aiPlanning.actionPlan ? toTasks(selected as AiDirectionCandidate, aiPlanning.actionPlan.tasks, aiPlanning.generationTrace) : [];

  return <PageShell eyebrow="DeepSeek · 唯一规划主线" title="从方向画像，到可执行行动。" description="先确认规划依据，再细分方向、生成计划，最后统一进入行动中心。">
    <section aria-label="规划流程" className="planning-flow">
      <div className="is-complete"><span>01</span><strong>方向画像</strong><small>{calibrationComplete ? "已建立" : "待校准"}</small></div>
      <div><span>02</span><strong>AI 细分</strong><small>比较方向</small></div>
      <div><span>03</span><strong>行动计划</strong><small>拆解任务</small></div>
      <div><span>04</span><strong>行动中心</strong><small>执行与复盘</small></div>
    </section>
    {calibrationJustUpdated && <div className="calibration-update-note" role="status"><Check size={18} /><div><strong>方向画像已更新</strong><span>{aiPlanning.actionPlan ? "旧计划仍完整保留；请按新画像重新生成后再决定是否替换。" : "DeepSeek 将使用新的画像生成候选与计划。"}</span></div></div>}
    <section className="direction-context-card">
      <div><span className="section-kicker">当前方向画像</span><h2>{calibratedDirection?.title || "尚未完成方向校准"}</h2><p>{awakening.visionText || "补充一个想解决的真实问题，AI 的建议会更具体。"}</p><div className="direction-context-tags">{awakening.visionTags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      <Link className="button button-secondary" to="/student/awakening">{calibrationComplete ? "重新校准方向" : "完成方向校准"} <ArrowRight size={16} /></Link>
    </section>
    {planNeedsRefresh && <div className="plan-refresh-warning" role="status"><CircleAlert size={18} /><div><strong>现有计划基于旧方向画像</strong><span>它不会被删除。重新生成方向和计划后，你再决定是否融合到行动中心。</span></div></div>}
    <section className="ai-planner-intro">
      <div><Bot size={26} /><div><span className="section-kicker">规划引擎</span><h2>DeepSeek 只生成这一份主计划。</h2><p>方向校准提供稳定上下文；这里负责细分、取舍和行动拆解，不再与“探索方向”重复。</p></div></div>
      <div className={`ai-service-chip is-${status}`}>{checking ? <><LoaderCircle className="is-spinning" size={15} />检查服务</> : status === "ready" ? <><Check size={15} />DeepSeek 已连接</> : <><CircleAlert size={15} />AI 未连接</>}</div>
    </section>

    <section className="ai-context-panel">
      <div className="ai-context-heading"><div><span className="section-kicker">02 · 补充上下文</span><h2>补充经历和现实限制。</h2></div></div>
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
      <div className="ai-section-heading"><div><span className="section-kicker">03 · 方向候选</span><h2>比较问题场景，不只比较岗位名称。</h2><p>{aiPlanning.directionResult.overview}</p></div><Target size={28} /></div>
      <div className="ai-direction-grid">{aiPlanning.directionResult.candidates.map((candidate) => <button aria-pressed={selected?.id === candidate.id} className={selected?.id === candidate.id ? "ai-direction-card is-selected" : "ai-direction-card"} key={candidate.id} onClick={() => { setAiPlanning({ selectedCandidateId: candidate.id, actionPlan: null }); setSaved(false); }} type="button">
        <span className="ai-fit-label">{candidate.fit}</span><strong>{candidate.title}</strong><small>{candidate.specialization}</small><p>{candidate.rationale}</p>
        <dl><div><dt>可能处理</dt><dd>{candidate.problemExamples.join(" · ")}</dd></div><div><dt>需要验证</dt><dd>{candidate.evidenceNeeded.join(" · ")}</dd></div></dl>
        <div className="ai-tradeoff"><span>现实取舍</span>{candidate.tradeoffs}</div>
        <div className="ai-first-experiment"><Sparkles size={15} /><div><span>第一次验证</span><b>{candidate.firstExperiment.title}</b><small>{candidate.firstExperiment.successSignal}</small></div></div>
      </button>)}</div>
      <p className="ai-reflection-question">{aiPlanning.directionResult.reflectionQuestion}</p>
    </section>}

    {selected && <section className="ai-plan-builder">
      <div><span className="section-kicker">04 · 个性化行动</span><h2>围绕「{selected.title}」生成可执行计划。</h2><p>先做方向验证，再补能力与作品证据。</p></div>
      <label>计划周期<select aria-label="计划周期" onChange={(event) => setAiPlanning({ horizonWeeks: Number(event.target.value), actionPlan: null })} value={aiPlanning.horizonWeeks}><option value="4">4 周快速验证</option><option value="8">8 周完整推进</option><option value="12">12 周深度积累</option></select></label>
      <button className="button button-primary" disabled={planLoading} onClick={generatePlan} type="button">{planLoading ? <><LoaderCircle className="is-spinning" size={17} />正在生成计划</> : <><Route size={17} />生成个性化行动计划</>}</button>
    </section>}

    {aiPlanning.actionPlan && selected && <section className="ai-plan-result">
      <div className="ai-section-heading"><div><span className="section-kicker">DeepSeek 规划结果</span><h2>{aiPlanning.actionPlan.objective}</h2><p>{aiPlanning.actionPlan.strategy}</p></div><span className="ai-plan-count">{aiPlanning.actionPlan.tasks.length}<small>项行动</small></span></div>
      <TaskList readOnly tasks={previewTasks} />
      <div className="ai-checkpoints">
        <div>
          <span className="section-kicker">复盘节点</span>
          <div className="ai-checkpoint-list">
            {aiPlanning.actionPlan.checkpoints.map((item) => (
              <p className="ai-checkpoint-row" key={`${item.week}-${item.question}`}>
                <strong>{item.week}</strong>
                <span>{item.question}</span>
              </p>
            ))}
          </div>
        </div>
        {aiPlanning.actionPlan.risks.length > 0 && (
          <div>
            <span className="section-kicker">注意偏差</span>
            <ul className="ai-risk-list">
              {aiPlanning.actionPlan.risks.map((risk) => <li key={risk}>{risk}</li>)}
            </ul>
          </div>
        )}
      </div>
      {fusionSummary && <div className="ai-fusion-summary" role="status"><div><Check size={18} /><strong>已融合为一份行动计划</strong></div><span>AI 主线 {fusionSummary.aiCount} 项</span><span>保留探索 {fusionSummary.retainedExplorationCount} 项</span><span>替换重复 {fusionSummary.replacedCount} 项</span><span>历史记录 {fusionSummary.preservedHistoryCount} 项</span></div>}
      <div className="ai-save-plan"><button className="button button-primary" disabled={saving} onClick={() => void savePlan()} type="button"><Check size={17} />{saving ? "正在融合并同步…" : "保存并融合行动计划"}</button>{saved && <Link className="button button-secondary" to="/student/roadmap">已保存，查看行动计划 <ArrowRight size={16} /></Link>}</div>
    </section>}
  </PageShell>;
}
