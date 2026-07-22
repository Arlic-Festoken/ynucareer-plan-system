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
  const roadmapTasks = useCareerStore((state) => state.roadmapTasks);
  const updateRoadmapTask = useCareerStore((state) => state.updateRoadmapTask);
  const addRoadmapTask = useCareerStore((state) => state.addRoadmapTask);
  const [title, setTitle] = useState("");
  const completed = roadmapTasks.filter((task) => task.completed).length;
  const groups = useMemo(() => Array.from(roadmapTasks.reduce((map, task) => { const list = map.get(task.semester) ?? []; list.push(task); map.set(task.semester, list); return map; }, new Map<string, ActionTask[]>()).entries()), [roadmapTasks]);
  function addTask(event: React.FormEvent) { event.preventDefault(); if (!title.trim()) return; addRoadmapTask({ id: `custom-${Date.now()}`, title: title.trim(), detail: "由你添加的个人行动；完成后写下这一步带来的信息。", category: "practice", priority: "medium", semester: "本学期", completed: false }); setTitle(""); }
  const entry = profile.grade <= 2 ? "/student/awakening" : "/student/matching";

  return <PageShell eyebrow="行动计划" title="让计划进入真实的时间里。" description="不要追求一次做完。每完成一件事，记录它带来的发现，再决定接下来是否继续。">
    <section className="roadmap-overview"><div><Route size={27} /><div><span className="section-kicker">本阶段</span><h2>{roadmapTasks.length ? "你的行动正在积累证据" : "先生成一份有起点的计划"}</h2><p>{roadmapTasks.length ? "计划按时间展开；完成后可留下简短复盘。" : "从方向探索或目标诊断开始，系统会生成可编辑的初始任务。"}</p></div></div>{roadmapTasks.length > 0 && <ProgressRail current={completed} label="已完成" total={roadmapTasks.length} />}</section>
    {!roadmapTasks.length ? <EmptyState action="去生成行动计划" detail="先从一个方向或一个目标岗位开始。系统会把结果转换为可以执行的第一批任务。" title="这里还没有行动任务" to={entry} /> : <section className="roadmap-groups">{groups.map(([semester, tasks]) => <section className="roadmap-group" key={semester}><div className="roadmap-group-heading"><span>{semester}</span><p>{tasks.filter((task) => task.completed).length} / {tasks.length} 已完成</p></div><TaskList onSaveReflection={(task, reflection) => updateRoadmapTask(task.id, { reflection })} onToggle={(task) => updateRoadmapTask(task.id, { completed: !task.completed })} tasks={tasks} /></section>)}</section>}
    <form className="quick-add" onSubmit={addTask}><div><span className="section-kicker">补充自己的行动</span><label>这周想推进的一件事<input onChange={(event) => setTitle(event.target.value)} placeholder="例如：报名参加校内数据挑战赛" value={title} /></label></div><button className="button button-secondary" type="submit"><Plus size={17} />加入计划</button></form>
  </PageShell>;
}
