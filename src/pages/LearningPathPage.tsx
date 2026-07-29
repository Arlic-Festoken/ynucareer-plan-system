import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  GraduationCap,
  LoaderCircle,
  Route,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createAction } from "../api/pilot";
import PageShell from "../components/common/PageShell";
import LearningPathGraph from "../components/product/LearningPathGraph";
import type { CurriculumPlan, LearningPathNode } from "../domain";
import { buildSampleCurriculum, curriculumTemplate, parseCurriculum } from "../services/curriculum";
import { buildAlgorithmLearningPath, learningPathToTasks } from "../services/learningPath";
import { preserveTaskProgress } from "../services/recommendation";
import { useCareerStore } from "../store/careerStore";

const routePreferenceLabels = {
  dual: "由系统判断，保研 / 考研双线",
  recommendation: "倾向保研，保留考研备选",
  postgraduate: "考研主线",
};

const statusLabels = { completed: "已修", current: "在修", planned: "待修" };
const kindLabels = { course: "课程学习", research: "科研训练", project: "项目作品", graduate: "升学准备", career: "申请与就业" };

function gradeLabel(grade: number) {
  return grade <= 4 ? `大${["一", "二", "三", "四"][grade - 1]}` : `研${grade - 4}`;
}

export default function LearningPathPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const profile = useCareerStore((state) => state.profile);
  const learningPath = useCareerStore((state) => state.learningPath);
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const setInputs = useCareerStore((state) => state.setLearningPathInputs);
  const setCurriculum = useCareerStore((state) => state.setCurriculumPlan);
  const setPlan = useCareerStore((state) => state.setLearningPathPlan);
  const setRoadmapTasks = useCareerStore((state) => state.setRoadmapTasks);
  const [importMessage, setImportMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const plan = learningPath.plan;
  const curriculum = learningPath.curriculum;
  const selectedNode = useMemo(
    () => plan?.nodes.find((item) => item.id === selectedId) ?? plan?.nodes[0] ?? null,
    [plan, selectedId],
  );
  const curriculumSummary = useMemo(() => {
    const courses = curriculum?.courses ?? [];
    return {
      completed: courses.filter((course) => course.status === "completed").length,
      current: courses.filter((course) => course.status === "current").length,
      planned: courses.filter((course) => course.status === "planned").length,
      credits: courses.reduce((total, course) => total + (course.credits ?? 0), 0),
    };
  }, [curriculum]);

  function generate(curriculumOverride?: CurriculumPlan | null) {
    const nextPlan = buildAlgorithmLearningPath({
      inputs: learningPath.inputs,
      curriculum: curriculumOverride === undefined ? curriculum : curriculumOverride,
      grade: profile.grade,
      major: profile.major,
    });
    setPlan(nextPlan);
    setSelectedId(nextPlan.nodes[0]?.id ?? "");
    setSaveMessage("");
  }

  async function importFile(file: File) {
    setImportMessage("");
    try {
      if (!/\.(csv|json|txt|md)$/i.test(file.name)) throw new Error("当前支持 CSV、JSON、TXT、MD；Excel 请另存为 UTF-8 CSV 后导入。");
      const parsed = parseCurriculum(await file.text(), { fileName: file.name, major: profile.major, currentGrade: profile.grade });
      setCurriculum(parsed);
      generate(parsed);
      setImportMessage(`已导入 ${parsed.courses.length} 门课程，并按 ${gradeLabel(profile.grade)} 修读进度生成路径。`);
    } catch (reason) {
      setImportMessage(reason instanceof Error ? reason.message : "培养方案导入失败。");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function useSample() {
    const sample = buildSampleCurriculum(profile.major, profile.grade);
    setCurriculum(sample);
    generate(sample);
    setImportMessage(`已载入 ${sample.courses.length} 门计算机类示例课程。替换为本校培养方案后，路径会重新匹配。`);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([`\uFEFF${curriculumTemplate}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "培养方案导入模板.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveToActions() {
    if (!plan) return;
    setSaving(true);
    setSaveMessage("");
    const tasks = learningPathToTasks(plan);
    setRoadmapTasks(preserveTaskProgress(tasks, roadmapTasks));
    try {
      await Promise.all(tasks.map((task) => createAction({
        title: task.title,
        detail: task.detail,
        category: task.category,
        lane: task.category === "research" ? "research" : "growth",
        source: "rule",
        sourceId: task.id,
        trace: task.provenance,
      })));
      setSaveMessage(`已把当前和下一阶段的 ${tasks.length} 项任务加入行动中心。`);
    } catch {
      setSaveMessage(`已保存 ${tasks.length} 项本地计划；账号行动同步暂时失败，可稍后重试。`);
    } finally {
      setSaving(false);
    }
  }

  return <PageShell eyebrow="培养方案驱动规划" title="从专业课出发，走到研究生与算法岗位。" description="导入培养方案，结合年级、绩点、排名和科研经历，生成可解释、可存储、能进入行动中心的学习拓扑图。">
    <section className="path-setup-grid">
      <article className="curriculum-import-card">
        <div className="path-step-heading"><span>01</span><div><small>课程底图</small><h2>一键导入培养方案</h2></div><FileSpreadsheet size={24} /></div>
        <p>支持教务系统导出的 UTF-8 CSV、JSON 或文本课程表。系统只读取课程名称、学期、学分、性质、状态和成绩。</p>
        <input
          accept=".csv,.json,.txt,.md,text/csv,application/json,text/plain"
          className="visually-hidden"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }}
          ref={fileInput}
          type="file"
        />
        <button className="curriculum-drop-button" onClick={() => fileInput.current?.click()} type="button">
          <Upload size={22} /><span><strong>选择培养方案文件</strong><small>CSV · JSON · TXT · MD，最大 2 MB</small></span><ArrowRight size={17} />
        </button>
        <div className="curriculum-import-actions">
          <button className="button button-quiet" onClick={useSample} type="button"><Sparkles size={15} />载入示例并立即生成</button>
          <button className="button button-quiet" onClick={downloadTemplate} type="button"><Download size={15} />下载导入模板</button>
        </div>
        {importMessage && <p className="path-inline-message" role="status">{importMessage}</p>}
      </article>

      <article className="path-profile-card">
        <div className="path-step-heading"><span>02</span><div><small>个人约束</small><h2>补全升学判断信息</h2></div><Target size={24} /></div>
        <div className="path-form-grid">
          <label>目标岗位<select disabled value={learningPath.inputs.targetRole}><option>算法工程师</option></select><small>当前已提供算法工程师深度模板</small></label>
          <label>每周课外投入<input max="30" min="4" onChange={(event) => setInputs({ weeklyHours: Number(event.target.value) })} type="number" value={learningPath.inputs.weeklyHours} /><small>不含正常上课时间</small></label>
          <label>绩点<input min="0" onChange={(event) => setInputs({ gpa: Number(event.target.value) })} step=".01" type="number" value={learningPath.inputs.gpa} /></label>
          <label>绩点满分<select onChange={(event) => setInputs({ gpaScale: Number(event.target.value) as 4 | 5 | 100 })} value={learningPath.inputs.gpaScale}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
          <label>专业排名前 %
            <input min="1" onChange={(event) => setInputs({ rankPercentile: event.target.value ? Number(event.target.value) : null })} placeholder="不知道可留空" type="number" value={learningPath.inputs.rankPercentile ?? ""} />
          </label>
          <label>升学偏好<select onChange={(event) => setInputs({ routePreference: event.target.value as typeof learningPath.inputs.routePreference })} value={learningPath.inputs.routePreference}>{Object.entries(routePreferenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>科研经历<select onChange={(event) => setInputs({ researchExperience: event.target.value as typeof learningPath.inputs.researchExperience })} value={learningPath.inputs.researchExperience}><option value="none">还没有</option><option value="starter">读过论文 / 联系过导师</option><option value="project">做过科研项目</option><option value="paper">有论文或正式成果</option></select></label>
          <label>英语基础<select onChange={(event) => setInputs({ englishLevel: event.target.value as typeof learningPath.inputs.englishLevel })} value={learningPath.inputs.englishLevel}><option value="starting">未通过四级</option><option value="cet4">已通过四级</option><option value="cet6">已通过六级</option></select></label>
        </div>
        <button className="button button-primary path-generate-button" onClick={() => generate()} type="button"><Route size={17} />生成针对性学习路径</button>
      </article>
    </section>

    {curriculum && <section className="curriculum-summary">
      <header><div><span className="section-kicker">课程解析结果</span><h2>{curriculum.title}</h2><p>{curriculum.sourceName} · 导入 {curriculum.courses.length} 门课</p></div><button className="button button-quiet" onClick={() => fileInput.current?.click()} type="button"><Upload size={15} />替换方案</button></header>
      <div className="curriculum-metrics">
        <div><span>已修</span><strong>{curriculumSummary.completed}</strong></div>
        <div><span>在修</span><strong>{curriculumSummary.current}</strong></div>
        <div><span>待修</span><strong>{curriculumSummary.planned}</strong></div>
        <div><span>培养方案学分</span><strong>{curriculumSummary.credits}</strong></div>
      </div>
      <details><summary>查看解析后的课程表 <ClipboardList size={15} /></summary><div className="curriculum-table-wrap"><table><thead><tr><th>课程</th><th>学期</th><th>学分</th><th>性质</th><th>状态</th><th>成绩</th></tr></thead><tbody>{curriculum.courses.map((course) => <tr key={course.id}><td>{course.name}</td><td>{course.semester}</td><td>{course.credits ?? "—"}</td><td>{course.category}</td><td><span className={`course-status is-${course.status}`}>{statusLabels[course.status]}</span></td><td>{course.score ?? "—"}</td></tr>)}</tbody></table></div></details>
    </section>}

    {plan ? <>
      <section className="route-diagnosis">
        <div><span className="section-kicker"><GraduationCap size={15} /> 升学路线诊断</span><h2>{plan.routeLabel}</h2><p>{plan.routeReason}</p><small>判断可信度：{plan.routeConfidence === "high" ? "高" : plan.routeConfidence === "medium" ? "中等" : "初步"} · 需以本校当年推免与招生政策为准</small></div>
        <aside><span>目标</span><strong>{plan.objective}</strong><ul>{plan.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></aside>
      </section>

      <section className="learning-topology">
        <header><div><span className="section-kicker"><GitBranch size={15} /> 可交互拓扑图</span><h2>先修关系、科研与升学准备放在同一张图里。</h2><p>点击节点查看具体行动和完成标准；路径以 JSON 结构随账号保存。</p></div><div className="topology-legend"><span className="is-now">现在</span><span className="is-next">下一阶段</span><span className="is-later">后续</span></div></header>
        <LearningPathGraph edges={plan.edges} nodes={plan.nodes} onSelect={(item) => setSelectedId(item.id)} selectedId={selectedNode?.id ?? ""} />
        {selectedNode && <NodeDetail node={selectedNode} resources={plan.resources} />}
      </section>

      <section className="path-resource-section">
        <header><div><span className="section-kicker"><BookOpen size={15} /> 推荐资源</span><h2>课程、书和文档都挂到对应节点。</h2><p>优先使用官方课程与作者开放版本；校内课程能覆盖时，不重复堆网课。</p></div></header>
        <div className="path-resource-grid">{plan.resources.map((resource) => <a href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.type}</span><ExternalLink size={15} /><h3>{resource.title}</h3><strong>{resource.provider}</strong><p>{resource.note}</p></a>)}</div>
      </section>

      <section className="path-save-panel">
        <div><span className="section-kicker">从图到行动</span><h2>把当前和下一阶段加入行动中心。</h2><p>每项任务都包含具体动作、完成标准和资源来源，后续可以提交成果与复盘。</p>{saveMessage && <small role="status"><Check size={14} />{saveMessage}</small>}</div>
        <div><button className="button button-primary" disabled={saving} onClick={() => void saveToActions()} type="button">{saving ? <><LoaderCircle className="is-spinning" size={16} />正在保存</> : <><FlaskConical size={16} />加入行动中心</>}</button>{saveMessage && <Link className="button button-secondary" to="/student/roadmap">查看行动计划 <ArrowRight size={16} /></Link>}</div>
      </section>
    </> : <section className="path-empty-state"><GitBranch size={30} /><span className="section-kicker">等待生成</span><h2>先导入培养方案，或直接用当前信息生成。</h2><p>没有课程表也能得到通用算法路径；导入后会自动匹配高数、线代、数据结构、机器学习等课程。</p></section>}
  </PageShell>;
}

function NodeDetail({ node, resources }: { node: LearningPathNode; resources: NonNullable<ReturnType<typeof buildAlgorithmLearningPath>>["resources"] }) {
  const linked = resources.filter((resource) => node.resourceIds.includes(resource.id));
  return <article className="path-node-detail">
    <div className="node-detail-meta"><span>{kindLabels[node.kind]}</span><span>{node.phase}</span><span>{node.durationWeeks} 周</span></div>
    <div className="node-detail-grid">
      <div><h3>{node.title}</h3><p>{node.why}</p>{node.courseMatches.length > 0 && <div className="matched-courses"><small>培养方案匹配</small>{node.courseMatches.map((course) => <span key={course}>{course}</span>)}</div>}</div>
      <div><small>照着做</small><ol>{node.actions.map((action) => <li key={action}>{action}</li>)}</ol></div>
      <aside><small>完成标准</small><strong>{node.evidence}</strong>{linked.map((resource) => <a href={resource.url} key={resource.id} rel="noreferrer" target="_blank">{resource.title}<ExternalLink size={13} /></a>)}</aside>
    </div>
  </article>;
}
