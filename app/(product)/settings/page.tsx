"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { ShareLinksSection } from "@/components/settings/ShareLinksSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import type { Profile } from "@/types/database";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          if (active) setLoading(false);
          return;
        }
        if (active) {
          setUserId(user.id);
          setEmail(user.email ?? "");
        }
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (active) setProfile((profileData as Profile) ?? null);
      } catch {
        // Leave defaults — sections handle missing data gracefully.
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-semibold text-light">Settings</h1>
      <p className="mt-2 text-sm text-dim">Manage your profile, subscription, and privacy.</p>

      {loading ? (
        <div className="mt-10 flex flex-col gap-6">
          <div className="glass h-40 animate-pulse p-6" />
          <div className="glass h-32 animate-pulse p-6" />
          <div className="glass h-32 animate-pulse p-6" />
          <div className="glass h-40 animate-pulse p-6" />
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-6">
          {userId && <ProfileSection userId={userId} email={email} initialFullName={profile?.full_name ?? ""} />}

          <SubscriptionSection tier={profile?.subscription_tier ?? "free"} />

          {userId && <SecuritySection />}

          {userId && <ShareLinksSection />}

          <NotificationsSection />

          <PrivacySection />

          <section className="glass flex items-center justify-between p-6 sm:p-8">
            <div>
              <h2 className="font-display text-xl font-semibold text-light">Sign out</h2>
              <p className="mt-1 text-sm text-dim">End your session on this device.</p>
            </div>
            <form action="/auth/sign-out" method="POST">
              <button type="submit" className="btn btn-ghost !px-4 !py-2 text-sm">
                Sign out
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
