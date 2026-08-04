import { ArrowRight, CheckCircle2, Circle, Network, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import type { ActionTask } from "../domain";
import { useCareerStore } from "../store/careerStore";

type PathNode = {
  phase: string;
  type: string;
  title: string;
  detail: string;
  duration: string;
  task: string;
  completed?: boolean;
};

function buildPath(profile: ReturnType<typeof useCareerStore.getState>["profile"], tasks: ActionTask[]): PathNode[] {
  const completed = new Set(tasks.filter((task) => task.completed).map((task) => task.title));
  const target = profile.role === "junior" ? "目标路径" : "真实场景";
  return [
    { phase: profile.role === "junior" ? "大三上" : "大一 / 大二", type: "基础", title: "建立专业基础", detail: "围绕" + profile.major + "补齐一项可复用的基础能力。", duration: "预计 1–4 周", task: "完成一次基础练习并留下记录。" },
    { phase: profile.role === "junior" ? "大三上" : "大二", type: "项目", title: "做出一个小作品", detail: "把" + target + "拆成一个能独立完成的作品或分析。", duration: "预计 4–8 周", task: "提交作品说明和一次复盘。" },
    { phase: profile.role === "junior" ? "大三下" : "大二 / 大三", type: profile.targetPath === "postgraduate" || profile.targetPath === "recommendation" ? "科研与升学准备" : "方向验证", title: profile.targetPath === "postgraduate" || profile.targetPath === "recommendation" ? "形成科研与升学准备" : "验证一个目标方向", detail: "用明确问题、方法和结果判断是否值得继续投入。", duration: "预计 6–12 周", task: "写出一页问题卡和下一步判断。" },
    { phase: profile.role === "junior" ? "大四" : "大三 / 大四", type: "成果", title: "沉淀能力证据", detail: "把课程、项目和实践整理成别人能够看懂的成果材料。", duration: "预计 2–4 周", task: "完成一份成果说明或模拟表达。", completed: completed.has("形成一份作品或成果说明") },
  ];
}

export default function LearningPathPage() {
  const profile = useCareerStore((state) => state.profile);
  const tasks = useCareerStore((state) => state.roadmapTasks);
  const nodes = buildPath(profile, tasks);

  return <PageShell eyebrow="学习路径图" title="把先修关系，排成一条能走的路。" description="路径图提供顺序和参考时间；真正的完成以行动中心里的计划和成果为准。">
    <section className="learning-path-intro"><Network size={24} /><div><span className="section-kicker">从基础到成果</span><h2>先修关系、科研与升学准备，放在同一张图里。</h2><p>每个节点只保留一个阶段标签，预计用时统一放在卡片底部，方便按顺序阅读。</p></div><Link className="button button-secondary" to="/student/roadmap">查看我的行动计划 <ArrowRight size={16} /></Link></section>
    <section className="learning-path-grid" aria-label="学习路径节点">{nodes.map((node) => <article className={"learning-path-node" + (node.completed ? " is-complete" : "")} key={node.title}><div className="learning-path-node-top"><span>{node.phase} · {node.type}</span>{node.completed ? <CheckCircle2 size={17} /> : <Circle size={17} />}</div><h3>{node.title}</h3><p>{node.detail}</p><div className="learning-path-node-bottom"><strong>{node.duration}</strong><span>{node.task}</span></div></article>)}</section>
    <section className="path-guide"><div><span className="section-kicker"><Sparkles size={14} />执行提示</span><h2>照着做，先完成眼前这一格。</h2><p>不要等整条路径都确定才开始。每完成一个节点，就用成果和复盘更新下一步判断。</p></div><ol><li>从第一张未完成卡片开始，先安排一次具体时间。</li><li>留下一个能被自己回看的产出，不只记录“学过”。</li><li>如果现实变化，回到行动中心调整，不需要重做整张图。</li></ol></section>
  </PageShell>;
}
