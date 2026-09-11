import { getEventForm, defaultFormsForEvent } from "@/lib/forms/helpers";
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
  // 1. Event status check
  // Open statuses: "registration_open", "approved", or case-insensitive "upcoming" / "ongoing"
  const st = (event.status || "").toLowerCase();
  const isExplicitlyClosed =
    st === "draft" ||
    st === "completed" ||
    st === "cancelled" ||
    st === "registration_closed";

  if (isExplicitlyClosed) {
    return {
      ok: false,
      reason:
        st === "draft"
          ? "This event is currently in draft mode and not published."
          : st === "completed"
            ? "This event has already ended."
            : "Registration is not open for this event.",
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

  // 3. Registration window
  if (event.registrationStart) {
    const start = new Date(event.registrationStart).getTime();
    if (Number.isFinite(start) && nowMs < start) {
      return { ok: false, reason: "Registration has not opened yet." };
    }
  }
  if (event.registrationEnd) {
    const end = new Date(event.registrationEnd).getTime();
    if (Number.isFinite(end) && nowMs > end) {
      return { ok: false, reason: "Registration has closed for this event." };
    }
  }

  // 4. Platform account required — only registered platform users can join
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

  // 5. Chapter closed visibility — only members of the same chapter can join.
  // Open-to-all events never require chapter membership.
  // HQ users (founder, hq_admin, campus_lead) are allowed to test/register across chapters.
  const isPrivilegedUser =
    store.session?.roleKey === "founder" ||
    store.session?.roleKey === "hq_admin" ||
    store.session?.roleKey === "campus_lead";

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

  // 6. Duplicate registration check
  const duplicate = store.registrations?.some(
    (r) =>
      r.eventId === event.id &&
      (r.userId === effectiveUserId || r.userId === userId) &&
      r.status !== "rejected",
  );
  if (duplicate) {
    return { ok: false, reason: "You are already registered for this event." };
  }

  return { ok: true, formId: form?.id || `form-reg-${event.id}` };
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

