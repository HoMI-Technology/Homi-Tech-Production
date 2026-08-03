import Link from "next/link";
import type { AdminAccessDecision } from "@/lib/auth/admin";

type Denied = Extract<AdminAccessDecision, { allow: false }>;

interface WallCopy {
  title: string;
  body: string;
  cta: { label: string; href: string };
}

/** Copy per denial reason. `signedIn` refines the not-admin case. */
function copyFor(reason: Denied["reason"], signedIn: boolean): WallCopy {
  switch (reason) {
    case "needs-enrollment":
      return {
        title: "Two-factor required",
        body: "Admin accounts must have two-factor authentication enabled. Add an authenticator app in your security settings, then return here.",
        cta: { label: "Enable two-factor", href: "/settings?section=security" },
      };
    case "needs-stepup":
      return {
        title: "Verify your second factor",
        body: "Your account has two-factor authentication enabled, but this session hasn't completed the second step. Sign in again to verify.",
        cta: { label: "Verify now", href: "/auth/sign-in?next=/admin" },
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
          <Link href={cta.href} className="btn btn-primary">
            {cta.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
