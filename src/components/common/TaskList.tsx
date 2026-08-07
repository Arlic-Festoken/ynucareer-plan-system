import { CheckCircle2, Circle, ExternalLink, FileText, Pin, Save } from "lucide-react";
import { useState } from "react";
import type { ActionTask } from "../../domain";

type TaskListProps = {
  tasks: ActionTask[];
  onToggle?: (task: ActionTask) => void;
  onTogglePin?: (task: ActionTask) => void;
  onSaveReflection?: (task: ActionTask, reflection: string) => void;
  emptyMessage?: string;
  readOnly?: boolean;
};

const categoryLabels: Record<ActionTask["category"], string> = {
  course: "课程", project: "项目", practice: "实践", reflection: "反思", research: "科研", career: "生涯",
};

export default function TaskList({ tasks, onToggle, onTogglePin, onSaveReflection, emptyMessage = "暂未生成任务。", readOnly = false }: TaskListProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  if (!tasks.length) return <p className="empty-state">{emptyMessage}</p>;
  const orderedTasks = onTogglePin ? [...tasks].sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned))) : tasks;

  return <div className="task-list">
    {orderedTasks.map((task) => <article className={`task-row ${task.completed ? "is-complete" : ""} ${task.pinned ? "is-pinned" : ""}`} key={task.id}>
      {readOnly ? <span aria-hidden="true" className="task-toggle"><Circle size={21} /></span> : <button aria-label={task.completed ? `标记未完成：${task.title}` : `完成：${task.title}`} className="task-toggle" onClick={() => onToggle?.(task)} type="button">
        {task.completed ? <CheckCircle2 aria-hidden="true" size={21} /> : <Circle aria-hidden="true" size={21} />}
      </button>}
      <div className="task-row-copy">
        <span className="task-row-meta">
          <span>{task.semester} · {categoryLabels[task.category]} · {task.priority === "high" ? "优先完成" : task.priority === "medium" ? "持续推进" : "保持关注"}{task.estimatedHours ? ` · 预计 ${task.estimatedHours} 小时` : ""}</span>
          {task.pinned && <span className="task-pin-pill">置顶</span>}
          {task.completed && <span className="task-status-pill">已完成</span>}
        </span>
        <strong>{task.title}</strong><small>{task.detail}</small>
        {task.opportunityTitle && <span className="task-opportunity">校内资源 · {task.opportunityTitle}{task.sourceUrl && <a href={task.sourceUrl} rel="noreferrer" target="_blank">查看来源 <ExternalLink size={12} /></a>}</span>}
        {task.completed && task.reflection && <p className="task-reflection"><FileText size={14} /> {task.reflection}</p>}
      </div>
      {(onTogglePin || (task.completed && onSaveReflection)) && <div className="task-row-actions">
        {onTogglePin && <button aria-label={task.pinned ? `取消置顶：${task.title}` : `置顶：${task.title}`} className={task.pinned ? "task-pin-action is-active" : "task-pin-action"} onClick={() => onTogglePin(task)} type="button"><Pin size={14} />{task.pinned ? "已置顶" : "置顶"}</button>}
        {task.completed && onSaveReflection && <button className="task-reflection-trigger" onClick={() => { setEditingTaskId(task.id); setDraft(task.reflection ?? ""); }} type="button">{task.reflection ? "编辑复盘" : "记录复盘"}</button>}
      </div>}
      {editingTaskId === task.id && <form className="task-reflection-form" onSubmit={(event) => { event.preventDefault(); onSaveReflection?.(task, draft.trim()); setEditingTaskId(null); }}>
        <label>这一步让你确认或改变了什么？<textarea autoFocus maxLength={280} onChange={(event) => setDraft(event.target.value)} placeholder="例如：完成对照后，我发现数据分析和问题表达都需要继续练习。" rows={3} value={draft} /></label>
        <div><button className="button button-quiet" onClick={() => setEditingTaskId(null)} type="button">取消</button><button className="button button-primary" type="submit"><Save size={15} />保存复盘</button></div>
      </form>}
    </article>)}
  </div>;
}
