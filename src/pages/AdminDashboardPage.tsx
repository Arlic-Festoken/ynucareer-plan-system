import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  CirclePlus,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  Send,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createOpportunityDraft,
  getCohortInsights,
  getEvidenceQueue,
  getStaffOpportunities,
  reviewEvidence,
  reviewOpportunity,
  setStaffOpportunityStatus,
  submitOpportunityForReview,
  type OpportunityDraft,
  type StaffOpportunity,
} from "../api/pilot";
import PageShell from "../components/common/PageShell";
import { abilityLabels, pathwayGuidance } from "../data/catalog";
import { abilityKeys, type CohortInsights, type EvidenceRecord, type OpportunityType, type Pathway } from "../domain";
import { useAuthStore } from "../store/authStore";

type WorkspaceTab = "overview" | "resources" | "evidence" | "insights";
type EvidenceQueueItem = EvidenceRecord & { provider: string; evidenceRequirement: string };

const typeLabels: Record<OpportunityType, string> = { course: "课程", project: "项目", competition: "竞赛", internship: "实习", consultation: "咨询", research: "科研", event: "活动" };
const typeOptions = Object.entries(typeLabels) as Array<[OpportunityType, string]>;
const statusLabels: Record<StaffOpportunity["status"], string> = {
  draft: "草稿",
  pending_review: "待审核",
  published: "已发布",
  expired: "已截止",
  closed: "已关闭",
  archived: "已归档",
};

const emptyForm: OpportunityDraft = {
  title: "",
  summary: "",
  provider: "",
  type: "event",
  sourceUrl: "",
  applicationUrl: "",
  deadline: "",
  location: "",
  deliveryMode: "offline",
  capacity: null,
  evidenceRequirement: "",
  abilityDimensions: [],
  eligibility: { stages: [], pathways: [], majors: [] },
  tags: [],
};

