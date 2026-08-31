export interface LineageCandidate {
  id: string;
  user_id: string;
}

export type LineageRejection = "self" | "cross_user" | "missing";

export function assertSameUserLineage(
  currentUserId: string,
  previous: LineageCandidate | null,
  currentAssessmentId?: string,
): LineageRejection | null {
  if (!previous) return "missing";
  if (currentAssessmentId && previous.id === currentAssessmentId) return "self";
  if (previous.user_id !== currentUserId) return "cross_user";
  return null;
}
