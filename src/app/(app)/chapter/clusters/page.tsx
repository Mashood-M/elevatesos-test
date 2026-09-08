"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, useStore } from "@/context/store-context";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";

export default function ChapterClustersFallbackPage() {
  const router = useRouter();
  const { store } = useStore();
  const { session } = useCurrentUser();

  useEffect(() => {
    if (session.chapterId) {
      const chapter = store.chapters.find(
        (c) => c.id === session.chapterId || c.slug === session.chapterId,
      );
      if (chapter?.slug) {
        router.replace(`/chapter/${chapter.slug}/clusters`);
      }
    }
  }, [router, session.chapterId, store.chapters]);

  return (
    <ChapterNotFound
      title="Join chapter to see"
      description="You need to join a college chapter or enter an invite code to view chapter learning clusters and builder tracks."
    />
  );
}