export default function AdminDashboardPage() {
  const permissions = useAuthStore((state) => state.user?.permissions || []);
  const canPublish = permissions.includes("publish_opportunity");
  const canReviewResources = permissions.includes("review_opportunity");
  const canReviewEvidence = permissions.includes("review_evidence");
  const canViewInsights = permissions.includes("view_insights");
  const canAccessResources = canPublish || canReviewResources || canViewInsights;
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [resources, setResources] = useState<StaffOpportunity[]>([]);
  const [evidence, setEvidence] = useState<EvidenceQueueItem[]>([]);
  const [insights, setInsights] = useState<CohortInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OpportunityDraft>(emptyForm);
  const [stage, setStage] = useState<"all" | "freshman" | "junior" | "graduate">("all");
  const [pathway, setPathway] = useState<"all" | Pathway>("all");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewingEvidence, setReviewingEvidence] = useState<EvidenceQueueItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rubric, setRubric] = useState<EvidenceRecord["rubric"]>({});
  const publishGuard = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      canAccessResources ? getStaffOpportunities() : Promise.resolve({ opportunities: [] }),
      canReviewEvidence ? getEvidenceQueue() : Promise.resolve({ evidence: [] }),
      canViewInsights ? getCohortInsights() : Promise.resolve({ insights: null }),
    ])
      .then(([resourceResult, evidenceResult, insightResult]) => {
        if (!active) return;
        setResources(resourceResult.opportunities);
        setEvidence(evidenceResult.evidence);
        setInsights(insightResult.insights);
      })
      .catch((reason: unknown) => {
        if (active) setMessage(reason instanceof Error ? reason.message : "教师工作台加载失败。");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canAccessResources, canReviewEvidence, canViewInsights]);

  const totals = useMemo(() => resources.reduce((total, item) => ({
    published: total.published + (item.status === "published" ? 1 : 0),
    saved: total.saved + item.participationSummary.saved,
    submitted: total.submitted + item.participationSummary.submitted,
    verified: total.verified + item.participationSummary.verified,
  }), { published: 0, saved: 0, submitted: 0, verified: 0 }), [resources]);
  const pendingEvidence = evidence.filter((item) => item.status === "submitted").length;
  const pendingResources = resources.filter((item) => item.status === "pending_review").length;
  const workspaceTabs = [
    ["overview", "总览", BarChart3],
    ...(canAccessResources ? [["resources", "资源", FileCheck2]] : []),
    ...(canReviewEvidence ? [["evidence", "成果审核", Inbox]] : []),
    ...(canViewInsights ? [["insights", "学院洞察", UsersRound]] : []),
  ] as Array<[WorkspaceTab, string, typeof BarChart3]>;

  function resetComposer() {
    setComposerOpen(false);
    setStep(1);
    setForm(emptyForm);
    setStage("all");
    setPathway("all");
    setTags("");
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (publishGuard.current) return;
    publishGuard.current = true;
    setSubmitting(true);
    setMessage("");
    try {
      const { opportunity } = await createOpportunityDraft({
        ...form,
        tags: tags.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
        eligibility: {
          stages: stage === "all" ? [] : [stage],
          pathways: pathway === "all" ? [] : [pathway],
          majors: form.eligibility.majors,
        },
      });
      const submitted = await submitOpportunityForReview(opportunity.id);
      const next = { ...submitted.opportunity, participationSummary: { opportunityId: opportunity.id, saved: 0, applied: 0, submitted: 0, verified: 0, completed: 0 } };
      setResources((current) => [next, ...current]);
      setMessage("资源已提交审核；通过前不会出现在学生端。");
      resetComposer();
      setTab("resources");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "资源保存失败。");
    } finally {
      publishGuard.current = false;
      setSubmitting(false);
    }
  }

  async function decideOpportunity(resource: StaffOpportunity, decision: "approved" | "changes_requested") {
    try {
      const note = decision === "changes_requested" ? "请重新核对官方来源、时间和成果要求。" : "";
      const { opportunity } = await reviewOpportunity(resource.id, decision, note);
      setResources((current) => current.map((item) => item.id === resource.id ? { ...item, ...opportunity } : item));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "资源审核失败。");
    }
  }

  async function changeStatus(resource: StaffOpportunity, status: "published" | "closed" | "archived") {
    try {
      const { opportunity } = await setStaffOpportunityStatus(resource.id, status);
      setResources((current) => current.map((item) => item.id === resource.id ? { ...item, ...opportunity } : item));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "状态更新失败。");
    }
  }

  async function decideEvidence(decision: "verified" | "changes_requested") {
    if (!reviewingEvidence) return;
    try {
      const result = await reviewEvidence(reviewingEvidence.id, { decision, feedback, rubric });
      setEvidence((current) => current.map((item) => item.id === reviewingEvidence.id ? { ...item, ...result.evidence } : item));
      setReviewingEvidence(null);
      setFeedback("");
      setRubric({});
      setMessage(decision === "verified" ? "成果已核验，学生能力画像将自动更新。" : "已退回学生补充成果。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "成果审核失败。");
    }
  }

  return <PageShell mode="teacher" eyebrow="校级试点工作台" title="把资源、反馈和培养改进连成一条线。" description="资源先审核再发布；成果默认匿名核验；群体洞察达到隐私阈值后才显示。">
    <section className="staff-tabs" aria-label="教师工作区">
      {workspaceTabs.map(([value, label, Icon]) => <button className={tab === value ? "is-active" : ""} key={value} onClick={() => setTab(value)} type="button"><Icon size={17} />{label}{value === "evidence" && pendingEvidence > 0 ? <span>{pendingEvidence}</span> : null}{value === "resources" && pendingResources > 0 ? <span>{pendingResources}</span> : null}</button>)}
      {canPublish && <button className="staff-new-resource" onClick={() => setComposerOpen(true)} type="button"><CirclePlus size={17} />新建资源</button>}
    </section>
    {message && <p className="staff-message" role="status">{message}</p>}
    {loading ? <div className="opportunity-loading" role="status"><LoaderCircle size={20} />正在同步教师工作台…</div> : <>
      {tab === "overview" && <section className="staff-overview">
        <section className="teacher-resource-summary"><article><BarChart3 size={20} /><span>正在发布</span><strong>{totals.published}</strong></article><article><UsersRound size={20} /><span>累计加入</span><strong>{totals.saved}</strong></article><article><Send size={20} /><span>成果待核验</span><strong>{pendingEvidence}</strong></article><article><CheckCircle2 size={20} /><span>累计已核验</span><strong>{totals.verified}</strong></article></section>
        <section className="staff-priority-grid">
          <article><span className="section-kicker"><Inbox size={15} /> 今日待处理</span><h2>{pendingResources + pendingEvidence ? `${pendingResources + pendingEvidence} 项需要处理` : "当前没有积压"}</h2><div>{canAccessResources && <button className="button button-secondary" onClick={() => setTab("resources")} type="button">审核资源 {pendingResources}<ArrowRight size={15} /></button>}{canReviewEvidence && <button className="button button-secondary" onClick={() => setTab("evidence")} type="button">核验成果 {pendingEvidence}<ArrowRight size={15} /></button>}</div></article>
          <article className="staff-privacy-card"><LockKeyhole size={22} /><span className="section-kicker">数据边界</span><h2>核验行动，不浏览学生档案。</h2><p>成果队列只显示匿名编号和学生主动提交的内容；群体统计低于阈值时不生成细分结论。</p></article>
        </section>
        {canAccessResources && <section className="staff-latest"><div className="section-heading"><div><span className="section-kicker">最近资源</span><h2>从发布到核验的累计进展</h2></div><button className="button button-quiet" onClick={() => setTab("resources")} type="button">查看全部</button></div><ResourceGrid canPublish={canPublish} canReview={canReviewResources} resources={resources.slice(0, 3)} onDecision={decideOpportunity} onStatus={changeStatus} /></section>}
      </section>}

      {tab === "resources" && <section className="staff-resource-workspace">
        <div className="section-heading"><div><span className="section-kicker">校内资源治理</span><h2>草稿、审核、发布和关闭都有记录。</h2><p>学生端不会看到草稿或待审核内容。</p></div>{canPublish && <button className="button button-primary" onClick={() => setComposerOpen(true)} type="button"><CirclePlus size={16} />新建资源</button>}</div>
        <ResourceGrid canPublish={canPublish} canReview={canReviewResources} resources={resources} onDecision={decideOpportunity} onStatus={changeStatus} />
      </section>}

      {tab === "evidence" && <section className="staff-evidence-workspace">
        <div className="section-heading"><div><span className="section-kicker">匿名成果队列</span><h2>用统一量表核验成长证据。</h2><p>核验分为 0–4 级，权重为 1–3；退回时必须给出具体修改意见。</p></div></div>
        {evidence.length ? <div className="evidence-review-list">{evidence.map((item) => <article className={`is-${item.status}`} key={item.id}><div><span>{item.anonymousStudentCode}</span><small>{item.status === "submitted" ? "待核验" : item.status === "verified" ? "已核验" : "已退回"}</small></div><h3>{item.title}</h3><p>{item.description}</p><dl><div><dt>责任单位</dt><dd>{item.provider || "自主行动"}</dd></div><div><dt>提交时间</dt><dd>{new Date(item.submittedAt).toLocaleDateString("zh-CN")}</dd></div></dl>{item.evidenceUrl && <a href={item.evidenceUrl} rel="noreferrer" target="_blank">查看公开成果 <ExternalLink size={13} /></a>}<blockquote>{item.reflection}</blockquote>{item.reviewerFeedback && <p className="review-feedback">{item.reviewerFeedback}</p>}{item.status === "submitted" && <button className="button button-secondary" onClick={() => { setReviewingEvidence(item); setFeedback(""); setRubric({}); }} type="button"><ClipboardCheck size={15} />开始核验</button>}</article>)}</div> : <div className="teacher-resource-empty"><BadgeCheck size={24} /><div><h2>暂无待核验成果</h2><p>学生提交成果后会以匿名编号进入这里。</p></div></div>}
      </section>}

      {tab === "insights" && <section className="staff-insights-workspace">
        <div className="section-heading"><div><span className="section-kicker">匿名群体洞察</span><h2>只在样本足够时提供培养线索。</h2><p>不展示学生名单、个体分数或低样本细分。</p></div></div>
        {insights?.suppressed ? <section className="insight-suppressed"><ShieldCheck size={26} /><div><h2>当前样本不足，细分洞察已隐藏。</h2><p>已有 {insights.sampleSize} 名学生完成资料，至少需要 {insights.threshold} 名才会显示能力短板和资源需求。累计流程数据仍可用于运行检查。</p></div></section> : insights && <><section className="insight-funnel"><article><span>加入行动</span><strong>{insights.funnel.saved}</strong></article><article><span>确认报名</span><strong>{insights.funnel.applied}</strong></article><article><span>提交成果</span><strong>{insights.funnel.submitted}</strong></article><article><span>完成核验</span><strong>{insights.funnel.verified}</strong></article></section><section className="insight-detail-grid"><article><h3>共性能力短板</h3>{insights.commonAbilityGaps.map((item) => <div key={item.ability}><span>{abilityLabels[item.ability]}</span><strong>{item.average}</strong></div>)}</article><article><h3>资源需求</h3>{insights.resourceDemand.map((item) => <div key={item.type}><span>{typeLabels[item.type]}</span><strong>{item.count}</strong></div>)}</article></section></>}
      </section>}
    </>}

    {canPublish && composerOpen && <div className="modal-backdrop" role="presentation"><form aria-label="新建校内资源" className="resource-composer" onSubmit={publish}>
      <header><div><span className="section-kicker">新建校内资源 · 第 {step} 步 / 3</span><h2>{step === 1 ? "基本信息" : step === 2 ? "适用范围与成果" : "提交审核前预览"}</h2></div><button aria-label="关闭新建资源" onClick={resetComposer} type="button"><X size={19} /></button></header>
      <div className="composer-progress"><i><b style={{ width: `${step / 3 * 100}%` }} /></i></div>
      {step === 1 && <section className="composer-fields"><div className="teacher-form-grid"><label>资源名称<input maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} required value={form.title} /></label><label>提供单位<input maxLength={120} onChange={(event) => setForm({ ...form, provider: event.target.value })} required value={form.provider} /></label><label>资源类型<select onChange={(event) => setForm({ ...form, type: event.target.value as OpportunityType })} value={form.type}>{typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>截止日期<input onChange={(event) => setForm({ ...form, deadline: event.target.value })} type="date" value={form.deadline} /></label></div><label>资源说明<textarea maxLength={800} onChange={(event) => setForm({ ...form, summary: event.target.value })} required rows={4} value={form.summary} /></label><div className="teacher-form-grid"><label>官方来源链接<input onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} required type="url" value={form.sourceUrl} /></label><label>报名 / 预约链接（可选）<input onChange={(event) => setForm({ ...form, applicationUrl: event.target.value })} type="url" value={form.applicationUrl} /></label></div></section>}
      {step === 2 && <section className="composer-fields"><div className="teacher-form-grid"><label>适用阶段<select onChange={(event) => setStage(event.target.value as typeof stage)} value={stage}><option value="all">全体学生</option><option value="freshman">低年级</option><option value="junior">高年级</option><option value="graduate">研究生</option></select></label><label>优先路径<select onChange={(event) => setPathway(event.target.value as typeof pathway)} value={pathway}><option value="all">不限路径</option>{Object.entries(pathwayGuidance).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label><label>地点<input onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="例如：呈贡校区信息楼" value={form.location} /></label><label>参与形式<select onChange={(event) => setForm({ ...form, deliveryMode: event.target.value as OpportunityDraft["deliveryMode"] })} value={form.deliveryMode}><option value="offline">线下</option><option value="online">线上</option><option value="hybrid">线上 + 线下</option></select></label><label>容量（可选）<input min="1" onChange={(event) => setForm({ ...form, capacity: event.target.value ? Number(event.target.value) : null })} type="number" value={form.capacity ?? ""} /></label><label>专业限制（可选）<input onChange={(event) => setForm({ ...form, eligibility: { ...form.eligibility, majors: event.target.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean) } })} placeholder="逗号分隔" value={form.eligibility.majors.join(", ")} /></label></div><label>学生应提交的成果<textarea maxLength={500} onChange={(event) => setForm({ ...form, evidenceRequirement: event.target.value })} placeholder="例如：公开作品链接、方法说明和行动复盘。" required rows={3} value={form.evidenceRequirement} /></label><fieldset><legend>关联能力维度</legend><div className="ability-checkbox-grid">{abilityKeys.map((key) => <label key={key}><input checked={form.abilityDimensions.includes(key)} onChange={() => setForm({ ...form, abilityDimensions: form.abilityDimensions.includes(key) ? form.abilityDimensions.filter((item) => item !== key) : [...form.abilityDimensions, key] })} type="checkbox" /><span>{abilityLabels[key]}</span></label>)}</div></fieldset><label>标签（逗号分隔）<input onChange={(event) => setTags(event.target.value)} placeholder="数据分析, 作品集, 校内实践" value={tags} /></label></section>}
      {step === 3 && <section className="resource-preview"><div><span>{typeLabels[form.type]}</span><small>{form.deadline || "无固定截止日"}</small></div><h3>{form.title || "尚未填写资源名称"}</h3><p>{form.summary || "尚未填写资源说明"}</p><dl><div><dt>责任单位</dt><dd>{form.provider || "未填写"}</dd></div><div><dt>成果要求</dt><dd>{form.evidenceRequirement || "未填写"}</dd></div><div><dt>能力维度</dt><dd>{form.abilityDimensions.map((item) => abilityLabels[item]).join("、") || "未选择"}</dd></div></dl><p className="preview-note"><LockKeyhole size={15} />提交后进入审核队列，通过前学生不可见。</p></section>}
      <footer>{step > 1 ? <button className="button button-quiet" onClick={() => setStep(step - 1)} type="button"><ChevronLeft size={16} />上一步</button> : <button className="button button-quiet" onClick={resetComposer} type="button">取消</button>}{step < 3 ? <button className="button button-primary" disabled={step === 1 ? !form.title || !form.provider || !form.summary || !form.sourceUrl : !form.evidenceRequirement || !form.abilityDimensions.length} onClick={() => setStep(step + 1)} type="button">继续 <ArrowRight size={16} /></button> : <button className="button button-primary" disabled={submitting} type="submit"><FileCheck2 size={16} />{submitting ? "正在提交…" : "保存草稿并提交审核"}</button>}</footer>
    </form></div>}

    {reviewingEvidence && <div className="modal-backdrop" role="presentation"><section aria-label="核验学生成果" className="evidence-review-dialog">
      <header><div><span className="section-kicker">{reviewingEvidence.anonymousStudentCode}</span><h2>{reviewingEvidence.title}</h2></div><button aria-label="关闭核验" onClick={() => setReviewingEvidence(null)} type="button"><X size={19} /></button></header>
      <div className="evidence-review-copy"><p>{reviewingEvidence.description}</p><blockquote>{reviewingEvidence.reflection}</blockquote></div>
      <fieldset><legend>选择相关能力并评分</legend><div className="rubric-grid">{abilityKeys.map((key) => <label key={key}><input checked={Boolean(rubric[key])} onChange={(event) => setRubric(event.target.checked ? { ...rubric, [key]: { score: 3, weight: 1 } } : Object.fromEntries(Object.entries(rubric).filter(([item]) => item !== key)))} type="checkbox" /><span>{abilityLabels[key]}</span>{rubric[key] && <><select aria-label={`${abilityLabels[key]}评分`} onChange={(event) => setRubric({ ...rubric, [key]: { ...rubric[key]!, score: Number(event.target.value) } })} value={rubric[key]!.score}>{[0, 1, 2, 3, 4].map((score) => <option key={score} value={score}>{score} 级</option>)}</select><select aria-label={`${abilityLabels[key]}权重`} onChange={(event) => setRubric({ ...rubric, [key]: { ...rubric[key]!, weight: Number(event.target.value) } })} value={rubric[key]!.weight}>{[1, 2, 3].map((weight) => <option key={weight} value={weight}>权重 {weight}</option>)}</select></>}</label>)}</div></fieldset>
      <label>反馈<textarea maxLength={600} onChange={(event) => setFeedback(event.target.value)} placeholder="说明做得好的部分，或需要补充的具体内容。" rows={4} value={feedback} /></label>
      <footer><button className="button button-quiet" disabled={!feedback.trim()} onClick={() => void decideEvidence("changes_requested")} type="button">退回补充</button><button className="button button-primary" disabled={!Object.keys(rubric).length} onClick={() => void decideEvidence("verified")} type="button"><Check size={16} />核验并计入能力画像</button></footer>
    </section></div>}
  </PageShell>;
}

