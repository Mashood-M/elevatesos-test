import { getEventForm, defaultFormsForEvent } from "@/lib/forms/helpers";
import type { ElevatesStore, EventItem } from "@/types";

export type RegisterEligibility =
  | { ok: true; formId: string; isWaitlist: boolean }
  | { ok: false; reason: string };

export interface EventRegistrationState {
  status: "open" | "waitlist_open" | "closed" | "ended" | "upcoming";
  label: string;
  canRegister: boolean;
  isWaitlist: boolean;
  isClosed: boolean;
  approvedCount: number;
  waitlistedCount: number;
  capacity: number;
  waitlistCapacity: number;
  seatsLeft: number;
  waitlistSeatsLeft: number;
  hasWaitlist: boolean;
  reason?: string;
}

/**
 * Calculates current registration state, seat capacity, waitlist status, and whether registration is closed.
 * - If seats are available (approved < capacity): Status is "open" (direct registration, priority-wise first registered gets seat).
 * - If seats are full and event has waitlist (waitlistCapacity > 0):
 *     - If waitlist has spots: Status is "waitlist_open" (users are added to waiting list).
 *     - If waitlist is full: Status is "closed" ("Registration Closed").
 * - If seats are full and event does not have waitlist (waitlistCapacity <= 0): Status is "closed" ("Registration Closed").
 */
export function getEventRegistrationState(
  store: ElevatesStore,
  event: EventItem,
  userId?: string,
  nowMs: number = Date.now(),
): EventRegistrationState {
  const approvedCount = (store.registrations ?? []).filter(
    (r) => r.eventId === event.id && r.status === "approved",
  ).length;
  const waitlistedCount = (store.registrations ?? []).filter(
    (r) => r.eventId === event.id && r.status === "waitlisted",
  ).length;

  const capacity =
    typeof event.capacity === "number" && event.capacity > 0
      ? event.capacity
      : 100;
  const waitlistCapacity =
    typeof event.waitlistCapacity === "number" && event.waitlistCapacity > 0
      ? event.waitlistCapacity
      : 0;
  const hasWaitlist = waitlistCapacity > 0;
  const seatsLeft = Math.max(0, capacity - approvedCount);
  const waitlistSeatsLeft = hasWaitlist
    ? Math.max(0, waitlistCapacity - waitlistedCount)
    : 0;

  const st = (event.status || "").toLowerCase();
  const isExplicitlyClosed =
    st === "draft" ||
    st === "completed" ||
    st === "cancelled" ||
    st === "registration_closed";

  if (st === "completed" || st === "cancelled") {
    return {
      status: "ended",
      label: st === "completed" ? "Event Ended" : "Event Cancelled",
      canRegister: false,
      isWaitlist: false,
      isClosed: true,
      approvedCount,
      waitlistedCount,
      capacity,
      waitlistCapacity,
      seatsLeft,
      waitlistSeatsLeft,
      hasWaitlist,
      reason:
        st === "completed"
          ? "This event has already ended."
          : "This event was cancelled.",
    };
  }

  if (isExplicitlyClosed) {
    return {
      status: "closed",
      label: "Registration Closed",
      canRegister: false,
      isWaitlist: false,
      isClosed: true,
      approvedCount,
      waitlistedCount,
      capacity,
      waitlistCapacity,
      seatsLeft,
      waitlistSeatsLeft,
      hasWaitlist,
      reason:
        st === "draft"
          ? "This event is currently in draft mode and not published."
          : "Registration is closed for this event.",
    };
  }

  // Registration window
  if (event.registrationStart) {
    const start = new Date(event.registrationStart).getTime();
    if (Number.isFinite(start) && nowMs < start) {
      return {
        status: "upcoming",
        label: "Registration Upcoming",
        canRegister: false,
        isWaitlist: false,
        isClosed: false,
        approvedCount,
        waitlistedCount,
        capacity,
        waitlistCapacity,
        seatsLeft,
        waitlistSeatsLeft,
        hasWaitlist,
        reason: "Registration has not opened yet.",
      };
    }
  }

  if (event.registrationEnd) {
    const end = new Date(event.registrationEnd).getTime();
    if (Number.isFinite(end) && nowMs > end) {
      return {
        status: "closed",
        label: "Registration Closed",
        canRegister: false,
        isWaitlist: false,
        isClosed: true,
        approvedCount,
        waitlistedCount,
        capacity,
        waitlistCapacity,
        seatsLeft,
        waitlistSeatsLeft,
        hasWaitlist,
        reason: "Registration has closed for this event.",
      };
    }
  }

  // Check seat capacity & waitlist
  if (seatsLeft > 0) {
    return {
      status: "open",
      label: "Register",
      canRegister: true,
      isWaitlist: false,
      isClosed: false,
      approvedCount,
      waitlistedCount,
      capacity,
      waitlistCapacity,
      seatsLeft,
      waitlistSeatsLeft,
      hasWaitlist,
    };
  }

  // Seats are full (seatsLeft === 0)
  if (hasWaitlist) {
    if (waitlistSeatsLeft > 0) {
      return {
        status: "waitlist_open",
        label: "Join Waiting List",
        canRegister: true,
        isWaitlist: true,
        isClosed: false,
        approvedCount,
        waitlistedCount,
        capacity,
        waitlistCapacity,
        seatsLeft,
        waitlistSeatsLeft,
        hasWaitlist,
      };
    } else {
      // Waiting list is full
      return {
        status: "closed",
        label: "Registration Closed",
        canRegister: false,
        isWaitlist: false,
        isClosed: true,
        approvedCount,
        waitlistedCount,
        capacity,
        waitlistCapacity,
        seatsLeft,
        waitlistSeatsLeft,
        hasWaitlist,
        reason:
          "Registration is closed. Both event capacity and waiting list are full.",
      };
    }
  } else {
    // No waiting list on this event and seats are full
    return {
      status: "closed",
      label: "Registration Closed",
      canRegister: false,
      isWaitlist: false,
      isClosed: true,
      approvedCount,
      waitlistedCount,
      capacity,
      waitlistCapacity,
      seatsLeft,
      waitlistSeatsLeft,
      hasWaitlist,
      reason: "Registration is closed. All available seats have been filled.",
    };
  }
}

