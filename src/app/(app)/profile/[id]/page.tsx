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
  KeyRound,
  Layers,
  Link2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlink,
  User,
  Users,
  X,
  ExternalLink,
  Award,
  CalendarCheck2,
  FolderGit2,
} from "lucide-react";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TypeConfirmModal } from "@/components/ui/type-confirm-modal";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  cohortLabel,
  findClassCohort,
  listStudentRepresentatives,
  studentHasClassSet,
} from "@/lib/forms/helpers";
import { withDerivedProgression } from "@/lib/eos/progression";
import { executiveScore, hasPermission, isHqRole, isFounder } from "@/lib/permissions";
import { getUserVolunteerPowers } from "@/lib/volunteers";
import { formatDateTime, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
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

type ProfileTab = "overview" | "credentials" | "journey" | "settings";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    store,
    updateProfile,
    deleteUser,
    verifyDiscordOtp,
    unlinkDiscord,
    sendEmailVerification,
    verifyEmailCode,
    markEmailVerified,
  } = useStore();
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

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [savedFlash, setSavedFlash] = useState(false);
  const [copiedElevatesId, setCopiedElevatesId] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Email Verification modal & state
  const [emailVerifyModalOpen, setEmailVerifyModalOpen] = useState(false);
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailVerifyStatus, setEmailVerifyStatus] = useState<"idle" | "sent" | "success" | "error">("idle");
  const [emailVerifyMessage, setEmailVerifyMessage] = useState("");
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);

  // Email resend cooldown timer
  useEffect(() => {
    if (emailResendCooldown <= 0) return;
    const timer = setTimeout(() => setEmailResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailResendCooldown]);

  // Check URL search params for ?verified=true
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("verified") === "true" && profile?.email) {
        markEmailVerified(profile.email, profile.id);
        setEmailVerifyStatus("success");
        setEmailVerifyMessage("Your email address has been verified successfully!");
        setEmailVerifyModalOpen(true);
        url.searchParams.delete("verified");
        window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams}` : ""));
      }
    }
  }, [profile?.email, profile?.id, markEmailVerified]);

  async function handleSendVerificationEmail() {
    if (!profile?.email || emailResendCooldown > 0) return;
    setIsSendingVerification(true);
    setEmailVerifyMessage("");
    setEmailVerifyStatus("idle");

    const res = await sendEmailVerification(profile.email, profile.id);
    setIsSendingVerification(false);
    if (res.ok) {
      setEmailVerifyStatus("sent");
      setEmailVerifyMessage(
        res.message ||
        `Verification email sent to ${profile.email}! Please check your inbox and click the link or enter the 6-digit code below.`,
      );
      setEmailResendCooldown(60);
    } else {
      setEmailVerifyStatus("error");
      setEmailVerifyMessage(res.message || "Failed to send verification email. Please try again.");
    }
  }

  async function handleConfirmEmailOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!profile?.email) return;
    const cleanOtp = emailOtpInput.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setEmailVerifyStatus("error");
      setEmailVerifyMessage("Please enter the 6-digit code sent to your email.");
      return;
    }

    setIsVerifyingEmailOtp(true);
    setEmailVerifyStatus("idle");
    const res = await verifyEmailCode(profile.email, cleanOtp, profile.id);
    setIsVerifyingEmailOtp(false);

    if (res.ok) {
      setEmailVerifyStatus("success");
      setEmailVerifyMessage("Your email address is now verified!");
      setEmailOtpInput("");
    } else {
      setEmailVerifyStatus("error");
      setEmailVerifyMessage(res.message || "Invalid or expired verification code.");
    }
  }

  function handleOpenEmailVerifyModal() {
    setEmailVerifyModalOpen(true);
    setEmailOtpInput("");
    setEmailVerifyStatus("idle");
    setEmailVerifyMessage("");
  }

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

  // Discord OTP Verification state
  const [otpInput, setOtpInput] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!profile) return;
    const cleanOtp = otpInput.trim();
    if (!cleanOtp) {
      setOtpError("Please enter the 6-character verification code.");
      return;
    }
    if (cleanOtp.length !== 6) {
      setOtpError("The verification code must be exactly 6 characters.");
      return;
    }
    setOtpError(null);
    setOtpSuccess(null);
    setIsVerifyingOtp(true);
    try {
      const res = await verifyDiscordOtp(profile.id, cleanOtp);
      if (res.ok) {
        setOtpSuccess(
          res.message || "Discord account successfully verified and linked!",
        );
        setOtpInput("");
      } else {
        if (res.reason === "no_pending_code") {
          setOtpError(
            res.message ||
            "No pending verification code found. Please run the /connect command in the Elevates Discord server first.",
          );
        } else if (res.reason === "max_attempts") {
          setOtpError(
            res.message ||
            "Maximum attempts exceeded. Please run /connect in the Elevates Discord server to generate a new code.",
          );
        } else if (res.reason === "invalid_code") {
          const attemptsMsg =
            typeof res.attemptsLeft === "number"
              ? ` (${res.attemptsLeft} attempt${res.attemptsLeft === 1 ? "" : "s"} remaining)`
              : "";
          setOtpError((res.message || "Incorrect verification code.") + attemptsMsg);
        } else {
          setOtpError(res.message || "Failed to verify code. Please check Discord and try again.");
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to verify code. Please try again.";
      setOtpError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleUnlinkDiscord() {
    if (!profile) return;
    setIsUnlinking(true);
    try {
      await unlinkDiscord(profile.id);
      setUnlinkConfirmOpen(false);
      setOtpSuccess(null);
      setOtpError(null);
      setOtpInput("");
    } catch (err) {
      console.warn("Failed to unlink discord:", err);
    } finally {
      setIsUnlinking(false);
    }
  }

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
    });

    setEditOpen(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  const selectedCohort = useMemo(() => {
    return chapterCohorts.find((c) => c.id === cohortId);
  }, [chapterCohorts, cohortId]);

  const assignedReps = useMemo(() => {
    return listStudentRepresentatives(store, profile);
  }, [store, profile]);

  const chapter = store.chapters.find((c) => c.id === profile?.chapterId);

  const canSeeClassesLink =
    Boolean(chapter) &&
    hasPermission(store, session.roleKey, "class.manage");

  const isDiscordConnected = Boolean(profile?.discordUserId);

  const profileUserId = profile?.id ?? "";
  const volunteerPowers = getUserVolunteerPowers(store, profileUserId);
  const isVolunteer = volunteerPowers.isVolunteer;
  const volunteerTeamName = volunteerPowers.effectiveTag || volunteerPowers.activeGroups[0]?.name;
  const volunteerAssignedEvent = volunteerPowers.activeAssignments[0]?.eventId
    ? store.events.find((e) => e.id === volunteerPowers.activeAssignments[0].eventId)
    : undefined;

  type RoleWithTimestamp = { role: (typeof store.roles)[0]; createdAt: string | undefined };
  const rolesWithUr: RoleWithTimestamp[] = store.userRoles
    .filter((ur) => ur.userId === profileUserId || ur.userId === cleanId)
    .map((ur) => {
      const r = store.roles.find((role) => role.id === ur.roleId || role.key === ur.roleKey);
      return r ? { role: r, createdAt: ur.createdAt } : null;
    })
    .filter((item): item is RoleWithTimestamp => item !== null && item.role.key !== "volunteer" && item.role.key !== "student");

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Member Portfolio"
        title={profile.fullName}
        description={
          isOwn
            ? "Official member profile, verified credentials, and active projects."
            : `Verified member portfolio${chapter ? ` · ${chapter.name}` : ""}.`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isOwn && (isVolunteer || session.roleKey === "volunteer" || hasPermission(store, session.roleKey, "attendance.verify")) && chapter && (
              <Link href={`/chapter/${chapter.slug}/attendance`}>
                <Button variant="orange" className="gap-2 font-bold shadow-xs">
                  <QrCode size={14} />
                  <span>Take Attendance</span>
                </Button>
              </Link>
            )}
            {isOwn && (
              <Link href="/referrals">
                <Button variant="secondary" className="gap-2">
                  <Link2 size={14} />
                  <span>Referrals</span>
                </Button>
              </Link>
            )}
            {canEdit && (
              <Button
                variant="orange"
                onClick={handleOpenEdit}
                className="gap-2 font-bold"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </Button>
            )}
            {isFounder(session.roleKey) && profile.id !== session.userId && (
              <Button
                variant="danger"
                onClick={() => setDeleteConfirmOpen(true)}
                className="gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete User</span>
              </Button>
            )}
          </div>
        }
      />

      {/* 2. Modern Profile Identity Hero Card */}
      <div className="rounded-[var(--radius-lg)] bg-bg-panel p-5 sm:p-7 shadow-[var(--shadow)] border border-border/70">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar Area */}
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-soft)] text-3xl font-extrabold text-[var(--accent)] shadow-sm border border-border/60">
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
            {isDiscordConnected && (
              <div
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#5865F2] text-white shadow-xs"
                title="Discord Bot Connected"
              >
                <DiscordIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Identity Information Details */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
                {profile.fullName}
              </h2>

              {/* 1-Click Copy Elevates ID Badge */}
              {profile.elevatesId && (
                <button
                  type="button"
                  onClick={handleCopyElevatesId}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-bg border border-border px-2.5 py-1 text-xs font-mono font-bold text-text hover:border-[var(--accent)] hover:text-[var(--accent)] transition shadow-2xs cursor-pointer"
                  title="Click to copy Elevates ID"
                >
                  <span>{profile.elevatesId}</span>
                  {copiedElevatesId ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="opacity-60" />
                  )}
                </button>
              )}

              {/* Discord sync indicator */}
              {isDiscordConnected ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20 px-2 py-0.5 text-[11px] font-bold">
                  <DiscordIcon className="w-3 h-3" />
                  Bot Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium">
                  <DiscordIcon className="w-3 h-3 opacity-70" />
                  Bot Unlinked
                </span>
              )}

              {/* Volunteer tag */}
              {isVolunteer && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold tracking-wide">
                  Volunteer
                </span>
              )}
            </div>

            {/* Academic & Campus Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Campus Chapter Pill */}
              {chapter ? (
                <Link
                  href={`/chapter/${chapter.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-semibold text-[var(--accent)] hover:underline"
                >
                  <Building2 size={13} />
                  <span>{chapter.name}</span>
                  {chapter.college && (
                    <span className="opacity-80 font-normal">
                      · {chapter.college}
                    </span>
                  )}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-500/10 px-2.5 py-1 text-text-dim">
                  <Building2 size={13} />
                  Independent Member
                </span>
              )}

              {/* Academic Year & Dept Pill */}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-bg border border-border px-2.5 py-1 text-text font-medium">
                <GraduationCap size={13} className="text-[var(--accent)]" />
                <span>{academicYearDisplay}</span>
                {(profile.department || profile.section) && (
                  <span className="text-text-mute">
                    · {profile.department || "General"}
                    {profile.section ? ` (${profile.section})` : ""}
                  </span>
                )}
              </span>

              {/* Email Verification status */}
              {profile.email && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px]",
                    profile.emailVerified
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "border-border bg-bg text-text-dim",
                  )}
                >
                  <Mail size={12} className="opacity-75" />
                  <span>{profile.email}</span>
                  {profile.emailVerified ? (
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  ) : canEdit ? (
                    <button
                      type="button"
                      onClick={handleOpenEmailVerifyModal}
                      className="ml-1 text-[10px] text-[var(--accent)] font-bold hover:underline cursor-pointer"
                    >
                      Verify
                    </button>
                  ) : null}
                </span>
              )}
            </div>

            {/* Member Bio */}
            {profile.bio && (
              <p className="max-w-2xl text-[13px] leading-relaxed text-text-dim pt-1">
                {profile.bio}
              </p>
            )}

            {/* Roles & EOS Doctrine Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                <Badge key={role.id} tone="magenta">
                  {role.name}
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

      {/* 3. Volunteer Quick Bar (if volunteer) */}
      {isVolunteer && chapter && (
        <div className="rounded-[var(--radius)] border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <QrCode size={18} />
            </div>
            <div>
              <p className="font-bold text-[13px] text-text">
                Volunteer Status: {volunteerTeamName ? `${volunteerTeamName} Member` : "Volunteer"}
              </p>
              <p className="text-[12px] text-text-dim">
                {volunteerAssignedEvent
                  ? `Assigned to manage "${volunteerAssignedEvent.title}".`
                  : `Member of volunteer team for ${chapter.name}. Awaiting event assignment.`}
              </p>
            </div>
          </div>
          {volunteerAssignedEvent && (
            <Link href={`/chapter/${chapter.slug}/attendance?eventId=${volunteerAssignedEvent.id}`}>
              <Button variant="orange" size="sm" className="font-bold shrink-0 gap-1.5">
                <QrCode size={13} />
                <span>Take Attendance</span>
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* 4. Executive Metric Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Points" value={profile.points} accent="cyan" />
        <Stat label="Executive Score" value={score} accent="magenta" />
        <Stat label="Certificates" value={certs.length} accent="green" />
        <Stat label="Events Attended" value={eventsAttended.length} accent="orange" />
      </div>

      {/* 5. Modern Tabbed Navigation */}
      <div className="flex items-center justify-between border-b border-border/80 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition cursor-pointer",
              activeTab === "overview"
                ? "bg-bg-panel text-text border border-border shadow-xs"
                : "text-text-mute hover:text-text hover:bg-bg-panel/50",
            )}
          >
            <User size={14} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("credentials")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition cursor-pointer",
              activeTab === "credentials"
                ? "bg-bg-panel text-text border border-border shadow-xs"
                : "text-text-mute hover:text-text hover:bg-bg-panel/50",
            )}
          >
            <Award size={14} />
            <span>Certificates & Credentials</span>
            <span className="rounded-full bg-border px-1.5 py-0.2 text-[10px] font-bold">
              {certs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("journey")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition cursor-pointer",
              activeTab === "journey"
                ? "bg-bg-panel text-text border border-border shadow-xs"
                : "text-text-mute hover:text-text hover:bg-bg-panel/50",
            )}
          >
            <Sparkles size={14} />
            <span>EOS Journey</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition cursor-pointer",
                activeTab === "settings"
                  ? "bg-bg-panel text-text border border-border shadow-xs"
                  : "text-text-mute hover:text-text hover:bg-bg-panel/50",
              )}
            >
              <DiscordIcon className="w-3.5 h-3.5" />
              <span>Integrations & Setup</span>
            </button>
          )}
        </div>
      </div>

      {/* 6. TAB CONTENT PANELS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Main Column (8-cols): Skills, Projects, Recent Events */}
          <div className="xl:col-span-8 space-y-6">
            {/* Technical Skills & Interests Card */}
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
                  Technical Skills & Interests
                </h3>
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={12} />
                    <span>Edit Skills</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute mb-2">
                  Skills ({profile.skills.length})
                </p>
                {profile.skills.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center">
                    <p className="text-[12px] text-text-mute">No skills added yet.</p>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOpenEdit}
                        className="mt-2 text-xs text-[var(--accent)]"
                      >
                        + Add technical skills
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-lg bg-bg border border-border px-3 py-1 text-[12px] font-semibold text-text shadow-2xs"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute mb-2">
                  Interests
                </p>
                {profile.interests.length === 0 ? (
                  <p className="text-[12px] text-text-mute">No interests specified.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-bg/60 border border-border/60 px-2.5 py-1 text-[12px] font-medium text-text-dim"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Projects Card */}
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <FolderGit2 size={16} className="text-[var(--accent)]" />
                  <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
                    Active Projects
                  </h3>
                </div>
                <span className="rounded-full bg-bg border border-border px-2.5 py-0.5 text-[11px] font-semibold text-text-mute">
                  {projects.length}
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="py-6 text-center text-text-mute text-[13px]">
                  No active projects associated with this profile.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-border/80 bg-bg/50 p-3.5 space-y-2 hover:bg-bg transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <Badge tone="cyan">{p.stage}</Badge>
                        {p.projectType && (
                          <span className="text-[10px] text-text-mute font-mono">
                            {p.projectType}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-[13px] text-text">
                        {p.title}
                      </h4>
                      {p.description && (
                        <p className="text-[11px] text-text-dim line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event Attendance History Card */}
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck2 size={16} className="text-[var(--accent)]" />
                  <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
                    Event History
                  </h3>
                </div>
                <span className="rounded-full bg-bg border border-border px-2.5 py-0.5 text-[11px] font-semibold text-text-mute">
                  {eventsAttended.length} attended
                </span>
              </div>

              {eventsAttended.length === 0 ? (
                <div className="py-6 text-center text-text-mute text-[13px]">
                  No event attendance recorded yet.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {eventsAttended.slice(0, 5).map((a) => {
                    const ev = store.events.find((e) => e.id === a.eventId);
                    return (
                      <li key={a.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-text truncate">
                            {ev?.title ?? "Community Event"}
                          </p>
                          <p className="text-[11px] text-text-mute">
                            {ev?.venue ? `${ev.venue} · ` : ""}
                            {formatDateTime(a.checkedInAt)}
                          </p>
                        </div>
                        <Badge tone="green">Present</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar Column (4-cols): Contact, Campus, Class Details */}
          <div className="xl:col-span-4 space-y-5">
            {/* Contact & Social Links Card */}
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-3">
              <h3 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-text border-b border-border/60 pb-2.5">
                Contact & Profiles
              </h3>

              <ul className="space-y-2.5 text-[12px]">
                {profile.email && (
                  <li className="flex items-center justify-between gap-2 text-text-dim">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Mail size={13} className="text-text-mute" />
                      <span className="truncate max-w-[180px]">{profile.email}</span>
                    </span>
                    {profile.emailVerified ? (
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-amber-500 font-semibold">Unverified</span>
                    )}
                  </li>
                )}

                {profile.phone && (
                  <li className="flex items-center gap-2 text-text-dim">
                    <Phone size={13} className="text-text-mute" />
                    <span>{profile.phone}</span>
                  </li>
                )}

                {profile.githubUrl && (
                  <li>
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-text hover:text-[var(--accent)] font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <Link2 size={13} className="text-text-mute" />
                        <span>GitHub</span>
                      </span>
                      <ExternalLink size={12} className="text-text-mute" />
                    </a>
                  </li>
                )}

                {profile.linkedinUrl && (
                  <li>
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-[#0a66c2] hover:underline font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <Link2 size={13} className="text-text-mute" />
                        <span>LinkedIn</span>
                      </span>
                      <ExternalLink size={12} className="text-text-mute" />
                    </a>
                  </li>
                )}

                {profile.portfolioUrl && (
                  <li>
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-[var(--accent)] hover:underline font-medium"
                    >
                      <span className="flex items-center gap-1.5">
                        <Globe size={13} className="text-text-mute" />
                        <span>Portfolio</span>
                      </span>
                      <ExternalLink size={12} className="text-text-mute" />
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Campus & Class Information Card */}
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-3">
              <h3 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-text border-b border-border/60 pb-2.5">
                Campus & Division
              </h3>

              <div className="space-y-2 text-[12px]">
                <div>
                  <span className="text-text-mute block text-[10px] uppercase font-bold">Chapter</span>
                  <p className="font-semibold text-text mt-0.5">
                    {chapter?.name ?? "Independent Member"}
                  </p>
                  {chapter?.college && (
                    <p className="text-[11px] text-text-dim">{chapter.college}</p>
                  )}
                </div>

                <div className="border-t border-border/50 pt-2">
                  <span className="text-text-mute block text-[10px] uppercase font-bold">Class</span>
                  <p className="font-semibold text-text mt-0.5">
                    {selectedCohort ? cohortLabel(selectedCohort) : "No division assigned"}
                  </p>
                </div>

                {assignedReps.length > 0 && (
                  <div className="border-t border-border/50 pt-2">
                    <span className="text-text-mute block text-[10px] uppercase font-bold mb-1">Class Representatives</span>
                    <ul className="space-y-1">
                      {assignedReps.map((r, i) => (
                        <li key={r.id} className="flex items-center justify-between rounded-lg bg-bg px-2.5 py-1 text-[11px]">
                          <span className="font-semibold">{r.label}</span>
                          <span className="text-text-mute text-[10px]">Rep {i + 1}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREDENTIALS & CERTIFICATES */}
      {activeTab === "credentials" && (
        <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-text">
                Verified Credentials & Certificates
              </h3>
              <p className="text-[12px] text-text-mute mt-0.5">
                Cryptographically verifiable event participation and completion credentials.
              </p>
            </div>
            <span className="rounded-full bg-bg border border-border px-3 py-0.5 text-xs font-bold text-[var(--accent)]">
              {certs.length} Issued
            </span>
          </div>

          {certs.length === 0 ? (
            <div className="py-12 text-center">
              <Award size={36} className="mx-auto mb-2 text-text-mute opacity-40" />
              <p className="text-[14px] font-semibold text-text">
                No certificates issued yet
              </p>
              <p className="mt-1 text-[12px] text-text-mute max-w-sm mx-auto">
                Certificates are automatically generated and verified upon attending workshops and hackathons.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certs.map((c) => {
                const ev = store.events.find((e) => e.id === c.eventId);
                return (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-bg/60 p-4 transition hover:bg-bg hover:shadow-xs hover:border-[var(--accent)]/50"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          {c.certificateId}
                        </span>
                        <Badge tone="green">Verified</Badge>
                      </div>

                      <h4 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-text line-clamp-2">
                        {ev?.title ?? "Official Event Certificate"}
                      </h4>

                      <p className="text-[11px] text-text-mute">
                        Issued on {formatDateTime(c.issuedAt)}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-text-dim">
                        Public Verification
                      </span>
                      <Link
                        href={`/verify/certificate/${c.certificateId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline"
                      >
                        <span>Verify</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EOS JOURNEY & ENGAGEMENT */}
      {activeTab === "journey" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-text border-b border-border/60 pb-3">
                EOS Community Progression
              </h3>
              <p className="text-[13px] text-text-dim leading-relaxed">
                Progression is earned through active participation in peer labs, workshops, and student innovation clusters.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-border bg-bg/50 p-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-text-mute">Community Tier</span>
                  <p className="text-[16px] font-bold text-text">
                    {communityTiers.find(
                      (t: { key?: string; tier?: string; label?: string }) =>
                        t.key === derived.engagementTier || t.tier === derived.engagementTier,
                    )?.label ?? "Everyone"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-bg/50 p-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-text-mute">Journey Stage</span>
                  <p className="text-[16px] font-bold text-text">
                    {journeyStages.find(
                      (s: { key?: string; stage?: string; label?: string }) =>
                        s.key === derived.journeyStage || s.stage === derived.journeyStage,
                    )?.label ?? "Awareness"}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[12px] text-text-mute space-y-1">
                <p>• <strong>Workshop check-in:</strong> Participant</p>
                <p>• <strong>Consistent activity:</strong> Active</p>
                <p>• <strong>Cluster invite accepted:</strong> Cluster Member</p>
                <p>• <strong>Leadership term:</strong> Campus Executive</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text border-b border-border/60 pb-3">
                Executive Activity Index
              </h3>

              <ProgressBar
                value={Math.min(100, profile.points / 20)}
                label="Activity Score"
                accent="green"
              />

              <div className="rounded-xl bg-bg border border-border p-3 space-y-1 text-[11px] text-text-dim font-mono">
                <p>Score = tasks × 12 + events × 18 + reports × 15 + attendance × 10</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTEGRATIONS & SETUP */}
      {activeTab === "settings" && canEdit && (
        <div className="space-y-6">
          {/* Discord Bot Integration Card */}
          <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
                  <DiscordIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
                    Discord Account Verification
                  </h3>
                  <p className="text-[12px] text-text-mute">
                    Link your Discord account to sync verified roles and announcements.
                  </p>
                </div>
              </div>
              {isDiscordConnected ? (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-bold">
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-xs font-bold">
                  Action Required
                </span>
              )}
            </div>

            {isDiscordConnected ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-bg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2] text-white">
                    <DiscordIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-text">
                      @{profile.discordUsername?.replace(/^@/, "") || "member"}
                    </p>
                    {profile.discordUserId && (
                      <p className="font-mono text-[11px] text-text-mute">
                        ID: {profile.discordUserId}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUnlinkConfirmOpen(true)}
                  className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
                >
                  <Unlink size={13} />
                  <span>Disconnect</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-text-dim">
                  Run <code className="font-mono font-bold text-text bg-bg px-2 py-0.5 rounded border border-border">/connect</code> in the Elevates Discord server, then paste the 6-character code below:
                </p>

                <form onSubmit={handleVerifyOtp} className="flex flex-wrap items-center gap-3 max-w-md">
                  <Input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => {
                      setOtpInput(e.target.value.trim().slice(0, 6));
                      if (otpError) setOtpError(null);
                    }}
                    placeholder="6-character code"
                    className="w-48 h-10 text-center font-mono font-bold text-base tracking-widest uppercase bg-bg"
                    disabled={isVerifyingOtp}
                  />

                  <Button
                    type="submit"
                    variant="orange"
                    disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                    className="h-10 font-bold text-xs gap-2"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        <span>Verify</span>
                      </>
                    )}
                  </Button>
                </form>

                {otpError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 max-w-md">
                    {otpError}
                  </p>
                )}
                {otpSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 max-w-md">
                    {otpSuccess}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Class Division Selection Card */}
          {profile.chapterId && (
            <div className="rounded-[var(--radius)] bg-bg-panel p-5 shadow-[var(--shadow)] border border-border/80 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text">
                  Class Division & Cohort
                </h3>
                {studentHasClassSet(profile) ? (
                  <Badge tone="green">Assigned</Badge>
                ) : (
                  <Badge tone="orange">Required</Badge>
                )}
              </div>

              <div className="max-w-md space-y-3">
                <FieldLabel>Select Your Class Division</FieldLabel>
                <Select
                  value={cohortId}
                  onChange={(e) => setCohortIdOverride(e.target.value)}
                  className="bg-bg"
                >
                  <option value="">Select class division…</option>
                  {chapterCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {cohortLabel(c)}
                    </option>
                  ))}
                </Select>

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveClass}
                    disabled={!selectedCohort}
                  >
                    Save Division
                  </Button>
                  {canSeeClassesLink && chapter && (
                    <Link href={`/chapter/${chapter.slug}/classes`}>
                      <Button variant="ghost" size="sm">Manage Classes</Button>
                    </Link>
                  )}
                  {savedFlash && (
                    <span className="text-xs text-emerald-600 font-bold">Saved!</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Edit Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profile"
        description="Configure your official member profile, academic details, and technical skills."
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
            </div>

            {/* Chapter / College Name (Non-editable) */}
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
            </div>
          </div>

          {/* Section 2: Personal & Academic Details */}
          <div className="space-y-3.5">
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

              <div className="sm:col-span-1">
                <FieldLabel>Department</FieldLabel>
                <Input
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  placeholder="e.g. CSE, ECE, ME"
                />
              </div>

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
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell the community about what you build and what you are learning..."
                rows={2}
              />
            </div>

            <div>
              <FieldLabel>Phone Number</FieldLabel>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Section 3: Technical Skills */}
          <div className="space-y-3">
            <FieldLabel>Technical Skills</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type skill & press Enter..."
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleAddSkill()}
                disabled={!newSkillInput.trim()}
              >
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {skillsList.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:opacity-75 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px] text-text-mute">
              <span>Popular:</span>
              {POPULAR_SKILL_SUGGESTIONS.slice(0, 6).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddSkill(s)}
                  className="rounded px-1.5 py-0.5 hover:bg-bg border border-border text-[10px] cursor-pointer"
                >
                  +{s}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Web & Social Links */}
          <div className="space-y-3 pt-2 border-t border-border">
            <FieldLabel>Web & Social Links</FieldLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                value={editGithub}
                onChange={(e) => setEditGithub(e.target.value)}
                placeholder="GitHub URL"
              />
              <Input
                value={editLinkedin}
                onChange={(e) => setEditLinkedin(e.target.value)}
                placeholder="LinkedIn URL"
              />
              <Input
                value={editPortfolio}
                onChange={(e) => setEditPortfolio(e.target.value)}
                placeholder="Portfolio URL"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="orange">
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Email Verification OTP Modal */}
      <Dialog
        open={emailVerifyModalOpen}
        onClose={() => setEmailVerifyModalOpen(false)}
        title="Verify Email Address"
        description={`We verify email addresses to secure credentials and official chapter communications.`}
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border bg-bg/50 p-4 space-y-2">
            <p className="text-xs text-text-mute font-mono">Target Email</p>
            <p className="font-bold text-sm text-text font-mono">{profile.email}</p>
          </div>

          {emailVerifyStatus !== "success" ? (
            <div className="space-y-3">
              <Button
                type="button"
                variant="orange"
                onClick={handleSendVerificationEmail}
                disabled={isSendingVerification || emailResendCooldown > 0}
                className="w-full justify-center"
              >
                {isSendingVerification ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : emailResendCooldown > 0 ? (
                  `Resend Code in ${emailResendCooldown}s`
                ) : (
                  "Send Verification Code"
                )}
              </Button>

              <form onSubmit={handleConfirmEmailOtp} className="space-y-3 pt-2 border-t border-border">
                <FieldLabel>Enter 6-Digit Verification Code</FieldLabel>
                <Input
                  value={emailOtpInput}
                  onChange={(e) => setEmailOtpInput(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center font-mono text-lg tracking-widest"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isVerifyingEmailOtp || emailOtpInput.trim().length !== 6}
                  className="w-full justify-center"
                >
                  {isVerifyingEmailOtp ? <Loader2 size={14} className="animate-spin" /> : "Confirm Code"}
                </Button>
              </form>
            </div>
          ) : null}

          {emailVerifyMessage && (
            <p
              className={cn(
                "text-xs p-3 rounded-lg border",
                emailVerifyStatus === "error"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-semibold",
              )}
            >
              {emailVerifyMessage}
            </p>
          )}
        </div>
      </Dialog>

      {/* Disconnect Discord Confirmation Modal */}
      <TypeConfirmModal
        open={unlinkConfirmOpen}
        onClose={() => setUnlinkConfirmOpen(false)}
        onConfirm={handleUnlinkDiscord}
        title="Disconnect Discord Account"
        description="Are you sure you want to unlink your Discord account? You will lose Discord bot synced roles and commands until reconnected."
        confirmWord="DISCONNECT"
        actionLabel="Disconnect Account"
      />

      {/* Delete User Modal (Founder only) */}
      <TypeConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          if (!profile || !isFounder(session.roleKey) || profile.id === session.userId) return;
          await deleteUser(profile.id);
          router.push("/hq/users");
        }}
        title={`Delete User: ${profile.fullName}`}
        description="This will permanently delete this profile, removing their credentials, roles, and permissions across the entire platform. This action cannot be undone."
        confirmWord="DELETE"
        actionLabel="Delete User Permanently"
      />
    </div>
  );
}
