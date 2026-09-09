/** Days since the last completed assessment for reassessment copy. */
export function daysSinceAssessment(completedAt: string): number {
  const then = new Date(completedAt).getTime();
  const now = Date.now();
  return Math.max(1, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}
