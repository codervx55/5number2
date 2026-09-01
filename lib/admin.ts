import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * Admin gate. An admin is any logged-in user whose email is in the
 * ADMIN_EMAILS env var (comma-separated). Set it in your host's environment,
 * e.g. ADMIN_EMAILS="you@example.com,partner@example.com".
 *
 * Returns the authenticated admin user, or null if the caller isn't an admin.
 * Every admin API route should call this first and 403 on null.
 */
export async function getAdminUser() {
  const user = await getAuthenticatedUser();
  if (!user?.email) return null;

  const raw = process.env.ADMIN_EMAILS ?? "";
  const admins = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (admins.length === 0) return null; // no admins configured = deny all
  if (!admins.includes(user.email.toLowerCase())) return null;

  return user;
}
