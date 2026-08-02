import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { EventItem } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";

const statusTone: Record<
  string,
  "cyan" | "magenta" | "green" | "orange" | "mute"
> = {
  completed: "mute",
  registration_open: "green",
  pending_approval: "orange",
  approved: "cyan",
  draft: "mute",
  registration_closed: "magenta",
  cancelled: "mute",
};

export function TicketCard({
  event,
  href,
  meta,
  footer,
  className,
}: {
  event: EventItem;
  href?: string;
  /** Extra line under venue/date (e.g. approved counts) */
  meta?: ReactNode;
  /** Actions below the ticket body — keep outside the title link */
  footer?: ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
            {event.ticketNo}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.03em]">
            {event.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-text-dim">{event.category}</p>
        </div>
        <Badge tone={statusTone[event.status] ?? "mute"}>
          {event.status.replaceAll("_", " ")}
        </Badge>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-dim">
        <p>{event.venue}</p>
        <p>{formatDateTime(event.startsAt)}</p>
        <p>
          {event.capacity} seats
          {event.waitlistCapacity ? ` · wl ${event.waitlistCapacity}` : ""}
        </p>
      </div>
      {meta ? (
        <p className="mt-1.5 text-[11px] text-text-mute">{meta}</p>
      ) : null}
    </>
  );

  return (
    <article
      className={cn(
        "rounded-[var(--radius)] bg-bg-panel p-4 shadow-[var(--shadow)] transition hover:shadow-[0_8px_28px_rgba(45,45,52,0.08)]",
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
