"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  findClassCohort,
  listStudentRepresentatives,
  studentHasClassSet,
} from "@/lib/forms/helpers";
import { executiveScore } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";

const DEPARTMENTS = ["CSE", "ECE", "EEE", "ME", "CE", "IT", "Other"];
const YEARS = ["1st", "2nd", "3rd", "4th"];
const SECTIONS = ["A", "B", "C", "D"];

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { store, updateProfile } = useStore();
  const { session } = useCurrentUser();
  const profile = store.profiles.find((p) => p.id === id);

  const [draft, setDraft] = useState({
    department: "",
    year: "",
    section: "",
  });
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDraft({
      department: profile.department ?? "",
      year: profile.year?.replace(/\s*Year$/i, "") ?? "",
      section: profile.section ?? "",
    });
  }, [profile]);

  const isOwn = session.userId === id;

  const previewCohort = useMemo(() => {
    if (!profile?.chapterId) return undefined;
    return findClassCohort(
      store,
      profile.chapterId,
      draft.department,
      draft.year,
      draft.section,
    );
  }, [store, profile?.chapterId, draft]);

  const assignedReps = useMemo(() => {
    if (!profile) return [];
    return listStudentRepresentatives(store, {
      ...profile,
      department: draft.department || profile.department,
      year: draft.year || profile.year,
      section: draft.section || profile.section,
    });
  }, [store, profile, draft]);

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
  const classLabel = [
    profile.department,
    profile.year,
    profile.section ? `Sec ${profile.section}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function saveClass() {
    if (!draft.department || !draft.year || !draft.section) return;
    updateProfile(id, {
      department: draft.department,
      year: draft.year,
      section: draft.section,
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  }

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-bg-panel p-6 shadow-[var(--shadow)] md:p-8">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-2xl font-semibold text-cyan">
            {initials(profile.fullName)}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan">
              Profile
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
              {profile.fullName}
            </h1>
            <p className="mt-2 text-sm text-text-dim">
              {classLabel || "Class not set"}
              {chapter ? (
                <>
                  {" · "}
                  <Link
                    href={`/chapter/${chapter.slug}`}
                    className="text-magenta hover:text-cyan"
                  >
                    {chapter.name}
                  </Link>
                </>
              ) : null}
            </p>
            {profile.bio ? (
              <p className="mt-3 max-w-xl text-[13px] text-text-dim">
                {profile.bio}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {roles.map((r) => (
                <Badge key={r!.id} tone="magenta">
                  {r!.name}
                </Badge>
              ))}
              {profile.badges.map((b) => (
                <Badge key={b} tone="green">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Points" value={profile.points} accent="cyan" />
        <Stat label="Executive Score" value={score} accent="magenta" />
        <Stat label="Certificates" value={certs.length} accent="green" />
        <Stat
          label="Events Attended"
          value={eventsAttended.length}
          accent="orange"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {isOwn && profile.chapterId ? (
          <TerminalPanel
            title="class.order"
            meta={savedFlash ? "saved" : studentHasClassSet(profile) ? "set" : "required"}
            accent="orange"
            className="xl:col-span-2"
          >
            <p className="mb-4 text-[13px] text-text-dim">
              Set your class (department, year, section). Your boy and girl class
              representatives are assigned from that class — you pick between
              those two when registering for events.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Department</FieldLabel>
                <Select
                  value={draft.department}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, department: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Year</FieldLabel>
                <Select
                  value={draft.year}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, year: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Section</FieldLabel>
                <Select
                  value={draft.section}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, section: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={saveClass}
                disabled={!draft.department || !draft.year || !draft.section}
              >
                Save class
              </Button>
              {savedFlash ? (
                <span className="text-[12px] text-[var(--accent)]">Saved</span>
              ) : null}
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-wider text-text-dim">
                Assigned representatives
              </p>
              {assignedReps.length === 2 ? (
                <ul className="mt-2 space-y-2">
                  {assignedReps.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{r.label}</span>
                      <Badge tone={r.role === "boy" ? "cyan" : "magenta"}>
                        {r.role}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : draft.department && draft.year && draft.section ? (
                <p className="mt-2 text-[13px] text-[var(--accent)]">
                  {previewCohort
                    ? "Representatives incomplete for this class."
                    : "No representatives configured for this class — ask your chapter exec."}
                </p>
              ) : (
                <p className="mt-2 text-[13px] text-text-dim">
                  Choose department, year, and section to see your two reps.
                </p>
              )}
            </div>
          </TerminalPanel>
        ) : null}

        <TerminalPanel title="skills.interests">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase text-cyan">Skills</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="border border-cyan/30 px-2 py-0.5 text-[10px] text-cyan"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase text-magenta">Interests</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.interests.map((i) => (
                  <span
                    key={i}
                    className="border border-magenta/30 px-2 py-0.5 text-[10px] text-magenta"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
            {profile.githubUrl ? (
              <a
                href={profile.githubUrl}
                className="text-cyan hover:text-green"
              >
                github →
              </a>
            ) : null}
            {profile.linkedinUrl ? (
              <a
                href={profile.linkedinUrl}
                className="text-magenta hover:text-green"
              >
                linkedin →
              </a>
            ) : null}
            {profile.portfolioUrl ? (
              <a
                href={profile.portfolioUrl}
                className="text-green hover:text-cyan"
              >
                portfolio →
              </a>
            ) : null}
          </div>
        </TerminalPanel>

        <TerminalPanel title="engagement.score" accent="magenta">
          <ProgressBar
            value={Math.min(100, profile.points / 20)}
            label="Activity index"
            accent="green"
          />
          <p className="mt-4 text-[11px] text-text-dim">
            Executive score algorithm: tasks × 12 + events × 18 + reports × 15
            + attendance × 10 + base 40
          </p>
        </TerminalPanel>

        <TerminalPanel title="certificates" accent="green">
          {certs.length === 0 ? (
            <p className="text-[12px] text-text-dim">
              // No certificates issued
            </p>
          ) : (
            <ul className="space-y-2">
              {certs.map((c) => {
                const ev = store.events.find((e) => e.id === c.eventId);
                return (
                  <li key={c.id} className="border border-border p-3">
                    <p className="font-mono text-[11px] text-green">
                      {c.certificateId}
                    </p>
                    <p className="text-[11px] text-text-dim">{ev?.title}</p>
                    <p className="text-[10px] text-text-mute">
                      {formatDateTime(c.issuedAt)}
                    </p>
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
                <li
                  key={p.id}
                  className="flex justify-between border-b border-border pb-2 text-[12px]"
                >
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
