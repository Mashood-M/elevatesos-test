"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
} from "lucide-react";

/* ─── TIME & DATE UTILITIES ────────────────────────────────────────── */

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeKey(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3) return dateKey;
  const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addHoursToTimeKey(timeKey: string, hoursToAdd: number): string {
  const [hStr, mStr] = (timeKey || "10:00").split(":");
  let h = (parseInt(hStr, 10) || 0) + hoursToAdd;
  const m = mStr || "00";
  if (h >= 24) h = h % 24;
  return `${String(h).padStart(2, "0")}:${m}`;
}

export function parseToDateKey(val?: string, fallbackIso?: string): string {
  if (!val && !fallbackIso) return "";
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (fallbackIso) {
    const d = new Date(fallbackIso);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  if (val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  return "";
}

export function parseToTimeKey(val?: string, fallbackIso?: string): string {
  if (!val && !fallbackIso) return "10:00";
  if (val && /^([01]\d|2[0-3]):[0-5]\d$/.test(val)) return val;
  if (val && /am|pm/i.test(val)) {
    const match = val.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const isPm = match[3].toLowerCase() === "pm";
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m}`;
    }
  }
  if (fallbackIso) {
    const d = new Date(fallbackIso);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  return "10:00";
}

export function formatDisplayDate(dateKey: string): string {
  if (!dateKey) return "";
  const parts = dateKey.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return dateKey;
}

export function formatDisplayTime(timeKey: string): string {
  if (!timeKey) return "";
  const [hStr, mStr] = timeKey.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return timeKey;
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr || "00"} ${ampm}`;
}

export function getDateRelativeLabel(dateKey: string): string {
  if (!dateKey) return "Upcoming dates only";
  const todayKey = getTodayDateKey();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  if (dateKey === todayKey) {
    return "Today • Upcoming";
  }
  if (dateKey === tomorrowKey) {
    return "Tomorrow • Upcoming";
  }
  const parts = dateKey.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) {
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      return `${weekday} • Upcoming only`;
    }
  }
  return "Upcoming date";
}

/**
 * Calculates start and end times strictly 1+ hour in front of current real time,
 * rounded cleanly to the next hour.
 */
export function getDefaultUpcomingEventTimes(baseDateKey?: string) {
  const now = new Date();
  const todayKey = getTodayDateKey();
  const dateKey = baseDateKey && baseDateKey >= todayKey ? baseDateKey : todayKey;

  let startHours = 10;
  let startMinutes = 0;

  if (dateKey === todayKey) {
    // Exactly "one in front time to real time":
    // 1 hour in front of real time, rounded to the next full hour
    const future = new Date(now.getTime() + 60 * 60 * 1000);
    let h = future.getHours();
    let m = future.getMinutes();
    if (m > 0) {
      h += 1;
      m = 0;
    }
    if (h >= 24) {
      // Midnight wrap-around: defaults to 10:00 AM next day
      startHours = 10;
      startMinutes = 0;
    } else {
      startHours = h;
      startMinutes = m;
    }
  }

  const endHours = (startHours + 2) % 24;
  const startTimeKey = `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`;
  const endTimeKey = `${String(endHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`;

  return {
    dateKey,
    displayDate: formatDisplayDate(dateKey),
    startTimeKey,
    displayStartTime: formatDisplayTime(startTimeKey),
    endTimeKey,
    displayEndTime: formatDisplayTime(endTimeKey),
    isoStartDate: new Date(`${dateKey}T${startTimeKey}:00`).toISOString(),
    isoEndDate: new Date(`${dateKey}T${endTimeKey}:00`).toISOString(),
  };
}

/* ─── HOOK: CLICK OUTSIDE ─────────────────────────────────────────── */

function useClickOutside(
  ref: React.RefObject<HTMLDivElement | null>,
  handler: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    function listener(e: MouseEvent | TouchEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) {
        return;
      }
      handler();
    }
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, active]);
}

/* ─── CUSTOM MATCHING CALENDAR COMPONENT ───────────────────────────── */

