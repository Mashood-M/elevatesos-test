"use client";

import { use, useState, useMemo } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useStore, showToast } from "@/context/store-context";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";
import type { AnnouncementAudience } from "@/types";

const audienceBadgeConfig: Record<
  AnnouncementAudience,
  { label: string; dotColor: string; bg: string; text: string; border: string }
> = {
  global: {
    label: "GLOBAL HQ",
    dotColor: "bg-[#f26430]",
    bg: "bg-[#f26430]/10",
    text: "text-[#f26430]",
    border: "border-[#f26430]/30",
  },
  chapter: {
    label: "CAMPUS CHAPTER",
    dotColor: "bg-[#414066]",
    bg: "bg-[#414066]/10",
    text: "text-[#414066]",
    border: "border-[#414066]/30",
  },
  cluster: {
    label: "INTEREST CLUSTER",
    dotColor: "bg-[#5f7560]",
    bg: "bg-[#5f7560]/10",
    text: "text-[#5f7560]",
    border: "border-[#5f7560]/30",
  },
  executive: {
    label: "EXECUTIVE DESK",
    dotColor: "bg-[#f59e0b]",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
    border: "border-[#f59e0b]/40",
  },
  student: {
    label: "STUDENT BODY",
    dotColor: "bg-[#2d2d34]",
    bg: "bg-[#2d2d34]/10",
    text: "text-[#2d2d34]",
    border: "border-[#2d2d34]/30",
  },
};

