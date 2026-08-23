import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { LENSES } from "@/lib/tools/registry";

/**
 * Metadata for the client-component tool lenses (`app/(product)/tools/[slug]`
 * and /scenarios). Each tool directory has a tiny server `layout.tsx` calling
 * `toolMetadata(path)` — the pages themselves are `"use client"` and cannot
 * export metadata, which is why these routes shipped with the root fallback
 * (`<title>HōMI</title>`, no canonical) until this helper existed.
 *
 * Name + description come from the lens registry (same no-drift SSOT the
 * sitemap uses). The maps below override only where the search phrase differs
 * from the product name or the registry one-liner is too thin for a SERP.
 * Never-say guard: no "best deal", "pre-approved", "our lenders" framing.
 */
const SEO_TITLES: Record<string, string> = {
  "/tools/affordability": "Home Affordability Calculator",
  "/tools/rent-vs-buy": "Rent vs. Buy Calculator",
  "/tools/down-payment": "Down Payment Goal Calculator",
  "/tools/refinance": "Refinance Break-Even Calculator",
  "/tools/apr-compare": "APR Comparison Calculator",
  "/tools/runway": "Emergency Runway Calculator",
  "/tools/debt-payoff": "Debt Payoff Calculator",
  "/tools/heloc": "HELOC Borrowing Power Calculator",
  "/tools/loan-programs": "Loan Program Comparison — Conventional vs. FHA vs. VA",
  "/tools/fire": "FIRE Number Calculator",
  "/tools/monte-carlo": "Monte Carlo Retirement Projection",
  "/tools/roth-conversion": "Roth Conversion Tradeoff Calculator",
  "/tools/blind-budget": "Blind Budget Planner",
  "/tools/preflight": "Decision Pre-Flight Check",
  "/scenarios": "Scenario Studio — Buy Now vs. Wait",
};

const SEO_DESCRIPTIONS: Record<string, string> = {
  "/tools/monte-carlo":
    "Run simulated market paths against your own retirement numbers. Ranges, not promises — simulated paths are not a forecast.",
  "/scenarios":
    "Compare buying now against waiting 12 or 24 months — five-year cost paths on your own numbers, with an honest readiness overlay. Educational only.",
};

export function toolMetadata(path: string): Metadata {
  const lens = LENSES.find((l) => l.path === path);
  if (!lens) throw new Error(`toolMetadata: no lens registered for ${path}`);
  return pageMetadata({
    title: SEO_TITLES[path] ?? lens.name,
    description: SEO_DESCRIPTIONS[path] ?? lens.desc,
    path,
  });
}
