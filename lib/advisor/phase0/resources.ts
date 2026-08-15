/**
 * Phase 0 resource slots. Max 3. Types locked. Never lead with 988
 * unless slot 3 trips. Neutral text links — not “You need help.”
 */

import {
  PHASE0_LIFELINE_DETAIL,
  PHASE0_LIFELINE_HREF,
  PHASE0_LIFELINE_LABEL,
  PHASE0_NFCC_DETAIL,
  PHASE0_NFCC_HREF,
  PHASE0_NFCC_LABEL,
  PHASE0_RESOURCE_FRAME,
  PHASE0_SAMHSA_DETAIL,
  PHASE0_SAMHSA_HREF,
  PHASE0_SAMHSA_LABEL,
} from "./copy";

export type Phase0ResourceSlot = 1 | 2 | 3;

export interface Phase0Resource {
  slot: Phase0ResourceSlot;
  label: string;
  detail: string;
  href: string;
}

export function selectPhase0Resources(flags: {
  financialStress: boolean;
  selfHarm: boolean;
}): Phase0Resource[] {
  const slots: Phase0Resource[] = [
    {
      slot: 1,
      label: PHASE0_SAMHSA_LABEL,
      detail: PHASE0_SAMHSA_DETAIL,
      href: PHASE0_SAMHSA_HREF,
    },
  ];
  if (flags.financialStress) {
    slots.push({
      slot: 2,
      label: PHASE0_NFCC_LABEL,
      detail: PHASE0_NFCC_DETAIL,
      href: PHASE0_NFCC_HREF,
    });
  }
  if (flags.selfHarm) {
    slots.push({
      slot: 3,
      label: PHASE0_LIFELINE_LABEL,
      detail: PHASE0_LIFELINE_DETAIL,
      href: PHASE0_LIFELINE_HREF,
    });
  }
  return slots.slice(0, 3);
}

export function formatPhase0ResourceLines(resources: readonly Phase0Resource[]): string {
  if (resources.length === 0) return "";
  const lines = resources.map((resource) => `${resource.label} — ${resource.detail}`);
  return `${PHASE0_RESOURCE_FRAME}\n${lines.join("\n")}`;
}
