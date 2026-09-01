"use client";

// Next.js route error boundary for /rent. If anything in the rent page throws
// during render (e.g. a transient data-not-ready state on a cold start), this
// catches it and shows a clean retry instead of the white "Application error"
// screen. "reset()" re-renders the route, which usually succeeds once data has
// loaded.
export default function RentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-lg border border-border bg-white px-6 py-8 text-center shadow-card">
        <p className="text-base font-semibold text-foreground">Loading the rent page…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          One moment — if it doesn’t appear, tap below.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
