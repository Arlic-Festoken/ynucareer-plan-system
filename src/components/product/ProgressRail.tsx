type ProgressRailProps = { current: number; total: number; label: string; detail?: string };

export default function ProgressRail({ current, total, label, detail }: ProgressRailProps) {
  const safeTotal = Math.max(total, 1);
  const percent = Math.min(100, Math.round((current / safeTotal) * 100));
  return <section className="progress-rail" aria-label={label}>
    <div><span className="signal-label">{label}</span><strong>{current} <small>/ {total}</small></strong></div>
    <div className="progress-line"><i style={{ width: `${percent}%` }} /></div>
    {detail && <p>{detail}</p>}
  </section>;
}
