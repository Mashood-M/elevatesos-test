"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isHqRole } from "@/lib/permissions";

export default function ChapterIndexPage() {
  const router = useRouter();
  const { store, hydrated } = useStore();
  const { session } = useCurrentUser();

  useEffect(() => {
    if (!hydrated) return;

    // HQ roles redirect to HQ dashboard
    if (isHqRole(session.roleKey)) {
      router.replace("/hq");
      return;
    }

    // If student has an assigned chapter, redirect to that chapter
    if (session.chapterId) {
      const assignedChapter = store.chapters.find((c) => c.id === session.chapterId);
      if (assignedChapter?.slug) {
        router.replace(`/chapter/${assignedChapter.slug}`);
        return;
      }
    }

    // Independent student (no chapter assigned yet) -> show active chapter's public events/workspace
    const fallbackChapter =
      store.chapters.find((c) => c.status === "active") ??
      store.chapters[0];

    const slug = fallbackChapter?.slug ?? "eranad-knowledge-city";
    router.replace(`/chapter/${slug}`);
  }, [router, session, store.chapters, hydrated]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center font-mono text-xs text-text-dim">
        Redirecting to workspace...
      </div>
    </div>
  );
}
