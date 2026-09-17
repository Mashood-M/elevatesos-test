"use client";

import { use, useEffect, useMemo, useState } from "react";
import { resolveMediaUrl } from "@/lib/data/media";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Globe,
  GraduationCap,
  Link2,
  Lock,
  Mail,
  Phone,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TypeConfirmModal } from "@/components/ui/type-confirm-modal";
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
import { withDerivedProgression } from "@/lib/eos/progression";
import { executiveScore, hasPermission, isHqRole } from "@/lib/permissions";
import { getUserVolunteerPowers } from "@/lib/volunteers";
import { formatDateTime, initials } from "@/lib/utils";
import type { Profile } from "@/types";

function DiscordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const DEFAULT_ACADEMIC_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Postgraduate",
  "Alumni / Graduated",
];

const POPULAR_SKILL_SUGGESTIONS = [
  "React",
  "Next.js",
  "TypeScript",
  "Python",
  "Node.js",
  "UI/UX Design",
  "Figma",
  "Tailwind CSS",
  "AI / ML",
  "Flutter",
  "Cloud / DevOps",
  "PostgreSQL",
];

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { store, updateProfile, deleteUser } = useStore();
  const { session } = useCurrentUser();

  const cleanId = (id || "").trim();
  const profile = store.profiles.find(
    (p) =>
      (p.elevatesId && p.elevatesId.toLowerCase() === cleanId.toLowerCase()) ||
      p.id === cleanId ||
      (p.email && p.email.toLowerCase() === cleanId.toLowerCase()),
  );

  // Canonical redirect: If accessed via long UUID, redirect to clean human-readable /profile/ELV-XXXXXX
  useEffect(() => {
    if (profile?.elevatesId && cleanId !== profile.elevatesId && cleanId.length > 15) {
      router.replace(`/profile/${profile.elevatesId}`);
    }
  }, [profile?.elevatesId, cleanId, router]);

  const communityTiers = store.doctrine?.communityTiers ?? [];
  const journeyStages = store.doctrine?.journeyStages ?? [];

  const [savedFlash, setSavedFlash] = useState(false);
  const [copiedElevatesId, setCopiedElevatesId] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function handleCopyElevatesId() {
    const idToCopy = profile?.elevatesId || profile?.email || "";
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedElevatesId(true);
    window.setTimeout(() => setCopiedElevatesId(false), 2000);
  }

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState("");
  const [editSection, setEditSection] = useState("");
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editGithub, setEditGithub] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editPortfolio, setEditPortfolio] = useState("");
  const [editDiscordUsername, setEditDiscordUsername] = useState("");
  const [editDiscordUserId, setEditDiscordUserId] = useState("");
  const [editDiscordConnected, setEditDiscordConnected] = useState(false);

  const isOwn = Boolean(
    (profile && session.userId && profile.id === session.userId) ||
      (session.userId && session.userId === cleanId),
  );
  const canEdit = isOwn || isHqRole(session.roleKey);

  const availableAcademicYears = useMemo(() => {
    const storeYears = store.academicYears || [];
    const combined = Array.from(new Set([...DEFAULT_ACADEMIC_YEARS, ...storeYears])).filter(Boolean);
    return combined;
  }, [store.academicYears]);

  const [cohortIdOverride, setCohortIdOverride] = useState<string | null>(null);

  const profileChapterId = profile?.chapterId;
  const profileDepartment = profile?.department;
  const profileYear = profile?.academicYear || profile?.year;
  const profileSection = profile?.section;

  const chapterCohorts = useMemo(() => {
    if (!profileChapterId) return [];
    return (store.classCohorts ?? [])
      .filter((c) => c.chapterId === profileChapterId)
      .slice()
      .sort((a, b) => cohortLabel(a).localeCompare(cohortLabel(b)));
  }, [store.classCohorts, profileChapterId]);

  const autoCohort = useMemo(() => {
    if (!profileChapterId) return null;
    return findClassCohort(
      store,
      profileChapterId,
      profileDepartment,
      profileYear,
      profileSection,
    );
  }, [store, profileChapterId, profileDepartment, profileYear, profileSection]);

  const cohortId = cohortIdOverride ?? (autoCohort?.id ?? "");

  // Open edit modal with current profile data
  function handleOpenEdit() {
    if (!profile) return;
    setEditName(profile.fullName || "");
    setEditBio(profile.bio || "");
    setEditPhone(profile.phone || "");
    setEditDept(profile.department || "");
    setEditAcademicYear(profile.academicYear || profile.year || "1st Year");
    setEditSection(profile.section || "");
    setSkillsList([...(profile.skills || [])]);
    setNewSkillInput("");
    setEditInterests((profile.interests || []).join(", "));
    setEditGithub(profile.githubUrl || "");
    setEditLinkedin(profile.linkedinUrl || "");
    setEditPortfolio(profile.portfolioUrl || "");
    setEditDiscordUsername(profile.discordUsername || "");
    setEditDiscordUserId(profile.discordUserId || "");
    setEditDiscordConnected(
      Boolean(
        profile.discordConnected ??
          (profile.discordUsername || profile.discordUserId),
      ),
    );
    setEditOpen(true);
  }

  function handleAddSkill(skillToAdd?: string) {
    const raw = (skillToAdd ?? newSkillInput).trim();
    if (!raw) return;
    if (!skillsList.some((s) => s.toLowerCase() === raw.toLowerCase())) {
      setSkillsList([...skillsList, raw]);
    }
    if (!skillToAdd) {
      setNewSkillInput("");
    }
  }

  function handleRemoveSkill(skillToRemove: string) {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    const interestsArr = editInterests
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    const yearVal = editAcademicYear.trim() || undefined;
    const hasDiscord = Boolean(
      editDiscordConnected ||
        editDiscordUsername.trim() ||
        editDiscordUserId.trim(),
    );

    updateProfile(profile.id, {
      fullName: editName.trim() || profile.fullName,
      bio: editBio.trim() || undefined,
      phone: editPhone.trim() || undefined,
      department: editDept.trim() || undefined,
      year: yearVal,
      academicYear: yearVal,
      section: editSection.trim() || undefined,
      skills: skillsList,
      interests: interestsArr,
      githubUrl: editGithub.trim() || undefined,
      linkedinUrl: editLinkedin.trim() || undefined,
      portfolioUrl: editPortfolio.trim() || undefined,
      discordUsername: editDiscordUsername.trim() || undefined,
      discordUserId: editDiscordUserId.trim() || undefined,
      discordConnected: hasDiscord,
      discordConnectedAt: hasDiscord
        ? profile.discordConnectedAt || new Date().toISOString()
        : undefined,
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

  const chapter = store.chapters.find((c) => c.id === profile?.chapterId);
  const profileUserId = profile?.id ?? cleanId;

  const isDiscordConnected = Boolean(
    profile?.discordConnected ??
      (profile?.discordUsername || profile?.discordUserId),
  );

  const volPowers = useMemo(() => {
    return getUserVolunteerPowers(store, profileUserId || cleanId);
  }, [store, profileUserId, cleanId]);

  const isVolunteer = useMemo(() => {
    const inTeam = (store.volunteerGroups || []).some(
      (g) => g.memberIds?.includes(profileUserId) || g.memberIds?.includes(cleanId),
    );
    const inEvent = (store.events || []).some(
      (e) => e.volunteerStudentIds?.includes(profileUserId) || e.volunteerStudentIds?.includes(cleanId),
    );
    return volPowers.isVolunteer || inTeam || inEvent;
  }, [volPowers.isVolunteer, store.volunteerGroups, store.events, profileUserId, cleanId]);

  const volunteerAssignedEvent = useMemo(() => {
    if (!isVolunteer) return null;
    const group = (store.volunteerGroups || []).find(
      (g) => (g.memberIds?.includes(profileUserId) || g.memberIds?.includes(cleanId)) && g.eventId,
    );
    if (group?.eventId) {
      return store.events.find((e) => e.id === group.eventId) ?? null;
    }
    const directEvent = (store.events || []).find(
      (e) => e.volunteerStudentIds?.includes(profileUserId) || e.volunteerStudentIds?.includes(cleanId),
    );
    return directEvent ?? null;
  }, [isVolunteer, store.volunteerGroups, store.events, profileUserId, cleanId]);

  const volunteerTeamName = useMemo(() => {
    if (!isVolunteer) return null;
    const group = (store.volunteerGroups || []).find(
      (g) => g.memberIds?.includes(profileUserId) || g.memberIds?.includes(cleanId),
    );
    return group?.name ?? null;
  }, [isVolunteer, store.volunteerGroups, profileUserId, cleanId]);

  type RoleWithTimestamp = { role: (typeof store.roles)[0]; createdAt: string | undefined };
  const rolesWithUr: RoleWithTimestamp[] = store.userRoles
    .filter((ur) => ur.userId === profileUserId || ur.userId === cleanId)
    .map((ur) => {
      const r = store.roles.find((role) => role.id === ur.roleId || role.key === ur.roleKey);
      return r ? { role: r, createdAt: ur.createdAt } : null;
    })
    .filter((item): item is RoleWithTimestamp => item !== null && item.role.key !== "volunteer");

  const certs = store.certificates.filter((c) => c.userId === profileUserId || c.userId === cleanId);
  const eventsAttended = store.attendance.filter((a) => a.userId === profileUserId || a.userId === cleanId);
  const projects = store.projects.filter((p) => p.teamIds.includes(profileUserId) || p.teamIds.includes(cleanId));
  const score = executiveScore(store, profileUserId);

  const academicYearDisplay = profile?.academicYear || profile?.year || "Year not set";

  const derived = withDerivedProgression(store, profile ?? ({} as Profile));

  function saveClass() {
    if (!selectedCohort || !profile) return;
    updateProfile(profile.id, {
      department: selectedCohort.department,
      year: selectedCohort.year,
      academicYear: selectedCohort.year,
      section: selectedCohort.section,
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  }

  if (!profile) {
    return (
      <div className="rounded-[14px] bg-[var(--accent-soft)] p-8 text-center">
        <p className="text-orange font-mono text-sm">{"// profile.not_found · "}{id}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-bg-panel p-6 shadow-[var(--shadow)] md:p-8 border border-border/50">
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
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                  Member Profile
                </p>
                {isDiscordConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20 px-2 py-0.5 text-[11px] font-bold">
                    <DiscordIcon className="w-3 h-3" />
                    Bot Synced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold">
                    <DiscordIcon className="w-3 h-3 opacity-70" />
                    Bot Unlinked
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl text-text">
                  {profile.fullName}
                </h1>
                {profile.elevatesId && (
                  <span className="font-mono text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md">
                    {profile.elevatesId}
                  </span>
                )}
                {isVolunteer && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold tracking-wide"
                    title={volunteerAssignedEvent ? `Assigned to: ${volunteerAssignedEvent.title}` : "Volunteer"}
                  >
                    Volunteer {volunteerAssignedEvent ? `· ${volunteerAssignedEvent.title}` : ""}
                  </span>
                )}
              </div>

              {/* Verified Identity & Non-Editable Institutional Info Bar */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-dim">
                {/* Academic Year */}
                <span className="inline-flex items-center gap-1 font-semibold text-text">
                  <GraduationCap size={13} className="text-[var(--accent)]" />
                  {academicYearDisplay}
                </span>

                {/* Department & Section */}
                {(profile.department || profile.section) && (
                  <>
                    <span className="text-border">·</span>
                    <span>
                      {profile.department || "General"}
                      {profile.section ? ` · Sec ${profile.section}` : ""}
                    </span>
                  </>
                )}

                {/* Chapter & College Name (Non-editable, based on joined chapter) */}
                <span className="text-border">·</span>
                {chapter ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-medium text-[var(--accent)]"
                    title={`Joined chapter: ${chapter.name} (${chapter.college || "Campus Chapter"}) - Chapter membership is locked to your campus`}
                  >
                    <Building2 size={12} />
                    <Link
                      href={`/chapter/${chapter.slug}`}
                      className="hover:underline font-bold"
                    >
                      {chapter.name}
                    </Link>
                    {chapter.college && (
                      <span className="text-xs opacity-80 font-normal">
                        · {chapter.college}
                      </span>
                    )}
                    <span
                      className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold opacity-70"
                      title="Bound to your campus chapter (Non-editable)"
                    >
                      <Lock size={10} />
                      Joined
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-500/10 px-2 py-0.5 text-text-dim text-xs">
                    <Building2 size={12} />
                    Independent / No Chapter
                  </span>
                )}

                {/* Email Address (Non-editable) */}
                {profile.email && (
                  <>
                    <span className="text-border">·</span>
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-text-dim"
                      title="Account Email - Non-editable"
                    >
                      <Mail size={12} className="opacity-60" />
                      {profile.email}
                      <Lock size={10} className="opacity-40" />
                    </span>
                  </>
                )}
              </div>

              {(profile.createdAt || profile.joinedAt) ? (
                <p className="mt-2 text-[12px] text-text-mute flex items-center gap-1.5 font-mono">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                  <span>Member since {formatDateTime((profile.createdAt || profile.joinedAt)!)}</span>
                </p>
              ) : null}

              {profile.bio ? (
                <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-text-dim">
                  {profile.bio}
                </p>
              ) : null}

              {/* Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {isVolunteer && (
                  <Badge tone="green" className="font-bold">
                    {volunteerTeamName ? `${volunteerTeamName} Member` : "Volunteer"}
                  </Badge>
                )}
                <Badge tone="cyan">
                  {communityTiers.find(
                    (t: { key?: string; tier?: string; label?: string }) =>
                      t.key === derived.engagementTier || t.tier === derived.engagementTier,
                  )?.label ?? "Everyone"}
                </Badge>
                <Badge tone="orange">
                  {journeyStages.find(
                    (s: { key?: string; stage?: string; label?: string }) =>
                      s.key === derived.journeyStage || s.stage === derived.journeyStage,
                  )?.label ?? "Awareness"}
                </Badge>
                {rolesWithUr.map(({ role, createdAt }) => (
                  <span
                    key={role.id}
                    title={createdAt ? `Assigned ${formatDateTime(createdAt)}` : undefined}
                  >
                    <Badge tone="magenta">
                      {role.name}
                      {createdAt && (
                        <span className="ml-1 opacity-75 text-[10px] font-mono">
                          · {formatDateTime(createdAt)}
                        </span>
                      )}
                    </Badge>
                  </span>
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
            {isOwn && (isVolunteer || session.roleKey === "volunteer" || hasPermission(store, session.roleKey, "attendance.verify")) && chapter && (
              <Link href={`/chapter/${chapter.slug}/attendance`}>
                <Button variant="orange" className="flex items-center gap-2 font-bold shadow-sm">
                  <QrCode size={14} />
                  Take Attendance
                </Button>
              </Link>
            )}
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
                className="flex items-center gap-2 font-bold"
              >
                <Edit3 size={14} />
                Profile Setup & Edit
              </Button>
            )}
            {isHqRole(session.roleKey) && (
              <Button
                variant="danger"
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Delete User
              </Button>
            )}
            {savedFlash && (
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-medium text-[var(--accent)] animate-pulse">
                Saved!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Volunteer Quick-Access Attendance Panel */}
      {isVolunteer && chapter && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-[var(--shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <QrCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-text">
                  Volunteer Tag: {volunteerTeamName ? `${volunteerTeamName} Member` : "Volunteer"}
                </p>
                {volunteerAssignedEvent ? (
                  <span className="rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    Assigned: {volunteerAssignedEvent.title}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    Awaiting Event
                  </span>
                )}
              </div>
              <p className="text-xs text-text-dim mt-0.5">
                {volunteerAssignedEvent
                  ? `You are assigned to take attendance and manage "${volunteerAssignedEvent.title}".`
                  : `Member of ${volunteerTeamName || "volunteer team"} for ${chapter.name}. Awaiting event assignment.`}
              </p>
            </div>
          </div>
          {volunteerAssignedEvent && (
            <Link href={`/chapter/${chapter.slug}/attendance?eventId=${volunteerAssignedEvent.id}`}>
              <Button variant="orange" className="text-xs font-bold shrink-0 flex items-center gap-2">
                <QrCode size={13} />
                Take Attendance →
              </Button>
            </Link>
          )}
        </div>
      )}

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
        {/* Discord Bot Integration Panel — Elevates Discord Bot Architecture */}
        <TerminalPanel
          title="elevates_bot.discord_sync"
          accent={isDiscordConnected ? "green" : "orange"}
          meta={isDiscordConnected ? "bot_linked" : "verification_needed"}
          className="xl:col-span-2"
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm border ${
                  isDiscordConnected
                    ? "bg-[#5865F2]/10 border-[#5865F2]/30 text-[#5865F2]"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                }`}
              >
                <DiscordIcon className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold text-base text-text">
                    {isDiscordConnected
                      ? "Linked with Elevates Discord Bot"
                      : "Connect Chapter Discord via Elevates Bot"}
                  </h3>
                  <Badge tone={isDiscordConnected ? "green" : "orange"}>
                    {isDiscordConnected ? "Bot Sync Active" : "Verification Required"}
                  </Badge>
                  {profile.designation && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 uppercase">
                      {profile.designation.replace("_", " ")} role
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-dim max-w-2xl leading-relaxed">
                  {isDiscordConnected
                    ? "Your Discord identity is bound to this Elevates OS account. The bot automatically provisions your 'ELEVATES • Member' server role, cluster channels, attendance pings, and campus badges."
                    : "The Elevates Discord Bot provisions roles, private campus cluster channels, and event alerts. Verify directly inside your chapter Discord server using your Elevates ID."}
                </p>

                {/* Verification ID helper card */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-bg-card border border-border px-3 py-1.5 shadow-2xs">
                    <span className="text-[11px] font-mono text-text-mute uppercase tracking-wider">Elevates ID:</span>
                    <span className="text-xs font-mono font-bold text-accent">
                      {profile.elevatesId || "ELV-PENDING"}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyElevatesId}
                      className="ml-1 inline-flex items-center gap-1 rounded-md bg-bg hover:bg-border/60 px-2 py-0.5 text-[11px] font-semibold text-text border border-border/80 transition-colors"
                      title="Copy Elevates ID to verify with bot"
                    >
                      {copiedElevatesId ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} className="text-text-muted" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {profile.discordUsername && (
                    <span className="rounded-xl bg-bg px-3 py-1.5 text-xs text-text border border-border flex items-center gap-1.5 font-mono">
                      <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
                      @{profile.discordUsername.replace(/^@/, "")}
                    </span>
                  )}

                  {profile.discordUserId && (
                    <span className="rounded-xl bg-bg px-3 py-1.5 text-xs text-text-dim border border-border font-mono">
                      Snowflake: {profile.discordUserId}
                    </span>
                  )}

                  {isDiscordConnected && (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs font-semibold">
                      <CheckCircle2 size={14} /> Synchronized
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 self-start w-full lg:w-auto">
              {!isDiscordConnected && (
                <Button
                  variant="orange"
                  size="sm"
                  onClick={handleCopyElevatesId}
                  className="text-xs flex items-center justify-center gap-1.5 font-bold shadow-sm"
                >
                  {copiedElevatesId ? (
                    <>
                      <Check size={14} />
                      <span>Copied ID! Run /connect</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy ID for /connect</span>
                    </>
                  )}
                </Button>
              )}
              {canEdit && (
                <Button
                  variant={isDiscordConnected ? "secondary" : "ghost"}
                  size="sm"
                  onClick={handleOpenEdit}
                  className="text-xs flex items-center justify-center gap-1.5 font-semibold"
                >
                  <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
                  {isDiscordConnected ? "Configure Discord" : "Manual Bot Setup"}
                </Button>
              )}
            </div>
          </div>

          {/* Verification steps for unlinked members */}
          {!isDiscordConnected && (
            <div className="mt-4 pt-3.5 border-t border-border/80">
              <div className="rounded-xl bg-bg/70 border border-border/60 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute mb-2 flex items-center gap-1.5">
                  <span>🤖</span> How to verify with the Elevates Discord Bot:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-text">
                  <div className="rounded-lg bg-bg-card p-2.5 border border-border/50">
                    <div className="font-bold text-[11px] text-accent font-mono mb-0.5">STEP 1</div>
                    <p className="text-text-dim text-[11px] leading-snug">
                      Join your campus chapter Discord server (e.g. {chapter?.name || "Elevates Chapter"}).
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-card p-2.5 border border-border/50">
                    <div className="font-bold text-[11px] text-accent font-mono mb-0.5">STEP 2</div>
                    <p className="text-text-dim text-[11px] leading-snug">
                      Type <code className="font-mono font-bold text-text bg-bg px-1 py-0.5 rounded">/connect</code> or <code className="font-mono font-bold text-text bg-bg px-1 py-0.5 rounded">/verify</code> in any channel.
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-card p-2.5 border border-border/50">
                    <div className="font-bold text-[11px] text-accent font-mono mb-0.5">STEP 3</div>
                    <p className="text-text-dim text-[11px] leading-snug">
                      Click &ldquo;Yes, I have an account&rdquo; and paste your Elevates ID (<span className="font-mono font-bold text-accent">{profile.elevatesId || "ELV-XXXX"}</span>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TerminalPanel>

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
                    onChange={(e) => setCohortIdOverride(e.target.value)}
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
              {communityTiers.find(
                (t: { key?: string; tier?: string; label?: string }) =>
                  t.key === derived.engagementTier || t.tier === derived.engagementTier,
              )?.label ?? "Everyone"}
            </Badge>
            <Badge tone="orange">
              {journeyStages.find(
                (s: { key?: string; stage?: string; label?: string }) =>
                  s.key === derived.journeyStage || s.stage === derived.journeyStage,
              )?.label ?? "Awareness"}
            </Badge>
          </div>
          <p className="mt-3 text-[12px] text-text-mute">
            Workshop check-in → Participant · Repeat activity → Active · Cluster
            invite accepted → Cluster · Leadership term → Campus Lead / Executive
          </p>
        </TerminalPanel>

        {/* Skills & Interests Panel */}
        <TerminalPanel
          title="skills.interests"
          meta={`${profile.skills.length} skills`}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text">
                  Skills ({profile.skills.length})
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <Edit3 size={11} /> Edit skills
                  </button>
                )}
              </div>

              {profile.skills.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-border p-3 text-center">
                  <p className="text-[12px] text-text-mute">No skills added yet.</p>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenEdit}
                      className="mt-1 text-xs text-[var(--accent)]"
                    >
                      + Add your technical skills
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-[var(--neutral-100)] border border-border/50 px-2.5 py-1 text-[12px] font-semibold text-text shadow-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/50 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text">Interests</p>
              {profile.interests.length === 0 ? (
                <p className="mt-2 text-[12px] text-text-mute">No interests added yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.interests.map((i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-[var(--neutral-100)] px-2.5 py-1 text-[12px] font-medium text-text-dim"
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
              <span
                className="flex items-center gap-1.5 text-text-dim font-mono text-xs"
                title="Verified Account Email"
              >
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
              {"// No certificates issued"}
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
            <p className="text-[12px] text-text-dim">{"// No active projects"}</p>
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

      {/* Comprehensive Profile Setup & Edit Modal Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Member Profile Setup"
        description="Configure your official member profile, academic year, technical skills, and Discord bot connection."
      >
        <form onSubmit={handleSaveProfile} className="space-y-5 pt-2">
          {/* Section 1: Non-Editable Institutional Credentials */}
          <div className="rounded-xl border border-border bg-bg/60 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                Verified Institutional Identity
              </span>
              <span className="text-[11px] text-text-mute flex items-center gap-1">
                <Lock size={11} /> Non-editable fields
              </span>
            </div>

            {/* Email Address (Non-editable) */}
            <div>
              <FieldLabel className="flex items-center justify-between">
                <span>Email Address</span>
                <span className="text-[10px] font-mono text-text-mute">Fixed to account</span>
              </FieldLabel>
              <div className="relative">
                <Input
                  value={profile.email || ""}
                  disabled
                  readOnly
                  className="bg-bg/40 text-text-dim cursor-not-allowed border-border font-mono text-xs pl-8 select-none"
                />
                <Lock size={13} className="absolute left-2.5 top-3 text-text-mute" />
              </div>
              <p className="mt-1 text-[11px] text-text-mute">
                Email address cannot be changed as it is permanently linked to your verified authentication account.
              </p>
            </div>

            {/* Chapter / College Name (Non-editable, based on joined chapter) */}
            <div>
              <FieldLabel className="flex items-center justify-between">
                <span>Joined Campus Chapter</span>
                <span className="text-[10px] font-mono text-text-mute">Campus governed</span>
              </FieldLabel>
              <div className="relative">
                <Input
                  value={
                    chapter
                      ? `${chapter.name} — ${chapter.college || "Campus Chapter"}`
                      : "Independent Student (No Chapter Joined)"
                  }
                  disabled
                  readOnly
                  className="bg-bg/40 text-text-dim cursor-not-allowed border-border text-xs pl-8 font-medium select-none"
                />
                <Building2 size={13} className="absolute left-2.5 top-3 text-text-mute" />
              </div>
              <p className="mt-1 text-[11px] text-text-mute">
                Chapter membership is governed by campus leads and admissions. It cannot be altered manually in your profile.
              </p>
            </div>
          </div>

          {/* Section 2: Personal & Academic Details */}
          <div className="space-y-3.5">
            <div className="border-b border-border pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-text">
                Personal & Academic Details
              </span>
            </div>

            <div>
              <FieldLabel>Full Name *</FieldLabel>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Academic Year Dropdown */}
              <div className="sm:col-span-1">
                <FieldLabel>Academic Year *</FieldLabel>
                <Select
                  value={editAcademicYear}
                  onChange={(e) => setEditAcademicYear(e.target.value)}
                  className="font-medium text-xs"
                >
                  {availableAcademicYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                  {!availableAcademicYears.includes(editAcademicYear) && editAcademicYear && (
                    <option value={editAcademicYear}>{editAcademicYear}</option>
                  )}
                </Select>
              </div>

              {/* Department */}
              <div className="sm:col-span-1">
                <FieldLabel>Department</FieldLabel>
                <Input
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  placeholder="e.g. CSE, ECE, ME"
                />
              </div>

              {/* Section */}
              <div className="sm:col-span-1">
                <FieldLabel>Section (optional)</FieldLabel>
                <Input
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                  placeholder="e.g. A, B"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Bio / Tagline</FieldLabel>
              <TextArea
                rows={2}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="A short tagline about your craft, goals, or passion..."
              />
            </div>
          </div>

          {/* Section 3: Technical Skills Tag Manager */}
          <div className="space-y-3">
            <div className="border-b border-border pb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text">
                Technical Skills ({skillsList.length})
              </span>
              <span className="text-[11px] text-text-dim">Add tags representing your stack</span>
            </div>

            {/* Active Skills Chips */}
            <div className="min-h-[44px] rounded-xl border border-border bg-bg/40 p-2.5 flex flex-wrap items-center gap-1.5">
              {skillsList.length === 0 ? (
                <span className="text-xs text-text-mute italic">
                  No skills selected yet. Type a skill below or click suggested tags.
                </span>
              ) : (
                skillsList.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2.5 py-1 text-xs font-bold text-[var(--accent)]"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-red-500 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add Custom Skill Input */}
            <div className="flex items-center gap-2">
              <Input
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type a skill (e.g. Docker, Rust, Swift) and press Add..."
                className="text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddSkill()}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold"
              >
                <Plus size={14} />
                Add
              </Button>
            </div>

            {/* Popular Skill Suggestions */}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-text-mute mb-1.5">
                Quick Add Suggestions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILL_SUGGESTIONS.map((sug) => {
                  const alreadyAdded = skillsList.some(
                    (s) => s.toLowerCase() === sug.toLowerCase(),
                  );
                  return (
                    <button
                      key={sug}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddSkill(sug)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                        alreadyAdded
                          ? "bg-bg/20 text-text-mute border-border/40 cursor-default opacity-50"
                          : "bg-bg hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 text-text-dim border-border cursor-pointer font-medium"
                      }`}
                    >
                      {alreadyAdded ? `✓ ${sug}` : `+ ${sug}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel>Interests (comma separated)</FieldLabel>
              <Input
                value={editInterests}
                onChange={(e) => setEditInterests(e.target.value)}
                placeholder="Web3, Open Source, System Design, Robotics"
                className="text-xs"
              />
            </div>
          </div>

          {/* Section 4: Discord Bot Integration */}
          <div className="rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/5 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#5865F2]/20 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5865F2] flex items-center gap-1.5">
                <DiscordIcon className="w-4 h-4" />
                Elevates Discord Bot Sync (/connect & /verify)
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  editDiscordConnected
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {editDiscordConnected ? "Linked & Active" : "Pending Verification"}
              </span>
            </div>

            {/* Quick Elevates ID banner for bot verification */}
            <div className="flex items-center justify-between rounded-lg bg-bg-card/90 border border-border p-2.5 text-xs">
              <div>
                <span className="text-text-dim text-[11px]">Verification Elevates ID:</span>
                <span className="font-mono font-bold text-accent ml-1.5 text-xs">
                  {profile.elevatesId || "ELV-PENDING"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyElevatesId}
                className="inline-flex items-center gap-1 rounded bg-bg hover:bg-border/60 px-2 py-1 text-[11px] font-semibold text-text border border-border transition-colors"
              >
                {copiedElevatesId ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} className="text-text-muted" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Discord Username / Handle</FieldLabel>
                <div className="relative">
                  <Input
                    value={editDiscordUsername}
                    onChange={(e) => {
                      setEditDiscordUsername(e.target.value);
                      if (e.target.value.trim()) setEditDiscordConnected(true);
                    }}
                    placeholder="e.g. mashood / dev#0001"
                    className="font-mono text-xs pl-8"
                  />
                  <span className="absolute left-2.5 top-2.5 text-text-mute font-mono text-xs">@</span>
                </div>
              </div>

              <div>
                <FieldLabel>Discord Snowflake ID (optional)</FieldLabel>
                <Input
                  value={editDiscordUserId}
                  onChange={(e) => {
                    setEditDiscordUserId(e.target.value);
                    if (e.target.value.trim()) setEditDiscordConnected(true);
                  }}
                  placeholder="e.g. 847294829104829104"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Toggle bot status */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-text">
                <input
                  type="checkbox"
                  checked={editDiscordConnected}
                  onChange={(e) => setEditDiscordConnected(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-[#5865F2] focus:ring-[#5865F2]"
                />
                <span>Account is connected & verified with Elevates Discord Bot</span>
              </label>

              {editDiscordConnected && (
                <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Sync Enabled
                </span>
              )}
            </div>

            <p className="text-[11px] text-text-dim leading-relaxed">
              When members type <code className="font-mono font-bold text-text">/connect</code> or <code className="font-mono font-bold text-text">/verify</code> in their chapter Discord, the bot looks up their Elevates ID, grants the <span className="font-semibold text-text">ELEVATES • Member</span> role, changes their server nickname to their full name, and maps any executive leadership designations.
            </p>
          </div>

          {/* Section 5: Contact & Portfolio Links */}
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-[12px] font-bold uppercase tracking-wider text-text">
              Contact & Portfolio Links
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Phone (optional)</FieldLabel>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 43210"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="orange" className="font-bold">
              Save Profile
            </Button>
          </div>
        </form>
      </Dialog>

      <TypeConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete User Profile"
        description={`Are you sure you want to permanently delete profile for "${profile.fullName}" (${profile.email})? This action cannot be undone.`}
        confirmWord="DELETE"
        actionLabel="Delete User"
        onConfirm={() => {
          deleteUser(profile.id);
          router.push("/hq/users");
        }}
      />
    </div>
  );
}
