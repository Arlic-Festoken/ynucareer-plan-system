import { ArrowLeft, ArrowRight, Check, Compass, GraduationCap, Sparkles } from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import { blankAbilities, interestOptions, majors, valueOptions } from "../data/catalog";
import type { CareerProfile, Pathway, UserRole } from "../domain";
import { resolveHome, useCareerStore } from "../store/careerStore";

type StudentRole = Exclude<UserRole, "teacher">;
const roles: Array<{ role: StudentRole; title: string; caption: string; description: string }> = [
  { role: "freshman", title: "低年级学生", caption: "大一 / 大二", description: "先找到一个值得尝试的方向。" },
  { role: "junior", title: "高年级学生", caption: "大三 / 大四", description: "先看清目标与下一步差距。" },
  { role: "graduate", title: "研究生", caption: "硕士 / 博士", description: "让科研推进和职业准备并行。" },
];
const pathways: Array<{ value: Pathway; label: string }> = [{ value: "employment", label: "就业" }, { value: "recommendation", label: "推免" }, { value: "postgraduate", label: "考研" }, { value: "civil-service", label: "考公" }];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const stored = useCareerStore((state) => state.profile);
  const completeOnboarding = useCareerStore((state) => state.completeOnboarding);
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<StudentRole>(stored.role === "teacher" ? "freshman" : stored.role);
  const [grade, setGrade] = useState(stored.grade);
  const [major, setMajor] = useState(majors.includes(stored.major) ? stored.major : majors[0]);
  const [targetPath, setTargetPath] = useState<Pathway>(stored.targetPath);
  const [interests, setInterests] = useState<string[]>(stored.interests);
  const [values, setValues] = useState<string[]>(stored.values);
  const [error, setError] = useState("");
  const grades = useMemo(() => role === "graduate" ? [5, 6, 7] : role === "freshman" ? [1, 2] : [3, 4], [role]);

  function selectRole(next: StudentRole) { setRole(next); setGrade(next === "graduate" ? 5 : next === "freshman" ? 1 : 3); }
  function toggle(setter: Dispatch<SetStateAction<string[]>>, selected: string[], value: string) { setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]); }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!interests.length || !values.length) { setError("请至少选择一个兴趣方向和一项价值。"); return; }
    const profile: CareerProfile = { id: "local-demo-profile", role, grade, major, targetPath, interests, values, abilityScores: { ...blankAbilities, ...stored.abilityScores } };
    completeOnboarding(profile); navigate(resolveHome(profile.role, profile.grade));
  }

  return <PageShell>
    <section className="setup-layout"><aside className="setup-aside"><Link className="site-brand compact" to="/"><span className="brand-square">→</span>向前</Link><div><span className="section-kicker">开始之前</span><h1>用两分钟，<br />让建议从你出发。</h1><p>无需姓名、成绩或联系方式；资料仅存本机。</p></div><ol><li className={step === 1 ? "is-active" : ""}><span>01</span>确认阶段</li><li className={step === 2 ? "is-active" : ""}><span>02</span>给出起点</li></ol><Link className="aside-link" to="/teacher/dashboard">我是教师，查看模拟洞察 <ArrowRight size={15} /></Link></aside>
      <section className="setup-main"><div className="setup-progress"><span>第 {step} 步 / 2</span><i><b style={{ width: `${step * 50}%` }} /></i></div>
        {step === 1 ? <div className="setup-step"><span className="section-kicker">选择你的当下</span><h2>你现在最需要解决什么？</h2><p>选择阶段，只显示当前主任务。</p><div className="stage-choice-grid">{roles.map((item) => <label className={role === item.role ? "stage-choice is-selected" : "stage-choice"} key={item.role}><input checked={role === item.role} name="role" onChange={() => selectRole(item.role)} type="radio" /><span className="stage-choice-icon">{item.role === "freshman" ? <Compass size={22} /> : item.role === "junior" ? <GraduationCap size={22} /> : <Sparkles size={22} />}</span><span><strong>{item.title}</strong><small>{item.caption}</small><em>{item.description}</em></span><Check size={18} /></label>)}</div><div className="setup-actions"><Link className="button button-quiet" to="/">返回首页</Link><button className="button button-primary" onClick={() => setStep(2)} type="button">继续 <ArrowRight size={17} /></button></div></div> : <form className="setup-step" onSubmit={submit}><span className="section-kicker">给建议一点上下文</span><h2>你想从哪里开始？</h2><p>仅用于生成起点建议。</p><div className="form-grid"><label>当前年级<select onChange={(event) => setGrade(Number(event.target.value))} value={grade}>{grades.map((item) => <option key={item} value={item}>{role === "graduate" ? `研 ${item - 4}` : `大 ${item}`}</option>)}</select></label><label>专业或学习领域<select onChange={(event) => setMajor(event.target.value)} value={major}>{majors.map((item) => <option key={item}>{item}</option>)}</select></label>{role !== "freshman" && <label>本次优先路径<select onChange={(event) => setTargetPath(event.target.value as Pathway)} value={targetPath}>{pathways.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}</div><fieldset><legend>我愿意先接近的方向</legend><div className="option-chips">{interestOptions.map((item) => <label key={item}><input checked={interests.includes(item)} onChange={() => toggle(setInterests, interests, item)} type="checkbox" /><span>{item}</span></label>)}</div></fieldset><fieldset><legend>我更在意什么</legend><div className="option-chips">{valueOptions.map((item) => <label key={item}><input checked={values.includes(item)} onChange={() => toggle(setValues, values, item)} type="checkbox" /><span>{item}</span></label>)}</div></fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="setup-actions"><button className="button button-quiet" onClick={() => setStep(1)} type="button"><ArrowLeft size={17} />上一步</button><button className="button button-primary" type="submit">生成我的行动计划 <ArrowRight size={17} /></button></div></form>}
      </section></section>
  </PageShell>;
}
