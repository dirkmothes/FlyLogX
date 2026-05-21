type Props = {
  label: string;
  value: string;
  delta?: string;
  tone?: "blue" | "green" | "yellow" | "red";
};

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  blue: "kpi-accent-blue",
  green: "kpi-accent-green",
  yellow: "kpi-accent-yellow",
  red: "kpi-accent-red",
};

export function KpiCard({ label, value, delta, tone = "blue" }: Props) {
  return (
    <article className={`kpi-card ${toneClass[tone]}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {delta ? <span className="kpi-delta">{delta}</span> : null}
    </article>
  );
}
