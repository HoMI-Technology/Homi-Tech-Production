import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
      },
    },
  );
}

/** Request-scoped client — layout and page share one instance per render pass. */
export const getCachedClient = cache(createClient);

/**
 * Request-scoped authenticated user. `auth.getUser()` is a network round-trip
 * to the Supabase Auth server, so a layout and its page must never both pay
 * for it — React.cache dedupes it to once per request. Stays getUser (not
 * getSession): server-side validation is the security posture; we only remove
 * the duplicate call, not the validation.
 */
export const getCachedUser = cache(async () => {
  const supabase = await getCachedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
