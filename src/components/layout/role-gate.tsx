"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/context/store-context";
import { canAccessPath, homeForRole } from "@/lib/access";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { store } = useStore();
  const { roleKey, chapterId } = store.session;
  const chapterSlug = store.chapters.find((c) => c.id === chapterId)?.slug;

  useEffect(() => {
    if (!canAccessPath(pathname, roleKey, chapterSlug)) {
      router.replace(homeForRole(roleKey, chapterSlug ?? "ekc"));
    }
  }, [pathname, roleKey, chapterSlug, router]);

  if (!canAccessPath(pathname, roleKey, chapterSlug)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-text-mute">
        Redirecting to your workspace…
      </div>
    );
  }

  return <>{children}</>;
}
