import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use inside Client Components ("use client"), e.g. the
 * login/signup forms. This is separate from lib/supabase/server.ts, which is
 * for Server Components and Route Handlers.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
