import { getEventForm } from "@/lib/forms/helpers";
import type { ElevatesStore, EventItem } from "@/types";

export type RegisterEligibility =
  | { ok: true; formId: string }
  | { ok: false; reason: string };

/**
 * Whether a user can register for an event right now.
 * Checks: event status, form availability, registration window,
 * platform account requirement, chapter-only visibility, and duplicate registration.
 */
export function canRegisterNow(
  store: ElevatesStore,
  event: EventItem,
  userId: string | undefined,
  nowMs: number = Date.now(),
): RegisterEligibility {
  // 1. Event must be published (registration_open)
  if (event.status !== "registration_open") {
    return { ok: false, reason: "Registration is not open for this event." };
  }

  // 2. Must have an open registration form
  const form = getEventForm(store, event.id, "registration");
  if (!form || form.status !== "open") {
    return {
      ok: false,
      reason: "No open registration form yet — check back soon.",
    };
  }

  // 3. Registration window
  const start = new Date(event.registrationStart).getTime();
  const end = new Date(event.registrationEnd).getTime();
  if (Number.isFinite(start) && nowMs < start) {
    return { ok: false, reason: "Registration has not opened yet." };
  }
  if (Number.isFinite(end) && nowMs > end) {
    return { ok: false, reason: "Registration has closed for this event." };
  }

  // 4. Platform account required — only registered platform users can join
  if (!userId) {
    return {
      ok: false,
      reason: "You need a platform account to register for this event.",
    };
  }
  const hasAccount = store.profiles.some((p) => p.id === userId);
  if (!hasAccount) {
    return {
      ok: false,
      reason: "Only users with a platform account can register for events.",
    };
  }

  // 5. Chapter-only visibility — only members of the same chapter can join
  if (event.visibility === "chapter_only") {
    const userProfile = store.profiles.find((p) => p.id === userId);
    if (!userProfile?.chapterId || userProfile.chapterId !== event.chapterId) {
      return {
        ok: false,
        reason: "This event is only open to members of this chapter.",
      };
    }
  }

  // 6. Duplicate registration check
  const duplicate = store.registrations.some(
    (r) =>
      r.eventId === event.id &&
      r.userId === userId &&
      r.status !== "rejected",
  );
  if (duplicate) {
    return { ok: false, reason: "You are already registered for this event." };
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
