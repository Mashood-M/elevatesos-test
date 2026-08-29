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

    const chapter =
      store.chapters.find((c) => c.id === session.chapterId) ??
      store.chapters.find((c) => c.status === "active") ??
      store.chapters[0];

    const slug = chapter?.slug ?? "eranad-knowledge-city";

    if (isHqRole(session.roleKey)) {
      router.replace("/hq");
      return;
    }

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
