import { BriefcaseBusiness, GraduationCap, Home, LineChart, PlayCircle, Route } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

type PageShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
};

const navItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/student/awakening", label: "低年级唤醒", icon: GraduationCap },
  { to: "/student/matching", label: "岗位匹配", icon: BriefcaseBusiness },
  { to: "/student/roadmap", label: "成长路线图", icon: Route },
  { to: "/admin/dashboard", label: "学院洞察", icon: LineChart },
  { to: "/demo", label: "演示", icon: PlayCircle },
];

export default function PageShell({ children, eyebrow, title, description }: PageShellProps) {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <Link className="brand" to="/">
          <span className="brand-mark">C</span>
          <span>分层递进生涯导航平台</span>
        </Link>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to}>
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      {(title || description) && (
        <section className="page-heading">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {title && <h1>{title}</h1>}
          {description && <p>{description}</p>}
        </section>
      )}
      <main>{children}</main>
    </div>
  );
}
