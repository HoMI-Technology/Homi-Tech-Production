import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FirstMoment } from "@/components/marketing/FirstMoment";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";
import { getCachedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Assess",
  description:
    "Five quiet beats, then an account, then the full assessment — so the verdict stays yours.",
  alternates: { canonical: "/first-moment" },
};

export default async function FirstMomentPage() {
  try {
    const user = await getCachedUser();
    if (user) redirect(SIGNED_IN_ASSESS_HREF);
  } catch {
    // Missing or placeholder Supabase — still show First Moment.
  }

  return <FirstMoment />;
}
