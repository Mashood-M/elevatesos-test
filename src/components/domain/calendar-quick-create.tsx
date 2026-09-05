"use client";

import { useEffect, useRef, useState } from "react";
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

// Letters, spaces, hyphens, apostrophes, and basic punctuation only
const NAME_PATTERN = /^[A-Za-z\s'\-.,&()!?]+$/;

export function CalendarQuickCreate({
  dateKey,
  chapterId: initialChapterId,
  allowChapterPick = false,
  open = true,
  onClose,
  onCreated,
}: Props) {
  const router = useRouter();
  const { store, createEvent, addEventCategory } = useStore();
  const { session } = useCurrentUser();
  const [chapterId, setChapterId] = useState(initialChapterId);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [venue, setVenue] = useState("");
  const [category, setCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("chapter_only");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(localDateTimeOn(dateKey, 10));
  const [endsAt, setEndsAt] = useState(localDateTimeOn(dateKey, 18));
  const [error, setError] = useState("");
  const newCatInputRef = useRef<HTMLInputElement>(null);

  const categories = store.eventCategories ?? ["WORKSHOP", "HACKATHON", "MEETUP", "LECTURE", "LAB", "SHOWCASE", "CHALLENGE"];

  useEffect(() => {
    if (!open) return;
    setChapterId(initialChapterId);
    setTitle("");
    setTitleError("");
    setVenue("");
    setCategory(categories[0] ?? "WORKSHOP");
    setShowAddCategory(false);
    setNewCategory("");
    setCategoryError("");
    setVisibility("chapter_only");
    setDescription("");
    setStartsAt(localDateTimeOn(dateKey, 10));
    setEndsAt(localDateTimeOn(dateKey, 18));
    setError("");
  }, [dateKey, initialChapterId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus new category input when shown
  useEffect(() => {
    if (showAddCategory) {
      setTimeout(() => newCatInputRef.current?.focus(), 50);
    }
  }, [showAddCategory]);

  const chapter = store.chapters.find((c) => c.id === chapterId);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (val && !NAME_PATTERN.test(val)) {
      setTitleError("Title should contain only letters and basic punctuation.");
    } else {
      setTitleError("");
    }
  }

  function handleAddCategory() {
    const normalized = newCategory.trim().toUpperCase();
    if (!normalized) {
      setCategoryError("Please enter a category name.");
      return;
    }
    if (categories.includes(normalized)) {
      setCategoryError(`"${normalized}" already exists.`);
      return;
    }
    const added = addEventCategory(normalized);
    if (added) {
      setCategory(normalized);
      setShowAddCategory(false);
      setNewCategory("");
      setCategoryError("");
    } else {
      setCategoryError(`"${normalized}" already exists.`);
    }
  }

  function handleCreate() {
    if (!title.trim() || !venue.trim()) {
      setError("Title and venue are required.");
      return;
    }
    if (titleError) {
      setError("Please fix the title before continuing.");
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
    const finalCategory = category || categories[0] || "WORKSHOP";
    const event: EventItem = {
      id,
      chapterId: chapter.id,
      title: title.trim(),
      bannerEmoji: "EVENT",
      description: description.trim() || "Scheduled from calendar.",
      venue: venue.trim(),
      startsAt: startIso,
      endsAt: endIso,
      organizerId: session.userId,
      capacity: 40,
      waitlistCapacity: 10,
      visibility,
      registrationStart: new Date().toISOString(),
      registrationEnd: fromLocalInput(localDateTimeOn(dateKey, 23, 59)),
      // Always starts as draft — must be published by founder/campus_lead
      status: "draft",
      certificateEnabled: true,
      ticketNo: `NO. ${String(chapterEvents.length + 10).padStart(2, "0")}`,
      category: finalCategory,
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
      description={`Draft event for ${formatDateKey(dateKey)} · publish to open registration.`}
      className="max-w-2xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-text-dim flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold text-text">Draft Mode</span> — registration activates once published
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="orange" onClick={handleCreate}>
              Create Draft Event
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {allowChapterPick ? (
          <div className="md:col-span-2">
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

        {/* Event Title */}
        <div className="md:col-span-2">
          <FieldLabel>Event Title</FieldLabel>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Let's Decode LinkedIn, Python Workshop…"
            autoFocus
          />
          {titleError ? (
            <p className="mt-1 text-[11px] text-red-400">{titleError}</p>
          ) : null}
        </div>

        {/* Category */}
        <div>
          <FieldLabel>Category</FieldLabel>
          {!showAddCategory ? (
            <div className="flex gap-1.5">
              <Select
                value={category}
                onChange={(e) => {
                  if (e.target.value === "__add__") {
                    setShowAddCategory(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="flex-1"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__add__">＋ Add new category…</option>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <Input
                  ref={newCatInputRef}
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value.toUpperCase());
                    setCategoryError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); }
                    if (e.key === "Escape") { setShowAddCategory(false); setNewCategory(""); }
                  }}
                  placeholder="E.g. SYMPOSIUM"
                  className="flex-1 uppercase"
                  maxLength={40}
                />
                <Button
                  type="button"
                  variant="orange"
                  className="h-9 px-3 text-[12px]"
                  onClick={handleAddCategory}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-2 text-[12px]"
                  onClick={() => { setShowAddCategory(false); setNewCategory(""); setCategoryError(""); }}
                >
                  ✕
                </Button>
              </div>
              {categoryError ? (
                <p className="text-[11px] text-red-400">{categoryError}</p>
              ) : (
                <p className="text-[11px] text-text-dim">
                  Category will be saved in UPPERCASE and shared across all chapters.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Venue */}
        <div>
          <FieldLabel>Venue / Location</FieldLabel>
          <Input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Main Seminar Hall, Lab 3, Online…"
          />
        </div>

        {/* Date/Time */}
        <div>
          <FieldLabel>Starts At</FieldLabel>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Ends At</FieldLabel>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>

        {/* Event Access & Privacy */}
        <div className="md:col-span-2">
          <FieldLabel>Event Access & Privacy</FieldLabel>
          <Select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
          >
            <option value="chapter_only">🔒 Chapter Members Only — this chapter's members with platform accounts</option>
            <option value="open_to_all">🌍 Open to All Platform Users — any student with a platform account</option>
          </Select>
          <p className="mt-1 text-[11px] text-text-dim">
            {visibility === "chapter_only"
              ? "Only members of this chapter who have a platform account can register."
              : "Any student with a platform account (across all chapters) can register. Non-platform users cannot join."}
          </p>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <FieldLabel>Description / Agenda (optional)</FieldLabel>
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief summary of event rules, schedule, prerequisites…"
            className="min-h-[72px]"
          />
        </div>
      </div>

      {/* Draft notice */}
      <div className="mt-3 rounded-[10px] border border-border/60 bg-bg-panel px-3 py-2">
        <p className="text-[12px] text-text-dim">
          <span className="font-semibold text-text">📝 Saved as Draft</span> — The event will be created
          as a draft. Only the <strong>HQ Founder</strong> or <strong>Campus Lead</strong> can publish it
          to open registration.
        </p>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] text-[var(--accent)]">{error}</p>
      ) : null}
    </Dialog>
  );
}
