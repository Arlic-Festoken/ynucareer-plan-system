import { Plus, Route } from "lucide-react";
import { useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import TaskList from "../components/common/TaskList";
import EmptyState from "../components/product/EmptyState";
import ProgressRail from "../components/product/ProgressRail";
import type { ActionTask } from "../domain";
import { useCareerStore } from "../store/careerStore";

export default function RoadmapPage() {
  const profile = useCareerStore((state) => state.profile);
  const awakening = useCareerStore((state) => state.awakening);
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const setAwakening = useCareerStore((state) => state.setAwakening);
  const updateRoadmapTask = useCareerStore((state) => state.updateRoadmapTask);
  const addRoadmapTask = useCareerStore((state) => state.addRoadmapTask);
  const [title, setTitle] = useState("");
  const explorer = profile.grade <= 2;
  const tasks = explorer ? awakening.actionTasks : roadmapTasks;
  const completed = tasks.filter((task) => task.completed).length;
  const groups = useMemo(() => Array.from(tasks.reduce((map, task) => { const list = map.get(task.semester) ?? []; list.push(task); map.set(task.semester, list); return map; }, new Map<string, ActionTask[]>()).entries()), [tasks]);
  function updateTask(task: ActionTask, patch: Partial<ActionTask>) {
    if (explorer) setAwakening({ actionTasks: awakening.actionTasks.map((item) => item.id === task.id ? { ...item, ...patch } : item) });
    else updateRoadmapTask(task.id, patch);
  }
  function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const task: ActionTask = { id: `custom-${Date.now()}`, title: title.trim(), detail: "由你添加的个人行动；完成后写下这一步带来的信息。", category: "practice", priority: "medium", semester: "本学期", completed: false };
    if (explorer) setAwakening({ actionTasks: [...awakening.actionTasks, task] });
    else addRoadmapTask(task);
    setTitle("");
  }
  const entry = explorer ? "/student/awakening" : "/student/matching";

  return <PageShell eyebrow={explorer ? "探索行动" : "行动计划"} title="让计划进入真实的时间里。" description="不要追求一次做完。每完成一件事，记录它带来的发现，再决定接下来是否继续。">
    <section className="roadmap-overview"><div><Route size={27} /><div><span className="section-kicker">本阶段</span><h2>{tasks.length ? "你的行动正在积累证据" : "先生成一份有起点的计划"}</h2><p>{tasks.length ? "计划按时间展开；完成后可留下简短复盘。" : explorer ? "先完成六步方向探索，再把候选方向转换为本周行动。" : "从目标诊断开始，系统会生成可编辑的初始任务。"}</p></div></div>{tasks.length > 0 && <ProgressRail current={completed} label="已完成" total={tasks.length} />}</section>
    {!tasks.length ? <EmptyState action={explorer ? "去完成方向探索" : "去生成行动计划"} detail={explorer ? "完成方向选择后，系统会把它转换为两项可以立即开始的探索行动。" : "先从一个目标岗位开始。系统会把结果转换为可以执行的第一批任务。"} title="这里还没有行动任务" to={entry} /> : <section className="roadmap-groups">{groups.map(([semester, groupTasks]) => <section className="roadmap-group" key={semester}><div className="roadmap-group-heading"><span>{semester}</span><p>{groupTasks.filter((task) => task.completed).length} / {groupTasks.length} 已完成</p></div><TaskList onSaveReflection={(task, reflection) => updateTask(task, { reflection })} onToggle={(task) => updateTask(task, { completed: !task.completed })} tasks={groupTasks} /></section>)}</section>}
    <form className="quick-add" onSubmit={addTask}><div><span className="section-kicker">补充自己的行动</span><label>这周想推进的一件事<input onChange={(event) => setTitle(event.target.value)} placeholder="例如：报名参加校内数据挑战赛" value={title} /></label></div><button className="button button-secondary" type="submit"><Plus size={17} />加入计划</button></form>
  </PageShell>;
}
