import type { EventItem, EventReminder, EventReminderTrigger } from "@/types";

export function computeScheduledTime(
  startsAt: string,
  triggerType: EventReminderTrigger,
  customDateTime?: string,
): string {
  if (triggerType === "custom" && customDateTime) {
    const d = new Date(customDateTime);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const start = new Date(startsAt);
  const startTime = isNaN(start.getTime()) ? Date.now() + 86400000 : start.getTime();

  switch (triggerType) {
    case "24h_before":
      return new Date(startTime - 24 * 60 * 60 * 1000).toISOString();
    case "2h_before":
      return new Date(startTime - 2 * 60 * 60 * 1000).toISOString();
    case "1h_before":
      return new Date(startTime - 60 * 60 * 1000).toISOString();
    case "morning_of": {
      // 9:00 AM on event day, or 3 hours before start if event starts earlier than 10 AM
      const morning = new Date(startTime);
      morning.setHours(9, 0, 0, 0);
      if (morning.getTime() >= startTime) {
        return new Date(startTime - 3 * 60 * 60 * 1000).toISOString();
      }
      return morning.toISOString();
    }
    default:
      return new Date(startTime - 24 * 60 * 60 * 1000).toISOString();
  }
}

export function formatEventTimeForMessage(startsAt: string): string {
  try {
    const d = new Date(startsAt);
    if (isNaN(d.getTime())) return "soon";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "soon";
  }
}

export function formatEventDateForMessage(startsAt: string): string {
  try {
    const d = new Date(startsAt);
    if (isNaN(d.getTime())) return "upcoming date";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "upcoming date";
  }
}

/**
 * Builds the standard default reminders for any event.
 */
export function buildDefaultEventReminders(
  event: EventItem,
  chapterId?: string,
): EventReminder[] {
  const now = new Date().toISOString();
  const timeStr = formatEventTimeForMessage(event.startsAt);
  const dateStr = formatEventDateForMessage(event.startsAt);
  const venue = event.venue?.trim() || "Main Campus Auditorium";
  const title = event.title?.trim() || "Event";

  return [
    {
      id: `rem-24h-${event.id}`,
      eventId: event.id,
      chapterId: chapterId || event.chapterId,
      triggerType: "24h_before",
      scheduledFor: computeScheduledTime(event.startsAt, "24h_before"),
      channel: "all",
      status: "scheduled",
      title: `Reminder: ${title} is tomorrow!`,
      message: `Hi there! Reminder that ${title} takes place tomorrow (${dateStr}) at ${timeStr}. Venue: ${venue}. Please have your check-in QR pass ready on your phone.`,
      recipientCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `rem-morning-${event.id}`,
      eventId: event.id,
      chapterId: chapterId || event.chapterId,
      triggerType: "morning_of",
      scheduledFor: computeScheduledTime(event.startsAt, "morning_of"),
      channel: "all",
      status: "scheduled",
      title: `Today: ${title} starts at ${timeStr}`,
      message: `Good morning! ${title} is taking place today at ${timeStr} at ${venue}. We look forward to seeing you there!`,
      recipientCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `rem-1h-${event.id}`,
      eventId: event.id,
      chapterId: chapterId || event.chapterId,
      triggerType: "1h_before",
      scheduledFor: computeScheduledTime(event.startsAt, "1h_before"),
      channel: "all",
      status: "scheduled",
      title: `Starting in 1 hour: ${title}`,
      message: `Doors are opening! ${title} begins in 1 hour at ${venue}. Head over and get your seat.`,
      recipientCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
