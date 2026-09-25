"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { ChapterInviteCodeManager } from "@/components/chapter/chapter-invite-code-manager";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow, resolveChapter } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import { hasExecutiveDelegation } from "@/lib/leadership";
import { deriveChapterShortCode } from "@/lib/chapters";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";

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

  // Access control: Campus Lead, Class Representative, HQ roles, or delegated Executive Members
  const isAllowedRole =
    session.roleKey === "campus_lead" ||
    session.roleKey === "class_representative" ||
    isHqRole(session.roleKey) ||
    (chapter ? hasExecutiveDelegation(store, session.userId, chapter.id, "manage_invites") : false);

  const shortCode = useMemo(() => {
    if (chapter?.shortCode) return chapter.shortCode.trim().toUpperCase();
    if (chapter?.name) return deriveChapterShortCode(chapter.name);
    return "ELV";
  }, [chapter]);

  const chapterCodes = useMemo(() => {
    if (!chapter) return [];
    return (store.chapterInviteCodes ?? []).filter(
      (c) => c.chapterId === chapter.id,
    );
  }, [store.chapterInviteCodes, chapter]);

  const activeCodes = chapterCodes.filter(
    (c) => !c.isRevoked && new Date(c.expiresAt).getTime() > Date.now(),
  );

  const totalJoined = useMemo(() => {
    let count = 0;
    for (const c of chapterCodes) {
      count += c.usesCount || c.joinedUsers?.length || 0;
    }
    return count;
  }, [chapterCodes]);

  if (!mounted) {
    return <ContentSkeleton />;
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
          Only Campus Leads, authorized Executive Members, and Class Representatives can access the Chapter Invitations module and generate unique chapter invite codes.
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
        description="Generate unique 3-day campus invite codes for students to join your chapter. Restricted to Campus Leads & Class Reps."
        actions={
          <Link href={`/chapter/${slug}`}>
            <button className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-bg-panel px-3 py-1.5 text-xs font-semibold text-text hover:bg-bg-hover hover:border-border transition shadow-xs">
              <ArrowLeft size={14} />
              <span>Back to Chapter</span>
            </button>
          </Link>
        }
      />

      {/* 4-Stat Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Active Codes"
          value={activeCodes.length}
          hint="Currently valid (3-day window)"
          accent="orange"
        />
        <Stat
          label="Total Codes Generated"
          value={chapterCodes.length}
          hint="All time batch history"
        />
        <Stat
          label="Students Joined"
          value={totalJoined}
          hint="Enrolled via chapter codes"
        />
        <Stat
          label="Campus Shortcode"
          value={`${shortCode}-`}
          hint="Unique chapter token prefix"
        />
      </div>

      <ChapterInviteCodeManager chapterId={chapter.id} chapterSlug={chapter.slug} />
    </div>
  );
}
