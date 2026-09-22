import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { EventItem } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";
import { isEventOngoing } from "@/lib/events";

const statusTone: Record<
  string,
  "cyan" | "magenta" | "green" | "orange" | "mute"
> = {
  completed: "mute",
  ongoing: "orange",
  registration_open: "orange",
  pending_approval: "orange",
  approved: "mute",
  draft: "mute",
  registration_closed: "mute",
  cancelled: "mute",
};

export function TicketCard({
  event,
  href,
  meta,
  footer,
  className,
  hideStatus = false,
}: {
  event: EventItem;
  href?: string;
  meta?: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideStatus?: boolean;
}) {
  const ongoing = isEventOngoing(event);
  const posterSrc = event.thumbnailUrl || event.posterUrl;

  const statusBadge = !hideStatus && !ongoing && (() => {
    const isUpcoming =
      event.status === "registration_open" &&
      Boolean(event.registrationStart && new Date(event.registrationStart).getTime() > Date.now());
    if (isUpcoming) return <Badge tone="orange">Upcoming</Badge>;
    if (event.status === "registration_closed") return <Badge tone="magenta">Reg. Stopped</Badge>;
    return <Badge tone={statusTone[event.status] ?? "mute"}>{event.status.replaceAll("_", " ")}</Badge>;
  })();

  const visibilityBadge =
    event.visibility === "open_to_all" ||
    event.visibility === "public" ||
    event.visibility === "all_chapters" ? (
      <Badge tone="mute">Open to All</Badge>
    ) : (
      <Badge tone="mute">Campus Exclusive</Badge>
    );

  /* ─── POSTER SPLIT LAYOUT ────────────────────────────────────────── */
  if (posterSrc) {
    return (
      <article
        className={cn(
          "rounded-[var(--radius)] overflow-hidden shadow-[var(--shadow)] transition hover:shadow-[0_8px_28px_rgba(45,45,52,0.08)] flex flex-row items-stretch",
          !className?.includes("bg-") && "bg-bg-panel",
          className,
        )}
      >
        {/* LEFT: Clean full poster — NO text overlay */}
        <div className="relative w-[34%] min-w-[110px] max-w-[160px] sm:w-[30%] shrink-0 bg-zinc-900 self-stretch overflow-hidden group/poster">
          {href ? (
            <Link href={href} className="absolute inset-0 z-10" aria-label={event.title} />
          ) : null}
          <img
            src={posterSrc}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover/poster:scale-105"
          />
        </div>

        {/* RIGHT: Event name, date/time & action buttons */}
        <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 min-w-0">
          <div className="min-w-0">
            {/* Category & Status badges */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold text-text-mute uppercase tracking-wider truncate">
                {event.category}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {ongoing ? (
                  <Badge tone="orange" className="py-0 px-1.5 text-[9px] font-bold flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]" />
                    </span>
                    Live
                  </Badge>
                ) : null}
                {statusBadge}
              </div>
            </div>

            {/* Event Name / Title */}
            {href ? (
              <Link href={href} className="block group/title">
                <h3 className="font-[family-name:var(--font-display)] text-[14px] sm:text-[15px] font-bold text-text tracking-tight leading-snug line-clamp-2 group-hover/title:text-[var(--accent)] transition-colors">
                  {event.title}
                </h3>
              </Link>
            ) : (
              <h3 className="font-[family-name:var(--font-display)] text-[14px] sm:text-[15px] font-bold text-text tracking-tight leading-snug line-clamp-2">
                {event.title}
              </h3>
            )}

            {/* Date & Time */}
            <p className="text-[11px] sm:text-[12px] font-medium text-text-dim mt-1">
              {formatDateTime(event.startsAt)}
            </p>

            {/* Meta if provided */}
            {meta ? (
              <p className="text-[10.5px] text-text-mute mt-1 truncate">
                {meta}
              </p>
            ) : null}
          </div>

          {/* Action buttons / Footer */}
          {footer ? (
            <div className="mt-3 min-w-0">{footer}</div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {visibilityBadge}
              {statusBadge}
            </div>
          )}
        </div>
      </article>
    );
  }

  /* ─── FALLBACK: no poster ────────────────────────────────────────── */
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.03em]">
            {event.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-text-dim">{event.category}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
          {event.lessons && event.lessons.length > 0 ? (
            <Badge tone="orange" className="font-mono text-[10px]">
              {event.lessons.length} Days
            </Badge>
          ) : null}
          {event.resources && event.resources.length > 0 ? (
            <Badge tone="mute" className="text-[10px]">🎁 Resources</Badge>
          ) : null}
          {ongoing ? (
            <Badge tone="orange" className="flex items-center gap-1 font-bold shadow-sm">
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
              </span>
              Ongoing
            </Badge>
          ) : null}
          {visibilityBadge}
          {statusBadge}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-dim">
        <p>{event.venue}</p>
        <p>{formatDateTime(event.startsAt)}</p>
        <p>
          {event.capacity} seats
          {event.waitlistCapacity ? ` · wl ${event.waitlistCapacity}` : ""}
        </p>
      </div>
      {meta ? <p className="mt-1.5 text-[11px] text-text-mute">{meta}</p> : null}
    </>
  );

  const hasCustomBg = Boolean(className && /\bbg-/.test(className));

  return (
    <article
      className={cn(
        "rounded-[var(--radius)] p-4 shadow-[var(--shadow)] transition hover:shadow-[0_8px_28px_rgba(45,45,52,0.08)]",
        !hasCustomBg && "bg-bg-panel",
        className,
      )}
    >
      {href ? (
        <Link href={href} className="block hover:text-[var(--accent)]">
          {body}
        </Link>
      ) : (
        body
      )}
      {footer ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">{footer}</div>
      ) : null}
    </article>
  );
}
