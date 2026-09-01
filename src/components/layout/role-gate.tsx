"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/context/store-context";
import { canAccessPath, homeForRole } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { store, hydrated } = useStore();
  const { userId, roleKey, chapterId } = store.session;
  const chapterSlug = chapterId
    ? (store.chapters.find((c) => c.id === chapterId)?.slug ?? "")
    : isHqRole(roleKey)
      ? (store.chapters[0]?.slug ?? "")
      : "";

  useEffect(() => {
    // Handle back button / BFCache restoration after logout
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        window.location.replace("/login");
      }
    }
    window.addEventListener("pageshow", onPageShow);

    // Wait until Supabase store hydration has finished before enforcing permissions
    if (!hydrated) return () => window.removeEventListener("pageshow", onPageShow);

    // No authenticated user — hard redirect to login using replace (clears stale state)
    if (!userId) {
      window.location.replace("/login");
      return () => window.removeEventListener("pageshow", onPageShow);
    }

    // User is logged in but doesn't have permission for this path
    if (!canAccessPath(pathname, roleKey, chapterSlug, store.session.authRoleKey)) {
      router.replace(homeForRole(roleKey, chapterSlug));
    }

    return () => window.removeEventListener("pageshow", onPageShow);
  }, [pathname, userId, roleKey, chapterSlug, router, hydrated]);

  // While store is hydrating from Supabase, render loading indicator
  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-text-mute">
        Loading workspace…
      </div>
    );
  }

  // Once hydrated, if no session userId exists, show redirect message
  if (!userId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-text-mute">
        Redirecting to sign in…
      </div>
    );
  }

  if (!canAccessPath(pathname, roleKey, chapterSlug)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-text-mute">
        Redirecting to your workspace…
      </div>
    );
  }

  return <>{children}</>;
}
