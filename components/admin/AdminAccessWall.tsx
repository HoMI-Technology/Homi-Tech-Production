import Link from "next/link";
import type { AdminAccessDecision } from "@/lib/auth/admin";
import { AdminStepUpForm } from "@/components/admin/AdminStepUpForm";

type Denied = Extract<AdminAccessDecision, { allow: false }>;

interface WallCopy {
  title: string;
  body: string;
  /** Link CTA. Absent for needs-stepup, which renders an inline code form. */
  cta?: { label: string; href: string };
}

/** Copy per denial reason. `signedIn` refines the not-admin case. */
function copyFor(reason: Denied["reason"], signedIn: boolean): WallCopy {
  switch (reason) {
    case "needs-enrollment":
      return {
        title: "Set up your authenticator",
        body: "The admin console needs two-factor authentication, and this account doesn't have an authenticator yet. It takes about a minute: open your security settings, add an authenticator app (Google Authenticator, 1Password, or Authy), scan the QR code, and enter the code it shows. Then come back here.",
        cta: { label: "Set up two-factor", href: "/settings#security" },
      };
    case "needs-stepup":
      return {
        title: "One more step",
        body: "Your authenticator is connected — this session just needs the current 6-digit code from your app.",
      };
    case "not-admin":
    default:
      return signedIn
        ? {
            title: "Admin access required",
            body: "Your account doesn't have admin privileges. If you believe this is a mistake, contact your HōMI administrator.",
            cta: { label: "Return to dashboard", href: "/dashboard" },
          }
        : {
            title: "Admin access required",
            body: "Sign in with an administrator account to continue.",
            cta: { label: "Sign in", href: "/auth/sign-in?next=/admin" },
          };
  }
}

/**
 * Full-screen gate shown when a request is refused entry to the admin console.
 * Matches the `.field` + `.glass` OPERATE language of the console itself.
 *
 * Enrollment and step-up are guided states, not dead ends: needs-enrollment
 * links straight to the authenticator setup in Settings → Security, and
 * needs-stepup verifies the second factor inline. This wall is kept even
 * while evaluateAdminAccess defaults requireMfa off (temporary founder
 * waiver) — do not delete this UX.
 */
export function AdminAccessWall({
  reason,
  signedIn,
}: {
  reason: Denied["reason"];
  signedIn: boolean;
}) {
  const { title, body, cta } = copyFor(reason, signedIn);
  // Enrollment/step-up are security prompts (cyan), not a hard denial (crimson).
  const accent = reason === "not-admin" ? "text-crimson" : "text-cyan";

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
            className={accent}
          >
            <path d="M10 3l7 3.5v4c0 4-3 6.5-7 7.5-4-1-7-3.5-7-7.5v-4L10 3z" />
            <path d="M10 8.5v3M10 14.5h.01" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-2xl text-light">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">{body}</p>
        <div className="mt-8">
          {reason === "needs-stepup" ? (
            <div className="text-left">
              <AdminStepUpForm />
            </div>
          ) : (
            cta && (
              <Link href={cta.href} className="btn btn-primary">
                {cta.label}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
