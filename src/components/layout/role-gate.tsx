"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/context/store-context";
import { canAccessPath, homeForRole } from "@/lib/access";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { store } = useStore();
  const { userId, roleKey, chapterId } = store.session;
  const chapterSlug =
    store.chapters.find((c) => c.id === chapterId)?.slug ?? "ekc";

  useEffect(() => {
    // No authenticated user — hard redirect to login (clears stale state)
    if (!userId) {
      window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
      return;
    }

    // User is logged in but doesn't have permission for this path
    if (!canAccessPath(pathname, roleKey, chapterSlug)) {
      router.replace(homeForRole(roleKey, chapterSlug ?? "ekc"));
    }
  }, [pathname, userId, roleKey, chapterSlug, router]);

  // While session is empty, show nothing (middleware handles the redirect server-side)
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
