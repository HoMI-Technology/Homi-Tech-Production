import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionHub } from "@/components/settings/SubscriptionHub";
import type { SubscriptionTier } from "@/types/database";

export const metadata: Metadata = {
  title: "Subscription",
  description: "View and change your HōMI monthly subscription, or manage billing in Stripe.",
  alternates: { canonical: "/settings/subscription" },
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/settings/subscription");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const tier = (profile?.subscription_tier as SubscriptionTier | undefined) ?? "free";
  const status = profile?.subscription_status ?? (tier === "free" ? "free" : "unknown");
  const hasStripeCustomer = Boolean(profile?.stripe_customer_id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <SubscriptionHub
        tier={tier}
        status={status}
        hasStripeCustomer={hasStripeCustomer}
        upgraded={params.upgraded === "1"}
      />
    </div>
  );
}
