import { ArrowRight, Film, MousePointerClick } from "lucide-react";
import { Link } from "react-router-dom";
import AppleButton from "../components/common/AppleButton";
import GlassCard from "../components/common/GlassCard";
import PageShell from "../components/common/PageShell";

const flow = [
  ["进入首页", "展示项目标题、四大模块、整体闭环。", "/"],
  ["选择大一学生", "进入生涯唤醒探索中心，展示专业政策图谱。", "/login"],
  ["完成内驱力与愿景", "切换到雷达图和愿景板，生成低年级行动计划。", "/student/awakening"],
  ["切换大三学生", "进入岗位匹配页面，选择数据分析师。", "/student/matching"],
  ["生成成长路线图", "展示大三上、大三下、大四上的分阶段行动方案。", "/student/roadmap"],
  ["进入教师端", "展示学院群体画像、短板热力图和教学建议。", "/admin/dashboard"],
];

export default function DemoFlowPage() {
  return (
    <PageShell
      eyebrow="录屏专用"
      title="2-3 分钟演示流程"
      description="按照这条路径点击，可以稳定展示低年级唤醒、高年级匹配、成长路线图和学院反馈。"
    >
      <section className="demo-layout">
        <GlassCard className="demo-cover">
          <Film size={34} />
          <h2>演示闭环</h2>
          <p>生涯唤醒 → 能力画像 → 岗位匹配 → 成长路线图 → 学院反馈</p>
          <Link to="/login">
            <AppleButton>
              从身份选择开始 <ArrowRight size={18} />
            </AppleButton>
          </Link>
        </GlassCard>
        <div className="demo-steps">
          {flow.map(([title, desc, target], index) => (
            <GlassCard className="demo-step" delay={index * 0.05} key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
              <Link to={target}>
                <MousePointerClick size={16} />
                打开页面
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
