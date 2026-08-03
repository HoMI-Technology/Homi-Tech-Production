import { COLORS } from "@/lib/brand";

const ROLE_COLORS: Record<string, string> = {
  admin: COLORS.crimson,
  partner: COLORS.cyan,
  employee: COLORS.emerald,
  user: COLORS.dim,
};

const TIER_COLORS: Record<string, string> = {
  free: COLORS.dim,
  plus: COLORS.cyan,
  pro: COLORS.yellow,
  family: COLORS.emerald,
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
  return <Badge label={role} color={ROLE_COLORS[role] ?? COLORS.dim} />;
}

export function TierBadge({ tier }: { tier: string }) {
  return <Badge label={tier} color={TIER_COLORS[tier] ?? COLORS.dim} />;
}
