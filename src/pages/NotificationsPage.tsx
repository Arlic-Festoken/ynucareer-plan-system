import { Bell, Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNotifications, markNotification } from "../api/pilot";
import PageShell from "../components/common/PageShell";
import type { NotificationItem } from "../domain";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getNotifications()
      .then((result) => { if (active) setNotifications(result.notifications); })
      .catch((reason: unknown) => { if (active) setMessage(reason instanceof Error ? reason.message : "通知读取失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function markRead(item: NotificationItem) {
    try {
      await markNotification(item.id, true);
      setNotifications((current) => current.map((notification) =>
        notification.id === item.id ? { ...notification, read: true } : notification));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "通知状态更新失败。");
    }
  }

  return <PageShell eyebrow="校内通知" title="截止、退回与核验结果，都留在这里。" description="通知由业务状态幂等生成，不会因为刷新页面重复创建。">
    {loading ? <div className="opportunity-loading" role="status"><LoaderCircle size={20} />正在读取通知…</div>
      : notifications.length ? <section className="notification-center">
        {notifications.map((item) => <article className={item.read ? "is-read" : "is-unread"} key={item.id}>
          <Bell size={18} />
          <div><span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span><h2>{item.title}</h2><p>{item.body}</p><Link to={item.href}>前往处理</Link></div>
          {item.read ? <span className="notification-read"><Check size={14} />已读</span>
            : <button className="button button-quiet" onClick={() => void markRead(item)} type="button">标记已读</button>}
        </article>)}
      </section> : <section className="opportunity-empty"><Bell size={26} /><div><span className="section-kicker">暂无通知</span><h2>新的截止提醒或教师反馈会出现在这里。</h2></div></section>}
    {message && <p className="save-message" role="status">{message}</p>}
  </PageShell>;
}