/**
 * Whether a user can register for an event right now.
 * Checks: capacity & waitlist availability, form availability, registration window,
 * platform account requirement, chapter-only visibility, and duplicate registration.
 */
export function canRegisterNow(
  store: ElevatesStore,
  event: EventItem,
  userId: string | undefined,
  nowMs: number = Date.now(),
): RegisterEligibility {
  // 1. Capacity, Waitlist & Event Status State Check
  const regState = getEventRegistrationState(store, event, userId, nowMs);
  if (!regState.canRegister) {
    return {
      ok: false,
      reason: regState.reason || "Registration is closed for this event.",
    };
  }

  // 2. Registration form availability
  // If a custom form exists, check its status; otherwise fallback to default event form
  const customForm = getEventForm(store, event.id, "registration");
  const form =
    customForm ??
    defaultFormsForEvent(event.id, event.chapterId, event.title).find(
      (f) => f.purpose === "registration",
    );

  if (customForm && customForm.status && customForm.status !== "open") {
    return {
      ok: false,
      reason: "Registration form is currently closed.",
    };
  }

  // 3. Platform account required — only registered platform users can join
  const effectiveUserId =
    userId || store.session?.userId || store.session?.authUserId;
  if (!effectiveUserId) {
    return {
      ok: false,
      reason: "You need a platform account to register for this event.",
    };
  }
  const hasAccount =
    store.profiles.some((p) => p.id === effectiveUserId) ||
    Boolean(store.session?.userId && store.session.userId === effectiveUserId);
  if (!hasAccount) {
    return {
      ok: false,
      reason: "Only users with a platform account can register for events.",
    };
  }

  // 4. Chapter closed visibility — only members of the same chapter can join.
  // Open-to-all events never require chapter membership.
  // Privileged users (founder, hq_admin, campus_lead, coordinators) are allowed to test/register across chapters.
  const isPrivilegedUser =
    store.session?.roleKey === "founder" ||
    store.session?.roleKey === "hq_admin" ||
    store.session?.roleKey === "campus_lead" ||
    store.session?.roleKey === "elevates_coordinator" ||
    store.session?.roleKey === "faculty_coordinator";

  if (!isOpenToAllEvent(event) && !isPrivilegedUser) {
    const userProfile = store.profiles.find((p) => p.id === effectiveUserId);
    if (
      userProfile?.chapterId &&
      event.chapterId &&
      userProfile.chapterId !== event.chapterId
    ) {
      return {
        ok: false,
        reason: "This event is only open to members of this chapter.",
      };
    }
  }

  // 5. Duplicate registration check
  const duplicate = store.registrations?.some(
    (r) =>
      r.eventId === event.id &&
      (r.userId === effectiveUserId || r.userId === userId) &&
      r.status !== "rejected",
  );
  if (duplicate) {
    return { ok: false, reason: "You are already registered for this event." };
  }

  return {
    ok: true,
    formId: form?.id || `form-reg-${event.id}`,
    isWaitlist: regState.isWaitlist,
  };
}

