import { ArrowLeft, ArrowRight, Check, Lightbulb, Network, Sparkles } from "lucide-react";
import { useMemo } from "react";
import PageShell from "../components/common/PageShell";
import TaskList from "../components/common/TaskList";
import ProgressRail from "../components/product/ProgressRail";
import { directions, policyConnections, valueOptions } from "../data/catalog";
import { buildExplorationTasks, preserveTaskProgress, recommendDirections } from "../services/recommendation";
import { useCareerStore } from "../store/careerStore";

const steps = ["价值取向", "专业场景", "内在动机", "未来愿景", "方向设计", "行动创造"];
const prompts = [
  "什么会让你觉得一段大学经历是值得的？",
  "你的专业，正在和哪些真实场景发生关系？",
  "哪些事会让你愿意持续投入？",
  "你想解决的问题，比你现在的职位名称更重要。",
  "选一个值得用行动验证的方向。",
  "把想法变成一件本周能完成的事。",
];
const motivations = [["curiosity", "持续探索未知问题"], ["contribution", "解决真实问题、带来价值"], ["achievement", "把复杂目标做成"], ["collaboration", "与他人协作成长"]] as const;

export default function AwakeningPage() {
  const profile = useCareerStore((state) => state.profile);
  const awakening = useCareerStore((state) => state.awakening);
  const updateProfile = useCareerStore((state) => state.updateProfile);
  const setAwakening = useCareerStore((state) => state.setAwakening);
  const recommended = useMemo(() => recommendDirections(profile), [profile]);
  const selected = directions.find((item) => item.id === awakening.selectedDirectionId);
  const connection = policyConnections.find((item) => item.major === profile.major) ?? policyConnections[0];
  const active = awakening.activeStep;
  const next = () => setAwakening({ activeStep: Math.min(6, active + 1) });
  const previous = () => setAwakening({ activeStep: Math.max(1, active - 1) });
  const generate = () => selected && setAwakening({ actionTasks: preserveTaskProgress(buildExplorationTasks(selected), awakening.actionTasks) });
  const toggleValue = (value: string) => updateProfile({ values: profile.values.includes(value) ? profile.values.filter((item) => item !== value) : [...profile.values, value] });

  return <PageShell eyebrow="低年级探索" title="先回答一个真实的问题，再决定是否走远。" description="六步并不是测评。它们只帮你把兴趣、场景和体验变成可以回看的方向证据。">
    <section className="explore-top"><ProgressRail current={active} detail={prompts[active - 1]} label="探索进度" total={6} /><p><span>当前专业</span><strong>{profile.major}</strong></p></section>
    <section className="explore-layout"><aside className="explore-steps" aria-label="探索步骤">{steps.map((label, index) => <button className={active === index + 1 ? "is-active" : active > index + 1 ? "is-done" : ""} key={label} onClick={() => setAwakening({ activeStep: index + 1 })} type="button"><span>{active > index + 1 ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span>{label}</button>)}</aside>
      <article className="explore-work"><span className="section-kicker">第 {active} 步 / 6</span><h2>{prompts[active - 1]}</h2>
        {active === 1 && <><p>选择两到三个你愿意长期坚持的价值。它们会参与方向排序，但不会替你做决定。</p><div className="select-tile-grid">{valueOptions.map((value) => <button className={profile.values.includes(value) ? "is-selected" : ""} key={value} onClick={() => toggleValue(value)} type="button">{profile.values.includes(value) && <Check size={16} />}{value}</button>)}</div></>}
        {active === 2 && <><p>这是本地示例图谱。把它看作继续检索、访谈和观察的起点，而不是外部世界的完整结论。</p><div className="context-chain"><div><span>政策线索</span><strong>{connection.policy}</strong></div><ArrowRight size={18} /><div><span>产业场景</span><strong>{connection.industry}</strong></div><ArrowRight size={18} /><div><span>专业连接</span><strong>{profile.major}</strong></div></div><div className="inline-insight"><Network size={19} />{connection.opportunity}</div></>}
        {active === 3 && <><p>以下分数是你此刻的自我观察，不会生成“人格结论”。</p><div className="motivation-list">{motivations.map(([key, label]) => <label key={key}><span>{label}</span><input aria-label={label} max="5" min="1" onChange={(event) => setAwakening({ motivation: { ...awakening.motivation, [key]: Number(event.target.value) } })} type="range" value={awakening.motivation[key]} /><output>{awakening.motivation[key]} / 5</output></label>)}</div><div className="inline-insight"><Lightbulb size={19} />高分不是更好，它只是提示哪些体验值得优先去试。</div></>}
        {active === 4 && <><p>先描述场景、问题和合作方式，不必急于写出一个职位名。</p><label className="large-field">我期待的一个工作场景<textarea aria-label="我的生涯愿景" onChange={(event) => setAwakening({ visionText: event.target.value })} placeholder="例如：我想用技术改善一个让我身边的人反复遇到的问题……" rows={6} value={awakening.visionText} /></label><div className="select-tile-grid compact">{["技术创造", "真实产品", "社会服务", "跨学科协作", "持续学习"].map((tag) => <button className={awakening.visionTags.includes(tag) ? "is-selected" : ""} key={tag} onClick={() => setAwakening({ visionTags: awakening.visionTags.includes(tag) ? awakening.visionTags.filter((item) => item !== tag) : [...awakening.visionTags, tag] })} type="button">{tag}</button>)}</div></>}
        {active === 5 && <><p>推荐来自你选择的兴趣与价值。请挑一个你愿意用真实行动验证的方向。</p><div className="direction-stack">{recommended.map((direction, index) => <button className={awakening.selectedDirectionId === direction.id ? "direction-option is-selected" : "direction-option"} key={direction.id} onClick={() => setAwakening({ selectedDirectionId: direction.id })} type="button"><span>候选 {String(index + 1).padStart(2, "0")}</span><strong>{direction.title}</strong><p>{direction.summary}</p><small>匹配兴趣：{direction.interests.filter((item) => profile.interests.includes(item)).join("、") || "可探索"}</small></button>)}</div></>}
        {active === 6 && <><p>{selected ? `已选择「${selected.title}」。现在生成两项能在本学期开始的探索行动。` : "请先回到第五步选择一个方向。"}</p><button className="button button-primary" disabled={!selected} onClick={generate} type="button"><Sparkles size={17} />生成探索行动计划</button><TaskList emptyMessage="选择方向后，系统会生成两项具体行动。" onSaveReflection={(task, reflection) => setAwakening({ actionTasks: awakening.actionTasks.map((item) => item.id === task.id ? { ...item, reflection } : item) })} onToggle={(task) => setAwakening({ actionTasks: awakening.actionTasks.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item) })} tasks={awakening.actionTasks} /></>}
        <div className="explore-actions"><button className="button button-quiet" disabled={active === 1} onClick={previous} type="button"><ArrowLeft size={16} />上一步</button><button className="button button-secondary" disabled={active === 6} onClick={next} type="button">下一步<ArrowRight size={16} /></button></div>
      </article></section>
  </PageShell>;
}