interface DatePickerInputProps {
  value: string;
  onChange: (dateKey: string, displayDate: string) => void;
  min?: string;
  placeholder?: string;
  showQuickPresets?: boolean;
  align?: "left" | "right";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DatePickerInput({
  value,
  onChange,
  min,
  placeholder = "Select upcoming date...",
  showQuickPresets = true,
  align = "left",
}: DatePickerInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const todayKey = getTodayDateKey();
  const effectiveMin = min && min >= todayKey ? min : todayKey;
  const dateKey = parseToDateKey(value) || effectiveMin;
  const display = formatDisplayDate(dateKey);
  const subLabel = getDateRelativeLabel(dateKey);

  // Parse current selected or initial view year/month
  const initialDate = dateKey ? new Date(dateKey) : new Date();
  const [viewYear, setViewYear] = useState(
    !isNaN(initialDate.getTime()) ? initialDate.getFullYear() : new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    !isNaN(initialDate.getTime()) ? initialDate.getMonth() : new Date().getMonth(),
  );

  // Sync viewed month with selected date if it changes externally
  useEffect(() => {
    if (dateKey) {
      const parts = dateKey.split("-").map(Number);
      if (parts.length === 3) {
        setViewYear(parts[0]);
        setViewMonth(parts[1] - 1);
      }
    }
  }, [dateKey]);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Check if prev month is fully in the past
  const todayDate = new Date();
  const isPrevMonthDisabled =
    viewYear < todayDate.getFullYear() ||
    (viewYear === todayDate.getFullYear() && viewMonth <= todayDate.getMonth());

  // Generate calendar days matrix
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0=Monday ... 6=Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells: {
    dayNumber: number;
    dateKey: string;
    isCurrentMonth: boolean;
    isDisabled: boolean;
    isSelected: boolean;
    isToday: boolean;
  }[] = [];

  // Prev month filler
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const k = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarCells.push({
      dayNumber: day,
      dateKey: k,
      isCurrentMonth: false,
      isDisabled: true,
      isSelected: k === dateKey,
      isToday: k === todayKey,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isDisabled = k < effectiveMin;
    calendarCells.push({
      dayNumber: d,
      dateKey: k,
      isCurrentMonth: true,
      isDisabled,
      isSelected: k === dateKey,
      isToday: k === todayKey,
    });
  }

  // Next month filler
  const totalCells = Math.ceil(calendarCells.length / 7) * 7;
  const remaining = totalCells - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const k = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({
      dayNumber: d,
      dateKey: k,
      isCurrentMonth: false,
      isDisabled: k < effectiveMin,
      isSelected: k === dateKey,
      isToday: k === todayKey,
    });
  }

  const selectDate = (k: string) => {
    if (k < effectiveMin) return;
    onChange(k, formatDisplayDate(k));
    setIsOpen(false);
  };

  // Presets
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const nextWeekKey = addDaysToDateKey(todayKey, 7);

  const presets = [
    { label: "Today", key: todayKey },
    { label: "Tomorrow", key: tomorrowKey },
    { label: "+7 Days", key: nextWeekKey },
  ].filter((p) => p.key >= effectiveMin);

  return (
    <div ref={containerRef} className="relative space-y-1.5 w-full">
      {/* ── Custom Trigger Input Card ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`group relative flex items-center justify-between gap-3 h-11 w-full rounded-xl border px-3 transition-all duration-200 cursor-pointer shadow-xs select-none outline-none ${
          isOpen
            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20 bg-bg-panel"
            : "border-border/80 bg-bg hover:bg-bg-panel/70 hover:border-[var(--accent)]/60 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:bg-[var(--accent)]/20">
            <CalendarIcon size={14} className="stroke-[2.2]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 leading-none text-left">
            <span className="text-xs font-semibold text-text truncate tracking-tight">
              {display || <span className="text-text-mute font-normal">{placeholder}</span>}
            </span>
            <span className="text-[10px] text-text-dim mt-0.5 truncate">
              {subLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium text-text-dim px-2 py-0.5 rounded-full bg-bg-panel border border-border/70 group-hover:border-[var(--accent)]/40 group-hover:text-text transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            Calendar
          </span>
          <ChevronDown
            size={13}
            className={`text-text-dim/80 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[var(--accent)]" : "group-hover:text-[var(--accent)]"
            }`}
          />
        </div>
      </div>

      {/* ── Quick Shortcut Presets ── */}
      {showQuickPresets && presets.length > 0 && (
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[10px] text-text-mute font-medium flex items-center gap-1 mr-0.5">
            <Sparkles size={10} className="text-[var(--accent)]" /> Quick:
          </span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.key, formatDisplayDate(preset.key))}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                dateKey === preset.key
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)] font-semibold"
                  : "bg-bg-panel/80 border-border/60 text-text-dim hover:text-text hover:border-border"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Custom Matching Calendar Popover Dropdown ── */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-border/90 bg-bg-panel p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Calendar Header: Month & Year Navigator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-text">
                {MONTH_NAMES[viewMonth]}
              </span>
              <span className="text-sm font-mono text-text-dim">
                {viewYear}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isPrevMonthDisabled}
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className={`flex items-center justify-center w-7 h-7 rounded-lg border border-border/70 transition-colors ${
                  isPrevMonthDisabled
                    ? "opacity-30 cursor-not-allowed bg-transparent text-text-mute"
                    : "hover:bg-bg-hover hover:border-[var(--accent)]/40 text-text"
                }`}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/70 hover:bg-bg-hover hover:border-[var(--accent)]/40 text-text transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_NAMES.map((name) => (
              <span
                key={name}
                className="text-[10px] font-mono font-semibold uppercase text-text-dim/70 py-1"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarCells.map((cell, idx) => {
              if (cell.isDisabled) {
                return (
                  <div
                    key={idx}
                    className="h-8 flex items-center justify-center text-[11px] font-mono text-text-mute/30 cursor-not-allowed rounded-lg"
                  >
                    {cell.dayNumber}
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDate(cell.dateKey)}
                  className={`h-8 flex items-center justify-center text-[11px] font-mono rounded-lg transition-all ${
                    cell.isSelected
                      ? "bg-[var(--accent)] text-white font-bold shadow-sm shadow-[var(--accent)]/30 scale-105"
                      : cell.isToday
                        ? "border border-[var(--accent)] text-[var(--accent)] font-semibold hover:bg-[var(--accent)]/10"
                        : cell.isCurrentMonth
                          ? "text-text hover:bg-bg-hover hover:text-[var(--accent)] font-medium"
                          : "text-text-dim/60 hover:bg-bg-hover"
                  }`}
                >
                  {cell.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Calendar Footer: Quick Info & Done */}
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-text-dim">
                Only upcoming dates selectable
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline px-1.5 py-0.5"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CUSTOM MATCHING CLOCK COMPONENT ─────────────────────────────── */

interface TimePickerInputProps {
  value: string;
  onChange: (timeKey: string, displayTime: string) => void;
  min?: string;
  placeholder?: string;
  showQuickPresets?: boolean;
  isEndTime?: boolean;
  baseStartTime?: string;
  align?: "left" | "right";
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_5 = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export function TimePickerInput({
  value,
  onChange,
  min,
  placeholder = "Select time...",
  showQuickPresets = true,
  isEndTime = false,
  baseStartTime,
  align = "left",
}: TimePickerInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const timeKey = parseToTimeKey(value);
  const display = formatDisplayTime(timeKey);

  // Parse timeKey into 12-hour components
  const [h24Str, mStr] = (timeKey || "14:00").split(":");
  let currentH24 = parseInt(h24Str, 10);
  if (isNaN(currentH24)) currentH24 = 14;
  const currentAmpm: "AM" | "PM" = currentH24 >= 12 ? "PM" : "AM";
  let currentH12 = currentH24 % 12;
  if (currentH12 === 0) currentH12 = 12;
  const currentM = mStr || "00";

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  // Helper to test if a 24h time HH:MM is before min
  const isTimeKeyDisabled = useCallback(
    (targetKey: string): boolean => {
      if (!min) return false;
      return targetKey < min;
    },
    [min],
  );

  // Check if AM or PM are fully disabled
  const isAmpmFullyDisabled = (target: "AM" | "PM") => {
    if (!min) return false;
    return HOURS_12.every((h12) => {
      const h24 = target === "PM" ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
      return MINUTES_5.every((m) =>
        isTimeKeyDisabled(`${String(h24).padStart(2, "0")}:${m}`),
      );
    });
  };

  // Switch AM/PM
  const toggleAmpm = (target: "AM" | "PM") => {
    let newH24 = currentH12;
    if (target === "PM") {
      newH24 = currentH12 === 12 ? 12 : currentH12 + 12;
    } else {
      newH24 = currentH12 === 12 ? 0 : currentH12;
    }
    let newKey = `${String(newH24).padStart(2, "0")}:${currentM}`;
    if (isTimeKeyDisabled(newKey)) {
      // Find earliest valid minute in that hour
      const validMinute = MINUTES_5.find(
        (m) => !isTimeKeyDisabled(`${String(newH24).padStart(2, "0")}:${m}`),
      );
      if (validMinute) {
        newKey = `${String(newH24).padStart(2, "0")}:${validMinute}`;
      } else {
        return;
      }
    }
    onChange(newKey, formatDisplayTime(newKey));
  };

  // Select 12h hour
  const selectHour = (h12: number) => {
    let newH24 = h12;
    if (currentAmpm === "PM") {
      newH24 = h12 === 12 ? 12 : h12 + 12;
    } else {
      newH24 = h12 === 12 ? 0 : h12;
    }

    let newKey = `${String(newH24).padStart(2, "0")}:${currentM}`;
    // If the current minute makes it invalid, find earliest valid minute
    if (isTimeKeyDisabled(newKey)) {
      const validMinute = MINUTES_5.find(
        (m) => !isTimeKeyDisabled(`${String(newH24).padStart(2, "0")}:${m}`),
      );
      if (validMinute) {
        newKey = `${String(newH24).padStart(2, "0")}:${validMinute}`;
      } else {
        return; // Full hour disabled
      }
    }
    onChange(newKey, formatDisplayTime(newKey));
  };

  // Select minute
  const selectMinute = (m: string) => {
    const newKey = `${String(currentH24).padStart(2, "0")}:${m}`;
    if (isTimeKeyDisabled(newKey)) return;
    onChange(newKey, formatDisplayTime(newKey));
  };

  // Presets
  const startKey = baseStartTime ? parseToTimeKey(baseStartTime) : "10:00";
  const presets = isEndTime
    ? [
        { label: "+1h", key: addHoursToTimeKey(startKey, 1) },
        { label: "+2h", key: addHoursToTimeKey(startKey, 2) },
        { label: "+3h", key: addHoursToTimeKey(startKey, 3) },
      ].filter((p) => !min || p.key >= min)
    : [
        { label: "10:00 AM", key: "10:00" },
        { label: "02:00 PM", key: "14:00" },
        { label: "06:00 PM", key: "18:00" },
      ].filter((p) => !min || p.key >= min);

  return (
    <div ref={containerRef} className="relative space-y-1.5 w-full">
      {/* ── Custom Trigger Input Card ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`group relative flex items-center justify-between gap-3 h-11 w-full rounded-xl border px-3 transition-all duration-200 cursor-pointer shadow-xs select-none outline-none ${
          isOpen
            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20 bg-bg-panel"
            : "border-border/80 bg-bg hover:bg-bg-panel/70 hover:border-[var(--accent)]/60 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:bg-[var(--accent)]/20">
            <Clock size={14} className="stroke-[2.2]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 leading-none text-left">
            <span className="text-xs font-semibold text-text truncate tracking-tight">
              {display || <span className="text-text-mute font-normal">{placeholder}</span>}
            </span>
            <span className="text-[10px] text-text-dim mt-0.5 truncate">
              {timeKey ? "12-hour AM/PM • Scheduled" : "Tap to set time"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium text-text-dim px-2 py-0.5 rounded-full bg-bg-panel border border-border/70 group-hover:border-[var(--accent)]/40 group-hover:text-text transition-colors">
            <Clock size={10} className="text-[var(--accent)] shrink-0" />
            Clock
          </span>
          <ChevronDown
            size={13}
            className={`text-text-dim/80 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[var(--accent)]" : "group-hover:text-[var(--accent)]"
            }`}
          />
        </div>
      </div>

      {/* ── Quick Shortcut Presets ── */}
      {showQuickPresets && presets.length > 0 && (
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[10px] text-text-mute font-medium flex items-center gap-1 mr-0.5">
            <Sparkles size={10} className="text-[var(--accent)]" /> Quick:
          </span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.key, formatDisplayTime(preset.key))}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                timeKey === preset.key
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)] font-semibold"
                  : "bg-bg-panel/80 border-border/60 text-text-dim hover:text-text hover:border-border"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Custom Matching Clock Popover Dropdown ── */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-border/90 bg-bg-panel p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Digital Time & AM/PM Banner */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-text">
                {String(currentH12).padStart(2, "0")}
              </span>
              <span className="text-xl font-bold text-[var(--accent)]">:</span>
              <span className="text-2xl font-bold text-text">{currentM}</span>
              <span className="text-xs font-semibold text-text-dim ml-1">
                {currentAmpm}
              </span>
            </div>

            {/* AM / PM Toggle Pill */}
            <div className="flex items-center p-0.5 rounded-lg border border-border bg-bg text-xs font-mono font-semibold">
              <button
                type="button"
                disabled={isAmpmFullyDisabled("AM")}
                onClick={() => toggleAmpm("AM")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  isAmpmFullyDisabled("AM")
                    ? "opacity-30 cursor-not-allowed text-text-mute"
                    : currentAmpm === "AM"
                      ? "bg-[var(--accent)] text-white shadow-xs"
                      : "text-text-dim hover:text-text"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                disabled={isAmpmFullyDisabled("PM")}
                onClick={() => toggleAmpm("PM")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  isAmpmFullyDisabled("PM")
                    ? "opacity-30 cursor-not-allowed text-text-mute"
                    : currentAmpm === "PM"
                      ? "bg-[var(--accent)] text-white shadow-xs"
                      : "text-text-dim hover:text-text"
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Hour Selector (1-12) */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim font-semibold">
                Hour (12h)
              </span>
              <span className="text-[10px] text-text-mute">
                {currentAmpm === "AM" ? "Morning" : "Afternoon/Night"}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {HOURS_12.map((h12) => {
                let testH24 = h12;
                if (currentAmpm === "PM") {
                  testH24 = h12 === 12 ? 12 : h12 + 12;
                } else {
                  testH24 = h12 === 12 ? 0 : h12;
                }

                // Check if all minutes for this hour are in the past
                const allMinutesDisabled = MINUTES_5.every((m) =>
                  isTimeKeyDisabled(
                    `${String(testH24).padStart(2, "0")}:${m}`,
                  ),
                );

                const isSelected = currentH12 === h12;

                if (allMinutesDisabled) {
                  return (
                    <div
                      key={h12}
                      className="h-8 flex items-center justify-center text-xs font-mono text-text-mute/30 cursor-not-allowed rounded-lg"
                    >
                      {h12}
                    </div>
                  );
                }

                return (
                  <button
                    key={h12}
                    type="button"
                    onClick={() => selectHour(h12)}
                    className={`h-8 flex items-center justify-center text-xs font-mono rounded-lg transition-all ${
                      isSelected
                        ? "bg-[var(--accent)] text-white font-bold shadow-sm shadow-[var(--accent)]/30 scale-105"
                        : "text-text hover:bg-bg-hover hover:text-[var(--accent)] font-medium"
                    }`}
                  >
                    {h12}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minute Selector (5-min intervals) */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim font-semibold">
                Minute
              </span>
              <span className="text-[10px] text-text-mute">5m intervals</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {MINUTES_5.map((m) => {
                const targetKey = `${String(currentH24).padStart(2, "0")}:${m}`;
                const isDisabled = isTimeKeyDisabled(targetKey);
                const isSelected = currentM === m;

                if (isDisabled) {
                  return (
                    <div
                      key={m}
                      className="h-7 flex items-center justify-center text-[11px] font-mono text-text-mute/30 cursor-not-allowed rounded-md"
                    >
                      :{m}
                    </div>
                  );
                }

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMinute(m)}
                    className={`h-7 flex items-center justify-center text-[11px] font-mono rounded-md transition-all ${
                      isSelected
                        ? "bg-[var(--accent)] text-white font-bold shadow-sm shadow-[var(--accent)]/30 scale-105"
                        : "text-text hover:bg-bg-hover hover:text-[var(--accent)] font-medium border border-border/40"
                    }`}
                  >
                    :{m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clock Footer: Upcoming hint & Done */}
          <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-text-dim">
                Upcoming times only
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline px-1.5 py-0.5"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
