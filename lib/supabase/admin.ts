import { createClient } from "@supabase/supabase-js";

/**
 * Admin-privileged Supabase client using the SERVICE ROLE key.
 *
 * DANGER: this key bypasses all Row Level Security. Never import this file
 * from a Client Component, never send this key to the browser, and never
 * expose it via a NEXT_PUBLIC_ env var. Server-only, route handlers only.
 *
 * Used here specifically to create a user with email_confirm: true after
 * they've already verified via our own Resend code flow - so Supabase
 * doesn't ALSO try to send its own confirmation link.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
