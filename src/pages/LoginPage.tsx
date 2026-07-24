import { ArrowRight, CheckCircle2, Database, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { resolveHome, useCareerStore } from "../store/careerStore";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registerMode = location.pathname === "/register";
  const status = useAuthStore((state) => state.status);
  const authError = useAuthStore((state) => state.error);
  const initialize = useAuthStore((state) => state.initialize);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void initialize(); }, [initialize]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (registerMode) {
        await register({ displayName, email, password });
        navigate("/onboarding", { replace: true });
        return;
      }
      await login({ email, password });
      const requested = searchParams.get("next");
      if (requested?.startsWith("/") && !requested.startsWith("//")) {
        navigate(requested, { replace: true });
        return;
      }
      const career = useCareerStore.getState();
      navigate(career.hasOnboarded ? resolveHome(career.profile.role, career.profile.grade) : "/onboarding", { replace: true });
    } catch {
      // The store exposes a user-safe error next to the form.
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <Link className="site-brand auth-brand" to="/" aria-label="向前生涯导航首页"><span className="brand-square">→</span><span>向前<span className="brand-sub">CAREER</span></span></Link>
    <section className="auth-layout">
      <div className="auth-story"><span className="section-kicker">账号与数据</span><h1>{registerMode ? "保存你的每一步，换设备也能继续。" : "欢迎回来，继续上次的行动。"}</h1><p>账号用于同步个人资料、方向选择、行动任务和复盘，不采集学号、成绩或联系方式。</p><div className="auth-proof-list"><span><LockKeyhole size={17} />密码使用独立盐值哈希保存</span><span><Database size={17} />生涯数据隔离到当前账号</span><span><Sparkles size={17} />DeepSeek 仅接收规划所需字段</span></div></div>
      <form className="auth-form" onSubmit={submit}>
        <div><span className="section-kicker">{registerMode ? "创建账号" : "账号登录"}</span><h2>{registerMode ? "从这里开始" : "继续你的计划"}</h2></div>
        {registerMode && <label>昵称<input autoComplete="name" maxLength={40} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：云同学" required value={displayName} /></label>}
        <label>邮箱<input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required type="email" value={email} /></label>
        <label>密码<input autoComplete={registerMode ? "new-password" : "current-password"} minLength={10} onChange={(event) => setPassword(event.target.value)} placeholder={registerMode ? "至少 10 个字符" : "输入密码"} required type="password" value={password} /></label>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        <button className="button button-primary auth-submit" disabled={submitting || status === "checking"} type="submit">{submitting ? "正在处理…" : registerMode ? "创建账号" : "登录"} <ArrowRight size={17} /></button>
        <p className="auth-switch">{registerMode ? "已有账号？" : "第一次使用？"} <Link to={registerMode ? "/login" : "/register"}>{registerMode ? "直接登录" : "创建账号"}</Link></p>
        <div className="auth-boundary"><CheckCircle2 size={16} /><span>请勿在个人简介或 AI 输入中填写身份证号、手机号、家庭信息或成绩单。</span></div>
      </form>
    </section>
  </main>;
}
