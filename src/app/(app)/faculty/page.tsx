"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore, useCurrentUser } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

export default function FacultyPage() {
  const { store } = useStore();
  const { session, profile } = useCurrentUser();
  const chapterId = session.chapterId ?? "ch-ekc";
  const chapter = store.chapters.find((c) => c.id === chapterId);
  const firstName = profile?.fullName?.split(" ")[0] ?? "there";

  const openEvents = store.events.filter(
    (e) =>
      e.chapterId === chapterId &&
      ["registration_open", "approved", "draft"].includes(e.status),
  );
  const submittedReports = store.reports.filter(
    (r) => r.chapterId === chapterId && r.status === "submitted",
  );
  const students = store.profiles.filter(
    (p) =>
      p.chapterId === chapterId &&
      store.userRoles.some(
        (ur) => ur.userId === p.id && ur.roleId === "r-student",
      ),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Faculty"
        title={`Good day, ${firstName}`}
        description="Faculty liaison — optional support. Chapters launch and publish without faculty approval."
        actions={
          chapter ? (
            <Link href={`/chapter/${chapter.slug}/analytics`}>
              <Button variant="ghost">Chapter analytics</Button>
            </Link>
          ) : null
        }
      />

      <TerminalPanel title="Optional liaison" className="mb-6">
        <p className="text-[13px] leading-relaxed text-text-dim">
          EOS rule: faculty is never required for chapter launch or event
          publish. Student Campus Lead + exec team run the chapter; you advise
          when invited.
        </p>
      </TerminalPanel>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Chapter events"
          value={openEvents.length}
          accent="orange"
        />
        <Stat label="Reports shared" value={submittedReports.length} />
        <Stat label="Students" value={students.length} />
      </div>

      <TerminalPanel
        title="Events monitor"
        meta="no approval gate"
        className="mt-6"
      >
        {openEvents.length === 0 ? (
          <p className="text-[13px] text-text-dim">No active events to monitor</p>
        ) : (
          <ul className="divide-y divide-border/80">
            {openEvents.map((ev) => (
              <li key={ev.id} className="py-3 text-sm">
                {chapter ? (
                  <Link
                    href={`/chapter/${chapter.slug}/events/${ev.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 hover:text-[var(--accent)]"
                  >
                    <span className="font-medium">{ev.title}</span>
                    <Badge tone="cyan">{ev.status.replaceAll("_", " ")}</Badge>
                  </Link>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{ev.title}</span>
                    <Badge tone="cyan">{ev.status.replaceAll("_", " ")}</Badge>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </TerminalPanel>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <TerminalPanel title="Report review">
          <ul className="divide-y divide-border/80">
            {submittedReports.map((r) => {
              const submitter = store.profiles.find(
                (p) => p.id === r.submittedBy,
              );
              return (
                <li key={r.id} className="py-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{r.title}</span>
                    <Badge tone="orange">{r.status}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-text-dim">
                    By {submitter?.fullName} ·{" "}
                    {r.submittedAt ? formatDateTime(r.submittedAt) : "—"}
                  </p>
                </li>
              );
            })}
            {submittedReports.length === 0 ? (
              <li className="py-2 text-[13px] text-text-dim">
                No submitted reports
              </li>
            ) : null}
          </ul>
          {chapter ? (
            <Link
              href={`/chapter/${chapter.slug}/reports`}
              className="mt-3 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Chapter reports →
            </Link>
          ) : null}
        </TerminalPanel>

        <TerminalPanel title="Student monitor">
          <ul className="divide-y divide-border/80 text-[13px]">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-2.5"
              >
                <Link
                  href={`/profile/${s.id}`}
                  className="hover:text-[var(--accent)]"
                >
                  {s.fullName}
                </Link>
                <span className="text-text-dim">{s.points} pts</span>
              </li>
            ))}
            {students.length === 0 ? (
              <li className="py-2 text-text-dim">No students listed</li>
            ) : null}
          </ul>
        </TerminalPanel>
      </div>
    </div>
  );
}
