"use client";


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
  return null;
}

export default SiteEntrySplash;
