import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo/metadata";

/** Incomplete public surface — noindex until it has real ranking content. */
export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
