export interface TrinityPillarReading {
  key: string;
  name: string;
  value: number;
}

export interface TrinityGap<T extends TrinityPillarReading = TrinityPillarReading> {
  gap: number;
  strong: T;
  weak: T;
}

/**
 * Alert when max−min > threshold (default 40). Boundary 40 → null.
 *
 * Generic so callers with richer pillar shapes (e.g. the dashboard's
 * PillarReading with max/color/pct) get their own type back on strong/weak.
 */
export function computeTrinityGap<T extends TrinityPillarReading>(
  pillars: T[],
  threshold = 40,
): TrinityGap<T> | null {
  if (pillars.length < 3) return null;
  const values = pillars.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const gap = max - min;
  if (gap <= threshold) return null;
  const strong = pillars.find((p) => p.value === max)!;
  const weak = pillars.find((p) => p.value === min)!;
  return { gap, strong, weak };
}
