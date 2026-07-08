const ROLE_COLORS: Record<string, string> = {
  admin: "#f24822",
  partner: "#22d3ee",
  employee: "#34d399",
  user: "#94a3b8",
};

const TIER_COLORS: Record<string, string> = {
  free: "#94a3b8",
  plus: "#22d3ee",
  pro: "#facc15",
  family: "#34d399",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize"
      style={{ color, borderColor: `${color}59`, background: `${color}1a` }}
    >
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return <Badge label={role} color={ROLE_COLORS[role] ?? "#94a3b8"} />;
}

export function TierBadge({ tier }: { tier: string }) {
  return <Badge label={tier} color={TIER_COLORS[tier] ?? "#94a3b8"} />;
}
