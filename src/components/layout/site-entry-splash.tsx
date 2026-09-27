"use client";

import { useEffect, useState } from "react";
import { EntryLoadingScreen } from "@/components/layout/entry-loading-screen";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SITE ENTRY SPLASH
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the natural welcome loading screen ONLY when:
 * 1. The site is opened freshly for the very first time in this browser session.
 * 2. The user is NOT logged in.
 *
 * EXCLUSIONS (Never shown):
 * - When refreshing the page (F5 / browser reload).
 * - When the user is logged in or inside workspace routes.
 * - When logging in, signing up, or logging out.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SiteEntrySplash() {
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Never show on page refresh
    try {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navEntry?.type === "reload") {
        return;
      }
    } catch {}

    // 2. Never show if user already visited any page in this browser session
    if (sessionStorage.getItem("elevates_session_entered")) {
      return;
    }

    // 3. Never show if skip flag is present
    if (sessionStorage.getItem("elevates_skip_splash")) {
      sessionStorage.removeItem("elevates_skip_splash");
      return;
    }

    // 4. Never show if the user is already logged in
    const hasRoleKey = !!localStorage.getItem("elevates_active_role_key");
    const hasTopRole = !!localStorage.getItem("elevates_known_top_role");
    const hasSupabaseToken = Object.keys(localStorage).some(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    const hasAuthCookie = document.cookie.split(";").some((c) => {
      const name = c.split("=")[0].trim();
      return name.startsWith("sb-") || name.includes("auth-token");
    });
    const isInsideWorkspace = /^\/(chapter|hq|faculty|executive|events|leaderboards|my-qr|profile|settings|tasks|workflows)/.test(
      window.location.pathname
    );

    if (hasRoleKey || hasTopRole || hasSupabaseToken || hasAuthCookie || isInsideWorkspace) {
      // User is logged in — mark as visited and do not show splash
      sessionStorage.setItem("elevates_session_entered", "1");
      return;
    }

    // 5. Mark session as entered so refreshing never triggers the splash
    sessionStorage.setItem("elevates_session_entered", "1");

    // Fresh non-logged-in visitor: show natural entry screen
    setMounted(true);

    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 600);

    const removeTimer = setTimeout(() => {
      setMounted(false);
    }, 1000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] pointer-events-auto transition-opacity duration-400 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <EntryLoadingScreen />
    </div>
  );
}

export default SiteEntrySplash;
