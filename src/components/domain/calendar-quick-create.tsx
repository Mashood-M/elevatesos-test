"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  formatDateKey,
  fromLocalInput,
  localDateTimeOn,
} from "@/lib/datetime";
import type { EventItem, Visibility } from "@/types";

type Props = {
  dateKey: string;
  /** Fixed chapter (chapter calendar) or initial choice (HQ). */
  chapterId: string;
  /** When true, show chapter picker (HQ global calendar). */
  allowChapterPick?: boolean;
  open?: boolean;
  onClose: () => void;
  onCreated?: (eventId: string) => void;
};

export function CalendarQuickCreate({
  dateKey,
  chapterId: initialChapterId,
  allowChapterPick = false,
  open = true,
  onClose,
  onCreated,
}: Props) {
  const router = useRouter();
  const { store, createEvent } = useStore();
  const { session } = useCurrentUser();
  const [chapterId, setChapterId] = useState(initialChapterId);
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [category, setCategory] = useState("WORKSHOP");
  const [visibility, setVisibility] = useState<Visibility>("chapter_only");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(localDateTimeOn(dateKey, 10));
  const [endsAt, setEndsAt] = useState(localDateTimeOn(dateKey, 18));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setChapterId(initialChapterId);
    setTitle("");
    setVenue("");
    setCategory("WORKSHOP");
    setVisibility("chapter_only");
    setDescription("");
    setStartsAt(localDateTimeOn(dateKey, 10));
    setEndsAt(localDateTimeOn(dateKey, 18));
    setError("");
  }, [dateKey, initialChapterId, open]);

  const chapter = store.chapters.find((c) => c.id === chapterId);

  function handleCreate() {
    if (!title.trim() || !venue.trim()) {
      setError("Title and venue are required.");
      return;
    }
    if (!chapter) {
      setError("Pick a chapter for this event.");
      return;
    }
    const startIso = fromLocalInput(startsAt);
    const endIso = fromLocalInput(endsAt);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError("End time must be after start time.");
      return;
    }

    const id = `ev-${Date.now()}`;
    const chapterEvents = store.events.filter((e) => e.chapterId === chapter.id);
    const event: EventItem = {
      id,
      chapterId: chapter.id,
      title: title.trim(),
      bannerEmoji: "NEW",
      description: description.trim() || "Scheduled from calendar",
      venue: venue.trim(),
      startsAt: startIso,
      endsAt: endIso,
      organizerId: session.userId,
      capacity: 40,
      waitlistCapacity: 10,
      visibility,
      registrationStart: new Date().toISOString(),
      registrationEnd: fromLocalInput(localDateTimeOn(dateKey, 23, 59)),
      status: "draft",
      certificateEnabled: true,
      ticketNo: `NO. ${String(chapterEvents.length + 10).padStart(2, "0")}`,
      category: category.trim() || "WORKSHOP",
    };
    createEvent(event);
    onCreated?.(id);
    onClose();
    router.push(`/chapter/${chapter.slug}/events/${id}`);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Schedule event"
      description={formatDateKey(dateKey)}
    >
      <p className="mb-4 text-[13px] text-text-dim">
        Schedule an event or meeting for this date. Adjust start and end times
        as needed.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {allowChapterPick ? (
          <div className="sm:col-span-2">
            <FieldLabel>Chapter</FieldLabel>
            <Select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
            >
              <option value="">Select chapter…</option>
              {store.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div>
          <FieldLabel>Title</FieldLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Workshop, meetup, meeting…"
            autoFocus
          />
        </div>
        <div>
          <FieldLabel>Venue</FieldLabel>
          <Input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Lab, auditorium, online…"
          />
        </div>
        <div>
          <FieldLabel>Starts</FieldLabel>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Ends</FieldLabel>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Visibility</FieldLabel>
          <Select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
          >
            <option value="chapter_only">Chapter only</option>
            <option value="all_chapters">All chapters</option>
            <option value="public">Public</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Description</FieldLabel>
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-[13px] text-[var(--accent)]">{error}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="orange" onClick={handleCreate}>
          Create event
        </Button>
      </div>
    </Dialog>
  );
}
