"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { cn, formatDateTime } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Calendar,
  Award,
  FileText,
  Search,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type FilterTab = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { store, markNotificationRead, markAllNotificationsRead } = useStore();
  const { session } = useCurrentUser();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const notifications = useMemo(() => {
    return (store.notifications ?? [])
      .filter((n) => n.userId === session.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [store.notifications, session.userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === "unread" && n.read) return false;
      if (filter === "read" && !n.read) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q)
      );
    });
  }, [notifications, filter, search]);

  const latestTime = notifications[0]?.createdAt
    ? formatDateTime(notifications[0].createdAt)
    : "No activity";

  function getNotificationIcon(title: string, body: string) {
    const text = (title + " " + body).toLowerCase();
    if (text.includes("certificate") || text.includes("credential")) {
      return <Award size={16} className="text-amber-500" />;
    }
    if (text.includes("event") || text.includes("session") || text.includes("workshop")) {
      return <Calendar size={16} className="text-[var(--accent)]" />;
    }
    if (text.includes("approval") || text.includes("confirmed") || text.includes("approved")) {
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    }
    if (text.includes("report") || text.includes("form")) {
      return <FileText size={16} className="text-cyan-500" />;
    }
    return <Bell size={16} className="text-[var(--accent)]" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activity"
        title="Notifications & Alerts"
        description="System alerts, attendance updates, event passes, report approvals, and verified certificates for your account."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              onClick={() => markAllNotificationsRead(session.userId)}
              className="gap-1.5 border border-border/70 hover:bg-bg-panel text-xs sm:text-sm font-semibold"
            >
              <CheckCheck size={15} />
              Mark All Read
            </Button>
          ) : null
        }
      />

      {/* 4-Stat Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Total Inbox"
          value={notifications.length}
          hint="All time alerts"
        />
        <Stat
          label="Unread Alerts"
          value={unreadCount}
          hint="Requiring attention"
          accent="orange"
        />
        <Stat
          label="Active Persona"
          value={session.roleKey.replaceAll("_", " ")}
          hint="Logged in role"
        />
        <Stat
          label="Latest Activity"
          value={unreadCount > 0 ? `${unreadCount} New` : "Caught Up"}
          hint={latestTime}
        />
      </div>

      {/* Notifications Workspace */}
      <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow-sm)]">
        {/* Search & Segmented Filter Bar */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={15} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="pl-9 pr-8 h-9.5 rounded-[var(--radius-sm)] bg-bg border-border/70 text-xs sm:text-sm"
              aria-label="Search notifications"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-1"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "all", label: "All", count: notifications.length },
              { key: "unread", label: "Unread", count: unreadCount },
              { key: "read", label: "Read", count: readCount },
            ].map((tab) => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key as FilterTab)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-text text-bg shadow-sm"
                      : "bg-bg border border-border/70 text-text-dim hover:text-text hover:border-border",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums",
                      isActive
                        ? "bg-bg/20 text-bg"
                        : "bg-border/60 text-text-dim",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-border/40 text-text-dim mb-3">
              <Bell size={22} />
            </div>
            <h4 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
              No notifications yet
            </h4>
            <p className="mt-1 text-xs text-text-dim max-w-sm mx-auto">
              You are all caught up. Updates on registrations, reports, and campus events will appear here.
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border py-12 text-center">
            <p className="text-sm font-semibold text-text">No matching notifications</p>
            <p className="mt-1 text-xs text-text-dim">
              Try adjusting your search keywords or switching filters.
            </p>
            <Button
              variant="ghost"
              className="mt-3 text-xs border border-border/70 hover:bg-bg"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
            >
              Clear Filters & Search
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const icon = getNotificationIcon(n.title, n.body);
              const isUnread = !n.read;

              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative rounded-[var(--radius)] border p-4 transition-all",
                    isUnread
                      ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.03] shadow-2xs"
                      : "border-border/70 bg-bg hover:border-border hover:bg-bg/80",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isUnread ? "bg-[var(--accent)]/10" : "bg-border/40",
                        )}
                      >
                        {icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={cn(
                              "text-xs sm:text-sm tracking-[-0.01em] truncate",
                              isUnread ? "font-bold text-text" : "font-semibold text-text/90",
                            )}
                          >
                            {n.title}
                          </h3>
                          {isUnread && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-text-dim leading-relaxed">
                          {n.body}
                        </p>
                        <p className="mt-2 text-[11px] text-text-mute font-mono">
                          {formatDateTime(n.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          className="h-7 px-2.5 text-[11px] border border-border/70 hover:bg-bg-panel"
                          onClick={() => markNotificationRead(n.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                      {n.href && (
                        <Link
                          href={n.href}
                          onClick={() => markNotificationRead(n.id)}
                        >
                          <Button
                            variant="secondary"
                            className="h-7 px-3 text-[11px] gap-1 font-semibold"
                          >
                            <span>Open</span>
                            <ArrowRight size={12} />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
