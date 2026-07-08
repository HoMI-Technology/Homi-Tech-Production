export function StatCard({
  label,
  value,
  accent = "#22d3ee",
  sublabel,
}: {
  label: string;
  value: string;
  accent?: string;
  sublabel?: string;
}) {
  return (
    <div className="glass p-6">
      <p className="text-sm text-dim">{label}</p>
      <p className="score-numeral mt-2 text-3xl font-bold text-light" style={{ textShadow: `0 0 24px ${accent}33` }}>
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-dim">{sublabel}</p>}
    </div>
  );
}