function ResourceGrid({ resources, onDecision, onStatus, canPublish, canReview }: {
  resources: StaffOpportunity[];
  onDecision: (resource: StaffOpportunity, decision: "approved" | "changes_requested") => void;
  onStatus: (resource: StaffOpportunity, status: "published" | "closed" | "archived") => void;
  canPublish: boolean;
  canReview: boolean;
}) {
  if (!resources.length) return <div className="teacher-resource-empty"><FileCheck2 size={24} /><div><h2>尚未创建资源</h2><p>从一项有官方来源、明确责任单位和成果要求的真实机会开始。</p></div></div>;
  return <div className="staff-resource-grid">{resources.map((resource) => <article className={`is-${resource.status}`} key={resource.id}>
    <div><span>{typeLabels[resource.type]}</span><small>{statusLabels[resource.status]}</small></div>
    <h3>{resource.title}</h3><p>{resource.provider} · {resource.deadline || "无固定截止日"}</p>
    <a href={resource.sourceUrl} rel="noreferrer" target="_blank">核验官方来源 <ExternalLink size={13} /></a>
    <dl><div><dt>累计加入</dt><dd>{resource.participationSummary.saved}</dd></div><div><dt>提交成果</dt><dd>{resource.participationSummary.submitted}</dd></div><div><dt>已核验</dt><dd>{resource.participationSummary.verified}</dd></div></dl>
    <div className="staff-resource-actions">
      {canReview && resource.status === "pending_review" && <><button onClick={() => onDecision(resource, "changes_requested")} type="button">退回</button><button className="is-primary" onClick={() => onDecision(resource, "approved")} type="button"><Check size={14} />通过</button></>}
      {canPublish && resource.status === "published" && <button onClick={() => onStatus(resource, "closed")} type="button">关闭资源</button>}
      {canPublish && resource.status === "closed" && <><button onClick={() => onStatus(resource, "published")} type="button">重新开放</button><button onClick={() => onStatus(resource, "archived")} type="button">归档</button></>}
    </div>
  </article>)}</div>;
}
