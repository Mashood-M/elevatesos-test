"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChapterInviteCodeManager } from "@/components/chapter/chapter-invite-code-manager";
import { useStore, useCurrentUser } from "@/context/store-context";
import { resolveChapter } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import { hasExecutiveDelegation } from "@/lib/leadership";
import { deriveChapterShortCode } from "@/lib/chapters";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { ContentSkeleton } from "@/components/layout/workspace-skeleton";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";

export default function ChapterInvitesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    return <ChapterNotFound />;
  }

  const chapterCode = (chapter.shortCode || chapter.slug).toUpperCase();

  if (!isAllowedRole) {
    return (
      <div className="space-y-6 pb-12">
        <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-6 sm:p-8 shadow-[3px_3px_0px_#2d2d34] bauhaus-grid-bg">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-red-500 opacity-10 pointer-events-none select-none" aria-hidden="true" />
          <div className="relative z-10 text-center max-w-md mx-auto py-8">
            <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500 mb-4 border border-red-500/20">
              <ShieldAlert size={28} />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-black text-[#2d2d34]">
              Access Restricted
            </h2>
            <p className="mt-2 text-xs text-[#71717a] font-mono">
              Only Campus Leads, authorized Executive Members, and Class Representatives can access the Chapter Invitations module.
            </p>
            <div className="mt-6">
              <Link
                href={`/chapter/${slug}`}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-[8px] bg-white text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[2px_2px_0px_#2d2d34] hover:bg-[#2d2d34] hover:text-white transition-all"
              >
                <ArrowLeft size={14} />
                Return to Chapter
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const metrics = [
    { num: "01", label: "ACTIVE", value: activeCodes.length, sub: "Valid codes (3-day window)", color: "#f26430" },
    { num: "02", label: "TOTAL", value: chapterCodes.length, sub: "All time batch history", color: "#2d2d34" },
    { num: "03", label: "JOINED", value: totalJoined, sub: "Enrolled via codes", color: "#414066" },
    { num: "04", label: "PREFIX", value: `${shortCode}-`, sub: "Chapter token prefix", color: "#5f7560" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 01. ARCHITECTURAL HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[3px_3px_0px_#2d2d34] bauhaus-grid-bg">
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none" aria-hidden="true" />
        <div className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-10 rotate-45 pointer-events-none select-none" aria-hidden="true" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CAMPUS · {chapterCode} {"//"} INVITATIONS
              </span>
              <span className="hidden sm:inline-block font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {chapter.name}
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Invitation Codes &
              <span className="block text-[#f26430] text-xl sm:text-2xl font-bold mt-0.5">
                STUDENT ONBOARDING
              </span>
            </h1>
            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Generate unique 3-day campus invite codes for students to join your chapter. Restricted to Campus Leads & Class Reps.
            </p>
          </div>

          <Link href={`/chapter/${slug}`}>
            <button
              type="button"
              className="h-9 px-3.5 rounded-[8px] bg-white text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34] hover:bg-[#2d2d34] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              Back to Chapter
            </button>
          </Link>
        </div>
      </section>

      {/* ─── 02. METRIC STRIP ──────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.num} className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between font-mono text-[9.5px] uppercase font-bold" style={{ color: m.color }}>
              <span>{m.num} {"//"} {m.label}</span>
              <span className="h-1.5 w-1.5" style={{ backgroundColor: m.color }} />
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] font-black text-2xl sm:text-3xl text-[#2d2d34] tracking-tight">
              {m.value}
            </p>
            <p className="text-[10.5px] font-mono text-[#52525b] mt-0.5 uppercase">{m.sub}</p>
          </div>
        ))}
      </section>

      {/* ─── 03. INVITE CODE MANAGER ───────────────────────────────── */}
      <ChapterInviteCodeManager chapterId={chapter.id} chapterSlug={chapter.slug} />
    </div>
  );
}

