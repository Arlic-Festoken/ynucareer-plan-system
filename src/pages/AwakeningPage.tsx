import { ArrowLeft, ArrowRight, Check, Lightbulb, Network, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import ProgressRail from "../components/product/ProgressRail";
import { directions, policyConnections, valueOptions } from "../data/catalog";
import { recommendDirections } from "../services/recommendation";
import { useAuthStore } from "../store/authStore";
import { useCareerStore } from "../store/careerStore";

const steps = ["价值取向", "内在动机", "场景愿景", "方向设计", "确认画像"];
const prompts = [
  "什么会让你觉得一段大学经历是值得的？",
  "哪些事会让你愿意持续投入？",
  "你想在哪类场景里解决什么问题？",
  "选一个值得让 AI 继续细分的方向。",
  "确认这份方向画像，开始生成唯一行动计划。",
];
const motivations = [["curiosity", "持续探索未知问题"], ["contribution", "解决真实问题、带来价值"], ["achievement", "把复杂目标做成"], ["collaboration", "与他人协作成长"]] as const;

export default function AwakeningPage() {
  const navigate = useNavigate();
  const profile = useCareerStore((state) => state.profile);
  const awakening = useCareerStore((state) => state.awakening);
  const updateProfile = useCareerStore((state) => state.updateProfile);
  const setAwakening = useCareerStore((state) => state.setAwakening);
  const completeDirectionCalibration = useCareerStore((state) => state.completeDirectionCalibration);
  const syncCareerNow = useAuthStore((state) => state.syncCareerNow);
  const [error, setError] = useState("");
  const recommended = useMemo(() => recommendDirections(profile), [profile]);
  const selected = directions.find((item) => item.id === awakening.selectedDirectionId);
  const connection = policyConnections.find((item) => item.major === profile.major) ?? policyConnections[0];
  const isRecalibration = Boolean(awakening.calibratedAt);
  const active = Math.min(5, awakening.activeStep);
  const next = () => setAwakening({ activeStep: Math.min(5, active + 1) });
  const previous = () => setAwakening({ activeStep: Math.max(1, active - 1) });
  const toggleValue = (value: string) => updateProfile({ values: profile.values.includes(value) ? profile.values.filter((item) => item !== value) : [...profile.values, value] });

  async function saveCalibration() {
    if (!selected) {
      setError("请先选择一个当前最值得验证的方向。");
      setAwakening({ activeStep: 4 });
      return;
    }
    completeDirectionCalibration({
      selectedDirectionId: selected.id,
      visionText: awakening.visionText,
      visionTags: awakening.visionTags,
      motivation: awakening.motivation,
    });
    try {
      await syncCareerNow();
    } finally {
      navigate("/student/ai-planning", { state: { calibrationUpdated: isRecalibration } });
    }
  }

  return <PageShell
    eyebrow={isRecalibration ? "方向画像 · 随时可改" : "首次设置 · 仅需一次"}
    title={isRecalibration ? "重新校准方向画像。" : "用一次校准，建立规划起点。"}
    description="这里只确认你想验证什么，不再生成第二套行动计划；DeepSeek 会基于这份画像继续细分。"
  >
    <section className="calibration-principle">
      <div><ShieldCheck size={22} /><span><strong>账号内规划上下文</strong><small>可修改、可删除，不作为模型训练或微调数据。</small></span></div>
      <div><Sparkles size={22} /><span><strong>一条计划主线</strong><small>校准完成后，所有新计划统一从 AI 规划生成。</small></span></div>
    </section>
    <section className="explore-top"><ProgressRail current={active} detail={prompts[active - 1]} label="校准进度" total={5} /><p><span>当前专业</span><strong>{profile.major}</strong></p></section>
    <section className="explore-layout">
      <aside className="explore-steps" aria-label="方向校准步骤">{steps.map((label, index) => <button className={active === index + 1 ? "is-active" : active > index + 1 ? "is-done" : ""} key={label} onClick={() => setAwakening({ activeStep: index + 1 })} type="button"><span>{active > index + 1 ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span>{label}</button>)}</aside>
      <article className="explore-work"><span className="section-kicker">第 {active} 步 / 5</span><h2>{prompts[active - 1]}</h2>
        {active === 1 && <><p>选择 2–3 个愿意长期坚持的价值。</p><div className="select-tile-grid">{valueOptions.map((value) => <button className={profile.values.includes(value) ? "is-selected" : ""} key={value} onClick={() => toggleValue(value)} type="button">{profile.values.includes(value) && <Check size={16} />}{value}</button>)}</div></>}
        {active === 2 && <><p>这是此刻的自我观察，不是人格结论。</p><div className="motivation-list">{motivations.map(([key, label]) => <label key={key}><span>{label}</span><input aria-label={label} max="5" min="1" onChange={(event) => setAwakening({ motivation: { ...awakening.motivation, [key]: Number(event.target.value) } })} type="range" value={awakening.motivation[key]} /><output>{awakening.motivation[key]} / 5</output></label>)}</div><div className="inline-insight"><Lightbulb size={19} />高分只表示值得优先尝试，不是能力判定。</div></>}
        {active === 3 && <><p>描述一个真实场景或问题，不必先写职位名。</p><div className="context-chain calibration-context"><div><span>专业连接</span><strong>{profile.major}</strong></div><ArrowRight size={18} /><div><span>可观察场景</span><strong>{connection.industry}</strong></div><ArrowRight size={18} /><div><span>机会线索</span><strong>{connection.opportunity}</strong></div></div><label className="large-field">我想验证的场景或问题<textarea aria-label="我想验证的场景或问题" maxLength={500} onChange={(event) => setAwakening({ visionText: event.target.value })} placeholder="例如：我想验证 AI 是否能减少同学整理课程资料的重复时间。" rows={5} value={awakening.visionText} /></label><div className="select-tile-grid compact">{["技术创造", "真实产品", "社会服务", "跨学科协作", "持续学习"].map((tag) => <button className={awakening.visionTags.includes(tag) ? "is-selected" : ""} key={tag} onClick={() => setAwakening({ visionTags: awakening.visionTags.includes(tag) ? awakening.visionTags.filter((item) => item !== tag) : [...awakening.visionTags, tag] })} type="button">{tag}</button>)}</div></>}
        {active === 4 && <><p>先选一个宽方向，AI 会继续比较其中的细分问题与现实取舍。</p><div className="direction-stack">{recommended.map((direction, index) => <button className={awakening.selectedDirectionId === direction.id ? "direction-option is-selected" : "direction-option"} key={direction.id} onClick={() => { setAwakening({ selectedDirectionId: direction.id }); setError(""); }} type="button"><span>候选 {String(index + 1).padStart(2, "0")}</span><strong>{direction.title}</strong><p>{direction.summary}</p><small>匹配兴趣：{direction.interests.filter((item) => profile.interests.includes(item)).join("、") || "可探索"}</small></button>)}</div></>}
        {active === 5 && <div className="calibration-review"><div><span>当前宽方向</span><strong>{selected?.title || "尚未选择"}</strong><p>{selected?.summary || "返回上一步，选一个值得继续细分的方向。"}</p></div><dl><div><dt>想验证的场景</dt><dd>{awakening.visionText || "暂未填写，可稍后补充"}</dd></div><div><dt>偏好标签</dt><dd>{awakening.visionTags.join(" · ") || "暂未选择"}</dd></div></dl><div className="inline-insight"><Network size={19} />保存后会直接进入 AI 规划。旧行动、完成记录、反思和成果不会被删除。</div></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="explore-actions">
          <button className="button button-quiet" disabled={active === 1} onClick={previous} type="button"><ArrowLeft size={16} />上一步</button>
          {active < 5 ? <button className="button button-secondary" onClick={next} type="button">下一步<ArrowRight size={16} /></button> : null}
          {selected && <button className="button button-primary" onClick={() => void saveCalibration()} type="button">{isRecalibration ? "保存调整并返回 AI 规划" : "保存方向并进入 AI 规划"}<ArrowRight size={16} /></button>}
        </div>
      </article>
    </section>
  </PageShell>;
}
