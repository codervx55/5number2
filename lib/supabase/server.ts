import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client bound to the incoming request's cookies, for use
 * inside Route Handlers (app/api/**\/route.ts) and Server Components.
 *
 * Requires these env vars (from your Supabase project settings -> API):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Route Handler this can safely no-op if called from a
          // context that disallows mutating cookies (e.g. during render).
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - middleware handles session refresh in that case.
          }
        },
      },
    }
  );
}

/**
 * Convenience helper: returns the authenticated Supabase user for this
 * request, or null if there isn't one. Use this at the top of any API route
 * that requires a logged-in user (buying a number, checking wallet, etc).
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}
