"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/context/store-context";
import { canAccessPath, homeForRole } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import { WorkspaceSkeleton } from "@/components/layout/workspace-skeleton";

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

  const isVolunteer = Boolean(
    userId && (
      (store.volunteerGroups || []).some((g) => g.memberIds?.includes(userId)) ||
      (store.events || []).some((e) => e.volunteerStudentIds?.includes(userId))
    )
  );

  useEffect(() => {
    // Wait until Supabase store hydration has finished before enforcing permissions
    if (!hydrated) return;

    // No authenticated user — redirect to login using replace (clears stale state)
    if (!userId) {
      window.location.replace("/login");
      return;
    }

    // User is logged in but doesn't have permission for this path
    if (!canAccessPath(pathname, roleKey, chapterSlug, store.session.authRoleKey, isVolunteer)) {
      router.replace(homeForRole(roleKey, chapterSlug));
    }
  }, [pathname, userId, roleKey, chapterSlug, router, hydrated, store.session.authRoleKey, isVolunteer]);

  // While store is hydrating from Supabase, render full modern ERP workspace skeleton
  if (!hydrated) {
    return <WorkspaceSkeleton />;
  }

  // Once hydrated, if no session userId exists or user doesn't have path access, show clean skeleton while redirecting
  if (!userId || !canAccessPath(pathname, roleKey, chapterSlug, store.session.authRoleKey, isVolunteer)) {
    return <WorkspaceSkeleton />;
  }

  return <>{children}</>;
}
