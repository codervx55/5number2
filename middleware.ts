import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { IDLE_TIMEOUT_MS, LAST_SEEN_COOKIE } from "@/lib/session-timeout";

/**
 * Runs on every request to:
 *
 *  1. Refresh the Supabase auth session. Without this, sessions can
 *     silently expire mid-use because nothing calls getUser() outside of
 *     API routes that happen to run.
 *     See: https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 *  2. Enforce an idle timeout. If the last request from this browser was
 *     more than IDLE_TIMEOUT_MS ago, the session is cleared and the person
 *     is sent to /login. The timestamp is rewritten on every request, so
 *     the clock only runs while they're away.
 *
 * Note the timeout is enforced server-side rather than with a client timer,
 * so closing the tab (or the laptop) still counts as being away - a
 * setTimeout in the browser would simply stop running.
 */

/** Paths that should never trigger a timeout redirect. */
const PUBLIC_PREFIXES = ["/login", "/signup", "/privacy", "/terms"];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching getUser() is what actually triggers the token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = Date.now();
  const pathname = request.nextUrl.pathname;

  if (user) {
    const lastSeenRaw = request.cookies.get(LAST_SEEN_COOKIE)?.value;
    const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : null;
    const idleTooLong =
      lastSeen !== null && Number.isFinite(lastSeen) && now - lastSeen > IDLE_TIMEOUT_MS;

    if (idleTooLong) {
      await supabase.auth.signOut();

      // Public pages stay viewable when signed out - just clear the session
      // rather than bouncing someone off the homepage.
      if (isPublicPath(pathname)) {
        const passthrough = NextResponse.next({ request });
        passthrough.cookies.delete(LAST_SEEN_COOKIE);
        return passthrough;
      }

      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("timeout", "1");
      // Send them back where they were once they've signed in again.
      loginUrl.searchParams.set("next", pathname);

      const redirect = NextResponse.redirect(loginUrl);
      redirect.cookies.delete(LAST_SEEN_COOKIE);
      return redirect;
    }

    // Still active - push the clock forward.
    response.cookies.set(LAST_SEEN_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Slightly longer than the idle window so the cookie itself is still
      // present when we need to judge that the window has passed.
      maxAge: Math.floor((IDLE_TIMEOUT_MS * 2) / 1000),
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
