"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, useStore } from "@/context/store-context";

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { session } = useCurrentUser();
  const { store } = useStore();

  useEffect(() => {
    if (!session.userId) return;
    const myProfile = store.profiles.find(
      (p) => p.id === session.userId || p.elevatesId === session.userId,
    );
    const targetId = myProfile?.elevatesId || session.userId;
    router.replace(`/profile/${targetId}`);
  }, [session.userId, store.profiles, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl bg-bg-panel px-5 py-4 shadow-sm border border-border">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        <span className="text-sm font-medium text-text-dim">Loading your profile…</span>
      </div>
    </div>
  );
}
