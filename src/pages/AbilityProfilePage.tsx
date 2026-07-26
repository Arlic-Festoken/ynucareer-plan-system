import { ArrowRight, BadgeCheck, Gauge, Info, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAbilityProfile, saveAbilityProfile } from "../api/pilot";
import PageShell from "../components/common/PageShell";
import { abilityLabels, blankAbilities } from "../data/catalog";
import { abilityKeys, type AbilityProfile, type AbilityScores } from "../domain";
import { useCareerStore } from "../store/careerStore";

const confidenceLabels = {
  low: "低可信 · 主要来自自评",
  medium: "中可信 · 已有多项核验证据",
  high: "高可信 · 证据类型与时间分布完整",
};

export default function AbilityProfilePage() {
  const updateCareerProfile = useCareerStore((state) => state.updateProfile);
  const localScores = useCareerStore((state) => state.profile.abilityScores);
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [draft, setDraft] = useState<AbilityScores>({ ...blankAbilities, ...localScores });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getAbilityProfile().then(({ profile: next }) => {
      if (!active) return;
      setProfile(next);
      setDraft(next.selfRating);
      updateCareerProfile({ abilityScores: next.combinedScore });
    }).catch((reason: unknown) => {
      if (active) setMessage(reason instanceof Error ? reason.message : "能力画像加载失败。");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [updateCareerProfile]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const { profile: next } = await saveAbilityProfile(draft);
      setProfile(next);
      updateCareerProfile({ abilityScores: next.combinedScore });
      setMessage("自评起点已更新。核验证据不会被自评覆盖。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  return <PageShell eyebrow="七维能力画像" title="自评是起点，证据决定可信度。" description="平台把你的判断与教师核验成果分开保存；岗位诊断使用合成分，并明确展示证据数量。">
    {loading ? <div className="opportunity-loading" role="status"><LoaderCircle size={20} />正在读取能力画像…</div> : <>
      <section className="ability-profile-summary">
        <article><Gauge size={20} /><span>画像可信度</span><strong>{profile ? confidenceLabels[profile.confidence] : "尚未建立"}</strong><p>{profile?.confidence === "low" ? "先如实更新自评，再从校内资源或行动中提交成果。" : "能力得分已包含核验成果，继续积累不同类型的证据。"}</p></article>
        <article><ShieldCheck size={20} /><span>计分方式</span><strong>35% 自评 + 65% 核验证据</strong><p>某个维度没有核验证据时，仅显示自评，不冒充高可信结论。</p></article>
      </section>
      <section className="ability-profile-editor">
        <div className="section-heading"><div><span className="section-kicker"><Info size={15} /> 自评更新</span><h2>按最近六个月的真实表现判断。</h2><p>不要根据“希望自己达到的水平”填写；完成项目、课程和实践后再回来调整。</p></div><button className="button button-primary" disabled={saving} onClick={() => void save()} type="button"><Save size={16} />{saving ? "正在保存…" : "保存自评"}</button></div>
        <div className="ability-dimension-list">{abilityKeys.map((key) => {
          const evidenceCount = profile?.evidenceCounts[key] || 0;
          const combined = profile?.combinedScore[key] ?? draft[key];
          return <article key={key}>
            <div className="ability-dimension-head"><div><strong>{abilityLabels[key]}</strong><small>{evidenceCount ? `${evidenceCount} 条已核验证据` : "暂无核验证据"}</small></div><span>{draft[key]}<small>自评</small></span><span>{combined}<small>当前画像</small></span></div>
            <label><span className="sr-only">调整{abilityLabels[key]}自评</span><input aria-label={`${abilityLabels[key]}自评`} max="100" min="0" onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })} type="range" value={draft[key]} /></label>
            <div className="ability-score-track"><i style={{ width: `${draft[key]}%` }} /><b style={{ width: `${combined}%` }} /></div>
          </article>;
        })}</div>
        {message && <p className="save-message" role="status">{message}</p>}
      </section>
      <section className="ability-next-step"><BadgeCheck size={24} /><div><span className="section-kicker">让画像变得可信</span><h2>去完成一项能被核验的真实行动。</h2><p>成果核验后，相关维度会自动更新；教师只能看到匿名编号和你主动提交的内容。</p></div><Link className="button button-secondary" to="/student/opportunities">查看校内资源 <ArrowRight size={16} /></Link></section>
    </>}
  </PageShell>;
}
