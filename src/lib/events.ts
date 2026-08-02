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
