import GlassCard from "./GlassCard";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "purple" | "green" | "orange";
};

export default function MetricCard({ label, value, detail, tone = "blue" }: MetricCardProps) {
  return (
    <GlassCard className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </GlassCard>
  );
}
