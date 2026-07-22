import { motion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import AppleButton from "../components/common/AppleButton";
import GlassCard from "../components/common/GlassCard";
import MetricCard from "../components/common/MetricCard";
import PageShell from "../components/common/PageShell";
import { roadmap } from "../data/mockData";

const prediction = [
  ["当前匹配度", "82%"],
  ["第一阶段后", "87%"],
  ["第二阶段后", "91%"],
  ["第三阶段后", "94%"],
];

export default function RoadmapPage() {
  return (
    <PageShell
      eyebrow="时序化成长导航"
      title="个性化成长路线图"
      description="系统把岗位差距转成按学期推进的课程、项目、竞赛、实践和求职行动。"
    >
      <section className="metric-grid">
        <MetricCard label="目标岗位" value={roadmap.targetJob} detail="数据智能方向" />
        <MetricCard label="当前匹配度" value="82%" detail="能力补齐型阶段" tone="orange" />
        <MetricCard label="预计完成后" value="94%" detail="进入高准备度区间" tone="green" />
      </section>

      <section className="two-column wide-left">
        <GlassCard className="timeline-card">
          <div className="panel-title">
            <span className="eyebrow">按学期生成</span>
            <h2>成长行动时间轴</h2>
          </div>
          <div className="timeline">
            {roadmap.semesters.map((semester, index) => (
              <motion.div
                className="timeline-item"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12 }}
                key={semester.name}
              >
                <div className="timeline-dot">{index + 1}</div>
                <div>
                  <h3>{semester.name}</h3>
                  <p>{semester.goal}</p>
                  <div className="task-list">
                    {semester.tasks.map((task) => (
                      <div className="task-card" key={task.title}>
                        <span>{task.type}</span>
                        <strong>{task.title}</strong>
                        <small>{task.priority}优先级 · {task.expectedOutcome}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="prediction-card">
          <TrendingUp size={26} />
          <h2>能力提升预测</h2>
          <div className="prediction-list">
            {prediction.map(([label, value], index) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <i style={{ width: `${72 + index * 7}%` }} />
              </div>
            ))}
          </div>
          <Link to="/admin/dashboard">
            <AppleButton>
              查看学院反馈 <ArrowRight size={18} />
            </AppleButton>
          </Link>
        </GlassCard>
      </section>
    </PageShell>
  );
}
