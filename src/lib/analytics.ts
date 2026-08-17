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

export function chapterMetricsFromStore(store: ElevatesStore): ChapterMetricRow[] {
  return store.chapters.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    members: Math.max(c.memberCount, store.profiles.filter((p) => p.chapterId === c.id).length),
    events: Math.max(c.eventCount, store.events.filter((e) => e.chapterId === c.id).length),
    projects: Math.max(c.projectCount, store.projects.filter((p) => p.chapterId === c.id).length),
    health: c.healthScore,
  }));
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
