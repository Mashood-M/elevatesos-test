"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";
import {
  Megaphone,
  Plus,
  Send,
  Globe,
  Building,
  Shield,
  Users,
  MessageSquare,
  Sparkles,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import type { AnnouncementAudience } from "@/types";

const audienceTone: Record<
  AnnouncementAudience,
  "cyan" | "magenta" | "green" | "orange" | "mute"
> = {
  global: "cyan",
  chapter: "orange",
  cluster: "green",
  executive: "magenta",
  student: "mute",
};

export default function ChapterAnnouncementsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, createAnnouncement } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("chapter");
  const [flash, setFlash] = useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const canPublish = hasPermission(
    store,
    store.session.roleKey,
    "announcement.publish",
  );

  const noChapter = !chapter;

  const announcements = useMemo(() => {
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

  const chapterNoticesCount = useMemo(() => {
    return announcements.filter((a) => a.audience === "chapter").length;
  }, [announcements]);

  const globalNoticesCount = useMemo(() => {
    return announcements.filter((a) => a.audience === "global").length;
  }, [announcements]);

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
      setFlash("Please provide both a title and message content.");
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
    setTitle("");
    setBody("");
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(store.session.roleKey, "people")}
        title="Announcements & Notices"
        description="Broadcast campus alerts, cluster updates, executive briefings, and network-wide community bulletins."
        actions={
          canPublish && !noChapter ? (
            <Button
              variant="orange"
              onClick={() => setOpen(true)}
              className="gap-1.5 shadow-sm text-xs sm:text-sm font-bold"
            >
              <Plus size={15} />
              New Announcement
            </Button>
          ) : null
        }
      />

      {/* 4-Stat Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Total Broadcasts"
          value={announcements.length}
          hint="All active notices"
        />
        <Stat
          label="Campus Bulletins"
          value={chapterNoticesCount}
          hint="Local to this chapter"
          accent="orange"
        />
        <Stat
          label="HQ Global Alerts"
          value={globalNoticesCount}
          hint="Network-wide updates"
        />
        <Stat
          label="Outbound Delivery Logs"
          value={outboundLogs.length}
          hint="WhatsApp & email dispatch"
        />
      </div>

      {/* Join-chapter banner for unchaptered students */}
      {noChapter && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--accent)]/30 bg-[var(--accent)]/[0.04] p-4 sm:p-5 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--accent)]" />
              <span>Join a College Chapter</span>
            </h3>
            <p className="text-xs text-text-dim mt-1 max-w-xl">
              You are currently viewing network-wide global announcements. Join your college chapter to receive campus notices, track events, and participate in interest clusters.
            </p>
          </div>
          <Button
            variant="orange"
            className="shrink-0 h-8 px-4 text-xs font-bold shadow-xs"
            onClick={() => setIsJoinModalOpen(true)}
          >
            Join Chapter
          </Button>
        </div>
      )}

      {/* Broadcast Feed */}
      <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 sm:p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-[var(--accent)]" />
            <h2 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-text">
              Live Feed
            </h2>
            <span className="rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-semibold text-text-dim tabular-nums">
              {announcements.length} messages
            </span>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-border py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-border/40 text-text-dim mb-3">
              <MessageSquare size={22} />
            </div>
            <h4 className="font-[family-name:var(--font-display)] text-sm font-bold text-text">
              No announcements yet
            </h4>
            <p className="mt-1 text-xs text-text-dim max-w-sm mx-auto">
              {noChapter
                ? "No global HQ notices at this time. Check back soon or join your campus chapter."
                : "Your leadership team has not posted any announcements yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => {
              const author = store.profiles.find((p) => p.id === a.authorId);
              const cluster = a.clusterId
                ? store.clusters.find((c) => c.id === a.clusterId)
                : null;
              const authorInitials = initials(author?.fullName || "AU");

              return (
                <article
                  key={a.id}
                  className="rounded-[var(--radius)] border border-border/70 bg-bg p-4 sm:p-5 shadow-[var(--shadow-sm)] hover:border-border transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-bold text-[var(--accent)] border border-[var(--accent)]/20">
                        {authorInitials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-text leading-tight">
                          {a.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-dim">
                          <span className="font-medium text-text">{author?.fullName || "Admin"}</span>
                          {cluster && (
                            <>
                              <span>&bull;</span>
                              <span className="text-[var(--accent)]">{cluster.name} Cluster</span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span className="font-mono text-[11px] text-text-mute">
                            {formatDateTime(a.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge tone={audienceTone[a.audience]} className="text-[10px] font-semibold">
                      {a.audience}
                    </Badge>
                  </div>

                  <p className="mt-3.5 text-xs sm:text-sm text-text-dim leading-relaxed whitespace-pre-line pl-12">
                    {a.body}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Outbound Dispatch Queue Log */}
      {canPublish && (
        <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 sm:p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Send size={15} className="text-[var(--accent)]" />
                <span>Outbound Message Logs</span>
              </h3>
              <p className="mt-0.5 text-xs text-text-dim">
                Delivery audit trail for notifications, WhatsApp alerts, and emails dispatched to chapter members.
              </p>
            </div>
            <Badge tone="mute" className="text-[10px]">
              {outboundLogs.length} logged
            </Badge>
          </div>

          {outboundLogs.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-border py-8 text-center text-text-dim text-xs">
              No outbound messages dispatched yet.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {outboundLogs.slice(0, 20).map((m) => (
                <div
                  key={m.id}
                  className="rounded-[var(--radius-sm)] border border-border/60 bg-bg px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={m.channel === "whatsapp" ? "green" : "cyan"} className="text-[10px]">
                      {m.channel}
                    </Badge>
                    <span className="font-semibold text-text">{m.title}</span>
                    <span className="text-text-dim text-[11px]">&rarr; {m.toAddress}</span>
                  </div>
                  <span className="font-mono text-[10px] text-text-mute capitalize">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Announcement Dialog */}
      <Dialog
        open={open && canPublish}
        onClose={() => setOpen(false)}
        title="Broadcast New Announcement"
        description="Compose an update to broadcast across your campus, leadership team, or the general student body."
        className="max-w-lg"
      >
        <div className="space-y-3.5 mt-2">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hackathon Registration Now Open"
              className="text-xs sm:text-sm h-9.5 rounded-[var(--radius-sm)]"
            />
          </div>
          <div>
            <FieldLabel>Target Audience</FieldLabel>
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
              className="text-xs sm:text-sm h-9.5 rounded-[var(--radius-sm)]"
            >
              <option value="chapter">Campus Chapter (All Students & Leads)</option>
              <option value="executive">Executive Desk (Chair, Leads, Secretary)</option>
              <option value="student">Students Only</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Message Content</FieldLabel>
            <TextArea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Provide all essential details, event links, and instructions..."
              className="text-xs sm:text-sm rounded-[var(--radius-sm)]"
            />
          </div>

          {flash && (
            <p className="text-xs font-semibold text-red-500">{flash}</p>
          )}

          <div className="mt-5 flex justify-end gap-2 border-t border-border/80 pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="orange" onClick={handlePublish} className="font-bold">
              Broadcast Message
            </Button>
          </div>
        </div>
      </Dialog>

      <ChapterJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}