export default function ChapterAnnouncementsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, createAnnouncement } = useStore();
  const chapter = findChapterBySlugOrId(store.chapters, slug);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("chapter");
  const [filterAudience, setFilterAudience] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const canPublish = hasPermission(
    store,
    store.session.roleKey,
    "announcement.publish",
  );

  const noChapter = !chapter;

  const baseAnnouncements = useMemo(() => {
    return store.announcements
      .filter((a) =>
        noChapter
          ? a.audience === "global"
          : a.audience === "global" ||
            (a.chapterId === chapter!.id &&
              ["chapter", "cluster", "executive", "student"].includes(a.audience)),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [store.announcements, chapter, noChapter]);

  const filteredAnnouncements = useMemo(() => {
    let list = baseAnnouncements;

    if (filterAudience !== "all") {
      list = list.filter((a) => a.audience === filterAudience);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q),
      );
    }

    return list;
  }, [baseAnnouncements, filterAudience, search]);

  const chapterNoticesCount = baseAnnouncements.filter((a) => a.audience === "chapter").length;
  const globalNoticesCount = baseAnnouncements.filter((a) => a.audience === "global").length;

  const outboundLogs = useMemo(() => {
    return (store.outboundMessages ?? []).filter(
      (m) =>
        m.relatedEntity === "announcement" ||
        m.relatedEntity === "registration" ||
        m.relatedEntity === "event",
    );
  }, [store.outboundMessages]);

  function handlePublish() {
    if (!title.trim() || !body.trim()) {
      setFlash("Please provide both a title and notice message.");
      return;
    }
    setFlash("");
    createAnnouncement({
      title: title.trim(),
      body: body.trim(),
      audience,
      chapterId: audience === "global" ? undefined : chapter!.id,
      authorId: store.session.userId,
    });
    showToast("Campus announcement published successfully", "success");
    setTitle("");
    setBody("");
    setOpen(false);
  }

  return (
    <div className="space-y-6 pb-14">
      {/* ─── 01. ARCHITECTURAL HERO BANNER ───────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-8 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-28 w-28 bg-[#414066] opacity-6 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CAMPUS · {(chapter?.shortCode || chapter?.slug || "HQ").toUpperCase()} {"//"} BROADCASTS
              </span>
              <span className="font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                {chapter?.name || "Global Chapter"}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight">
              Announcements &amp; Notices.
            </h1>
            <p className="mt-1.5 text-[13px] text-[#52525b] leading-relaxed">
              Broadcast campus alerts, cluster roadmaps, executive briefings,
              and network-wide community bulletins.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canPublish && !noChapter && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} />
                New Announcement
              </button>
            )}

            {noChapter && (
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="h-9 px-4 rounded-[8px] bg-[#414066] hover:bg-[#343353] text-white font-mono text-[11.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-[#f59e0b]" />
                Join Chapter
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── 02. METRIC STRIP ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>01 // TOTAL BROADCASTS</span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {baseAnnouncements.length}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            All Active Notices
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>02 // CAMPUS LOCAL</span>
            <span className="h-2 w-2 rounded-[2px] bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#414066]">
            {chapterNoticesCount}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Local Chapter Bulletins
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>03 // GLOBAL HQ</span>
            <span className="h-2 w-2 bg-[#5f7560] rotate-45" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#5f7560]">
            {globalNoticesCount}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Network Bulletins
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>04 // DISPATCH LOGS</span>
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {outboundLogs.length}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Delivery Dispatches
          </p>
        </div>
      </section>

      {/* ─── 03. PUBLISH DIALOG / DRAWER ──────────────────────────────── */}
      {open && (
        <section className="rounded-[16px] border-2 border-[#2d2d34] bg-white p-5 sm:p-6 shadow-[4px_4px_0px_#2d2d34] space-y-4">
          <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f26430]" />
              <h3 className="font-mono text-[12px] font-bold uppercase tracking-wider text-[#2d2d34]">
                PUBLISH CAMPUS ANNOUNCEMENT
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#71717a] hover:text-[#2d2d34] p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34] mb-1.5">
                Notice Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next Chapter General Assembly"
                className="w-full h-10 px-3 rounded-[8px] bg-[#faf9f6] border border-[#2d2d34]/30 font-sans text-[13px] text-[#2d2d34] focus:outline-none focus:border-[#f26430] shadow-[1px_1px_0px_#2d2d34]"
              />
            </div>

            <div>
              <label className="block font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34] mb-1.5">
                Target Audience *
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
                className="w-full h-10 px-3 rounded-[8px] bg-[#faf9f6] border border-[#2d2d34]/30 font-mono text-[12px] font-bold uppercase text-[#2d2d34] focus:outline-none focus:border-[#f26430] shadow-[1px_1px_0px_#2d2d34]"
              >
                <option value="chapter">CAMPUS CHAPTER ({chapter?.name})</option>
                <option value="executive">CHAPTER EXECUTIVE LEADERSHIP</option>
                <option value="student">STUDENT MEMBERS ONLY</option>
                <option value="cluster">INTEREST CLUSTERS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34] mb-1.5">
              Notice Content *
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Provide exact event timings, venue rooms, agenda bullet points, and contact guidelines..."
              className="w-full p-3 rounded-[8px] bg-[#faf9f6] border border-[#2d2d34]/30 font-sans text-[13px] text-[#2d2d34] focus:outline-none focus:border-[#f26430] shadow-[1px_1px_0px_#2d2d34]"
            />
          </div>

          {flash && (
            <p className="font-mono text-[11px] font-bold text-[#b91c1c] bg-red-50 p-2 rounded-[6px] border border-red-200">
              {flash}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8.5 px-3.5 rounded-[8px] bg-white hover:bg-[#f3f4f6] text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handlePublish}
              className="h-8.5 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Send size={13} />
              Publish Announcement
            </button>
          </div>
        </section>
      )}

      {/* ─── 04. SEARCH & FILTER STRIP ─────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-[12px] border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34]">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Bulletins" },
            { id: "chapter", label: "Campus" },
            { id: "global", label: "Global HQ" },
            { id: "executive", label: "Executive" },
          ].map((tab) => {
            const isActive = filterAudience === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterAudience(tab.id)}
                className={`h-7.5 px-3 rounded-[6px] font-mono text-[10.5px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                    : "bg-[#faf9f6] text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34] hover:text-[#2d2d34]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717a]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bulletins..."
            className="w-full h-8 pl-8 pr-3 rounded-[6px] bg-[#faf9f6] border border-[#2d2d34]/20 font-mono text-[11px] text-[#2d2d34] focus:outline-none focus:border-[#f26430]"
          />
        </div>
      </section>

      {/* ─── 05. BROADCAST FEED ────────────────────────────────────────── */}
      {filteredAnnouncements.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#2d2d34]/30 bg-white p-12 text-center shadow-[1.5px_1.5px_0px_rgba(45,45,52,0.05)]">
          <div className="h-12 w-12 rounded-full bg-[#faf9f6] border border-[#2d2d34]/20 flex items-center justify-center mx-auto mb-3 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <Megaphone size={22} className="text-[#71717a]" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
            No Announcements Found
          </h3>
          <p className="mt-1 max-w-sm mx-auto text-[12.5px] text-[#71717a]">
            {search
              ? "No notices match your search keywords. Try adjusting your query."
              : "No announcements have been published to this campus feed yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAnnouncements.map((a, idx) => {
            const author = store.profiles.find((p) => p.id === a.authorId);
            const cluster = a.clusterId
              ? store.clusters.find((c) => c.id === a.clusterId)
              : null;
            const badge = audienceBadgeConfig[a.audience] || audienceBadgeConfig.student;
            const authorInitials = initials(author?.fullName || "AU");

            return (
              <article
                key={a.id}
                className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] transition-all"
              >
                {/* Header with Title and Audience Stamp */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#2d2d34] text-white border border-[#2d2d34] shadow-[1px_1px_0px_#f26430] flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                      {authorInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-[4px] border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dotColor}`} />
                          {badge.label}
                        </span>
                        <span className="font-mono text-[10px] text-[#71717a]">
                          {"//"} 0{idx + 1}
                        </span>
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-black text-[#2d2d34] leading-snug">
                        {a.title}
                      </h3>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] text-[#71717a] shrink-0">
                    {formatDateTime(a.createdAt)}
                  </span>
                </div>

                {/* Body Content */}
                <div className="mt-3.5 pl-0 sm:pl-12 text-[13px] text-[#3f3f46] leading-relaxed whitespace-pre-line">
                  {a.body}
                </div>

                {/* Footer Metadata */}
                <div className="mt-4 pt-3 border-t border-[#2d2d34]/15 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[#71717a]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2d2d34]">
                      {author?.fullName || "Elevates Administrator"}
                    </span>
                    {cluster && (
                      <>
                        <span>·</span>
                        <span className="text-[#f26430]">{cluster.name} Cluster</span>
                      </>
                    )}
                  </div>
                  <span>OFFICIAL DISPATCH RECORD</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Join Chapter Modal */}
      <ChapterJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}
