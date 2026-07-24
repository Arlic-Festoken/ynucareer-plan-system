import { Check, Cloud, Database, LogOut, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import { majors } from "../data/catalog";
import { useAuthStore } from "../store/authStore";
import { useCareerStore } from "../store/careerStore";

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const storedProfile = useAuthStore((state) => state.profile);
  const syncStatus = useAuthStore((state) => state.syncStatus);
  const lastSyncedAt = useAuthStore((state) => state.lastSyncedAt);
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const syncCareerNow = useAuthStore((state) => state.syncCareerNow);
  const logout = useAuthStore((state) => state.logout);
  const careerProfile = useCareerStore((state) => state.profile);
  const updateCareerProfile = useCareerStore((state) => state.updateProfile);
  const initial = useMemo(() => ({
    university: storedProfile?.university || "云南大学",
    college: storedProfile?.college || "",
    major: storedProfile?.major || careerProfile.major,
    grade: storedProfile?.grade || careerProfile.grade,
    bio: storedProfile?.bio || "",
  }), [careerProfile.grade, careerProfile.major, storedProfile]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveProfile(form);
      updateCareerProfile({ major: form.major, grade: form.grade });
      await syncCareerNow();
      setMessage("已保存并同步到当前账号。");
    } catch {
      setMessage("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return <PageShell eyebrow="个人中心" title="你的资料，只服务于更准确的下一步。" description="账号资料与生涯任务保存在服务端数据库，可在同一账号下继续。">
    <section className="profile-summary">
      <div className="profile-avatar"><UserRound size={28} /></div>
      <div><span className="section-kicker">当前账号</span><h2>{user?.displayName}</h2><p><Mail size={15} />{user?.email}</p></div>
      <div className={`profile-sync is-${syncStatus}`}><Cloud size={17} /><span>{syncStatus === "saving" ? "正在同步" : syncStatus === "error" ? "同步失败" : "已连接数据库"}</span><small>{lastSyncedAt ? `最近同步 ${new Date(lastSyncedAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "等待首次同步"}</small></div>
    </section>

    <div className="profile-layout">
      <form className="profile-form" onSubmit={submit}>
        <div><span className="section-kicker">学习背景</span><h2>用于调整方向和行动建议</h2><p>不填写学号、成绩、电话或家庭信息。</p></div>
        <div className="profile-form-grid">
          <label>学校<input maxLength={80} onChange={(event) => setForm({ ...form, university: event.target.value })} required value={form.university} /></label>
          <label>学院<input maxLength={80} onChange={(event) => setForm({ ...form, college: event.target.value })} placeholder="例如：软件学院" value={form.college} /></label>
          <label>专业<select onChange={(event) => setForm({ ...form, major: event.target.value })} value={form.major}>{majors.map((major) => <option key={major}>{major}</option>)}</select></label>
          <label>当前年级<select onChange={(event) => setForm({ ...form, grade: Number(event.target.value) })} value={form.grade}>{[1, 2, 3, 4, 5, 6, 7].map((grade) => <option key={grade} value={grade}>{grade <= 4 ? `大 ${grade}` : `研 ${grade - 4}`}</option>)}</select></label>
        </div>
        <label>个人简介<textarea maxLength={300} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="可以写关注的问题、做过的项目和希望靠近的场景。" rows={5} value={form.bio} /></label>
        <div className="profile-actions"><button className="button button-primary" disabled={saving} type="submit"><Save size={16} />{saving ? "正在保存" : "保存个人资料"}</button>{message && <span role="status"><Check size={15} />{message}</span>}</div>
      </form>

      <aside className="account-panel">
        <div><ShieldCheck size={22} /><span className="section-kicker">数据边界</span><h2>账号数据如何保存</h2></div>
        <ul><li><Database size={15} />账号、资料、任务和复盘按用户隔离</li><li><ShieldCheck size={15} />登录会话使用 HttpOnly Cookie</li><li><Cloud size={15} />本地修改自动同步到 SQLite 数据库</li></ul>
        <button className="button button-quiet danger-button" onClick={signOut} type="button"><LogOut size={16} />退出登录</button>
      </aside>
    </div>
  </PageShell>;
}
