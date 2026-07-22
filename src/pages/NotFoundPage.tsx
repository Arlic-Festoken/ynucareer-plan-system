import { Link } from "react-router-dom";
import PageShell from "../components/common/PageShell";

export default function NotFoundPage() {
  return <PageShell eyebrow="404" title="这里没有你要找的页面。" description="回到首页，或者重新选择你的当前阶段开始。"><Link className="button button-primary" to="/">返回首页</Link></PageShell>;
}
