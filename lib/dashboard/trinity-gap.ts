export interface TrinityPillarReading {
  key: string;
  name: string;
  value: number;
}

export interface TrinityGap {
  gap: number;
  strong: TrinityPillarReading;
  weak: TrinityPillarReading;
}

/** Alert when max−min > threshold (default 40). Boundary 40 → null. */
export function computeTrinityGap(
  pillars: TrinityPillarReading[],
  threshold = 40,
): TrinityGap | null {
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
