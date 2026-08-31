/**
 * Idle session timeout.
 *
 * Supabase access tokens expire after an hour but refresh silently, so a
 * session otherwise lasts indefinitely. This adds an inactivity rule on
 * top: leave the site for longer than the window and you're signed out.
 *
 * The clock resets on every request, so someone actively using the site is
 * never interrupted - only genuine absence logs you out.
 */

export const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Cookie holding the epoch-ms timestamp of the last seen request. */
export const LAST_SEEN_COOKIE = "5n_last_seen";
