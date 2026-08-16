/**
 * Path / household pricing experiment hooks.
 * Sticky variant assignment in localStorage; never gates core assessment.
 */

import { trackPathPricingExposure } from "./analytics";

export type PathPricingVariant = "control" | "path_plus" | "household_bundle";

const KEY = "homi:exp:path-pricing-v1";

export interface PathPricingAssignment {
  experiment: "path_pricing_v1";
  variant: PathPricingVariant;
  assignedAt: string;
}

/** Deterministic-ish random sticky assignment (client-only). */
export function getPathPricingAssignment(): PathPricingAssignment {
  if (typeof window === "undefined") {
    return {
      experiment: "path_pricing_v1",
      variant: "control",
      assignedAt: new Date(0).toISOString(),
    };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PathPricingAssignment;
      if (parsed?.variant) return parsed;
    }
  } catch {
    /* fall through */
  }
  const roll = Math.random();
  const variant: PathPricingVariant =
    roll < 0.34 ? "control" : roll < 0.67 ? "path_plus" : "household_bundle";
  const assignment: PathPricingAssignment = {
    experiment: "path_pricing_v1",
    variant,
    assignedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(assignment));
  } catch {
    /* ignore */
  }
  return assignment;
}

export function exposePathPricing(surface: string): PathPricingAssignment {
  const a = getPathPricingAssignment();
  trackPathPricingExposure({
    experiment: a.experiment,
    variant: `${a.variant}:${surface}`,
  });
  return a;
}

export function pathPricingCopy(variant: PathPricingVariant): {
  headline: string;
  body: string;
  cta: string;
  href: string;
} {
  switch (variant) {
    case "path_plus":
      return {
        headline: "Path depth on Plus",
        body: "Free keeps the protective path. Plus unlocks full history, export, and multi-device path sync.",
        cta: "See Plus",
        href: "/pricing",
      };
    case "household_bundle":
      return {
        headline: "Household readiness",
        body: "Two assessments, one joint score, shared path — Family tier for dual-user households.",
        cta: "See Family",
        href: "/pricing",
      };
    default:
      return {
        headline: "Your path is free to start",
        body: "Generate and complete protective steps at no cost. Upgrade when you want history and household.",
        cta: "View pricing",
        href: "/pricing",
      };
  }
}
