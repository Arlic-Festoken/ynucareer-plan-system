import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  Flag,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppleButton from "../components/common/AppleButton";
import GlassCard from "../components/common/GlassCard";
import MetricCard from "../components/common/MetricCard";
import PageShell from "../components/common/PageShell";
import MotivationRadar from "../components/charts/MotivationRadar";
import PolicyGraph from "../components/charts/PolicyGraph";
import { awakeningSteps, students } from "../data/mockData";

type AwakeningPageProps = {
  initialStep?: number;
};

const valueCards = [
  ["修身", "认识自身能力与兴趣，建立稳定的自我发展坐标。", Compass],
  ["立业", "形成专业能力与社会价值，积累真实成果。", BookOpenCheck],
  ["报国", "将个人发展嵌入国家战略与社会需求。", Flag],
  ["创造", "用行动、项目和作品持续验证方向。", Sparkles],
];

const actionPlan = [
  "课程行动：完成 Python 数据分析基础学习",
  "项目行动：尝试完成一个校园数据可视化小项目",
  "竞赛行动：报名数学建模校赛或数据分析类竞赛",
  "阅读行动：阅读 2 篇 AI+教育 / AI+医疗案例文章",
  "反思行动：每两周填写一次探索日志",
];

export default function AwakeningPage({ initialStep = 2 }: AwakeningPageProps) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [planVisible, setPlanVisible] = useState(false);
  const student = students.freshman;
  const step = useMemo(
    () => awakeningSteps.find((item) => item.step === activeStep) ?? awakeningSteps[0],
    [activeStep],
  );

  return (
    <PageShell
      eyebrow="低年级 · 探索期"
      title="生涯唤醒探索中心"
      description="六步路径把价值唤醒、专业理解、内驱力评估、愿景设计和行动计划串成一个可演示闭环。"
    >
      <section className="metric-grid">
        <MetricCard label="当前阶段" value="大一 · 探索期" detail={student.major} />
        <MetricCard label="生涯唤醒指数" value="46 / 100" detail="比入学初提升 12 分" tone="green" />
        <MetricCard label="已完成路径" value={`${Math.max(activeStep - 1, 1)} / 6`} detail="推荐继续探索专业战略图谱" tone="purple" />
      </section>

      <section className="two-column wide-left">
        <GlassCard className="stepper-card">
          <h2>六步生涯唤醒路径</h2>
          <div className="stepper-list">
            {awakeningSteps.map((item) => (
              <button
                className={item.step === activeStep ? "active" : ""}
                key={item.step}
                onClick={() => setActiveStep(item.step)}
              >
                <span>{String(item.step).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="content-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
            >
              <span className="eyebrow">Step {step.step} · {step.output}</span>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
              {renderStepContent(activeStep, planVisible, () => setPlanVisible(true))}
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </section>
    </PageShell>
  );
}

function renderStepContent(step: number, planVisible: boolean, showPlan: () => void) {
  if (step === 1) {
    return (
      <div className="value-grid">
        {valueCards.map(([title, text, Icon]) => (
          <div className="value-card" key={title as string}>
            <Icon size={24} />
            <strong>{title as string}</strong>
            <span>{text as string}</span>
          </div>
        ))}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="graph-layout">
        <PolicyGraph />
        <div className="insight-panel">
          <h3>你的专业正在参与哪些国家战略？</h3>
          <p>
            计算机科学与技术专业与“数字中国”“人工智能+”“智慧医疗”“新质生产力”等方向高度相关。
            系统建议优先探索 AI 应用开发、数据智能、医疗信息化三个方向。
          </p>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="assessment-layout">
        <div className="choice-stack">
          {["我更愿意解决复杂技术问题", "我希望自己的工作有社会价值", "我喜欢创造具体产品", "我愿意在竞争中证明自己"].map(
            (item) => (
              <span key={item}>
                <CheckCircle2 size={18} /> {item}
              </span>
            ),
          )}
        </div>
        <MotivationRadar />
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="vision-board">
        {["人工智能", "智慧医疗", "高成长行业", "技术创造", "社会价值", "研究型工作", "产品落地"].map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
        <blockquote>
          你倾向于成为一名将人工智能技术应用于真实社会问题的技术型创新人才，尤其关注医疗、教育和数据智能等领域。
        </blockquote>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="direction-grid">
        {["AI 应用开发工程师", "医疗人工智能研究助理", "数据分析与决策支持方向"].map((item, index) => (
          <div className="direction-card" key={item}>
            <span>方向 {index + 1}</span>
            <h3>{item}</h3>
            <p>核心能力、适合课程、入门项目和探索难度已生成，可进入行动验证。</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="action-plan">
      <AppleButton onClick={showPlan}>
        生成我的探索行动计划 <ArrowRight size={18} />
      </AppleButton>
      <div className="plan-list">
        {(planVisible ? actionPlan : actionPlan.slice(0, 2)).map((item, index) => (
          <motion.div
            className="plan-item"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            key={item}
          >
            <Target size={18} />
            <span>{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
