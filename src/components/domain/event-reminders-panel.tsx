"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  Mail,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Edit2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore } from "@/context/store-context";
import {
  buildDefaultEventReminders,
  computeScheduledTime,
  formatEventDateForMessage,
  formatEventTimeForMessage,
} from "@/lib/events/reminders";
import type { EventItem, EventReminder, EventReminderTrigger, OutboundChannel } from "@/types";
import { cn } from "@/lib/utils";

interface EventRemindersPanelProps {
  event: EventItem;
  chapterSlug: string;
  canManage?: boolean;
}

export function EventRemindersPanel({
  event,
  chapterSlug,
  canManage = true,
}: EventRemindersPanelProps) {
  const {
    store,
    createEventReminder,
    updateEventReminder,
    deleteEventReminder,
    sendEventReminder,
  } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<EventReminder | null>(null);
  const [triggerType, setTriggerType] = useState<EventReminderTrigger>("24h_before");
  const [customDateTime, setCustomDateTime] = useState("");
  const [channel, setChannel] = useState<OutboundChannel | "all">("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Attendees count
  const attendeesCount = useMemo(() => {
    return store.registrations.filter(
      (r) =>
        (r.eventId === event.id || r.eventId === `evt-${event.id}`) &&
        (r.status === "approved" || r.status === "pending"),
    ).length;
  }, [store.registrations, event.id]);

  // Reminders for this event
  const eventReminders = useMemo(() => {
    return (store.eventReminders ?? [])
      .filter(
        (r) =>
          r.eventId === event.id ||
          r.eventId === `evt-${event.id}` ||
          (event.slug && r.eventId === event.slug),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
      );
  }, [store.eventReminders, event.id, event.slug]);

  function openCreateDialog(preset?: EventReminderTrigger) {
    setEditingReminder(null);
    const trig = preset || "24h_before";
    setTriggerType(trig);
    setChannel("all");
    const sched = computeScheduledTime(event.startsAt, trig);
    setCustomDateTime(sched.slice(0, 16));

    const timeStr = formatEventTimeForMessage(event.startsAt);
    const dateStr = formatEventDateForMessage(event.startsAt);
    const venue = event.venue?.trim() || "Main Auditorium";

    if (trig === "24h_before") {
      setTitle(`Reminder: ${event.title} is tomorrow!`);
      setMessage(
        `Hi! Reminder that ${event.title} takes place tomorrow (${dateStr}) at ${timeStr}. Venue: ${venue}. Bring your check-in QR pass.`,
      );
    } else if (trig === "1h_before") {
      setTitle(`Starting in 1 hour: ${event.title}`);
      setMessage(
        `Doors open! ${event.title} starts in 1 hour at ${venue}. Head over to check in.`,
      );
    } else if (trig === "morning_of") {
      setTitle(`Today: ${event.title} at ${timeStr}`);
      setMessage(
        `Good morning! ${event.title} is happening today at ${timeStr} at ${venue}. See you there!`,
      );
    } else {
      setTitle(`Reminder: ${event.title}`);
      setMessage(
        `Reminder for ${event.title} on ${dateStr} at ${timeStr}. Venue: ${venue}.`,
      );
    }
    setDialogOpen(true);
  }

  function openEditDialog(reminder: EventReminder) {
    setEditingReminder(reminder);
    setTriggerType(reminder.triggerType);
    setChannel(reminder.channel);
    setTitle(reminder.title);
    setMessage(reminder.message);
    setCustomDateTime(reminder.scheduledFor ? reminder.scheduledFor.slice(0, 16) : "");
    setDialogOpen(true);
  }

  function handleSaveReminder() {
    if (!title.trim() || !message.trim()) return;
    const scheduledFor =
      triggerType === "custom" && customDateTime
        ? new Date(customDateTime).toISOString()
        : computeScheduledTime(event.startsAt, triggerType, customDateTime);

    if (editingReminder) {
      updateEventReminder(editingReminder.id, {
        title: title.trim(),
        message: message.trim(),
        triggerType,
        scheduledFor,
        channel,
      });
      setFlash("Reminder updated and saved to Supabase.");
    } else {
      createEventReminder({
        id: `rem-${Date.now()}`,
        eventId: event.id,
        chapterId: event.chapterId,
        title: title.trim(),
        message: message.trim(),
        triggerType,
        scheduledFor,
        channel,
        status: "scheduled",
        recipientCount: 0,
        createdAt: new Date().toISOString(),
      });
      setFlash("New reminder scheduled and saved to Supabase.");
    }
    setDialogOpen(false);
    setTimeout(() => setFlash(null), 4000);
  }

  function handleActivateDefaults() {
    const defaults = buildDefaultEventReminders(event, event.chapterId);
    defaults.forEach((rem) => {
      createEventReminder(rem);
    });
    setFlash(`Activated ${defaults.length} default reminders (24h, morning of, and 1h prior).`);
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleSendNow(reminder: EventReminder) {
    if (!canManage) return;
    setSendingId(reminder.id);
    try {
      const sentCount = await sendEventReminder(reminder.id, event.id);
      setFlash(
        `Successfully sent reminder "${reminder.title}" to ${sentCount} registered attendee${sentCount === 1 ? "" : "s"}! Saved to Supabase notifications.`,
      );
    } catch (err: any) {
      setFlash(`Failed to send reminder: ${err?.message || "Unknown error"}`);
    } finally {
      setSendingId(null);
      setTimeout(() => setFlash(null), 5000);
    }
  }

  function formatRelativeSchedule(dateStr: string): string {
    try {
      const target = new Date(dateStr).getTime();
      const now = Date.now();
      const diffMs = target - now;
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const formatted = new Date(dateStr).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      if (diffMs < 0) {
        return `${formatted} (Past)`;
      }
      if (diffHours < 1) {
        return `${formatted} (in < 1 hour)`;
      }
      if (diffHours < 24) {
        return `${formatted} (in ${diffHours}h)`;
      }
      return `${formatted} (in ${diffDays}d)`;
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[var(--accent)]" />
            <h4 className="font-bold text-sm text-text">Event Reminders</h4>
            <Badge tone="cyan">{eventReminders.length} configured</Badge>
          </div>
          <p className="mt-0.5 text-xs text-text-dim">
            {attendeesCount} registered student{attendeesCount === 1 ? "" : "s"} will receive in-app and broadcast reminders.
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {eventReminders.length === 0 ? (
              <Button
                variant="secondary"
                className="h-8 text-xs font-semibold"
                onClick={handleActivateDefaults}
              >
                <Sparkles size={13} className="mr-1.5 text-amber-500" />
                Add Defaults (24h & 1h)
              </Button>
            ) : null}
            <Button
              variant="orange"
              className="h-8 text-xs font-semibold"
              onClick={() => openCreateDialog("custom")}
            >
              <Plus size={13} className="mr-1.5" />
              Schedule Reminder
            </Button>
          </div>
        ) : null}
      </div>

      {flash ? (
        <div className="rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs font-medium text-emerald-500 flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>{flash}</span>
        </div>
      ) : null}

      {/* List of reminders */}
      {eventReminders.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border/80 bg-bg/50 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            <Bell size={18} />
          </div>
          <h5 className="mt-2 text-sm font-semibold text-text">No Reminders Configured</h5>
          <p className="mt-1 text-xs text-text-dim max-w-md mx-auto">
            Ensure higher student attendance by scheduling automated reminders 24 hours and 1 hour before {event.title}.
          </p>
          {canManage ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="orange"
                className="h-8 text-xs font-semibold"
                onClick={handleActivateDefaults}
              >
                <Sparkles size={13} className="mr-1.5 text-white" />
                Activate Default Reminders (24h, morning, 1h)
              </Button>
              <Button
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => openCreateDialog("custom")}
              >
                <Plus size={13} className="mr-1.5" />
                Custom Schedule
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {eventReminders.map((reminder) => {
            const isSent = reminder.status === "sent";
            const isSending = sendingId === reminder.id;
            return (
              <div
                key={reminder.id}
                className={cn(
                  "rounded-[12px] border p-3.5 transition-all shadow-[var(--shadow-sm)]",
                  isSent
                    ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                    : "border-border/80 bg-bg",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={isSent ? "green" : "orange"}>
                        {isSent ? "Sent" : "Scheduled"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-dim">
                        <Clock size={12} className="text-text-mute" />
                        {formatRelativeSchedule(reminder.scheduledFor)}
                      </span>
                      <span className="text-[11px] font-mono text-text-dim capitalize">
                        · {reminder.channel}
                      </span>
                    </div>

                    <h5 className="text-sm font-bold text-text pt-0.5">{reminder.title}</h5>
                    <p className="text-xs text-text-dim leading-relaxed whitespace-pre-line">
                      {reminder.message}
                    </p>

                    {isSent && reminder.sentAt ? (
                      <p className="text-[11px] font-medium text-emerald-500 pt-1 flex items-center gap-1.5">
                        <CheckCircle2 size={13} />
                        Dispatched on {new Date(reminder.sentAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        {reminder.recipientCount ? ` to ${reminder.recipientCount} student${reminder.recipientCount === 1 ? "" : "s"}` : ""}
                      </p>
                    ) : null}
                  </div>

                  {canManage ? (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1">
                      {!isSent ? (
                        <Button
                          variant="orange"
                          className="h-8 px-2.5 text-xs font-semibold"
                          disabled={isSending}
                          onClick={() => handleSendNow(reminder)}
                        >
                          <Send size={12} className="mr-1.5" />
                          {isSending ? "Sending..." : "Send Now"}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-text-dim hover:text-text"
                          disabled={isSending}
                          onClick={() => handleSendNow(reminder)}
                          title="Re-send reminder to all attendees"
                        >
                          <Send size={12} className="mr-1.5" />
                          Send Again
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-text-dim hover:text-text"
                        onClick={() => openEditDialog(reminder)}
                        title="Edit reminder"
                      >
                        <Edit2 size={13} />
                      </Button>

                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-text-dim hover:text-red-500"
                        onClick={() => deleteEventReminder(reminder.id, event.id)}
                        title="Delete reminder"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingReminder ? "Edit Event Reminder" : "Schedule Event Reminder"}
        description={`Configure when and what reminder notification to send to attendees of ${event.title}.`}
        className="max-w-lg"
      >
        <div className="space-y-4 pt-2">
          <div>
            <FieldLabel>Timing Preset</FieldLabel>
            <Select
              value={triggerType}
              onChange={(e) => {
                const trig = e.target.value as EventReminderTrigger;
                setTriggerType(trig);
                if (trig !== "custom") {
                  const sched = computeScheduledTime(event.startsAt, trig);
                  setCustomDateTime(sched.slice(0, 16));
                }
              }}
            >
              <option value="24h_before">24 Hours Before Start</option>
              <option value="morning_of">Morning of Event (9:00 AM)</option>
              <option value="2h_before">2 Hours Before Start</option>
              <option value="1h_before">1 Hour Before Start</option>
              <option value="custom">Custom Date & Time</option>
            </Select>
          </div>

          <div>
            <FieldLabel>Scheduled Date & Time</FieldLabel>
            <Input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => {
                setCustomDateTime(e.target.value);
                setTriggerType("custom");
              }}
            />
            <p className="mt-1 text-[11px] text-text-dim">
              Event starts at: {new Date(event.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>

          <div>
            <FieldLabel>Delivery Channel</FieldLabel>
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value as OutboundChannel | "all")}
            >
              <option value="all">All Channels (In-App + Email + WhatsApp)</option>
              <option value="in_app">In-App Notification Only</option>
              <option value="email">Email Notification Only</option>
              <option value="whatsapp">WhatsApp Message Only</option>
            </Select>
          </div>

          <div>
            <FieldLabel>Notification Title</FieldLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reminder: Event is starting soon!"
            />
          </div>

          <div>
            <FieldLabel>Message Content</FieldLabel>
            <TextArea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide event details, venue reminder, check-in instructions..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="orange"
              onClick={handleSaveReminder}
              disabled={!title.trim() || !message.trim()}
            >
              {editingReminder ? "Update Reminder" : "Schedule Reminder"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
