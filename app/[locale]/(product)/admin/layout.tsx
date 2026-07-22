import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/AdminSidebar";
import { Wordmark } from "@/components/brand/Wordmark";
import type { Profile } from "@/types/database";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = (data as Profile | null) ?? null;
    } catch {
      profile = null;
    }
  }

  if (!user || !profile || profile.role !== "admin") {
    return (
      <div className="field flex min-h-screen items-center justify-center px-6">
        <div className="glass w-full max-w-md p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-surface">
            <svg
              width="22"
              height="22"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="text-crimson"
            >
              <path d="M10 3l7 3.5v4c0 4-3 6.5-7 7.5-4-1-7-3.5-7-7.5v-4L10 3z" />
              <path d="M10 8.5v3M10 14.5h.01" />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-2xl text-light">Admin access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            {user
              ? "Your account doesn't have admin privileges. If you believe this is a mistake, contact your HōMI administrator."
              : "Sign in with an administrator account to continue."}
          </p>
          <div className="mt-8">
            <Link href={user ? "/dashboard" : "/auth/sign-in?next=/admin"} className="btn btn-primary">
              {user ? "Return to dashboard" : "Sign in"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="field min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24">
            <div className="mb-6 flex items-center gap-2 px-1">
              <Wordmark size="text-lg" />
              <span className="rounded-full bg-slate-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim">
                Admin
              </span>
            </div>
            <AdminSidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <AdminMobileNav />
          {children}
        </div>
      </div>
    </div>
  );
}
