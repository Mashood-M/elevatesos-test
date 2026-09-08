"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { ChapterJoinModal } from "@/components/chapter/chapter-join-modal";
import type { AnnouncementAudience } from "@/types";

const audienceTone: Record<
  AnnouncementAudience,
  "cyan" | "magenta" | "green" | "orange" | "mute"
> = {
  global: "cyan",
  chapter: "magenta",
  cluster: "green",
  executive: "orange",
  student: "mute",
};

export default function AnnouncementsPage() {
  const { store, createAnnouncement } = useStore();
  const { session } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("global");
  const [flash, setFlash] = useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const userChapterId = session.chapterId;
  const chapter = userChapterId ? store.chapters.find((c) => c.id === userChapterId) : null;
  const noChapter = !chapter && !isHqRole(session.roleKey);

  const canPublish = hasPermission(
    store,
    session.roleKey,
    "announcement.publish",
  );

  // If no chapter resolved, show only global (HQ) announcements + join banner
  const announcements = store.announcements
    .filter((a) =>
      noChapter
        ? a.audience === "global"
        : a.audience === "global" ||
          (chapter && a.chapterId === chapter.id &&
            ["chapter", "cluster", "executive", "student"].includes(a.audience)),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  function handlePublish() {
    if (!title.trim() || !body.trim()) {
      setFlash("Title and body are required.");
      return;
    }
    setFlash("");
    createAnnouncement({
      title: title.trim(),
      body: body.trim(),
      audience,
      chapterId: audience === "global" ? undefined : chapter?.id,
      authorId: session.userId,
    });
    setTitle("");
    setBody("");
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Announcements"
        description="Broadcast messages — official notices from Elevates HQ and campus updates."
        actions={
          canPublish && (!noChapter || isHqRole(session.roleKey)) ? (
            <Button variant="orange" onClick={() => setOpen((v) => !v)}>
              {open ? "Cancel" : "New announcement"}
            </Button>
          ) : noChapter ? (
            <Button variant="orange" onClick={() => setIsJoinModalOpen(true)}>
              🔑 Join chapter with code
            </Button>
          ) : null
        }
      />

      {/* Join-chapter banner for unchaptered students */}
      {noChapter && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-text">
              Join chapter to see
            </p>
            <p className="text-[12px] text-text-dim mt-0.5">
              Showing HQ network announcements. Join a college chapter to view your campus notices, cluster alerts, and team updates.
            </p>
          </div>
          <Button
            variant="primary"
            className="shrink-0 h-8 px-4 text-[12px]"
            onClick={() => setIsJoinModalOpen(true)}
          >
            🔑 Join chapter
          </Button>
        </div>
      )}

      {open ? (
        <TerminalPanel title="Publish" className="mb-4">
          <div className="space-y-3">
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Workshop this Friday"
              />
            </div>
            <div>
              <FieldLabel>Audience</FieldLabel>
              <Select
                value={audience}
                onChange={(e) =>
                  setAudience(e.target.value as AnnouncementAudience)
                }
              >
                {isHqRole(session.roleKey) && <option value="global">Global (HQ Network)</option>}
                {chapter && (
                  <>
                    <option value="chapter">Chapter</option>
                    <option value="executive">Executive</option>
                    <option value="student">Students</option>
                  </>
                )}
              </Select>
            </div>
            <div>
              <FieldLabel>Body</FieldLabel>
              <TextArea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What should people know?"
              />
            </div>
            {flash ? (
              <p className="text-[13px] text-[var(--accent)]">{flash}</p>
            ) : null}
            <Button variant="primary" onClick={handlePublish}>
              Publish
            </Button>
          </div>
        </TerminalPanel>
      ) : null}

      <TerminalPanel title="Feed" meta={`${announcements.length} messages`}>
        {announcements.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[13px] text-text-dim">
              {noChapter
                ? "No HQ announcements yet. Join a chapter to see chapter notices."
                : "No announcements yet."}
            </p>
            {noChapter && (
              <Button
                variant="ghost"
                className="mt-3 text-xs"
                onClick={() => setIsJoinModalOpen(true)}
              >
                Enter invite code →
              </Button>
            )}
          </div>
        ) : null}
        <div className="space-y-4">
          {announcements.map((a) => {
            const author = store.profiles.find((p) => p.id === a.authorId);
            const cluster = a.clusterId
              ? store.clusters.find((c) => c.id === a.clusterId)
              : null;
            return (
              <article
                key={a.id}
                className="rounded-[var(--radius)] bg-bg-panel shadow-[var(--shadow)] bg-bg p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
                    {a.title}
                  </h3>
                  <Badge tone={audienceTone[a.audience]}>{a.audience}</Badge>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-text-dim">
                  {a.body}
                </p>
                <p className="mt-3 text-[11px] text-text-mute">
                  {author?.fullName}
                  {cluster ? ` · ${cluster.name} cluster` : ""}
                  {" · "}
                  {formatDateTime(a.createdAt)}
                </p>
              </article>
            );
          })}
        </div>
      </TerminalPanel>

      <ChapterJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}
