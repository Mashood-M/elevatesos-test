import { getEventForm } from "@/lib/forms/helpers";
import type { ElevatesStore, EventItem } from "@/types";

export type RegisterEligibility =
  | { ok: true; formId: string }
  | { ok: false; reason: string };

/** Whether a user can register for an event right now (status, form, window, duplicates). */
export function canRegisterNow(
  store: ElevatesStore,
  event: EventItem,
  userId: string | undefined,
  nowMs: number = Date.now(),
): RegisterEligibility {
  if (event.status !== "registration_open") {
    return { ok: false, reason: "Registration is not open for this event." };
  }

  const form = getEventForm(store, event.id, "registration");
  if (!form || form.status !== "open") {
    return {
      ok: false,
      reason: "No open registration form yet — check back soon.",
    };
  }

  const start = new Date(event.registrationStart).getTime();
  const end = new Date(event.registrationEnd).getTime();
  if (Number.isFinite(start) && nowMs < start) {
    return { ok: false, reason: "Registration has not opened yet." };
  }
  if (Number.isFinite(end) && nowMs > end) {
    return { ok: false, reason: "Registration has closed for this event." };
  }

  if (userId) {
    const duplicate = store.registrations.some(
      (r) =>
        r.eventId === event.id &&
        r.userId === userId &&
        r.status !== "rejected",
    );
    if (duplicate) {
      return { ok: false, reason: "You are already registered for this event." };
    }
  }

  return { ok: true, formId: form.id };
}

/** Check if an event is open to all students across colleges and chapters. */
export function isOpenToAllEvent(event: EventItem): boolean {
  return (
    event.visibility === "open_to_all" ||
    event.visibility === "public" ||
    event.visibility === "all_chapters"
  );
}

/** Determine whether a given event is visible to a user based on privacy/visibility rules. */
export function isEventVisibleToUser(
  event: EventItem,
  userChapterId?: string,
  userRoleKey?: string,
): boolean {
  const isManager =
    userRoleKey === "founder" ||
    userRoleKey === "hq_admin" ||
    userRoleKey === "campus_lead" ||
    userRoleKey === "chairman";

  // Draft / un-published events are HIDDEN by default from non-managers until published
  if (event.status === "draft" || event.status === "pending_approval") {
    if (!isManager) return false;
  }

  // HQ roles can see all events
  if (userRoleKey === "founder" || userRoleKey === "hq_admin") {
    return true;
  }

  // Closed / private events are hidden unless manager
  if (event.visibility === "closed") {
    return isManager;
  }

  // Open to all events are visible to everyone
  if (isOpenToAllEvent(event)) {
    return true;
  }

  // Chapter-only events are ONLY visible to members of that specific chapter
  if (event.visibility === "chapter_only") {
    return Boolean(userChapterId && userChapterId === event.chapterId);
  }

  return true;
}
