"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { getEventForm } from "@/lib/forms/helpers";
import { hasPermission } from "@/lib/permissions";
import type { EventItem, Visibility } from "@/types";

export default function ChapterEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { store, createEvent, updateRegistrationStatus } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    venue: "",
    category: "WORKSHOP",
    capacity: "40",
    visibility: "chapter_only" as Visibility,
    description: "",
  });

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  const events = store.events.filter((e) => e.chapterId === chapter.id);
  const canCreate = hasPermission(store, session.roleKey, "event.create");
  const canApprove = hasPermission(store, session.roleKey, "registration.approve");
  const canReview = hasPermission(store, session.roleKey, "registration.review");
  const canManage =
    canCreate ||
    hasPermission(store, session.roleKey, "event.manage") ||
    session.roleKey === "student";

  const pendingApproval = store.registrations.filter((r) => {
    const ev = store.events.find((e) => e.id === r.eventId);
    return (
      ev?.chapterId === chapter.id &&
      (r.status === "reviewed" || r.status === "pending")
    );
  });

  function handleCreate() {
    if (!chapter || !form.title || !form.venue) return;
    const id = `ev-${Date.now()}`;
    const event: EventItem = {
      id,
      chapterId: chapter.id,
      title: form.title,
      bannerEmoji: "NEW",
      description: form.description || "New chapter event",
      venue: form.venue,
      startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      endsAt: new Date(Date.now() + 7 * 86400000 + 8 * 3600000).toISOString(),
      organizerId: session.userId,
      capacity: parseInt(form.capacity, 10) || 40,
      waitlistCapacity: 10,
      visibility: form.visibility,
      registrationStart: new Date().toISOString(),
      registrationEnd: new Date(Date.now() + 6 * 86400000).toISOString(),
      status: "draft",
      certificateEnabled: true,
      ticketNo: `NO. ${String(events.length + 10).padStart(2, "0")}`,
      category: form.category,
    };
    createEvent(event);
    setShowForm(false);
    setForm({
      title: "",
      venue: "",
      category: "WORKSHOP",
      capacity: "40",
      visibility: "chapter_only",
      description: "",
    });
    router.push(`/chapter/${slug}/events/${id}`);
  }

  return (
    <div>
      <PageHeader
        title="Events"
        description="Lineup tickets open into full event pages — capacity, close times, and linked Forms."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/forms`}>
              <Button variant="ghost">Forms hub</Button>
            </Link>
            {canCreate ? (
              <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Cancel" : "Create event"}
              </Button>
            ) : null}
          </div>
        }
      />

      {showForm ? (
        <TerminalPanel title="create.event" accent="green" className="mb-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Venue</FieldLabel>
              <Input
                value={form.venue}
                onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel>Capacity</FieldLabel>
              <Input
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
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
                <option value="chapter_only">Chapter Only</option>
                <option value="specific_chapters">Selected Chapters</option>
                <option value="all_chapters">All Chapters</option>
                <option value="public">Public</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <TextArea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>
          <Button variant="green" className="mt-4" onClick={handleCreate}>
            Create → Open event
          </Button>
        </TerminalPanel>
      ) : null}

      {(canApprove || canReview) && pendingApproval.length > 0 ? (
        <TerminalPanel title="registration.queue" accent="orange" className="mb-6">
          <ul className="space-y-3">
            {pendingApproval.map((reg) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              const ev = store.events.find((e) => e.id === reg.eventId);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-border p-3"
                >
                  <div>
                    <p className="font-bold">{user?.fullName}</p>
                    <p className="text-[11px] text-text-dim">
                      {ev?.title} · {reg.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {canReview && reg.status === "pending" ? (
                      <Button
                        variant="orange"
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
                    {canApprove && reg.status === "reviewed" ? (
                      <Button
                        variant="green"
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
                    <Badge
                      tone={reg.status === "approved" ? "green" : "orange"}
                    >
                      {reg.status}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {events.map((ev) => {
          const regForm = getEventForm(store, ev.id, "registration");
          const fbForm = getEventForm(store, ev.id, "feedback");
          const approved = store.registrations.filter(
            (r) => r.eventId === ev.id && r.status === "approved",
          ).length;
          return (
            <div key={ev.id} className="space-y-2">
              <TicketCard
                event={ev}
                href={`/chapter/${slug}/events/${ev.id}`}
              />
              <p className="px-1 text-[11px] text-text-dim">
                {approved}/{ev.capacity} approved · closes{" "}
                {new Date(ev.registrationEnd).toLocaleDateString()}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/chapter/${slug}/events/${ev.id}`}>
                  <Button variant="primary" className="w-full">
                    Open event
                  </Button>
                </Link>
                {canManage && regForm ? (
                  <Link href={`/chapter/${slug}/forms/${regForm.id}`}>
                    <Button variant="ghost" className="w-full">
                      Open in Forms
                    </Button>
                  </Link>
                ) : fbForm ? (
                  <Link href={`/chapter/${slug}/forms/${fbForm.id}/fill`}>
                    <Button variant="ghost" className="w-full">
                      Give feedback
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/chapter/${slug}/forms`}>
                    <Button variant="ghost" className="w-full">
                      Forms
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
