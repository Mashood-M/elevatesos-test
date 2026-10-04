"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/context/store-context";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { formatDate } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const statusFlow: TaskStatus[] = ["pending", "in_progress", "completed"];

const columnConfig: Record<TaskStatus, { label: string; number: string; bg: string; dot: string; text: string }> = {
  pending: {
    label: "PENDING QUEUE",
    number: "01",
    bg: "bg-amber-50",
    dot: "bg-[#f59e0b]",
    text: "text-[#f59e0b]",
  },
  in_progress: {
    label: "ACTIVE IN PROGRESS",
    number: "02",
    bg: "bg-cyan-50",
    dot: "bg-[#414066]",
    text: "text-[#414066]",
  },
  completed: {
    label: "COMPLETED SPRINT",
    number: "03",
    bg: "bg-emerald-50",
    dot: "bg-[#5f7560]",
    text: "text-[#5f7560]",
  },
};

export default function ChapterTasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, updateTaskStatus } = useStore();
  const chapter = findChapterBySlugOrId(store.chapters, slug);

  const tasks = useMemo(() => {
    if (!chapter) return [];
    return store.tasks.filter((t) => t.chapterId === chapter.id);
  }, [store.tasks, chapter]);

  if (!chapter) {
    return (
      <div className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-8 text-center shadow-[2px_2px_0px_#2d2d34]">
        <p className="font-mono text-sm text-[#f26430] uppercase font-bold">{"// CHAPTER NOT FOUND"}</p>
      </div>
    );
  }

  function advanceStatus(current: TaskStatus) {
    const idx = statusFlow.indexOf(current);
    return statusFlow[Math.min(idx + 1, statusFlow.length - 1)];
  }

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const chapterCode = (chapter.shortCode || chapter.slug).toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. ARCHITECTURAL HERO BANNER ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Subtle Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-8 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                OPERATIONS // {chapterCode}
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {chapter.name}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Task Board & Execution Sprint
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Track event logistics, technical workshops, documentation filings, and team delegation pipelines across the campus executive cycle.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <Link href={`/chapter/${chapter.slug}/events`}>
              <button
                type="button"
                className="h-9 px-4 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-[#f26430]" />
                <span>Events</span>
              </button>
            </Link>
            <Link href={`/chapter/${chapter.slug}/projects`}>
              <button
                type="button"
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Project Sprints</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Total Tasks */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // TOTAL PIPELINE
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#2d2d34] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <ClipboardList className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {tasks.length}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            Assigned across campus roles
          </p>
        </div>

        {/* Metric 02: Pending Queue */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // PENDING QUEUE
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {pendingCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            Awaiting execution start
          </p>
        </div>

        {/* Metric 03: Active In Progress */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // IN PROGRESS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {inProgressCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            Under active delivery
          </p>
        </div>

        {/* Metric 04: Completed Sprint */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // COMPLETED SPRINT
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#5f7560] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {completedCount}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            Verified operational outputs
          </p>
        </div>
      </section>

      {/* ── 3. ARCHITECTURAL KANBAN COLUMNS ─────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-3">
        {statusFlow.map((status) => {
          const cfg = columnConfig[status];
          const column = tasks.filter((t) => t.status === status);

          return (
            <div
              key={status}
              className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] flex flex-col justify-between"
            >
              <div>
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider">
                      {cfg.number} {"//"} {cfg.label}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#2d2d34] text-white">
                    {column.length}
                  </span>
                </div>

                {/* Task Cards List */}
                <ul className="space-y-3">
                  {column.map((task) => {
                    const assignee = store.profiles.find((p) => p.id === task.assigneeId);
                    const event = store.events.find((e) => e.id === task.eventId);

                    return (
                      <li
                        key={task.id}
                        className="rounded-[12px] border border-[#2d2d34]/15 bg-[#faf9f6] p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-[#2d2d34] leading-snug">
                            {task.title}
                          </p>
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-zinc-700 border border-[#2d2d34]/15 uppercase shrink-0">
                            {task.category || "Ops"}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1 font-mono text-[10.5px] text-[#71717a]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[#f26430]" />
                            <span>Due {formatDate(task.dueDate)}</span>
                          </div>

                          {event && (
                            <div className="flex items-center gap-1.5 text-[#414066] font-semibold truncate">
                              <Calendar className="w-3 h-3 text-[#414066] shrink-0" />
                              <span className="truncate">{event.title}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-[#2d2d34] pt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                            <span className="font-medium">{assignee?.fullName || "Unassigned"}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#2d2d34]/10">
                          {status !== "completed" ? (
                            <button
                              type="button"
                              onClick={() => updateTaskStatus(task.id, advanceStatus(task.status))}
                              className="w-full h-7 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Advance to {advanceStatus(task.status).replace("_", " ")}</span>
                              <ArrowRight className="w-3 h-3 text-[#f26430]" />
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 font-mono text-[10.5px] font-bold text-[#5f7560] py-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#5f7560]" />
                              <span>Delivered & Verified</span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}

                  {column.length === 0 && (
                    <li className="py-8 text-center font-mono text-xs text-[#71717a]">
                      No tasks in this lane.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
