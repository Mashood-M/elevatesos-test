"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/context/store-context";
import { canAccessPath, homeForRole } from "@/lib/access";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { store, hydrated } = useStore();
  const { userId, roleKey, chapterId } = store.session;
  const chapterSlug =
    store.chapters.find((c) => c.id === chapterId)?.slug ?? "ekc";

  useEffect(() => {
    // Wait until Supabase store hydration has finished before enforcing permissions
    if (!hydrated) return;

    // No authenticated user — hard redirect to login (clears stale state)
    if (!userId) {
      window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
      return;
    }

    // User is logged in but doesn't have permission for this path
    if (!canAccessPath(pathname, roleKey, chapterSlug)) {
      router.replace(homeForRole(roleKey, chapterSlug ?? "ekc"));
    }
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
