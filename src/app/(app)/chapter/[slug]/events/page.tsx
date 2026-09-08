"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventManagerCreateDialog } from "@/components/domain/event-manager-dialog";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow, resolveChapter } from "@/lib/access";
import { canRegisterNow, isEventVisibleToUser } from "@/lib/events";
import { defaultFormsForEvent, getEventForm } from "@/lib/forms/helpers";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { EventItem, EventStatus } from "@/types";


type StatusChip = "all" | "registration_open" | "draft" | "completed";

const STATUS_CHIPS: { key: StatusChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registration_open", label: "Open" },
  { key: "draft", label: "Draft" },
  { key: "completed", label: "Completed" },
];



export default function ChapterEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store, createEvent, updateEvent, createForm, setFormStatus, updateRegistrationStatus, batchUpdateRegistrationStatus, addEventCategory } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);

  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const toggleSelectReg = (id: string) => {
    setSelectedRegIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<StatusChip>("all");
  const [search, setSearch] = useState("");


  const canCreate = hasPermission(store, session.roleKey, "event.create");
  const canApprove = hasPermission(store, session.roleKey, "registration.approve");
  const canReview = hasPermission(store, session.roleKey, "registration.review");
  const canManage =
    canCreate || hasPermission(store, session.roleKey, "event.manage");
  // Only HQ Founder and Campus Lead can publish events (move draft → registration_open)
  const canPublish =
    session.roleKey === "founder" || session.roleKey === "campus_lead";

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) {
      setShowForm(true);
    }
  }, [searchParams, canCreate]);

  if (!mounted) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-xs text-text-dim animate-pulse">Loading events...</p>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="py-20 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-bold text-text">Chapter not found</p>
        <p className="mt-2 text-xs text-text-dim max-w-md mx-auto">This campus chapter is not yet registered or opened. HQ and HQ Admins only can manage un-opened chapters.</p>
      </div>
    );
  }

  const events = store.events
    .filter((e) => e.chapterId === chapter.id)
    .filter((e) => isEventVisibleToUser(e, session.chapterId, session.roleKey));
  const mainEvents = events.filter((e) => e.eventType === "main" || !e.parentEventId);
  const q = search.trim().toLowerCase();
  const filteredEvents = events
    .filter((e) =>
      statusChip === "all" ? true : e.status === (statusChip as EventStatus),
    )
    .filter((e) => {
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    })
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const pendingApproval = store.registrations.filter((r) => {
    const ev = store.events.find((e) => e.id === r.eventId);
    return (
      ev?.chapterId === chapter.id &&
      (r.status === "reviewed" || r.status === "pending")
    );
  });



  function publishEventFromList(eventItem: EventItem) {
    const existing = getEventForm(store, eventItem.id, "registration");
    if (!existing) {
      const template = defaultFormsForEvent(
        eventItem.id,
        chapter!.id,
        eventItem.title,
      ).find((f) => f.purpose === "registration")!;
      createForm({
        ...template,
        id: template.id,
        status: "open",
      });
    } else if (existing.status !== "open") {
      setFormStatus(existing.id, "open");
    }
    updateEvent(eventItem.id, { status: "registration_open" });
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Events"
        description="Publish opens registration directly — faculty approval never required. Link Forms, then check in."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/forms`}>
              <Button variant="ghost">Forms hub</Button>
            </Link>
            {canCreate ? (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Create event
              </Button>
            ) : null}
          </div>
        }
      />

      {(canApprove || canReview) && pendingApproval.length > 0 ? (
        <div className="mb-5 rounded-[var(--radius)] border border-border/80 bg-bg-panel px-4 py-3 shadow-[var(--shadow-sm)]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold tracking-[-0.01em] text-text">
                Needs attention ({pendingApproval.length} pending registration{pendingApproval.length === 1 ? "" : "s"})
              </p>
              <p className="text-[11px] text-text-dim">
                Class Reps and Campus Leads can select multiple student registrations and approve them in batch.
              </p>
            </div>
            {selectedRegIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-[12px] text-red-400"
                  onClick={() => {
                    batchUpdateRegistrationStatus(selectedRegIds, "rejected", session.userId);
                    setSelectedRegIds([]);
                  }}
                >
                  Reject Selected
                </Button>
                <Button
                  variant="green"
                  className="h-8 px-3 text-[12px]"
                  onClick={() => {
                    batchUpdateRegistrationStatus(selectedRegIds, "approved", session.userId);
                    setSelectedRegIds([]);
                  }}
                >
                  Approve Selected → QR ({selectedRegIds.length})
                </Button>
              </div>
            )}
          </div>
          <ul className="divide-y divide-border/80">
            {pendingApproval.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              const ev = store.events.find((e) => e.id === reg.eventId);
              const isSelected = selectedRegIds.includes(reg.id);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectReg(reg.id)}
                      className="rounded border-border"
                    />
                    <p className="text-[13px] font-medium text-text">
                      {user?.fullName}
                      <span className="font-normal text-text-dim">
                        {" "}
                        · {ev?.title}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="orange">{reg.status}</Badge>
                    {reg.status === "pending" && (canReview || canApprove) ? (
                      <Button
                        variant="orange"
                        className="h-8 px-3 text-[12px]"
                        onClick={() =>
                          updateRegistrationStatus(
                            reg.id,
                            "reviewed",
                            session.userId,
                          )
                        }
                      >
                        Review
                      </Button>
                    ) : null}
                    {canApprove &&
                    (reg.status === "reviewed" || reg.status === "pending") ? (
                      <Button
                        variant="green"
                        className="h-8 px-3 text-[12px]"
                        onClick={() =>
                          updateRegistrationStatus(
                            reg.id,
                            "approved",
                            session.userId,
                          )
                        }
                      >
                        Approve → QR
                      </Button>
                    ) : null}
                    {(canReview || canApprove) &&
                    (reg.status === "pending" || reg.status === "reviewed") ? (
                      <Button
                        variant="danger"
                        className="h-8 px-3 text-[12px]"
                        onClick={() =>
                          updateRegistrationStatus(
                            reg.id,
                            "rejected",
                            session.userId,
                          )
                        }
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <TerminalPanel
        title="events"
        meta={`${filteredEvents.length} shown · ${events.length} total`}
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, venue, category…"
              aria-label="Search events"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_CHIPS.filter(
              (chip) =>
                chip.key !== "draft" ||
                session.roleKey === "campus_lead" ||
                isHqRole(session.roleKey),
            ).map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatusChip(chip.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium",
                  statusChip === chip.key
                    ? "bg-[var(--charcoal-900)] text-white"
                    : "bg-bg text-text-dim hover:bg-bg-hover",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              {canCreate
                ? "Create a draft event, publish it, then share the registration form."
                : "Nothing scheduled yet — check back soon or browse when events open."}
            </p>
            {canCreate ? (
              <Button
                variant="orange"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Create event
              </Button>
            ) : null}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              No events match. Try clearing search or another status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusChip("all");
                setSearch("");
              }}
              className="mt-3 text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredEvents.map((ev) => {
              const regForm = getEventForm(store, ev.id, "registration");
              const fbForm = getEventForm(store, ev.id, "feedback");
              const approved = store.registrations.filter(
                (r) => r.eventId === ev.id && r.status === "approved",
              ).length;
              const eligibility = canRegisterNow(store, ev, session.userId);

              let secondary: { href: string; label: string } | null = null;
              if (canManage && regForm) {
                secondary = {
                  href: `/chapter/${slug}/forms/${regForm.id}`,
                  label: "Forms",
                };
              } else if (
                ev.status === "completed" &&
                fbForm &&
                fbForm.status === "open"
              ) {
                secondary = {
                  href: `/chapter/${slug}/forms/${fbForm.id}/fill`,
                  label: "Feedback",
                };
              }

              return (
                <TicketCard
                  key={ev.id}
                  event={ev}
                  href={`/chapter/${slug}/events/${ev.id}`}
                  className="bg-bg shadow-[var(--shadow-sm)]"
                  hideStatus={!canManage}
                  meta={`${approved}/${ev.capacity} approved · closes ${new Date(ev.registrationEnd).toLocaleDateString()}`}
                  footer={
                    <>
                      {ev.status === "draft" && canPublish ? (
                        <Button
                          variant="orange"
                          className="h-9 px-4"
                          onClick={() => publishEventFromList(ev)}
                        >
                          Publish → Open Registration
                        </Button>
                      ) : ev.status === "draft" && canManage ? (
                        <Button
                          variant="ghost"
                          className="h-9 px-4 text-text-dim cursor-default"
                          disabled
                        >
                          Draft (pending publish)
                        </Button>
                      ) : eligibility.ok ? (
                        <Link href={`/f/${eligibility.formId}`}>
                          <Button variant="orange" className="h-9 px-4">
                            Register
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/chapter/${slug}/events/${ev.id}`}>
                          <Button variant="primary" className="h-9 px-4">
                            Open event
                          </Button>
                        </Link>
                      )}
                      {secondary ? (
                        <Link
                          href={secondary.href}
                          className="text-[12px] font-medium text-text-dim hover:text-[var(--accent)]"
                        >
                          {secondary.label}
                        </Link>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </TerminalPanel>

      <EventManagerCreateDialog
        open={showForm && canCreate}
        onClose={() => setShowForm(false)}
        chapterSlug={chapter.slug}
        chapterId={chapter.id}
      />
    </div>
  );
}
