"use client";

import { use, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
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

  if (!chapter) return <p className="text-[var(--accent)]">Chapter not found</p>;

  const canPublish = hasPermission(
    store,
    store.session.roleKey,
    "announcement.publish",
  );

  const announcements = store.announcements
    .filter(
      (a) =>
        a.audience === "global" ||
        (a.chapterId === chapter.id &&
          ["chapter", "cluster", "executive", "student"].includes(a.audience)),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  function handlePublish() {
    if (!title.trim() || !body.trim()) return;
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
    <div>
      <PageHeader
        title="Announcements"
        description="Broadcast messages — chapter notices, cluster alerts, and executive syncs."
        actions={
          canPublish ? (
            <Button variant="orange" onClick={() => setOpen((v) => !v)}>
              {open ? "Cancel" : "New announcement"}
            </Button>
          ) : null
        }
      />

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
                <option value="chapter">Chapter</option>
                <option value="executive">Executive</option>
                <option value="student">Students</option>
                <option value="cluster">Cluster</option>
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
            <Button variant="primary" onClick={handlePublish}>
              Publish
            </Button>
          </div>
        </TerminalPanel>
      ) : null}

      <TerminalPanel title="Feed" meta={`${announcements.length} messages`}>
        <div className="space-y-4">
          {announcements.map((a) => {
            const author = store.profiles.find((p) => p.id === a.authorId);
            const cluster = a.clusterId
              ? store.clusters.find((c) => c.id === a.clusterId)
              : null;
            return (
              <article
                key={a.id}
                className="rounded-[var(--radius)] border border-border bg-bg p-4"
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
    </div>
  );
}
