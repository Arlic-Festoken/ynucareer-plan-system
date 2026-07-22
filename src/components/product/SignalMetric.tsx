type SignalMetricProps = { label: string; value: string | number; detail: string; tone?: "signal" | "neutral" | "warm" };

export default function SignalMetric({ label, value, detail, tone = "signal" }: SignalMetricProps) {
  return <article className={`signal-metric tone-${tone}`}><span className="signal-label">{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}
