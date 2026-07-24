import { Bot, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getCoachStatus, requestCoach, type CoachAdvice, type CoachInput, type CoachStatus } from "../../api/careerCoach";

type AiCoachCardProps = { input: CoachInput };

export default function AiCoachCard({ input }: AiCoachCardProps) {
  const [status, setStatus] = useState<CoachStatus>("unavailable");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getCoachStatus(controller.signal).then((next) => { setStatus(next); setChecking(false); });
    return () => controller.abort();
  }, []);

  async function askCoach() {
    setLoading(true); setError("");
    try { setAdvice(await requestCoach(input)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "AI 服务暂时不可用，请稍后重试。"); }
    finally { setLoading(false); }
  }

  return <section className="ai-coach-card" aria-live="polite">
    <div className="ai-coach-heading"><span className="ai-icon"><Bot size={20} /></span><div><span className="section-kicker">可选 AI 辅导</span><h2>把这一步拆得更具体。</h2><p>规则计划优先，AI 补充执行步骤。</p></div></div>
    {checking ? <p className="ai-status"><LoaderCircle className="is-spinning" size={16} />正在检查 AI 服务…</p> : status === "ready" ? <button className="button button-secondary" disabled={loading} onClick={askCoach} type="button">{loading ? <><LoaderCircle className="is-spinning" size={17} />正在生成建议</> : <><Sparkles size={17} />用 AI 拆解这一步</>}</button> : <p className="ai-status"><CircleAlert size={17} />{status === "not_configured" ? "AI 未配置，规则计划可用。" : "AI 暂不可用，规则计划可用。"}</p>}
    {error && <p className="ai-error"><CircleAlert size={16} />{error}</p>}
    {advice && <article className="ai-advice"><span className="section-kicker">补充建议</span><h3>{advice.headline}</h3><p>{advice.summary}</p><ol>{advice.nextActions.map((item) => <li key={item.title}><strong>{item.title}</strong><span>{item.why}</span></li>)}</ol><small>{advice.caution}</small></article>}
  </section>;
}
