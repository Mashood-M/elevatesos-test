"use client";

import { use, useEffect, useMemo, useState } from "react";
import { resolveMediaUrl } from "@/lib/data/media";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, Globe, Link2, Mail, Phone, Trash2 } from "lucide-react";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  cohortLabel,
  findClassCohort,
  listStudentRepresentatives,
  studentHasClassSet,
} from "@/lib/forms/helpers";
import {
  EOS_COMMUNITY_TIERS,
  EOS_JOURNEY_STAGES,
} from "@/lib/eos/doctrine";
import { withDerivedProgression } from "@/lib/eos/progression";
import { executiveScore, hasPermission, isHqRole } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";
import type { Profile } from "@/types";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { store, updateProfile, deleteUser } = useStore();
  const { session } = useCurrentUser();
  const profile = store.profiles.find(
    (p) => p.id === id || (p.email && p.email.toLowerCase() === id.toLowerCase())
  );


  const [cohortId, setCohortId] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editGithub, setEditGithub] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editPortfolio, setEditPortfolio] = useState("");

  const isOwn = Boolean(session.userId && session.userId === id);
  const canEdit = isOwn || isHqRole(session.roleKey);

  const chapterCohorts = useMemo(() => {
    if (!profile?.chapterId) return [];
    return (store.classCohorts ?? [])
      .filter((c) => c.chapterId === profile.chapterId)
      .slice()
      .sort((a, b) => cohortLabel(a).localeCompare(cohortLabel(b)));
  }, [store.classCohorts, profile?.chapterId]);

  useEffect(() => {
    if (!profile?.chapterId) return;
    const match = findClassCohort(
      store,
      profile.chapterId,
      profile.department,
      profile.year,
      profile.section,
    );
    setCohortId(match?.id ?? "");
  }, [profile, store]);

  // Open edit modal with current profile data
  function handleOpenEdit() {
    if (!profile) return;
    setEditName(profile.fullName || "");
    setEditBio(profile.bio || "");
    setEditPhone(profile.phone || "");
    setEditDept(profile.department || "");
    setEditYear(profile.year || "");
    setEditSection(profile.section || "");
    setEditSkills((profile.skills || []).join(", "));
    setEditInterests((profile.interests || []).join(", "));
    setEditGithub(profile.githubUrl || "");
    setEditLinkedin(profile.linkedinUrl || "");
    setEditPortfolio(profile.portfolioUrl || "");
    setEditOpen(true);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const skillsArr = editSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const interestsArr = editInterests
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    updateProfile(profile.id, {
      fullName: editName.trim() || profile.fullName,
      bio: editBio.trim() || undefined,
      phone: editPhone.trim() || undefined,
      department: editDept.trim() || undefined,
      year: editYear.trim() || undefined,
      section: editSection.trim() || undefined,
      skills: skillsArr,
      interests: interestsArr,
      githubUrl: editGithub.trim() || undefined,
      linkedinUrl: editLinkedin.trim() || undefined,
      portfolioUrl: editPortfolio.trim() || undefined,
    });

    setEditOpen(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  const selectedCohort = chapterCohorts.find((c) => c.id === cohortId);

  const assignedReps = useMemo(() => {
    if (!profile || !selectedCohort) return [];
    return listStudentRepresentatives(store, {
      ...profile,
      department: selectedCohort.department,
      year: selectedCohort.year,
      section: selectedCohort.section,
    });
  }, [store, profile, selectedCohort]);

  const canSeeClassesLink =
    isHqRole(session.roleKey) ||
    hasPermission(store, session.roleKey, "class.manage");

  if (!profile) {
    return (
      <div className="rounded-[14px] bg-[var(--accent-soft)] p-8 text-center">
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

  const derived = withDerivedProgression(store, profile);

  function saveClass() {
    if (!selectedCohort || !profile) return;
    updateProfile(profile.id, {
      department: selectedCohort.department,
      year: selectedCohort.year,
      section: selectedCohort.section,
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  }

  return (
    <div>
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-bg-panel p-6 shadow-[var(--shadow)] md:p-8">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[var(--accent-soft)] text-2xl font-bold text-[var(--accent)] shadow-[var(--shadow-sm)]">
              {profile.avatarUrl ? (
                <img
                  src={resolveMediaUrl(profile.avatarUrl)}
                  alt={profile.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(profile.fullName)
              )}
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-[var(--accent)]">
                Profile
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                  {profile.fullName}
                </h1>
                {profile.elevatesId && (
                  <span className="font-mono text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md">
                    {profile.elevatesId}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-text-dim">
                {classLabel || "Class not set"}
                {chapter ? (
                  <>
                    {" · "}
                    <Link
                      href={`/chapter/${chapter.slug}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {chapter.name}
                    </Link>
                  </>
                ) : null}
              </p>
              {profile.bio ? (
                <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-text-dim">
                  {profile.bio}
                </p>
              ) : null}

              {/* Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="cyan">
                  {EOS_COMMUNITY_TIERS.find(
                    (t) => t.key === derived.engagementTier,
                  )?.label ?? "Everyone"}
                </Badge>
                <Badge tone="orange">
                  {EOS_JOURNEY_STAGES.find(
                    (s) => s.key === derived.journeyStage,
                  )?.label ?? "Awareness"}
                </Badge>
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

          {/* Action Buttons */}
          <div className="flex shrink-0 items-center gap-2">
            {isOwn && (
              <Link href="/referrals">
                <Button variant="secondary" className="flex items-center gap-2">
                  <Link2 size={14} />
                  Referrals
                </Button>
              </Link>
            )}
            {canEdit && (
              <Button
                variant="orange"
                onClick={handleOpenEdit}
                className="flex items-center gap-2"
              >
                <Edit3 size={14} />
                Edit profile
              </Button>
            )}
            {isHqRole(session.roleKey) && (
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to permanently delete profile for "${profile.fullName}" (${profile.email})? This action cannot be undone.`
                    )
                  ) {
                    deleteUser(profile.id);
                    router.push("/hq/users");
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Delete User
              </Button>
            )}
            {savedFlash && (
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-medium text-[var(--accent)]">
                Saved!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
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
        {/* Class Selection — only if the student has a chapter */}
        {isOwn && profile.chapterId ? (
          <TerminalPanel
            title="class.order"
            meta={savedFlash ? "saved" : studentHasClassSet(profile) ? "set" : "required"}
            accent="orange"
            className="xl:col-span-2"
          >
            <p className="mb-4 text-[13px] text-text-dim">
              Pick your class from the list set by chapter executives. That class
              has one or two representatives — pick one of them when registering
              for events.
            </p>
            {!chapterCohorts.length ? (
              <p className="text-[13px] text-[var(--accent)]">
                No classes set up yet. Ask your chapter exec to create divisions
                (e.g. Common · 1st · T1, CSE · 2nd · A).
                {canSeeClassesLink && chapter ? (
                  <>
                    {" "}
                    <Link
                      href={`/chapter/${chapter.slug}/classes`}
                      className="underline font-medium"
                    >
                      Open Classes
                    </Link>
                  </>
                ) : null}
              </p>
            ) : (
              <>
                <div className="max-w-xl">
                  <FieldLabel>Your class</FieldLabel>
                  <Select
                    value={cohortId}
                    onChange={(e) => setCohortId(e.target.value)}
                  >
                    <option value="">Select class…</option>
                    {chapterCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {cohortLabel(c)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={saveClass}
                    disabled={!selectedCohort}
                  >
                    Save class
                  </Button>
                  {canSeeClassesLink && chapter ? (
                    <Link href={`/chapter/${chapter.slug}/classes`}>
                      <Button variant="ghost">Manage classes</Button>
                    </Link>
                  ) : null}
                </div>
              </>
            )}
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-wider text-text-dim">
                Assigned representatives
              </p>
              {assignedReps.length >= 1 ? (
                <ul className="mt-2 space-y-2">
                  {assignedReps.map((r, i) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-[14px] bg-bg shadow-[var(--shadow-sm)] px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{r.label}</span>
                      <Badge tone={i === 0 ? "cyan" : "magenta"}>
                        rep {i + 1}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-text-dim">
                  Select a class above to see your representative(s).
                </p>
              )}
            </div>
          </TerminalPanel>
        ) : isOwn && !profile.chapterId ? (
          <TerminalPanel
            title="chapter.status"
            meta="independent"
            accent="orange"
            className="xl:col-span-2"
          >
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-[240px]">
                <p className="text-sm font-semibold text-text mb-1">
                  Not in any chapter
                </p>
                <p className="text-[13px] text-text-dim leading-relaxed">
                  Your account is set as an <strong>Independent</strong> student — not tied to any specific Elevates chapter.
                  You can still attend <strong>open events</strong> hosted at any campus and participate fully.
                  If you join a chapter later, your profile will update automatically.
                </p>
              </div>
              <Badge tone="mute">Independent</Badge>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[11px] text-text-mute">
                To join a chapter, ask a chapter executive or campus lead to add you.
                Your Elevates ID is still active and will carry over when you join.
              </p>
            </div>
          </TerminalPanel>
        ) : null}

        {/* EOS Journey */}
        <TerminalPanel title="eos.journey" accent="cyan" className="xl:col-span-2">
          <p className="mb-3 text-[13px] text-text-dim">
            Progression is earned from activity — attendance, clusters, and
            leadership — not admin labels.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">
              {EOS_COMMUNITY_TIERS.find((t) => t.key === derived.engagementTier)
                ?.label ?? "Everyone"}
            </Badge>
            <Badge tone="orange">
              {EOS_JOURNEY_STAGES.find((s) => s.key === derived.journeyStage)
                ?.label ?? "Awareness"}
            </Badge>
          </div>
          <p className="mt-3 text-[12px] text-text-mute">
            Workshop check-in → Participant · Repeat activity → Active · Cluster
            invite accepted → Cluster · Leadership term → Campus Lead / Executive
          </p>
        </TerminalPanel>

        {/* Skills & Interests */}
        <TerminalPanel title="skills.interests">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text">Skills</p>
              {profile.skills.length === 0 ? (
                <p className="mt-2 text-[12px] text-text-mute">No skills added yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-[var(--neutral-100)] px-2.5 py-1 text-[12px] font-medium text-text"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text">Interests</p>
              {profile.interests.length === 0 ? (
                <p className="mt-2 text-[12px] text-text-mute">No interests added yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.interests.map((i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-[var(--neutral-100)] px-2.5 py-1 text-[12px] font-medium text-text"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-[13px]">
            {profile.email ? (
              <span className="flex items-center gap-1.5 text-text-dim">
                <Mail size={14} className="opacity-60" />
                {profile.email}
              </span>
            ) : null}
            {profile.phone ? (
              <span className="flex items-center gap-1.5 text-text-dim">
                <Phone size={14} className="opacity-60" />
                {profile.phone}
              </span>
            ) : null}
            {profile.githubUrl ? (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-medium text-text hover:text-[var(--accent)]"
              >
                <Link2 size={14} />
                GitHub
              </a>
            ) : null}
            {profile.linkedinUrl ? (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-medium text-[#0a66c2] hover:underline"
              >
                <Link2 size={14} />
                LinkedIn
              </a>
            ) : null}
            {profile.portfolioUrl ? (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline"
              >
                <Globe size={14} />
                Portfolio
              </a>
            ) : null}
          </div>
        </TerminalPanel>

        {/* Engagement Score */}
        <TerminalPanel title="engagement.score" accent="magenta">
          <ProgressBar
            value={Math.min(100, profile.points / 20)}
            label="Activity index"
            accent="green"
          />
          <p className="mt-4 text-[11px] text-text-dim">
            Executive score algorithm: tasks × 12 + events × 18 + reports × 15
            + attendance × 10
          </p>
        </TerminalPanel>

        {/* Certificates */}
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
                  <li key={c.id} className="rounded-[14px] bg-bg shadow-[var(--shadow-sm)] p-3">
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

        {/* Projects */}
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

      {/* Edit Profile Modal Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profile"
        description="Update your personal details, bio, skills, and links."
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div>
            <FieldLabel>Email Address (Read-only)</FieldLabel>
            <Input
              value={profile.email || ""}
              disabled
              readOnly
              className="bg-white/5 text-text-dim cursor-not-allowed border-border font-mono text-xs opacity-75"
            />
            <p className="mt-1 text-[11px] text-text-mute">
              Email address is fixed and cannot be edited.
            </p>
          </div>

          <div>
            <FieldLabel>Full Name</FieldLabel>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <FieldLabel>Bio / Tagline</FieldLabel>
            <TextArea
              rows={2}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Short bio, focus areas, or interests"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Phone (optional)</FieldLabel>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <FieldLabel>Department</FieldLabel>
              <Input
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                placeholder="e.g. CSE, Cyber Security"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Year</FieldLabel>
              <Input
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                placeholder="e.g. 3rd Year, S5"
              />
            </div>
            <div>
              <FieldLabel>Section</FieldLabel>
              <Input
                value={editSection}
                onChange={(e) => setEditSection(e.target.value)}
                placeholder="e.g. A, B"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Skills (comma separated)</FieldLabel>
            <Input
              value={editSkills}
              onChange={(e) => setEditSkills(e.target.value)}
              placeholder="React, TypeScript, Python, UI/UX"
            />
          </div>

          <div>
            <FieldLabel>Interests (comma separated)</FieldLabel>
            <Input
              value={editInterests}
              onChange={(e) => setEditInterests(e.target.value)}
              placeholder="Web Dev, AI/ML, Cloud, Open Source"
            />
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-[12px] font-semibold text-text-dim">Social & Portfolio Links</p>
            <div>
              <FieldLabel>GitHub URL</FieldLabel>
              <Input
                value={editGithub}
                onChange={(e) => setEditGithub(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            <div>
              <FieldLabel>LinkedIn URL</FieldLabel>
              <Input
                value={editLinkedin}
                onChange={(e) => setEditLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <FieldLabel>Portfolio / Website URL</FieldLabel>
              <Input
                value={editPortfolio}
                onChange={(e) => setEditPortfolio(e.target.value)}
                placeholder="https://yourportfolio.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="orange">
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
