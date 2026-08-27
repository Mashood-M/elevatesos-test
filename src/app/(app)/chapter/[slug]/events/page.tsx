"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow, resolveChapter } from "@/lib/access";
import { fromLocalInput, offsetIso, toLocalInput } from "@/lib/datetime";
import { canRegisterNow } from "@/lib/events";
import { getEventForm } from "@/lib/forms/helpers";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { EventAttendanceSession, EventItem, EventStatus, Visibility } from "@/types";


type StatusChip = "all" | "registration_open" | "draft" | "completed";

const STATUS_CHIPS: { key: StatusChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registration_open", label: "Open" },
  { key: "draft", label: "Draft" },
  { key: "completed", label: "Completed" },
];

function defaultCreateSchedule() {
  return {
    startsAt: toLocalInput(offsetIso(7, 10)),
    endsAt: toLocalInput(offsetIso(7, 18)),
    registrationEnd: toLocalInput(offsetIso(6, 23, 59)),
  };
}

function emptyCreateForm() {
  return {
    title: "",
    venue: "Main Seminar Hall",
    category: "Workshop",
    capacity: "60",
    visibility: "public" as Visibility,
    mode: "in_person" as "in_person" | "online" | "hybrid",
    description: "",
    topics: "",
    eventType: "standalone" as "standalone" | "main" | "sub",
    parentEventId: "",
    attendanceSessions: [
      { id: "sess-1", name: "Main Arrival Check-In", time: "", isRequired: true },
    ] as EventAttendanceSession[],
    hasPlatform: false,
    platformName: "",
    platformTagline: "",
    platformLiveUrl: "",
    platformRepoUrl: "",
    platformMetric: "",
    hasCaseStudy: false,
    caseStudySlug: "",
    architectureSummary: "",
    ...defaultCreateSchedule(),
  };
}



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
  const { store, createEvent, updateRegistrationStatus } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);

  const [showForm, setShowForm] = useState(false);
  const [statusChip, setStatusChip] = useState<StatusChip>("all");
  const [search, setSearch] = useState("");
  const [createFlash, setCreateFlash] = useState("");
  const [form, setForm] = useState(emptyCreateForm);

  const canCreate = hasPermission(store, session.roleKey, "event.create");
  const canApprove = hasPermission(store, session.roleKey, "registration.approve");
  const canReview = hasPermission(store, session.roleKey, "registration.review");
  const canManage =
    canCreate || hasPermission(store, session.roleKey, "event.manage");

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

  const events = store.events.filter((e) => e.chapterId === chapter.id);
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

  function closeCreate() {
    setShowForm(false);
    setCreateFlash("");
  }

  function handleCreate() {
    if (!chapter || !form.title.trim() || !form.venue.trim()) {
      setCreateFlash("Title and venue are required.");
      return;
    }
    setCreateFlash("");
    const id = `ev-${Date.now()}`;
    const startsAt = fromLocalInput(form.startsAt);
    const endsAt = fromLocalInput(form.endsAt);
    const registrationEnd = fromLocalInput(form.registrationEnd);
    const topics = form.topics
      ? form.topics.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const isPlatformActive = form.hasPlatform || form.hasCaseStudy;
    const platformData = isPlatformActive
      ? {
          enabled: true,
          platformName: form.platformName || form.title,
          tagline: form.platformTagline,
          liveUrl: form.platformLiveUrl,
          repoUrl: form.platformRepoUrl,
          highlightMetric: form.platformMetric,
          architectureSummary: form.architectureSummary,
        }
      : undefined;

    const event: EventItem = {
      id,
      chapterId: chapter.id,
      title: form.title,
      bannerEmoji: form.eventType === "main" ? "🏆" : form.eventType === "sub" ? "⚡" : "EVENT",
      description: form.description || "Chapter event and hands-on session.",
      venue: form.venue,
      startsAt,
      endsAt,
      organizerId: session.userId,
      capacity: parseInt(form.capacity, 10) || 60,
      waitlistCapacity: 15,
      visibility: form.visibility,
      mode: form.mode,
      registrationStart: new Date().toISOString(),
      registrationEnd,
      status: "draft",
      certificateEnabled: true,
      ticketNo: `NO. ${String(events.length + 10).padStart(2, "0")}`,
      category: form.category,
      topics,
      eventType: form.eventType,
      parentEventId: form.eventType === "sub" ? form.parentEventId || undefined : undefined,
      attendanceSessions: form.attendanceSessions,
      platform: platformData,


      caseStudy: isPlatformActive
        ? {
            enabled: true,
            platformName: form.platformName || form.title,
            tagline: form.platformTagline,
            caseStudySlug: form.caseStudySlug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            liveUrl: form.platformLiveUrl,
            repoUrl: form.platformRepoUrl,
            highlightMetric: form.platformMetric,
            architectureSummary: form.architectureSummary,
          }
        : undefined,
    };
    createEvent(event);
    closeCreate();
    setForm(emptyCreateForm());
    router.push(`/chapter/${slug}/events/${id}`);
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
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[12px] font-semibold tracking-[-0.01em] text-text">
              Needs attention
            </p>
            <p className="text-[11px] text-text-mute">
              {pendingApproval.length} registration
              {pendingApproval.length === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="divide-y divide-border/80">
            {pendingApproval.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              const ev = store.events.find((e) => e.id === reg.eventId);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
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
            {STATUS_CHIPS.map((chip) => (
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
                  meta={`${approved}/${ev.capacity} approved · closes ${new Date(ev.registrationEnd).toLocaleDateString()}`}
                  footer={
                    <>
                      {eligibility.ok ? (
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

      <Dialog
        open={showForm && canCreate}
        onClose={closeCreate}
        title="Create event"
        description="Unified event creation across all chapters. Starts as a draft — publish to open registration."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Event Scope: Main Flagship vs Sub-Event vs Standalone */}
          <div className="rounded-[12px] border border-border/80 bg-bg p-3.5 shadow-[var(--shadow-sm)]">
            <FieldLabel>Event Scope / Hierarchy</FieldLabel>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`rounded-[10px] border px-3 py-2 text-left text-[12px] transition-colors ${
                  form.eventType === "standalone"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                    : "border-border/80 bg-bg text-text-dim hover:text-text"
                }`}
                onClick={() => setForm((f) => ({ ...f, eventType: "standalone", parentEventId: "" }))}
              >
                <span className="block font-medium">🌟 Standalone Event</span>
                <span className="text-[10px] text-text-mute">Single workshop / session</span>
              </button>
              <button
                type="button"
                className={`rounded-[10px] border px-3 py-2 text-left text-[12px] transition-colors ${
                  form.eventType === "main"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                    : "border-border/80 bg-bg text-text-dim hover:text-text"
                }`}
                onClick={() => setForm((f) => ({ ...f, eventType: "main", parentEventId: "" }))}
              >
                <span className="block font-medium">🏆 Main Flagship Event</span>
                <span className="text-[10px] text-text-mute">e.g. Vibranium '26</span>
              </button>
              <button
                type="button"
                className={`rounded-[10px] border px-3 py-2 text-left text-[12px] transition-colors ${
                  form.eventType === "sub"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                    : "border-border/80 bg-bg text-text-dim hover:text-text"
                }`}
                onClick={() => setForm((f) => ({ ...f, eventType: "sub" }))}
              >
                <span className="block font-medium">⚡ Sub-Event</span>
                <span className="text-[10px] text-text-mute">e.g. QR Treasure Hunt</span>
              </button>
            </div>

            {form.eventType === "sub" ? (
              <div className="mt-3 border-t border-border/60 pt-3">
                <FieldLabel>Parent Main Event</FieldLabel>
                <Select
                  value={form.parentEventId}
                  onChange={(e) => setForm((f) => ({ ...f, parentEventId: e.target.value }))}
                >
                  <option value="">Select parent flagship event…</option>
                  {mainEvents.map((m) => (
                    <option key={m.id} value={m.id}>
                      🏆 {m.title}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Event Title</FieldLabel>
              <Input
                placeholder={
                  form.eventType === "main"
                    ? "e.g. VIBRANIUM '26 — ANNUAL TECH SYMPOSIUM"
                    : form.eventType === "sub"
                    ? "e.g. QR TREASURE HUNT / BLIND CODING BATTLE"
                    : "e.g. LET'S DECODE LINKEDIN"
                }
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="Workshop">Workshop</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Meetup">Meetup</option>
                <option value="Challenge">Challenge / Hunt</option>
                <option value="Showcase">Showcase</option>
                <option value="Lecture">Lecture</option>
                <option value="Lab">Lab</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Event Mode</FieldLabel>
              <Select
                value={form.mode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mode: e.target.value as "in_person" | "online" | "hybrid",
                  }))
                }
              >
                <option value="in_person">In-Person (Campus)</option>
                <option value="online">Online / Virtual</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Venue / Location</FieldLabel>
              <Input
                placeholder="e.g. Main Seminar Hall / Campus Auditorium"
                value={form.venue}
                onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Capacity (Seats)</FieldLabel>
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="e.g. 60"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>

            <div>
              <FieldLabel>Visibility</FieldLabel>
              <Select
                value={form.visibility}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    visibility: e.target.value as Visibility,
                  }))
                }
              >
                <option value="public">Public (Main Site & Chapter)</option>
                <option value="chapter_only">Chapter Members Only</option>
                <option value="all_chapters">All Elevates Chapters</option>
                <option value="specific_chapters">Selected Chapters</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Starts At</FieldLabel>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Ends At</FieldLabel>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Registration Closes</FieldLabel>
              <Input
                type="datetime-local"
                value={form.registrationEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, registrationEnd: e.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel>Topics / Tags (comma-separated)</FieldLabel>
              <Input
                placeholder="e.g. AI, Full-Stack, QR Hunt, CTF"
                value={form.topics}
                onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
              />
            </div>
            {/* Attendance Checkpoints / Terms Builder */}
            <div className="md:col-span-2 rounded-[var(--radius)] border border-border/80 bg-bg-panel p-3 shadow-[var(--shadow-sm)]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-[12px] font-semibold text-text">Attendance Terms & Checkpoints</p>
                  <p className="text-[11px] text-text-dim">
                    Configure how many check-ins are required (e.g. 1 for workshop, 3-4 checkpoints for hackathons).
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        attendanceSessions: [
                          { id: "sess-1", name: "Main Arrival Check-In", time: "09:30 AM", isRequired: true },
                        ],
                      }))
                    }
                  >
                    1 Session (Workshop)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        attendanceSessions: [
                          { id: "sess-1", name: "Morning Session", time: "09:30 AM", isRequired: true },
                          { id: "sess-2", name: "Afternoon Session", time: "02:00 PM", isRequired: true },
                        ],
                      }))
                    }
                  >
                    2 Sessions (Full-Day)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        attendanceSessions: [
                          { id: "sess-1", name: "Ingress & Team Reg", time: "09:00 AM", isRequired: true },
                          { id: "sess-2", name: "Midnight Code Check", time: "11:30 PM", isRequired: true },
                          { id: "sess-3", name: "Final Pitch & Demo", time: "04:00 PM", isRequired: true },
                        ],
                      }))
                    }
                  >
                    3 Checkpoints (Hackathon)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        attendanceSessions: [
                          { id: "sess-1", name: "Ingress Check-In (Day 1)", time: "09:00 AM", isRequired: true },
                          { id: "sess-2", name: "Midnight Progress (Day 1)", time: "11:30 PM", isRequired: true },
                          { id: "sess-3", name: "Midday Evaluation (Day 2)", time: "01:00 PM", isRequired: true },
                          { id: "sess-4", name: "Final Presentation (Day 2)", time: "05:30 PM", isRequired: true },
                        ],
                      }))
                    }
                  >
                    4 Checkpoints (36h Hackathon)
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mt-3 border-t border-border/70 pt-3">
                {form.attendanceSessions?.map((sess, idx) => (
                  <div key={sess.id || idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-text-dim w-5">#{idx + 1}</span>
                    <Input
                      placeholder="Session / Checkpoint Name (e.g. Midnight Code Check)"
                      value={sess.name}
                      className="h-8 text-[12px] flex-1"
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({
                          ...f,
                          attendanceSessions: f.attendanceSessions.map((s, i) =>
                            i === idx ? { ...s, name: val } : s,
                          ),
                        }));
                      }}
                    />
                    <Input
                      placeholder="Time (e.g. 11:30 PM)"
                      value={sess.time || ""}
                      className="h-8 text-[12px] w-32"
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({
                          ...f,
                          attendanceSessions: f.attendanceSessions.map((s, i) =>
                            i === idx ? { ...s, time: val } : s,
                          ),
                        }));
                      }}
                    />
                    {form.attendanceSessions.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-[11px] text-text-dim hover:text-red-400"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            attendanceSessions: f.attendanceSessions.filter((_, i) => i !== idx),
                          }));
                        }}
                      >
                        ✕
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-between items-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 text-[11px] border border-border"
                  onClick={() => {
                    setForm((f) => {
                      const nextId = `sess-${(f.attendanceSessions?.length || 0) + 1}`;
                      return {
                        ...f,
                        attendanceSessions: [
                          ...(f.attendanceSessions || []),
                          { id: nextId, name: `Checkpoint ${(f.attendanceSessions?.length || 0) + 1}`, time: "", isRequired: true },
                        ],
                      };
                    });
                  }}
                >
                  + Add Checkpoint / Session
                </Button>
                <span className="text-[11px] text-text-dim">
                  {form.attendanceSessions?.length || 1} total check-in terms
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Description / Agenda</FieldLabel>
              <TextArea
                rows={3}
                placeholder="Brief summary of event rules, schedule, prerequisites, and outcomes..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>


          {/* Custom Built Platform / Web App for this Event or Sub-Event */}
          <div className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
            <label className="flex items-center gap-2 text-[13px] font-medium text-text cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasPlatform}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hasPlatform: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border accent-[var(--accent)]"
              />
              <span>💻 Built a custom platform / web app for this {form.eventType === "sub" ? "sub-event" : "event"}</span>
            </label>
            <p className="mt-1 text-[11px] text-text-dim">
              Enable if your team built a custom web app (e.g. QR Hunt Scanner, Live Leaderboard, Battle Arena) for this event.
            </p>

            {form.hasPlatform ? (
              <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Platform / App Name</FieldLabel>
                  <Input
                    placeholder={
                      form.eventType === "sub"
                        ? "e.g. Vibranium QR Treasure Hunt Engine"
                        : "e.g. Vibranium Portal / Celestia Platform"
                    }
                    value={form.platformName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, platformName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Live Web App URL</FieldLabel>
                  <Input
                    placeholder="https://hunt.vibranium.live or https://..."
                    value={form.platformLiveUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, platformLiveUrl: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Highlight Metric / Feature</FieldLabel>
                  <Input
                    placeholder="e.g. 120+ Teams · Real-time GPS & QR Scanner"
                    value={form.platformMetric}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, platformMetric: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Source Code / GitHub Repo</FieldLabel>
                  <Input
                    placeholder="https://github.com/..."
                    value={form.platformRepoUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, platformRepoUrl: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Architecture / Tech Stack Highlights</FieldLabel>
                  <Input
                    placeholder="e.g. Next.js 15, WebSockets, Supabase Realtime, Geolocation API"
                    value={form.architectureSummary}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, architectureSummary: e.target.value }))
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {createFlash ? (
          <p className="mt-3 text-[13px] text-[var(--accent)]">{createFlash}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={closeCreate}>
            Cancel
          </Button>
          <Button type="button" variant="orange" onClick={handleCreate}>
            Create → Open event
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
