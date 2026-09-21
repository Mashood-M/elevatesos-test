"use client";

import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import type { EventLesson } from "@/types";

/**
 * 4 distinct geometric SVG emblems faithfully inspired by the reference design:
 * 1. Magenta 4-petal floral clover
 * 2. Green downward shield / anchor leaf
 * 3. Orange 4-square cross
 * 4. Cyan dual-wing butterfly
 */
export function LessonGlyph({
  color = "magenta",
  shape = "clover",
  className = "w-8 h-8",
}: {
  color?: "magenta" | "green" | "orange" | "cyan" | "blue" | "purple";
  shape?: "clover" | "shield" | "cross" | "wings" | string;
  className?: string;
}) {
  const colorMap = {
    magenta: "#e879f9",
    green: "#4ade80",
    orange: "#fb923c",
    cyan: "#38bdf8",
    blue: "#60a5fa",
    purple: "#c084fc",
  };

  const fill = colorMap[color] || colorMap.magenta;

  if (shape === "shield" || color === "green") {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M6 8C6 6.89543 6.89543 6 8 6H28C29.1046 6 30 6.89543 30 8V18C30 25.5 19.5 30 18 30C16.5 30 6 25.5 6 18V8Z"
          fill={fill}
        />
        <path
          d="M18 10L24 16H20V22H16V16H12L18 10Z"
          fill="white"
          opacity="0.95"
        />
      </svg>
    );
  }

  if (shape === "cross" || color === "orange") {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect x="7" y="7" width="9" height="9" rx="2" fill={fill} />
        <rect x="20" y="7" width="9" height="9" rx="2" fill={fill} />
        <rect x="7" y="20" width="9" height="9" rx="2" fill={fill} />
        <rect x="20" y="20" width="9" height="9" rx="2" fill={fill} />
        <rect x="12" y="12" width="12" height="12" rx="3" fill={fill} />
      </svg>
    );
  }

  if (shape === "wings" || color === "cyan") {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M8 8C14 8 16 14 16 18C16 22 14 28 8 28C5.5 28 4 25.5 4 23V13C4 10.5 5.5 8 8 8Z"
          fill={fill}
        />
        <path
          d="M28 8C22 8 20 14 20 18C20 22 22 28 28 28C30.5 28 32 25.5 32 23V13C32 10.5 30.5 8 28 8Z"
          fill={fill}
        />
      </svg>
    );
  }

  // Default: Magenta floral clover
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="5.5" fill={fill} />
      <circle cx="24" cy="12" r="5.5" fill={fill} />
      <circle cx="12" cy="24" r="5.5" fill={fill} />
      <circle cx="24" cy="24" r="5.5" fill={fill} />
      <rect x="11" y="11" width="14" height="14" rx="3" fill={fill} />
    </svg>
  );
}

const DEFAULT_GLYPH_PALETTE: Array<{
  color: "magenta" | "green" | "orange" | "cyan";
  shape: "clover" | "shield" | "cross" | "wings";
}> = [
  { color: "magenta", shape: "clover" },
  { color: "green", shape: "shield" },
  { color: "orange", shape: "cross" },
  { color: "cyan", shape: "wings" },
];

export function EventLessonsCard({
  lessons = [],
  title = "Lessons",
  seriesTitle,
  className = "",
}: {
  lessons?: EventLesson[];
  title?: string;
  seriesTitle?: string;
  className?: string;
}) {
  const items = useMemo(() => {
    if (!lessons || lessons.length === 0) return [];
    return lessons.map((ls, idx) => {
      const fallback = DEFAULT_GLYPH_PALETTE[idx % DEFAULT_GLYPH_PALETTE.length];
      return {
        ...ls,
        iconColor: ls.iconColor || fallback.color,
        iconShape: ls.iconShape || fallback.shape,
      };
    });
  }, [lessons]);

  if (items.length === 0) return null;

  return (
    <div
      className={`rounded-[18px] border border-border/80 bg-bg-panel shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-bg-panel">
        <div className="flex items-center gap-2">
          <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-text">
            {title}
          </h3>
          {seriesTitle ? (
            <span className="text-xs font-semibold text-text-dim">
              · {seriesTitle}
            </span>
          ) : null}
        </div>
        <span className="text-[11px] font-mono text-text-dim">
          {items.length} {items.length === 1 ? "Session" : "Sessions"}
        </span>
      </div>

      {/* Lesson Rows */}
      <div className="divide-y divide-border/60">
        {items.map((lesson, idx) => {
          const content = (
            <div className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-bg-page/70">
              {/* Left Column: Glyph + Date & Time */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="shrink-0 transition-transform group-hover:scale-105">
                  <LessonGlyph
                    color={lesson.iconColor}
                    shape={lesson.iconShape}
                    className="w-9 h-9 sm:w-10 sm:h-10"
                  />
                </div>
                <div className="min-w-[85px]">
                  <p className="text-sm sm:text-[15px] font-bold text-text tracking-tight leading-tight">
                    {lesson.dateText || lesson.date || lesson.dayLabel || `Day ${lesson.dayNumber || idx + 1}`}
                  </p>
                  <p className="text-[11px] text-text-dim mt-0.5 leading-none font-medium">
                    {lesson.timeText || lesson.time || "TBA"}
                  </p>
                </div>
              </div>

              {/* Middle Column: Title & Mode */}
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-serif italic text-base sm:text-[19px] font-medium text-text leading-tight truncate">
                  {lesson.title}
                </h4>
                <p className="text-[11px] text-text-dim mt-0.5 font-medium flex items-center gap-1.5">
                  <span>{lesson.mode || lesson.location || "Online"}</span>
                </p>
              </div>

              {/* Right Column: Arrow Action */}
              <div className="shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-bg text-text-dim transition-all group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shadow-sm">
                  <ArrowUpRight size={15} />
                </div>
              </div>
            </div>
          );

          if (lesson.linkUrl) {
            return (
              <a
                key={lesson.id || idx}
                href={lesson.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="block focus:outline-none"
                title={`Open session: ${lesson.title}`}
              >
                {content}
              </a>
            );
          }

          return <div key={lesson.id || idx}>{content}</div>;
        })}
      </div>
    </div>
  );
}
