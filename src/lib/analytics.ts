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
 * Calculates Activity Score (Health Score) for a chapter dynamically based on event output and attendance rate.
 * Logic:
 * - Target: Minimum 2 events per month (2 events/month = 100% quota ratio).
 * - Attendance: Average attendance percentage across events (checked-in / registered).
 * - Score = (Event Quota Ratio) * (Average Attendance Rate) * 100.
 */
export function calculateChapterActivityScore(
  store: ElevatesStore,
  chapterId: string,
): number {
  const chapter = store.chapters.find((c) => c.id === chapterId);
  if (!chapter) return 0;

  const chapterEvents = store.events.filter((e) => e.chapterId === chapterId);

  // If no events recorded in store at all for this chapter, initial score is 0
  if (chapterEvents.length === 0) {
    return 0;
  }

  // Group events by YYYY-MM
  const eventsByMonth = new Map<string, typeof chapterEvents>();
  for (const ev of chapterEvents) {
    const monthKey = ev.startsAt ? ev.startsAt.slice(0, 7) : "recent";
    const list = eventsByMonth.get(monthKey) ?? [];
    list.push(ev);
    eventsByMonth.set(monthKey, list);
  }

  // Calculate monthly scores
  let totalMonthlyScoreSum = 0;
  let monthsCount = 0;

  eventsByMonth.forEach((monthEvents) => {
    monthsCount++;

    // 1. Event Target Ratio: Minimum 2 events per month -> 100% quota
    const eventQuotaRatio = Math.min(1.0, monthEvents.length / 2);

    // 2. Attendance rate across events in this month
    let eventAttendanceRatesSum = 0;
    for (const ev of monthEvents) {
      const regs = store.registrations.filter((r) => r.eventId === ev.id);
      const atts = store.attendance.filter(
        (a) =>
          a.eventId === ev.id &&
          ["present", "late", "volunteer", "speaker"].includes(a.status),
      );

      if (regs.length > 0) {
        const rate = Math.min(1.0, atts.length / regs.length);
        eventAttendanceRatesSum += rate;
      } else if (atts.length > 0) {
        eventAttendanceRatesSum += 1.0;
      } else {
        eventAttendanceRatesSum += 1.0;
      }
    }

    const avgAttendanceRateInMonth =
      monthEvents.length > 0 ? eventAttendanceRatesSum / monthEvents.length : 1.0;

    const monthlyScore = eventQuotaRatio * avgAttendanceRateInMonth * 100;
    totalMonthlyScoreSum += monthlyScore;
  });

  const finalScore =
    monthsCount > 0 ? Math.round(totalMonthlyScoreSum / monthsCount) : 0;

  return Math.min(100, Math.max(0, finalScore));
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
