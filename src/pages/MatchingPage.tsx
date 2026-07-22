import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, BrainCircuit, Search } from "lucide-react";
import { useState } from "react";
import AppleButton from "../components/common/AppleButton";
import GlassCard from "../components/common/GlassCard";
import MetricCard from "../components/common/MetricCard";
import PageShell from "../components/common/PageShell";
import AbilityRadar from "../components/charts/AbilityRadar";
import { abilityLabels, jobs, matchResults, students } from "../data/mockData";
import type { AbilityScores, JobProfile, MatchResult } from "../types";

export default function MatchingPage() {
  const [selectedJobId, setSelectedJobId] = useState("data-analyst");
  const [analysisVisible, setAnalysisVisible] = useState(true);
  const student = students.junior;
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0];
  const match =
    matchResults.find((item) => item.jobId === selectedJob.id) ??
    createFallbackMatch(student.id, selectedJob, student.abilityScores);
  const gapText = match.gaps
    .slice(0, 3)
    .map((gap) => gap.ability.replace(" 数据处理能力", ""))
    .join("、");

  function runAnalysis(jobId: string) {
    setSelectedJobId(jobId);
    setAnalysisVisible(false);
    window.setTimeout(() => setAnalysisVisible(true), 420);
  }

  return (
    <PageShell
      eyebrow="高年级 · 决策期"
      title="岗位精准匹配"
      description="展示版用预设岗位画像和能力画像生成差距解释，体现系统方法论和产品闭环。"
    >
      <section className="metric-grid">
        <MetricCard label="目标岗位" value={selectedJob.title} detail={selectedJob.industry} />
        <MetricCard label="岗位匹配度" value={`${match.matchScore}%`} detail="能力差距加权计算" tone="green" />
        <MetricCard label="就业准备度" value={match.readinessLevel} detail={`关键短板：${gapText}`} tone="orange" />
      </section>

      <section className="two-column">
        <GlassCard className="job-selector">
          <div className="search-box">
            <Search size={18} />
            <span>搜索或选择推荐岗位</span>
          </div>
          <div className="job-list">
            {jobs.map((job) => (
              <button
                className={job.id === selectedJobId ? "active" : ""}
                key={job.id}
                onClick={() => runAnalysis(job.id)}
              >
                <strong>{job.title}</strong>
                <span>{job.description}</span>
              </button>
            ))}
          </div>
          <div className="formula-card">
            <BrainCircuit size={20} />
            <p>MatchScore = 100 - Σ wi × max(0, Required_i - Current_i)</p>
          </div>
        </GlassCard>

        <GlassCard className="match-panel">
          <AnimatePresence mode="wait">
            {analysisVisible ? (
              <motion.div
                key={selectedJobId}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div className="panel-title">
                  <span className="eyebrow">能力画像 vs 岗位画像</span>
                  <h2>{selectedJob.title} 匹配诊断</h2>
                </div>
                <AbilityRadar current={student.abilityScores} required={selectedJob.requiredAbilities} />
                <div className="percentile-box">
                  <BadgeCheck size={20} />
                  <span>当前位于同目标学生前 {match.percentile}%；完成推荐路径预计提升至前 {match.projectedPercentile}%</span>
                </div>
              </motion.div>
            ) : (
              <motion.div className="loading-panel" key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                正在分析能力画像并匹配目标岗位要求...
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </section>

      <section className="gap-grid">
        {match.gaps.map((gap, index) => (
          <GlassCard className="gap-card" delay={index * 0.07} key={gap.ability}>
            <span className={`impact impact-${gap.impact}`}>影响程度：{gap.impact}</span>
            <h3>{gap.ability}</h3>
            <div className="gap-score">
              <span>当前 {gap.current}</span>
              <i />
              <span>要求 {gap.required}</span>
              <strong>差距 {gap.gap}</strong>
            </div>
            <p>{gap.explanation}</p>
          </GlassCard>
        ))}
      </section>

      <GlassCard className="summary-card">
        <h2>匹配结论</h2>
        <p>{match.summary}</p>
        <a href="/student/roadmap">
          <AppleButton>
            生成成长路线图 <ArrowRight size={18} />
          </AppleButton>
        </a>
      </GlassCard>
    </PageShell>
  );
}

function createFallbackMatch(studentId: string, job: JobProfile, current: AbilityScores): MatchResult {
  const keys = Object.keys(abilityLabels) as Array<keyof AbilityScores>;
  const totalGap = keys.reduce((sum, key) => {
    const weight = job.weight[key] ?? 1;
    return sum + Math.max(0, job.requiredAbilities[key] - current[key]) * weight;
  }, 0);
  const matchScore = Math.max(60, Math.round(100 - totalGap / 2.8));
  const gaps = keys
    .map((key) => ({
      key,
      gap: Math.max(0, job.requiredAbilities[key] - current[key]),
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map(({ key, gap }) => ({
      ability: abilityLabels[key],
      current: current[key],
      required: job.requiredAbilities[key],
      gap,
      impact: gap >= 16 ? "高" : gap >= 9 ? "中" : "低",
      explanation: `${job.title} 对${abilityLabels[key]}要求较高，当前能力已具备基础，但仍需要通过课程、项目或实践进一步形成可展示证据。`,
    })) as MatchResult["gaps"];

  return {
    studentId,
    jobId: job.id,
    matchScore,
    readinessLevel: matchScore >= 88 ? "高" : matchScore >= 78 ? "中高" : matchScore >= 68 ? "中" : "低",
    percentile: Math.max(24, 65 - Math.round(matchScore / 3)),
    projectedPercentile: Math.max(18, 54 - Math.round(matchScore / 3)),
    gaps,
    summary: `综合判断：你与${job.title}岗位具有可继续发展的适配潜力，建议优先补齐${gaps
      .slice(0, 2)
      .map((gap) => gap.ability)
      .join("、")}，并尽快把学习结果沉淀为项目作品和面试表达材料。`,
  };
}
