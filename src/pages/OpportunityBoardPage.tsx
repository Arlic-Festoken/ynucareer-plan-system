import {
  ArrowUpRight,
  Bookmark,
  CalendarPlus,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  Filter,
  LibraryBig,
  LoaderCircle,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import { getOpportunities } from "../api/opportunities";
import { calendarUrl, saveParticipation } from "../api/pilot";
import { pathwayGuidance } from "../data/catalog";
import type { CampusOpportunity, OpportunityParticipationStatus, OpportunityType } from "../domain";
import { useCareerStore } from "../store/careerStore";

const typeLabels: Record<OpportunityType, string> = {
  course: "课程",
  project: "项目",
  competition: "竞赛",
  internship: "实习",
  consultation: "咨询",
  research: "科研",
  event: "活动",
};
const statusLabels: Record<OpportunityParticipationStatus, string> = {
  saved: "已加入",
  applied: "已报名",
  in_progress: "进行中",
  submitted: "待核验",
  changes_requested: "待补充",
  verified: "已核验",
  withdrawn: "已撤回",
};
const workflowLabels: Record<CampusOpportunity["status"], string> = {
  draft: "草稿",
  pending_review: "审核中",
  published: "可参与",
  expired: "已截止",
  closed: "已关闭",
  archived: "已归档",
};

function studentStage(role: string) {
  return role === "graduate" ? "graduate" : role === "junior" ? "junior" : "freshman";
}

export default function OpportunityBoardPage() {
  const profile = useCareerStore((state) => state.profile);
  const [opportunities, setOpportunities] = useState<CampusOpportunity[]>([]);
  const [type, setType] = useState<"all" | OpportunityType>("all");
  const [scope, setScope] = useState<"all" | "mine" | "attention">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [reflection, setReflection] = useState("");
  const currentStage = studentStage(profile.role);

  useEffect(() => {
    let active = true;
    void getOpportunities()
      .then((result) => { if (active) setOpportunities(result.opportunities); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "资源加载失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const applicable = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");
    return opportunities.filter((opportunity) => {
      const { eligibility } = opportunity;
      const eligible = (!eligibility.stages.length || eligibility.stages.includes(currentStage))
        && (!eligibility.pathways.length || eligibility.pathways.includes(profile.targetPath))
        && (!eligibility.majors.length || eligibility.majors.includes(profile.major));
      const matchesType = type === "all" || opportunity.type === type;
      const matchesScope = scope === "all"
        || (scope === "mine" && Boolean(opportunity.participation))
        || (scope === "attention" && ["changes_requested", "submitted"].includes(opportunity.participation?.status || ""));
      const matchesQuery = !keyword || [
        opportunity.title,
        opportunity.summary,
        opportunity.provider,
        ...opportunity.tags,
      ].some((value) => value.toLocaleLowerCase("zh-CN").includes(keyword));
      return eligible && matchesType && matchesScope && matchesQuery;
    });
  }, [currentStage, opportunities, profile.major, profile.targetPath, query, scope, type]);

  async function transition(opportunity: CampusOpportunity, status: OpportunityParticipationStatus, evidence?: {
    evidenceNote: string;
    evidenceUrl: string;
    reflection: string;
  }) {
    setBusyId(opportunity.id);
    setError("");
    try {
      const result = await saveParticipation(opportunity.id, { status, ...evidence });
      setOpportunities((current) => current.map((item) => item.id === opportunity.id ? { ...item, participation: result.participation } : item));
      if (status === "submitted") {
        setEvidenceId("");
        setEvidenceNote("");
        setEvidenceUrl("");
        setReflection("");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请稍后再试。");
    } finally {
      setBusyId("");
    }
  }

  function openEvidence(opportunity: CampusOpportunity) {
    setEvidenceId(opportunity.id);
    setEvidenceNote(opportunity.participation?.evidenceNote || "");
    setEvidenceUrl(opportunity.participation?.evidenceUrl || "");
    setReflection(opportunity.participation?.reflection || "");
  }

  return <PageShell eyebrow="校内资源" title="把计划接到一项真实机会。" description="资源来自校内责任单位并保留官方来源。报名、成果和教师反馈会进入同一条成长记录。">
    <section className="resource-toolbar">
      <label className="resource-search"><Search size={17} /><span className="sr-only">搜索校内资源</span><input onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、课程、单位或标签" type="search" value={query} />{query && <button aria-label="清空搜索" onClick={() => setQuery("")} type="button"><X size={15} /></button>}</label>
      <a className="button button-quiet" href={calendarUrl()}><CalendarPlus size={16} />导出截止日历</a>
    </section>
    <section className="resource-context">
      <div><span className="section-kicker"><LibraryBig size={15} /> 当前匹配条件</span><strong>{profile.major}</strong><small>{profile.grade <= 4 ? `大 ${profile.grade}` : `研 ${profile.grade - 4}`} · {pathwayGuidance[profile.targetPath].label}</small></div>
      <p>只显示与你当前阶段、专业和路径相符的内容；没有官方来源的机会不会进入资源台。</p>
    </section>
    <section className="resource-filters" aria-label="校内资源筛选">
      <div><Filter size={16} /><span>范围</span>{(["all", "mine", "attention"] as const).map((item) => <button className={scope === item ? "is-active" : ""} key={item} onClick={() => setScope(item)} type="button">{item === "all" ? "全部资源" : item === "mine" ? "我的参与" : "待我处理"}</button>)}</div>
      <div><span>类型</span>{(["all", "course", "project", "competition", "internship", "consultation", "research", "event"] as const).map((item) => <button className={type === item ? "is-active" : ""} key={item} onClick={() => setType(item)} type="button">{item === "all" ? "全部" : typeLabels[item]}</button>)}</div>
    </section>
    {error && <p className="opportunity-error" role="alert">{error}</p>}
    {loading ? <div className="opportunity-loading" role="status"><LoaderCircle size={20} />正在获取校内资源…</div> : applicable.length ? <section className="opportunity-grid">{applicable.map((opportunity) => {
      const participation = opportunity.participation;
      const active = opportunity.status === "published";
      const actionUrl = opportunity.applicationUrl || opportunity.sourceUrl;
      return <article className={`opportunity-card is-${opportunity.status}`} key={opportunity.id}>
        <div className="opportunity-card-meta"><span>{typeLabels[opportunity.type]}</span><small>{workflowLabels[opportunity.status]}</small></div>
        <h2>{opportunity.title}</h2><p>{opportunity.summary}</p>
        <dl>
          <div><dt>责任单位</dt><dd>{opportunity.provider}</dd></div>
          <div><dt>截止时间</dt><dd>{opportunity.deadline || "以官方页面为准"}</dd></div>
          {opportunity.location && <div><dt>地点 / 形式</dt><dd>{opportunity.location} · {opportunity.deliveryMode === "online" ? "线上" : opportunity.deliveryMode === "hybrid" ? "混合" : "线下"}</dd></div>}
          {opportunity.evidenceRequirement && <div><dt>成果要求</dt><dd>{opportunity.evidenceRequirement}</dd></div>}
        </dl>
        <div className="opportunity-tags">{opportunity.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className="opportunity-source"><a href={opportunity.sourceUrl} rel="noreferrer" target="_blank">核验官方来源 <ExternalLink size={14} /></a>{participation && <span className={`is-${participation.status}`}>{participation.status === "verified" ? <CheckCircle2 size={14} /> : participation.status === "submitted" ? <Send size={14} /> : <Bookmark size={14} />}{statusLabels[participation.status]}</span>}</div>
        <div className="opportunity-actions">
          {!participation && active && <button className="button button-secondary" disabled={busyId === opportunity.id} onClick={() => void transition(opportunity, "saved")} type="button"><Bookmark size={16} />加入行动</button>}
          {participation?.status === "saved" && active && <>
            <a className="button button-primary" href={actionUrl} rel="noreferrer" target="_blank">前往报名 <ArrowUpRight size={16} /></a>
            <button className="button button-quiet" disabled={busyId === opportunity.id} onClick={() => void transition(opportunity, "applied")} type="button">我已完成报名</button>
          </>}
          {participation?.status === "applied" && <button className="button button-secondary" disabled={busyId === opportunity.id} onClick={() => void transition(opportunity, "in_progress")} type="button"><CircleDot size={16} />开始参与</button>}
          {["applied", "in_progress", "changes_requested"].includes(participation?.status || "") && <button className="button button-primary" onClick={() => openEvidence(opportunity)} type="button"><Sparkles size={15} />{participation?.status === "changes_requested" ? "补充成果" : "提交成果"}</button>}
          {["saved", "applied", "in_progress", "changes_requested"].includes(participation?.status || "") && <button className="button button-quiet" disabled={busyId === opportunity.id} onClick={() => void transition(opportunity, "withdrawn")} type="button">撤回</button>}
          {participation?.status === "withdrawn" && active && <button className="button button-quiet" disabled={busyId === opportunity.id} onClick={() => void transition(opportunity, "saved")} type="button"><RotateCcw size={15} />重新加入</button>}
        </div>
        {participation?.status === "submitted" && <p className="resource-feedback is-pending">成果已提交，等待教师核验。核验前不会改变能力得分。</p>}
        {participation?.status === "changes_requested" && <p className="resource-feedback is-warning"><strong>教师反馈</strong>{participation.reviewerFeedback}</p>}
        {participation?.status === "verified" && <p className="resource-feedback is-success"><strong>已核验</strong>{participation.reviewerFeedback || "这项成果已进入你的能力证据。"}</p>}
        {evidenceId === opportunity.id && <form className="opportunity-evidence" onSubmit={(event) => { event.preventDefault(); void transition(opportunity, "submitted", { evidenceNote, evidenceUrl, reflection }); }}>
          <div><strong>提交可复盘的成果</strong><button aria-label="关闭成果表单" onClick={() => setEvidenceId("")} type="button"><X size={16} /></button></div>
          <label>成果说明<textarea maxLength={600} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="说明你完成了什么、承担了什么，以及结果如何。" required rows={3} value={evidenceNote} /></label>
          <label>公开成果链接（可选）<input onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." type="url" value={evidenceUrl} /></label>
          <label>行动反思<textarea maxLength={600} onChange={(event) => setReflection(event.target.value)} placeholder="这次行动验证或改变了什么？下一步准备怎么做？" required rows={3} value={reflection} /></label>
          <div><button className="button button-quiet" onClick={() => setEvidenceId("")} type="button">取消</button><button className="button button-primary" disabled={busyId === opportunity.id} type="submit"><Send size={15} />提交核验</button></div>
        </form>}
      </article>;
    })}</section> : <section className="opportunity-empty"><LibraryBig size={26} /><div><span className="section-kicker">没有符合当前筛选的资源</span><h2>换个关键词或查看全部资源。</h2><p>如果持续没有匹配项，学院端会在满足隐私阈值后看到匿名资源需求，不会暴露你的个人资料。</p></div></section>}
  </PageShell>;
}
