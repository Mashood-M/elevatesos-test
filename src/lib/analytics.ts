import {
  addMonths,
  dateKeyInTz,
  monthLabel,
  nowYearMonth,
} from "@/lib/datetime";
import type { ElevatesStore } from "@/types";

export type ChapterMetricRow = {
  id: string;
  name: string;
  slug: string;
  members: number;
  events: number;
  projects: number;
  health: number;
};

export type MonthlyEngagement = {
  month: string;
  events: number;
  registrations: number;
};

/**
 * Calculates Chapter Activity Score dynamically following a 3-step algorithm:
 * Step 1: Calculate attendance percentage for each valid individual event: (Attendees / Seats) * 100
 *         (Skip events with 0 total seats or no capacity set).
 * Step 2: Calculate monthly activity score by averaging valid event percentages in that month.
 * Step 3: Compute overall chapter activity score by averaging all monthly activity scores.
 */
export function calculateChapterActivityScore(
  store: ElevatesStore,
  chapterId: string,
): number {
  const chapter = store.chapters.find((c) => c.id === chapterId);
  if (!chapter) return 0;

  const chapterEvents = store.events.filter((e) => e.chapterId === chapterId);
  if (chapterEvents.length === 0) return 0;

  // Group events by YYYY-MM
  const eventsByMonth = new Map<string, typeof chapterEvents>();
  for (const ev of chapterEvents) {
    const monthKey = ev.startsAt ? ev.startsAt.slice(0, 7) : "recent";
    const list = eventsByMonth.get(monthKey) ?? [];
    list.push(ev);
    eventsByMonth.set(monthKey, list);
  }

  let totalMonthlyScoreSum = 0;
  let monthsCount = 0;

  eventsByMonth.forEach((monthEvents) => {
    let validEventCount = 0;
    let eventPercentagesSum = 0;

    for (const ev of monthEvents) {
      const seats = ev.capacity ?? 0;
      // Step 1: Skip if zero total seats or unconfigured capacity
      if (seats <= 0) continue;

      const atts = store.attendance.filter(
        (a) =>
          a.eventId === ev.id &&
          ["present", "late", "volunteer", "speaker"].includes(a.status),
      );

      const eventAttendancePercentage = (atts.length / seats) * 100;
      eventPercentagesSum += eventAttendancePercentage;
      validEventCount++;
    }

    // Step 2 & 3: Monthly score is average of valid event percentages in that month
    if (validEventCount > 0) {
      const monthlyScore = eventPercentagesSum / validEventCount;
      totalMonthlyScoreSum += monthlyScore;
      monthsCount++;
    }
  });

  if (monthsCount === 0) return 0;

  const finalScore = totalMonthlyScoreSum / monthsCount;
  return Math.min(100, Math.max(0, Math.round(finalScore)));
}

/** Helper function to calculate monthly activity score trends */
export function calculateMonthlyActivityScores(
  store: ElevatesStore,
  chapterId: string,
): { month: string; score: number }[] {
  const chapterEvents = store.events.filter((e) => e.chapterId === chapterId);
  const eventsByMonth = new Map<string, typeof chapterEvents>();

  for (const ev of chapterEvents) {
    const monthKey = ev.startsAt ? ev.startsAt.slice(0, 7) : "recent";
    const list = eventsByMonth.get(monthKey) ?? [];
    list.push(ev);
    eventsByMonth.set(monthKey, list);
  }

  const results: { month: string; score: number }[] = [];

  eventsByMonth.forEach((monthEvents, month) => {
    let validEventCount = 0;
    let eventPercentagesSum = 0;

    for (const ev of monthEvents) {
      const seats = ev.capacity ?? 0;
      if (seats <= 0) continue;

      const atts = store.attendance.filter(
        (a) =>
          a.eventId === ev.id &&
          ["present", "late", "volunteer", "speaker"].includes(a.status),
      );

      eventPercentagesSum += (atts.length / seats) * 100;
      validEventCount++;
    }

    if (validEventCount > 0) {
      results.push({
        month,
        score: Math.round((eventPercentagesSum / validEventCount) * 10) / 10,
      });
    }
  });

  return results.sort((a, b) => a.month.localeCompare(b.month));
}

export function chapterMetricsFromStore(store: ElevatesStore): ChapterMetricRow[] {
  return store.chapters.map((c) => {
    const members = store.profiles.filter((p) => p.chapterId === c.id).length || c.memberCount || 0;
    const events = store.events.filter((e) => e.chapterId === c.id).length || c.eventCount || 0;
    const projects = store.projects.filter((p) => p.chapterId === c.id).length || c.projectCount || 0;
    const health = calculateChapterActivityScore(store, c.id);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      members,
      events,
      projects,
      health,
    };
  });
}

function ymKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function isoToYmKey(iso: string) {
  const day = dateKeyInTz(iso);
  return day ? day.slice(0, 7) : "";
}

/** Last `count` months (including current) of events + registrations by startsAt / createdAt. */
export function monthlyEngagementFromStore(
  store: ElevatesStore,
  count = 6,
): MonthlyEngagement[] {
  const end = nowYearMonth();
  const months: { year: number; month: number; label: string; key: string }[] =
    [];
  for (let i = count - 1; i >= 0; i--) {
    const ym = addMonths(end, -i);
    months.push({
      ...ym,
      label: monthLabel(ym).replace(/ \d{4}$/, ""),
      key: ymKey(ym.year, ym.month),
    });
  }

  const eventCounts = new Map<string, number>();
  const regCounts = new Map<string, number>();
  for (const m of months) {
    eventCounts.set(m.key, 0);
    regCounts.set(m.key, 0);
  }

  for (const event of store.events) {
    const key = isoToYmKey(event.startsAt);
    if (key && eventCounts.has(key)) {
      eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
    }
  }

  for (const reg of store.registrations) {
    const key = isoToYmKey(reg.createdAt);
    if (key && regCounts.has(key)) {
      regCounts.set(key, (regCounts.get(key) ?? 0) + 1);
    }
  }

  return months.map((m) => ({
    month: m.label,
    events: eventCounts.get(m.key) ?? 0,
    registrations: regCounts.get(m.key) ?? 0,
  }));
}
