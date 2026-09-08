"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/context/store-context";
import { isHqRole } from "@/lib/permissions";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";

interface Props {
  title?: string;
  description?: string;
}

export function ChapterNotFound({
  title = "Join chapter to see",
  description = "You need to join a college chapter or enter an invite code to access this workspace and its notices.",
}: Props) {
  const { session } = useCurrentUser();
  const [modalOpen, setModalOpen] = useState(false);
  const isHq = isHqRole(session?.roleKey);

  return (
    <div className="py-20 text-center max-w-md mx-auto px-4">
      <p className="font-[family-name:var(--font-display)] text-xl font-bold text-text">
        {isHq ? "Chapter not found" : title}
      </p>
      <p className="mt-2 text-xs text-text-dim leading-relaxed">
        {isHq
          ? "This campus chapter is not yet registered or opened. HQ and HQ Admins only can manage un-opened chapters."
          : description}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        {isHq ? (
          <Link href="/hq/chapters">
            <Button variant="primary" className="text-xs">
              Back to network →
            </Button>
          </Link>
        ) : (
          <>
            <Button
              variant="orange"
              className="text-xs"
              onClick={() => setModalOpen(true)}
            >
              🔑 Join chapter with code
            </Button>
            <Link href="/chapter">
              <Button variant="ghost" className="text-xs">
                Student Hub
              </Button>
            </Link>
          </>
        )}
      </div>
      <ChapterJoinModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
