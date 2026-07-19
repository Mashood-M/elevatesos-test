"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress";
import { useStore } from "@/context/store-context";
import { executiveScore } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { store } = useStore();
  const profile = store.profiles.find((p) => p.id === id);

  if (!profile) {
    return (
      <div className="border border-orange p-8 text-center">
        <p className="text-orange">// profile.not_found · {id}</p>
      </div>
    );
  }

  const chapter = store.chapters.find((c) => c.id === profile.chapterId);
  const roles = store.userRoles
    .filter((ur) => ur.userId === id)
    .map((ur) => store.roles.find((r) => r.id === ur.roleId))
    .filter(Boolean);
  const certs = store.certificates.filter((c) => c.userId === id);
  const eventsAttended = store.attendance.filter((a) => a.userId === id);
  const projects = store.projects.filter((p) => p.teamIds.includes(id));
  const score = executiveScore(store, id);

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-bg-panel p-6 shadow-[var(--shadow)] md:p-8">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-2xl font-semibold text-cyan">
            {initials(profile.fullName)}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan">Profile</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
              {profile.fullName}
            </h1>
            <p className="mt-2 text-sm text-text-dim">
              {profile.department ?? "—"} · {profile.year ?? "—"}
              {chapter ? (
                <>
                  {" · "}
                  <Link href={`/chapter/${chapter.slug}`} className="text-magenta hover:text-cyan">
                    {chapter.name}
                  </Link>
                </>
              ) : null}
            </p>
            {profile.bio ? (
              <p className="mt-3 max-w-xl text-[13px] text-text-dim">{profile.bio}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {roles.map((r) => (
                <Badge key={r!.id} tone="magenta">{r!.name}</Badge>
              ))}
              {profile.badges.map((b) => (
                <Badge key={b} tone="green">{b}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Points" value={profile.points} accent="cyan" />
        <Stat label="Executive Score" value={score} accent="magenta" />
        <Stat label="Certificates" value={certs.length} accent="green" />
        <Stat label="Events Attended" value={eventsAttended.length} accent="orange" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TerminalPanel title="skills.interests">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase text-cyan">Skills</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.skills.map((s) => (
                  <span key={s} className="border border-cyan/30 px-2 py-0.5 text-[10px] text-cyan">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase text-magenta">Interests</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.interests.map((i) => (
                  <span key={i} className="border border-magenta/30 px-2 py-0.5 text-[10px] text-magenta">{i}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
            {profile.githubUrl ? (
              <a href={profile.githubUrl} className="text-cyan hover:text-green">github →</a>
            ) : null}
            {profile.linkedinUrl ? (
              <a href={profile.linkedinUrl} className="text-magenta hover:text-green">linkedin →</a>
            ) : null}
            {profile.portfolioUrl ? (
              <a href={profile.portfolioUrl} className="text-green hover:text-cyan">portfolio →</a>
            ) : null}
          </div>
        </TerminalPanel>

        <TerminalPanel title="engagement.score" accent="magenta">
          <ProgressBar value={Math.min(100, profile.points / 20)} label="Activity index" accent="green" />
          <p className="mt-4 text-[11px] text-text-dim">
            Executive score algorithm: tasks × 12 + events × 18 + reports × 15 + attendance × 10 + base 40
          </p>
        </TerminalPanel>

        <TerminalPanel title="certificates" accent="green">
          {certs.length === 0 ? (
            <p className="text-[12px] text-text-dim">// No certificates issued</p>
          ) : (
            <ul className="space-y-2">
              {certs.map((c) => {
                const ev = store.events.find((e) => e.id === c.eventId);
                return (
                  <li key={c.id} className="border border-border p-3">
                    <p className="font-mono text-[11px] text-green">{c.certificateId}</p>
                    <p className="text-[11px] text-text-dim">{ev?.title}</p>
                    <p className="text-[10px] text-text-mute">{formatDateTime(c.issuedAt)}</p>
                    <Link
                      href={`/verify/certificate/${c.certificateId}`}
                      className="mt-1 inline-block text-[10px] uppercase text-cyan hover:text-magenta"
                    >
                      Verify →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </TerminalPanel>

        <TerminalPanel title="projects" accent="orange">
          {projects.length === 0 ? (
            <p className="text-[12px] text-text-dim">// No active projects</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-border pb-2 text-[12px]">
                  <span>{p.title}</span>
                  <Badge tone="cyan">{p.stage}</Badge>
                </li>
              ))}
            </ul>
          )}
        </TerminalPanel>
      </div>
    </div>
  );
}
