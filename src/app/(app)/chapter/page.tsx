"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole } from "@/lib/access";

export default function ChapterIndexPage() {
  const router = useRouter();
  const { store } = useStore();
  const { session } = useCurrentUser();

  useEffect(() => {
    const chapter =
      store.chapters.find((c) => c.id === session.chapterId) ??
      store.chapters.find((c) => c.status === "active") ??
      store.chapters[0];

    const slug = chapter?.slug ?? "ekc";
    const target = homeForRole(session.roleKey, slug);
    router.replace(target === "/chapter" || target === "/chapter/" ? `/chapter/${slug}` : target);
  }, [router, session, store.chapters]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center font-mono text-xs text-text-dim">
        Redirecting to chapter...
      </div>
    </div>
  );
}