/** Check if an event is open to all students across colleges and chapters. */
export function isOpenToAllEvent(event: EventItem): boolean {
  return (
    event.visibility === "open_to_all" ||
    event.visibility === "public" ||
    event.visibility === "all_chapters"
  );
}

/**
 * Deduplicates an array of events by ID, (chapterId + slug), and (chapterId + title).
 * When duplicate entries are found, the first valid one is preserved.
 */
export function deduplicateEvents(events: EventItem[]): EventItem[] {
  const seenIds = new Set<string>();
  const seenChapterSlugs = new Set<string>();
  const seenChapterTitles = new Set<string>();
  const deduplicated: EventItem[] = [];

  for (const ev of events) {
    if (!ev || !ev.title) continue;

    // 1. Check ID
    if (ev.id) {
      const idNorm = ev.id.trim().toLowerCase();
      if (seenIds.has(idNorm)) continue;
      seenIds.add(idNorm);
    }

    // 2. Check chapterId + slug
    if (ev.chapterId && ev.slug) {
      const slugKey = `${ev.chapterId.trim().toLowerCase()}::${ev.slug.trim().toLowerCase()}`;
      if (seenChapterSlugs.has(slugKey)) continue;
      seenChapterSlugs.add(slugKey);
    }

    // 3. Check chapterId + title
    if (ev.chapterId && ev.title) {
      const titleKey = `${ev.chapterId.trim().toLowerCase()}::${ev.title.trim().toLowerCase()}`;
      if (seenChapterTitles.has(titleKey)) continue;
      seenChapterTitles.add(titleKey);
    }

    deduplicated.push(ev);
  }

  return deduplicated;
}

/**
 * Determine whether a given event is visible to a user based on privacy/visibility rules:
 * - HQ roles (founder, hq_admin) can see all events across all chapters.
 * - Draft / unapproved events are only visible to HQ or managers of that specific chapter.
 * - Open events (open_to_all, public, all_chapters) are visible across all chapters and to non-chapter members.
 * - Closed / chapter-exclusive events ONLY show on the chapter under users who belong to that chapter.
 */
export function isEventVisibleToUser(
  event: EventItem,
  userChapterId?: string,
  userRoleKey?: string,
  sessionUserId?: string,
  allChapters?: { id: string; slug?: string }[],
): boolean {
  // 1. HQ roles can see all events
  if (userRoleKey === "founder" || userRoleKey === "hq_admin") {
    return true;
  }

  // 2. The event organizer can always see their own event
  if (sessionUserId && event.organizerId && sessionUserId === event.organizerId) {
    return true;
  }

  // 3. Robust chapter matching (supports UUID matching, slug matching, and cross-lookup)
  const isSameChapter = (() => {
    if (!userChapterId || !event.chapterId) return false;
    if (userChapterId === event.chapterId) return true;
    if (userChapterId.toLowerCase() === event.chapterId.toLowerCase()) return true;
    if (allChapters && allChapters.length > 0) {
      const uCh = allChapters.find(
        (c) => c.id === userChapterId || c.slug === userChapterId,
      );
      const eCh = allChapters.find(
        (c) => c.id === event.chapterId || c.slug === event.chapterId,
      );
      if (uCh && eCh && uCh.id === eCh.id) return true;
    }
    return false;
  })();

  const isChapterManager =
    isSameChapter &&
    (userRoleKey === "campus_lead" ||
      userRoleKey === "chairman" ||
      userRoleKey === "vice_chairman" ||
      userRoleKey === "secretary" ||
      userRoleKey === "joint_secretary" ||
      userRoleKey === "elevates_coordinator" ||
      userRoleKey === "technical_lead" ||
      userRoleKey === "media_lead" ||
      userRoleKey === "innovation_lead");

  // 4. Draft / un-published events: ONLY visible to HQ, Chapter Managers, or the Organizer
  if (event.status === "draft" || event.status === "pending_approval") {
    return isChapterManager;
  }

  // 5. Open to all events: visible across all chapters and to non-chapter members
  if (isOpenToAllEvent(event)) {
    return true;
  }

  // 6. Closed / chapter-only events: ONLY visible to users who belong to this chapter
  return isSameChapter;
}

export const DEFAULT_EVENT_CATEGORIES: string[] = [
  "WORKSHOP",
  "HACKATHON",
  "MEETUP",
  "LECTURE",
  "LAB",
  "SHOWCASE",
  "CHALLENGE",
];

export function getAllEventCategories(storeCategories?: string[]): string[] {
  const merged = [
    ...DEFAULT_EVENT_CATEGORIES,
    ...(storeCategories || []).map((c) => String(c).trim().toUpperCase()),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cat of merged) {
    if (cat && !seen.has(cat)) {
      seen.add(cat);
      result.push(cat);
    }
  }
  return result;
}

