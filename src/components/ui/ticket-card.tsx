import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { EventItem } from "@/types";
import { formatDateTime } from "@/lib/utils";

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
}: {
  event: EventItem;
  href?: string;
}) {
  const body = (
    <article className="rounded-[var(--radius)] border border-border bg-bg-panel p-4 transition hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
            {event.ticketNo}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-[17px] font-bold tracking-[-0.02em]">
            {event.title}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--accent)]">{event.category}</p>
        </div>
        <Badge tone={statusTone[event.status] ?? "mute"}>
          {event.status.replaceAll("_", " ")}
        </Badge>
      </div>
      <div className="mt-3 grid gap-1 text-[13px] text-text-dim sm:grid-cols-2">
        <p>{event.venue}</p>
        <p>{formatDateTime(event.startsAt)}</p>
        <p>
          {event.capacity} seats · waitlist {event.waitlistCapacity}
        </p>
        <p className="capitalize">{event.visibility.replaceAll("_", " ")}</p>
      </div>
    </article>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
