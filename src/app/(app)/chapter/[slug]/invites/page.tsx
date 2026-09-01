"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ChapterInviteCodeManager } from "@/components/chapter/chapter-invite-code-manager";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow, resolveChapter } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function ChapterInvitesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { slug } = use(params);
  const { store } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);

  // Access control: Campus Lead, Class Representative, and HQ roles ONLY
  const isAllowedRole =
    session.roleKey === "campus_lead" ||
    session.roleKey === "class_representative" ||
    isHqRole(session.roleKey);

  if (!mounted) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-xs text-text-dim animate-pulse">Loading invite codes...</p>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="py-20 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-bold text-text">Chapter not found</p>
        <p className="mt-2 text-xs text-text-dim max-w-md mx-auto">
          This campus chapter is not found or inaccessible.
        </p>
      </div>
    );
  }

  if (!isAllowedRole) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-400 mb-4">
          <ShieldAlert size={28} />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-text">
          Access Restricted
        </h2>
        <p className="mt-2 text-xs text-text-dim">
          Only Campus Leads and Class Representatives can access the Chapter Invitations module and generate unique chapter invite codes.
        </p>
        <div className="mt-6">
          <Link
            href={`/chapter/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            <ArrowLeft size={14} />
            <span>Return to Chapter Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Chapter Invitations & Codes"
        description="Generate unique, random 3-day college invite codes for students to join your chapter. Restricted to Campus Leads & Class Reps."
        actions={
          <Link href={`/chapter/${slug}`}>
            <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-bg-hover transition">
              <ArrowLeft size={14} />
              <span>Back to Chapter</span>
            </button>
          </Link>
        }
      />

      <ChapterInviteCodeManager chapterId={chapter.id} chapterSlug={chapter.slug} />
    </div>
  );
}
