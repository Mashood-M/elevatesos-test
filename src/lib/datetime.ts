/** Campus-canonical timezone for Elevates OS date display and calendar math. */
export const APP_TZ = "Asia/Kolkata";

export type YearMonth = { year: number; month: number }; // month 1–12

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function partsInTz(date: Date, timeZone = APP_TZ) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD in APP_TZ */
export function dateKeyInTz(input: string | Date, timeZone = APP_TZ): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const { year, month, day } = partsInTz(d, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function monthKey(iso: string, timeZone = APP_TZ): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    timeZone,
    month: "long",
    year: "numeric",
  });
}

export function dayOfMonth(iso: string, timeZone = APP_TZ): number {
  return partsInTz(new Date(iso), timeZone).day;
}

export function nowYearMonth(timeZone = APP_TZ): YearMonth {
  const { year, month } = partsInTz(new Date(), timeZone);
  return { year, month };
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const idx = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthLabel(ym: YearMonth, timeZone = APP_TZ): string {
  // Noon UTC on the 15th avoids DST edge cases when formatting a month label.
  const probe = new Date(Date.UTC(ym.year, ym.month - 1, 15, 12));
  return probe.toLocaleDateString("en-IN", {
    timeZone,
    month: "long",
    year: "numeric",
  });
}

/**
 * Mon–Sun month matrix. Each cell is a YYYY-MM-DD key in APP_TZ.
 * Includes leading/trailing days from adjacent months.
 */
export function monthMatrix(ym: YearMonth, _timeZone = APP_TZ): string[][] {
  void _timeZone;
  const firstKey = `${ym.year}-${pad(ym.month)}-01`;
  const firstWeekday = weekdayMon0(firstKey); // 0=Mon … 6=Sun
  const daysInMonth = daysInYearMonth(ym.year, ym.month);

  const cells: string[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    const prev = addMonths(ym, -1);
    const prevDays = daysInYearMonth(prev.year, prev.month);
    const day = prevDays - firstWeekday + 1 + i;
    cells.push(`${prev.year}-${pad(prev.month)}-${pad(day)}`);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${ym.year}-${pad(ym.month)}-${pad(day)}`);
  }
  let nextDay = 1;
  const next = addMonths(ym, 1);
  while (cells.length % 7 !== 0) {
    cells.push(`${next.year}-${pad(next.month)}-${pad(nextDay)}`);
    nextDay += 1;
  }

  const weeks: string[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function daysInYearMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Monday=0 … Sunday=6 for a civil YYYY-MM-DD date. */
function weekdayMon0(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return (wd + 6) % 7;
}

export function eventSpansDate(
  startsAt: string,
  endsAt: string,
  dateKey: string,
  timeZone = APP_TZ,
): boolean {
  const start = dateKeyInTz(startsAt, timeZone);
  const end = dateKeyInTz(endsAt, timeZone);
  if (!start || !end || !dateKey) return false;
  return dateKey >= start && dateKey <= end;
}

/** Civil YYYY-MM-DD → `datetime-local` string at hour:minute (no TZ conversion). */
export function localDateTimeOn(dateKey: string, hour: number, minute = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "";
  return `${dateKey}T${pad(hour)}:${pad(minute)}`;
}

/** Format a YYYY-MM-DD key for UI (en-IN, APP_TZ civil date). */
export function formatDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey;
  const [y, m, d] = dateKey.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 6, 30));
  return probe.toLocaleDateString("en-IN", {
    timeZone: APP_TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** `datetime-local` value from ISO, shown in the browser's local zone (input constraint). */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/** Relative demo timestamps from now (local clock). */
export function offsetIso(daysFromNow: number, hour = 10, minute = 0, durationHours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  if (durationHours) d.setHours(d.getHours() + durationHours);
  return d.toISOString();
}

export const WEEKDAYS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
