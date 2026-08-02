"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

export default function HqAlertsPage() {
  const {
    store,
    createAnnouncement,
    markNotificationRead,
    markAllNotificationsRead,
  } = useStore();
  const { session } = useCurrentUser();
  const canBroadcast = hasPermission(
    store,
    session.roleKey,
    "announcement.publish",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");

  const notifications = useMemo(
    () =>
      store.notifications
        .filter((n) => n.userId === session.userId)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [store.notifications, session.userId],
  );

  const unread = notifications.filter((n) => !n.read).length;

  const networkAnnouncements = useMemo(
    () =>
      store.announcements
        .filter((a) => a.audience === "global")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [store.announcements],
  );

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1600);
  }

  function openBroadcast() {
    setTitle("");
    setBody("");
    setFormError("");
    setDialogOpen(true);
  }

  function publishBroadcast() {
    setFormError("");
    if (!title.trim() || !body.trim()) {
      setFormError("Title and body are required.");
      return;
    }
    const created = createAnnouncement({
      title: title.trim(),
      body: body.trim(),
      audience: "global",
      authorId: session.userId,
    });
    if (!created) {
      setFormError("Could not publish. Check permissions.");
      return;
    }
    setDialogOpen(false);
    flashMsg("Broadcast published");
  }

  return (
    <div>
      <PageHeader
        eyebrow="More"
        title="Alerts"
        description="HQ inbox and network broadcasts — reports, chapter signals, and org-wide announcements."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="text-[12px] text-[var(--accent)]">{flash}</span>
            ) : null}
            {unread > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => markAllNotificationsRead(session.userId)}
              >
                Mark all read
              </Button>
            ) : null}
            {canBroadcast ? (
              <Button type="button" variant="orange" onClick={openBroadcast}>
                Broadcast
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Inbox" value={notifications.length} accent="cyan" />
        <Stat label="Unread" value={unread} accent="orange" />
        <Stat
          label="Network"
          value={networkAnnouncements.length}
          accent="magenta"
        />
      </div>

      <TerminalPanel
        title="Inbox"
        meta={`${unread} unread`}
        className="mt-6"
      >
        {!notifications.length ? (
          <p className="py-6 text-center text-[13px] text-text-mute">
            No alerts for this HQ persona yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={
                  n.read
                    ? "rounded-[var(--radius)] border border-border bg-bg p-4"
                    : "rounded-[var(--radius)] border border-[var(--accent)]/35 bg-[var(--accent-soft)] p-4"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-text">{n.title}</h3>
                    <p className="mt-1 text-[13px] text-text-dim">{n.body}</p>
                    <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={n.read ? "mute" : "orange"}>
                      {n.read ? "read" : "new"}
                    </Badge>
                    {!n.read ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => markNotificationRead(n.id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </div>
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => markNotificationRead(n.id)}
                    className="mt-3 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
                  >
                    Open →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </TerminalPanel>

      <TerminalPanel
        title="Network announcements"
        meta={`${networkAnnouncements.length} global`}
        className="mt-4"
        action={
          canBroadcast ? (
            <button
              type="button"
              onClick={openBroadcast}
              className="text-[12px] font-medium text-[var(--secondary)] hover:underline"
            >
              New broadcast
            </button>
          ) : null
        }
      >
        {!networkAnnouncements.length ? (
          <p className="py-6 text-center text-[13px] text-text-mute">
            No network announcements yet.
            {canBroadcast ? " Publish a broadcast to reach chapters." : ""}
          </p>
        ) : (
          <ul className="space-y-3">
            {networkAnnouncements.map((a) => {
              const author =
                store.profiles.find((p) => p.id === a.authorId)?.fullName ??
                a.authorId;
              return (
                <li
                  key={a.id}
                  className="rounded-[var(--radius)] border border-border bg-bg p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-bold text-text">{a.title}</h3>
                    <Badge tone="magenta">global</Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-text-dim">{a.body}</p>
                  <p className="mt-2 text-[11px] text-text-mute">
                    {author} · {formatDateTime(a.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </TerminalPanel>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Network broadcast"
        description="Publishes a global announcement and notifies HQ plus chapter campus leads."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leadership cycle reminder"
            />
          </div>
          <div>
            <FieldLabel>Body</FieldLabel>
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message for all chapters…"
              rows={5}
            />
          </div>
          {formError ? (
            <p className="text-[12px] text-[var(--danger)]">{formError}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={publishBroadcast}>
              Publish
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
