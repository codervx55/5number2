"use client";

import { useEffect } from "react";

/**
 * Fires a single view-count ping when the app first loads in the browser.
 * Drop <ViewTracker /> once in the root layout. Uses sessionStorage so it
 * counts one view per browser session (not per client-side navigation).
 */
export function ViewTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("viewCounted")) return;
      sessionStorage.setItem("viewCounted", "1");
    } catch {
      // sessionStorage may be unavailable; still count the view.
    }
    fetch("/api/view", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
