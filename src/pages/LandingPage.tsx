import {
  ArrowRight,
  BrainCircuit,
  GraduationCap,
  LineChart,
  Route,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import AppleButton from "../components/common/AppleButton";
import GlassCard from "../components/common/GlassCard";
import PageShell from "../components/common/PageShell";

const modules = [
  {
    title: "中国化六步生涯唤醒",
    text: "从修身、立业、报国、创造出发，帮助低年级学生把专业学习放入国家战略坐标。",
    icon: GraduationCap,
  },
  {
    title: "岗位能力精准匹配",
    text: "用岗位画像、能力画像和差距解释，把目标岗位从模糊想象转为可执行判断。",
    icon: BrainCircuit,
  },
  {
    title: "时序化成长路线图",
    text: "按学期拆解课程、项目、竞赛、实践和求职行动，形成持续成长闭环。",
    icon: Route,
  },
  {
    title: "学院群体就业准备度分析",
    text: "从学生工具上升为学院育人反馈系统，为课程与实践供给提供数据依据。",
    icon: LineChart,
  },
];

export default function LandingPage() {
  return (
    <PageShell>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} /> 分层递进生涯导航平台 Demo
          </span>
          <h1>让大学生从“迷茫探索”走向“精准成长”</h1>
          <p>
            基于中国化生涯路径与数据驱动能力画像的智慧生涯发展平台，面向低年级唤醒、
            高年级匹配、成长路线图和学院群体反馈形成完整产品闭环。
          </p>
          <div className="hero-actions">
            <Link to="/login">
              <AppleButton>
                开始演示 <ArrowRight size={18} />
              </AppleButton>
            </Link>
            <Link to="/demo">
              <AppleButton variant="secondary">录屏流程</AppleButton>
            </Link>
          </div>
        </div>
        <div className="system-flow">
          {["生涯唤醒", "能力画像", "岗位匹配", "成长路线图", "学院反馈"].map((item, index) => (
            <div className="flow-item" key={item}>
              <span>0{index + 1}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="bento-grid">
        {modules.map((item, index) => {
          const Icon = item.icon;
          return (
            <GlassCard className="bento-card" delay={index * 0.06} key={item.title}>
              <Icon size={26} />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </GlassCard>
          );
        })}
      </section>
    </PageShell>
  );
}
