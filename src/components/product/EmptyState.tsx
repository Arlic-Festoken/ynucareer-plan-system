import { ArrowRight, CircleDashed } from "lucide-react";
import { Link } from "react-router-dom";

type EmptyStateProps = { title: string; detail: string; to: string; action: string };

export default function EmptyState({ title, detail, to, action }: EmptyStateProps) {
  return <section className="empty-state-card"><CircleDashed size={24} /><div><h2>{title}</h2><p>{detail}</p><Link className="button button-secondary" to={to}>{action}<ArrowRight size={16} /></Link></div></section>;
}
