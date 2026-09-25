"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/context/store-context";
import { canAccessPath, homeForRole } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import { parseDelegations } from "@/lib/leadership";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceSkeleton } from "@/components/layout/workspace-skeleton";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { store, hydrated, refreshStore } = useStore();
  const { userId, roleKey, chapterId } = store.session;
  const pathChapterSlug = pathname.match(/^\/chapter\/([^/]+)/)?.[1] ?? "";
  const chapter = (pathChapterSlug ? store.chapters.find((c) => c.slug === pathChapterSlug) : null)
    || (chapterId ? store.chapters.find((c) => c.id === chapterId) : null);
  const chapterSlug = chapter?.slug ?? (chapterId
    ? (store.chapters.find((c) => c.id === chapterId)?.slug ?? "")
    : isHqRole(roleKey)
      ? (store.chapters[0]?.slug ?? "")
      : "");

  const isVolunteer = Boolean(
    userId && (
      (store.volunteerGroups || []).some((g) => g.memberIds?.includes(userId)) ||
      (store.events || []).some((e) => e.volunteerStudentIds?.includes(userId))
    )
  );

  const targetUid = userId;
  const targetAuthUid = store.session.authUserId;
  const myProfile = targetUid
    ? store.profiles.find(
        (p) =>
          p.id === targetUid ||
          (targetAuthUid && p.id === targetAuthUid) ||
          (p.email && p.email.toLowerCase() === targetUid.toLowerCase()),
      )
    : null;

  const myUserIds = [targetUid, targetAuthUid, myProfile?.id].filter(Boolean) as string[];

  const activeTerm = chapter
    ? store.terms.find((t) => t.chapterId === chapter.id && t.status === "active")
    : store.terms.find(
        (t) =>
          t.status === "active" &&
          store.termMembers.some(
            (tm) => tm.termId === t.id && myUserIds.includes(tm.userId),
          ),
      );

  const myTermMember = (() => {
    if (activeTerm) {
      return store.termMembers.find(
        (tm) =>
          tm.termId === activeTerm.id &&
          (myUserIds.includes(tm.userId) ||
            (myProfile?.email &&
              store.profiles.find((p) => p.id === tm.userId)?.email?.toLowerCase() ===
                myProfile.email.toLowerCase())),
      ) ?? null;
    }
    // Fallback: scan all active terms for this user's membership
    const allActiveTermIds = new Set(
      store.terms.filter((t) => t.status === "active").map((t) => t.id),
    );
    return store.termMembers.find(
      (tm) =>
        allActiveTermIds.has(tm.termId) &&
        (myUserIds.includes(tm.userId) ||
          (myProfile?.email &&
            store.profiles.find((p) => p.id === tm.userId)?.email?.toLowerCase() ===
              myProfile.email.toLowerCase())),
    ) ?? null;
  })();
  const myDelegations = parseDelegations(myTermMember?.permissions, myTermMember?.designation);
  const effectiveRoleKey = (roleKey === "student" && myTermMember) ? "executive_member" : roleKey;

  useEffect(() => {
    // Wait until Supabase store hydration has finished before enforcing permissions
    if (!hydrated) return;

    // If store session does not have userId, check Supabase auth directly before redirecting.
    // This prevents kicking out authenticated users during store rehydration or cache sync.
    if (!userId) {
      let isMounted = true;
      void (async () => {
        try {
          const supabase = createClient();
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
              if (isMounted) {
                void refreshStore();
              }
              return;
            }
          }
        } catch {
          // If check errors, proceed to login redirect
        }

        if (isMounted) {
          window.location.replace("/login");
        }
      })();

      return () => {
        isMounted = false;
      };
    }

    // User is logged in but doesn't have permission for this path
    if (!canAccessPath(pathname, effectiveRoleKey, chapterSlug, store.session.authRoleKey, isVolunteer, myDelegations)) {
      router.replace(homeForRole(effectiveRoleKey, chapterSlug));
    }
  }, [pathname, userId, effectiveRoleKey, chapterSlug, router, hydrated, store.session.authRoleKey, isVolunteer, myDelegations, refreshStore]);

  // While store is hydrating from Supabase, render full modern ERP workspace skeleton
  if (!hydrated) {
    return <WorkspaceSkeleton />;
  }

  // Once hydrated, if no session userId exists or user doesn't have path access, show clean skeleton while redirecting
  if (!userId || !canAccessPath(pathname, effectiveRoleKey, chapterSlug, store.session.authRoleKey, isVolunteer, myDelegations)) {
    return <WorkspaceSkeleton />;
  }

  return <>{children}</>;
}
