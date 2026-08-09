"use client";

import { createClient } from "@/lib/supabase/client";

function OAuthButton({
  provider,
  label,
  icon,
  next,
}: {
  provider: "google" | "apple";
  label: string;
  icon: React.ReactNode;
  next: string;
}) {
  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} className="btn btn-ghost w-full" aria-label={label}>
      {icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mr-2">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      className="mr-2"
      fill="currentColor"
    >
      <path d="M12.55 4.85c-.55.64-1.43.72-2.08.17-.64-.55-.72-1.43-.17-2.08.55-.64 1.43-.72 2.08-.17.64.55.72 1.43.17 2.08z" />
      <path d="M11.35 6.1c-.85-.05-1.55.45-2.05.45-.55 0-1.25-.45-2-.45-1.6 0-3.2 1.35-3.2 3.85 0 2.25 1.45 4.9 3.35 4.9.75 0 1.3-.5 2.05-.5.75 0 1.25.5 2.05.5 1.85 0 3.1-2.7 3.1-4.9 0-.25-.05-.5-.1-.75-1.15-.4-1.95-1.5-1.95-2.75 0-.95.55-1.75 1.3-2.15-.55-.75-1.45-1.1-2.35-1.05-.15.05-.3.1-.4.15-.35.15-.7.3-1.1.3-.45 0-.9-.15-1.3-.35.3-.15.65-.25 1-.25.85 0 1.6.45 2.05 1.1.45-.65 1.2-1.1 2.05-1.1.35 0 .7.1 1 .25-.5.4-.85 1-.85 1.7 0 1.25.8 2.35 1.95 2.75-.05.25-.1.5-.1.75 0 .3.05.6.15.9-.25.1-.5.15-.75.15z" />
    </svg>
  );
}

export function OAuthButtons({ next }: { next: string }) {
  const showGoogle = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "1";
  const showApple = process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === "1";

  if (!showGoogle && !showApple) return null;

  return (
    <>
      <div className="hairline my-6" />
      <div className="space-y-3">
        {showGoogle && (
          <OAuthButton
            provider="google"
            label="Continue with Google"
            icon={<GoogleIcon />}
            next={next}
          />
        )}
        {showApple && (
          <OAuthButton
            provider="apple"
            label="Continue with Apple"
            icon={<AppleIcon />}
            next={next}
          />
        )}
      </div>
    </>
  );
}
