import { BookOpenCheck, Lightbulb, UsersRound } from "lucide-react";
import GlassCard from "../components/common/GlassCard";
import MetricCard from "../components/common/MetricCard";
import PageShell from "../components/common/PageShell";
import { HeatmapPanel, InterestBarChart, MatchPieChart } from "../components/charts/AdminCharts";
import { adminOverview } from "../data/mockData";

export default function AdminDashboardPage() {
  return (
    <PageShell
      eyebrow="教师端 · 学院治理反馈"
      title="学院群体分析仪表板"
      description="把学生端的唤醒、匹配和路线图数据汇总为学院课程供给与实践训练建议。"
    >
      <section className="metric-grid four">
        <MetricCard label="试点学生数" value={`${adminOverview.pilotStudents}`} detail="覆盖 4 个专业方向" />
        <MetricCard label="低年级平均唤醒指数" value={`${adminOverview.awakeningAverage}`} detail="探索期持续提升" tone="green" />
        <MetricCard label="高年级平均匹配度" value={`${adminOverview.matchAverage}`} detail="岗位准备度中高" tone="purple" />
        <MetricCard label="共性短板能力" value="3 项" detail={adminOverview.commonWeaknesses.join(" / ")} tone="orange" />
      </section>

      <section className="dashboard-grid">
        <GlassCard className="chart-card">
          <h2>低年级兴趣方向分布</h2>
          <InterestBarChart data={adminOverview.interestDistribution} />
        </GlassCard>
        <GlassCard className="chart-card">
          <h2>高年级岗位适配度分布</h2>
          <MatchPieChart data={adminOverview.matchDistribution} />
        </GlassCard>
        <GlassCard className="chart-card wide">
          <h2>共性能力短板热力图</h2>
          <HeatmapPanel data={adminOverview.heatmap} />
        </GlassCard>
        <GlassCard className="insight-card">
          <Lightbulb size={26} />
          <h2>学院建议</h2>
          <div className="suggestion-list">
            {adminOverview.suggestions.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="insight-card">
          <BookOpenCheck size={26} />
          <h2>重点推荐课程</h2>
          <div className="tag-row">
            {adminOverview.recommendedCourses.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="teacher-note">
            <UsersRound size={18} />
            面向大一至大四建立“认知唤醒、行业案例、项目实践、求职训练”的分层供给。
          </div>
        </GlassCard>
      </section>
    </PageShell>
  );
}
