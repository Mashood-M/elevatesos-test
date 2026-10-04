"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  FileText,
  Search,
  X,
  ArrowRight,
} from "lucide-react";
import { useStore, useCurrentUser, showToast } from "@/context/store-context";
import { cn, formatDateTime } from "@/lib/utils";

type FilterTab = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { store, markNotificationRead, markAllNotificationsRead } = useStore();
  const { session } = useCurrentUser();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const notifications = useMemo(() => {
    return (store.notifications ?? [])
      .filter((n) => n.userId === session.userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
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
    : "Standby";

  function getNotificationIcon(title: string, body: string) {
    const text = (title + " " + body).toLowerCase();
    if (text.includes("certificate") || text.includes("credential")) {
      return {
        icon: Award,
        color: "text-[#f59e0b]",
        bg: "bg-[#f59e0b]/10",
        border: "border-[#f59e0b]/30",
      };
    }
    if (
      text.includes("event") ||
      text.includes("session") ||
      text.includes("workshop") ||
      text.includes("lab")
    ) {
      return {
        icon: Calendar,
        color: "text-[#f26430]",
        bg: "bg-[#f26430]/10",
        border: "border-[#f26430]/30",
      };
    }
    if (
      text.includes("approval") ||
      text.includes("confirmed") ||
      text.includes("approved") ||
      text.includes("attendance")
    ) {
      return {
        icon: CheckCircle2,
        color: "text-[#5f7560]",
        bg: "bg-[#5f7560]/10",
        border: "border-[#5f7560]/30",
      };
    }
    if (text.includes("report") || text.includes("form") || text.includes("survey")) {
      return {
        icon: FileText,
        color: "text-[#414066]",
        bg: "bg-[#414066]/10",
        border: "border-[#414066]/30",
      };
    }
    return {
      icon: Bell,
      color: "text-[#f26430]",
      bg: "bg-[#f26430]/10",
      border: "border-[#f26430]/30",
    };
  }

  const handleMarkAll = () => {
    markAllNotificationsRead(session.userId);
    showToast("All notifications marked as read", "info");
  };

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
                ACTIVITY STREAM // INBOX ALERTS
              </span>
              <span className="font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                PERSONAL DISPATCH LOG
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight">
              Notifications &amp; Activity.
            </h1>
            <p className="mt-1.5 text-[13px] text-[#52525b] leading-relaxed">
              Real-time audit updates, attendance verifications, ticket passes,
              report reviews, and campus announcements sent to your account.
            </p>
          </div>

          {/* Mark All Read CTA */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="h-9 px-4 rounded-[8px] bg-white hover:bg-[#f3f4f6] text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <CheckCheck size={14} className="text-[#5f7560]" />
              Mark All As Read ({unreadCount})
            </button>
          )}
        </div>
      </section>

      {/* ─── 02. METRIC STRIP ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>01 // TOTAL INBOX</span>
            <span className="h-2 w-2 rounded-full bg-[#2d2d34]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {notifications.length}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            All-Time Records
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>02 // UNREAD ALERTS</span>
            <span className="h-2 w-2 rounded-[2px] bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#f26430]">
            {unreadCount}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Requires Review
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>03 // ACTIVE ROLE</span>
            <span className="h-2 w-2 bg-[#414066] rotate-45" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-black text-[#414066] uppercase truncate">
            {session.roleKey.replace("_", " ")}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">
            Authenticated Profile
          </p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>04 // DISPATCH PULSE</span>
            <span className="h-2 w-2 rounded-full bg-[#5f7560]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#5f7560]">
            {unreadCount > 0 ? "ATTENTION" : "CAUGHT UP"}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase truncate">
            {latestTime}
          </p>
        </div>
      </section>

      {/* ─── 03. SEARCH & SEGMENTED FILTER BAR ────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-[12px] border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34]">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "all", label: "All Activity", count: notifications.length },
            { key: "unread", label: "Unread", count: unreadCount },
            { key: "read", label: "Read / Archive", count: readCount },
          ].map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key as FilterTab)}
                className={`h-7.5 px-3 rounded-[6px] font-mono text-[10.5px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                    : "bg-[#faf9f6] text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34] hover:text-[#2d2d34]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[9.5px] px-1 rounded-[3px] ${
                    isActive ? "bg-white/20 text-white" : "bg-[#2d2d34]/10 text-[#52525b]"
                  }`}
                >
                  {tab.count}
                </span>
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
            placeholder="Search alerts & tickets..."
            className="w-full h-8 pl-8 pr-7 rounded-[6px] bg-[#faf9f6] border border-[#2d2d34]/20 font-mono text-[11px] text-[#2d2d34] focus:outline-none focus:border-[#f26430]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#2d2d34]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </section>

      {/* ─── 04. NOTIFICATIONS FEED ───────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#2d2d34]/30 bg-white p-12 text-center shadow-[1.5px_1.5px_0px_rgba(45,45,52,0.05)]">
          <div className="h-12 w-12 rounded-full bg-[#faf9f6] border border-[#2d2d34]/20 flex items-center justify-center mx-auto mb-3 shadow-[1.5px_1.5px_0px_#2d2d34]">
            <Bell size={22} className="text-[#71717a]" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
            Your Inbox Is Clear
          </h3>
          <p className="mt-1 max-w-sm mx-auto text-[12.5px] text-[#71717a]">
            You have no notifications yet. System confirmations, credential issuances, and chapter broadcasts will appear here in real time.
          </p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#2d2d34]/30 bg-white p-10 text-center shadow-[1.5px_1.5px_0px_rgba(45,45,52,0.05)]">
          <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
            No Matching Notifications
          </h4>
          <p className="mt-1 text-[12.5px] text-[#71717a]">
            No activity matches your search keywords or filter status.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
            className="mt-3.5 h-8 px-3.5 rounded-[6px] bg-[#faf9f6] hover:bg-[#f3f4f6] text-[#2d2d34] font-mono text-[11px] font-bold uppercase border border-[#2d2d34]/30 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n, idx) => {
            const { icon: IconComponent, color, bg, border } = getNotificationIcon(
              n.title,
              n.body,
            );
            const isUnread = !n.read;

            return (
              <div
                key={n.id}
                className={cn(
                  "group relative overflow-hidden rounded-[14px] border p-4 sm:p-4.5 transition-all",
                  isUnread
                    ? "bg-white border-[#2d2d34] border-l-4 border-l-[#f26430] shadow-[2.5px_2.5px_0px_#2d2d34]"
                    : "bg-[#faf9f6] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1.5px_1.5px_0px_rgba(45,45,52,0.08)]",
                )}
              >
                <div className="flex items-start justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Icon Container */}
                    <div
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-[8px] border flex items-center justify-center shadow-[1px_1px_0px_#2d2d34]",
                        bg,
                        border,
                        color,
                      )}
                    >
                      <IconComponent size={17} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-[#71717a]">
                          {"//"} 0{idx + 1}
                        </span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#f26430] text-white">
                            NEW
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-[#71717a]">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </div>

                      <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-[#2d2d34] leading-snug">
                        {n.title}
                      </h3>

                      <p className="mt-1 text-[12.5px] text-[#52525b] leading-relaxed">
                        {n.body}
                      </p>

                      {/* Action Link if target exists */}
                      {n.href && (
                        <Link
                          href={n.href}
                          className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#f26430] hover:text-[#d85322] uppercase tracking-wider"
                        >
                          Open Resource
                          <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Mark as read button if unread */}
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="shrink-0 h-7 w-7 rounded-[6px] border border-[#2d2d34]/30 bg-white hover:bg-[#5f7560] hover:text-white hover:border-[#2d2d34] text-[#71717a] flex items-center justify-center shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer"
                      title="Mark as read"
                    >
                      <Check size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
