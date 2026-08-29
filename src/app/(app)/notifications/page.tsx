"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { useStore, useCurrentUser } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const { store, markNotificationRead, markAllNotificationsRead } = useStore();
  const { session } = useCurrentUser();

  const notifications = store.notifications
    .filter((n) => n.userId === session.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        eyebrow="More"
        title="Notifications"
        description="Notifications for your current session — reports, registrations, approvals, and certificates."
        actions={
          unread > 0 ? (
            <Button
              variant="ghost"
              onClick={() => markAllNotificationsRead(session.userId)}
            >
              Mark all read
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total" value={notifications.length} />
        <Stat label="Unread" value={unread} />
        <Stat label="Role" value={session.roleKey.replaceAll("_", " ")} />
      </div>

      <TerminalPanel title="Inbox" meta={session.userId} className="mt-6">
        {notifications.length === 0 ? (
          <p className="text-[13px] text-text-dim">No notifications for this persona.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-[var(--radius)] border p-4 ${
                  n.read ? "border-border bg-bg" : "border-[var(--accent)]/35 bg-[var(--accent-soft)]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{n.title}</h3>
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
    </div>
  );
}
