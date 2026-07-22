import { Building2, GraduationCap, UserRoundCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppleButton from "../components/common/AppleButton";
import GlassCard from "../components/common/GlassCard";
import PageShell from "../components/common/PageShell";
import { useUserStore } from "../store/userStore";
import type { UserRole } from "../types";

const identities: {
  role: UserRole;
  title: string;
  desc: string;
  target: string;
  icon: typeof GraduationCap;
}[] = [
  {
    role: "freshman",
    title: "大一学生",
    desc: "进入生涯唤醒探索中心，体验六步中国化路径。",
    target: "/student/awakening",
    icon: GraduationCap,
  },
  {
    role: "junior",
    title: "大三学生",
    desc: "进入岗位匹配与成长路线图，生成差距诊断。",
    target: "/student/matching",
    icon: UserRoundCheck,
  },
  {
    role: "teacher",
    title: "学院教师",
    desc: "查看群体画像、共性短板和教学治理建议。",
    target: "/admin/dashboard",
    icon: Building2,
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setRole = useUserStore((state) => state.setRole);

  function chooseIdentity(role: UserRole, target: string) {
    setRole(role);
    navigate(target);
  }

  return (
    <PageShell
      eyebrow="模拟身份切换"
      title="请选择演示身份"
      description="展示版不做真实注册登录，直接通过身份选择体现分层切换机制。"
    >
      <section className="identity-grid">
        {identities.map((identity, index) => {
          const Icon = identity.icon;
          return (
            <GlassCard className="identity-card" delay={index * 0.08} key={identity.role}>
              <Icon size={34} />
              <h2>{identity.title}</h2>
              <p>{identity.desc}</p>
              <AppleButton onClick={() => chooseIdentity(identity.role, identity.target)}>
                进入演示
              </AppleButton>
            </GlassCard>
          );
        })}
      </section>
    </PageShell>
  );
}
