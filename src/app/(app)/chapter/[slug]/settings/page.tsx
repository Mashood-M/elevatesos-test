"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  KeyRound,
  CheckCircle2,
  History,
  Copy,
  Check,
  MapPin,
  Users,
  Calendar,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  FolderGit2,
  FileText,
  BarChart2,
  Pencil,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { chapterEyebrow, isExecutiveRole, isFacultyRole } from "@/lib/access";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import { deriveChapterShortCode } from "@/lib/chapters";
import type { Chapter } from "@/types";
import { ChapterInviteCodeManager } from "@/components/chapter/chapter-invite-code-manager";
import { ChapterDepartmentManager } from "@/components/chapter/chapter-department-manager";
import { ChapterLocationPicker } from "@/components/chapter/chapter-location-picker";
import { ChapterCitySelect } from "@/components/chapter/chapter-city-select";
import { ChapterUserSearchPicker } from "@/components/chapter/chapter-user-search-picker";

export default function ChapterSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { store, updateChapter } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);
  const [flash, setFlash] = useState("");
  const [joinCopied, setJoinCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "access" | "onboarding" | "activity">("general");

  const canManage = useMemo(() => {
    if (!chapter) return false;
    return (
      isHqRole(session.roleKey) ||
      isFacultyRole(session.roleKey) ||
      hasPermission(store, session.roleKey, "chapter.manage") ||
      session.roleKey === "campus_lead" ||
      session.roleKey === "class_representative" ||
      session.roleKey === "chairman" ||
      session.roleKey === "secretary"
    );
  }, [chapter, session.roleKey, store]);

  if (!chapter) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">Chapter not found</p>
        <Link href="/hq/chapters" className="mt-2 inline-block text-[var(--accent)]">
          Back to chapters
        </Link>
      </div>
    );
  }

  const ch = chapter;

  const members = store.profiles.filter((p) => p.chapterId === ch.id);
  const leadershipTerms = store.leadershipTerms.filter(
    (t) => t.chapterId === ch.id,
  );
  const activeTerm = leadershipTerms.find((t) => t.status === "active");
  const termIds = new Set(leadershipTerms.map((t) => t.id));
  const executives = store.leadershipAssignments.filter((a) =>
    termIds.has(a.termId),
  );
  const clusters = store.clusters.filter((c) => c.chapterId === ch.id);

  const currentCampusLeadId = useMemo(() => {
    if (ch.campusLeadId) return ch.campusLeadId;
    const cs = ch.customSettings;
    if (cs?.campusLeadId || cs?.campus_lead_id) {
      return (cs.campusLeadId || cs.campus_lead_id) as string;
    }
    if (activeTerm) {
      const leadAssignment = store.leadershipAssignments.find(
        (a) =>
          a.termId === activeTerm.id &&
          (a.roleKey === "campus_lead" || a.roleKey === "chairman"),
      );
      if (leadAssignment) return leadAssignment.userId;
    }
    const leadRole = store.userRoles.find(
      (ur) =>
        ur.chapterId === ch.id &&
        (ur.roleKey === "campus_lead" || ur.roleKey === "chairman"),
    );
    if (leadRole) return leadRole.userId;
    const anyLead = store.leadershipAssignments.find(
      (a) =>
        termIds.has(a.termId) &&
        (a.roleKey === "campus_lead" || a.roleKey === "chairman"),
    );
    if (anyLead) return anyLead.userId;
    return undefined;
  }, [ch, activeTerm, termIds, store.leadershipAssignments, store.userRoles]);

  const campusLead = store.profiles.find((p) => p.id === currentCampusLeadId);
  const faculty = store.profiles.find((p) => p.id === ch.facultyId);

  const chapterMemberCandidates = useMemo(() => {
    return store.profiles.filter(
      (p) =>
        p.chapterId === ch.id ||
        p.id === currentCampusLeadId ||
        p.id === ch.facultyId,
    );
  }, [store.profiles, ch.id, currentCampusLeadId, ch.facultyId]);

  const chapterLogs = useMemo(() => {
    const memberSet = new Set(members.map((m) => m.id));
    return (store.activityLogs ?? [])
      .filter((l) => {
        if (l.entity === "chapter" && l.entityId === ch.id) return true;
        if (l.meta && (l.meta.includes(ch.id) || l.meta.includes(ch.slug) || l.meta.includes(ch.name))) return true;
        if (l.entity === "leadership_term" && leadershipTerms.some((t) => t.id === l.entityId)) return true;
        if (l.entity === "leadership_assignment" && executives.some((e) => e.id === l.entityId)) return true;
        if (memberSet.has(l.actorId)) return true;
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [store.activityLogs, ch.id, ch.slug, ch.name, members, leadershipTerms, executives]);

  const initialFormData = useMemo(
    () => ({
      name: ch.name,
      shortCode: ch.shortCode || deriveChapterShortCode(ch.name),
      slug: ch.slug,
      status: ch.status,
      campusLeadId: currentCampusLeadId,
      facultyId: ch.facultyId,
      city: ch.city,
      district: ch.district,
      state: ch.state,
      coordinates: ch.coordinates,
      latitude: ch.latitude,
      longitude: ch.longitude,
      location: ch.location,
      mapUrl: ch.mapUrl,
      notes: ch.notes ?? "",
    }),
    [ch, currentCampusLeadId],
  );

  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize form buffer when chapter updates in store while not editing
  useMemo(() => {
    if (!isEditing) {
      setFormData(initialFormData);
    }
  }, [initialFormData, isEditing]);

  function handleStartEdit() {
    if (!canManage) return;
    setFormData(initialFormData);
    setIsEditing(true);
    setActiveTab("general");
  }

  function handleDiscard() {
    setFormData(initialFormData);
    setIsEditing(false);
    setFlash("Edits discarded.");
    window.setTimeout(() => setFlash(""), 1600);
  }

  async function handleSave() {
    if (!canManage) return;
    if (!formData.name.trim()) {
      setFlash("Chapter name cannot be empty.");
      window.setTimeout(() => setFlash(""), 2200);
      return;
    }
    if (!formData.slug.trim()) {
      setFlash("URL slug cannot be empty.");
      window.setTimeout(() => setFlash(""), 2200);
      return;
    }

    setIsSaving(true);
    try {
      const cleanSlug = finalizeSlug(formData.slug);
      const cleanShortCode =
        formData.shortCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) ||
        deriveChapterShortCode(formData.name);

      updateChapter(ch.id, {
        name: formData.name.trim(),
        college: formData.name.trim(),
        shortCode: cleanShortCode,
        slug: cleanSlug,
        status: formData.status,
        campusLeadId: formData.campusLeadId,
        facultyId: formData.facultyId,
        city: formData.city,
        district: formData.district,
        state: formData.state,
        coordinates: formData.coordinates,
        latitude: formData.latitude,
        longitude: formData.longitude,
        location: formData.location,
        mapUrl: formData.mapUrl,
        notes: formData.notes,
      });

      setIsEditing(false);
      setFlash("Settings saved successfully!");
      window.setTimeout(() => setFlash(""), 2200);

      if (cleanSlug !== slug) {
        router.replace(`/chapter/${cleanSlug}/settings`);
      }
    } catch {
      setFlash("Error saving chapter settings.");
      window.setTimeout(() => setFlash(""), 2200);
    } finally {
      setIsSaving(false);
    }
  }

  function saveDirectField(patch: Partial<Chapter>) {
    if (!canManage) return;
    updateChapter(ch.id, patch);
    setFormData((prev) => ({ ...prev, ...patch }));
    setFlash("Status updated.");
    window.setTimeout(() => setFlash(""), 1600);
    if (patch.slug && patch.slug !== slug) {
      router.replace(`/chapter/${patch.slug}/settings`);
    }
  }

  function focusCampusLead() {
    setActiveTab("general");
    setIsEditing(true);
    window.setTimeout(() => {
      const el = document.getElementById("campus-lead-picker");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 120);
  }

  function focusFaculty() {
    setActiveTab("general");
    setIsEditing(true);
    window.setTimeout(() => {
      const el = document.getElementById("faculty-coordinator-picker");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 120);
  }

  const hasFaculty = Boolean(ch.facultyId);
  const hasCampusLead = Boolean(currentCampusLeadId);
  const hasLeadership =
    Boolean(activeTerm) ||
    hasCampusLead ||
    leadershipTerms.some((t) => t.status === "upcoming" || t.status === "active") ||
    executives.length > 0;
  const hasClusters = clusters.length > 0;
  const hasStudents = members.length >= 1;
  const isChapterActive = ch.status === "active";

  const checklist = [
    {
      id: "campus_lead",
      label: "Campus Lead assigned",
      detail: campusLead ? campusLead.fullName : "Assign campus lead / chairman",
      done: hasCampusLead,
      actionLabel: hasCampusLead ? "Change" : "Assign",
      onAction: focusCampusLead,
    },
    {
      id: "faculty",
      label: "Faculty coordinator",
      detail: faculty ? faculty.fullName : "Assign a faculty advisor",
      done: hasFaculty,
      actionLabel: hasFaculty ? "Change" : "Assign",
      onAction: focusFaculty,
    },
    {
      id: "leadership",
      label: "Active leadership cycle",
      detail: activeTerm
        ? `${activeTerm.academicYear} · ${activeTerm.title}`
        : executives.length > 0
          ? `${executives.length} executive${executives.length === 1 ? "" : "s"} assigned`
          : "Setup executive team & cycle",
      done: hasLeadership,
      href: `/chapter/${slug}/leadership`,
      actionLabel: hasLeadership ? "Manage" : "Setup",
    },
    {
      id: "clusters",
      label: "At least one cluster",
      detail:
        clusters.length > 0
          ? `${clusters.length} active cluster${clusters.length === 1 ? "" : "s"}`
          : "Create domain tracks for students",
      done: hasClusters,
      href: `/chapter/${slug}/clusters`,
      actionLabel: hasClusters ? "Manage" : "Create",
    },
    {
      id: "students",
      label: "Students onboarded",
      detail:
        members.length > 0
          ? `${members.length} member${members.length === 1 ? "" : "s"} registered`
          : "Invite or register campus students",
      done: hasStudents,
      href: `/chapter/${slug}/students`,
      actionLabel: hasStudents ? "View" : "Onboard",
    },
    {
      id: "status",
      label: "Chapter status active",
      detail: isChapterActive
        ? "Active in Elevates network"
        : ch.status === "onboarding"
          ? "Currently onboarding"
          : "Currently inactive",
      done: isChapterActive,
      actionLabel: isChapterActive ? undefined : "Activate",
      onAction:
        canManage && !isChapterActive
          ? () => saveDirectField({ status: "active" })
          : undefined,
    },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;

  const joinPath = "/join";
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${joinPath}`
      : joinPath;

  async function copyJoinLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setJoinCopied(true);
      window.setTimeout(() => setJoinCopied(false), 1600);
    } catch {
      setFlash("Could not copy — use the join page link.");
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Top-Left Back Button Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-bg-panel px-3 py-1.5 text-[12px] font-medium text-text-dim transition-colors hover:bg-bg hover:text-text shadow-2xs group cursor-pointer"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>
        <span className="text-border">/</span>
        <Link
          href={`/chapter/${slug}`}
          className="text-[12px] font-medium text-text-mute transition-colors hover:text-[var(--accent)]"
        >
          {chapter.name}
        </Link>
        <span className="text-border">/</span>
        <span className="text-[12px] font-semibold text-text">Settings</span>
      </div>

      {/* 2. PageHeader with Status Badge and Actions */}
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Chapter Settings"
        badge={
          <div className="flex items-center gap-1.5">
            <Badge tone={isChapterActive ? "green" : ch.status === "onboarding" ? "orange" : "mute"}>
              {ch.status}
            </Badge>
            {isEditing && (
              <Badge tone="orange" className="font-semibold animate-pulse">
                Editing
              </Badge>
            )}
          </div>
        }
        description={
          isEditing
            ? `Editing ${chapter.name} settings. Click "Save Changes" when finished or "Discard" to cancel.`
            : `${chapter.name} · Campus details, access codes, departments, and launch configuration.`
        }
        actions={
          canManage ? (
            isEditing ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={isSaving}
                  className="gap-1.5 border border-border/80 text-text-dim hover:text-text cursor-pointer"
                >
                  <X size={13} />
                  <span>Discard</span>
                </Button>
                <Button
                  variant="orange"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="orange"
                size="sm"
                onClick={handleStartEdit}
                className="gap-1.5 font-bold shadow-xs cursor-pointer"
              >
                <Pencil size={13} />
                <span>Edit Settings</span>
              </Button>
            )
          ) : null
        }
      />

      {/* 3. Flash Notification */}
      {flash ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={14} />
          <span>{flash}</span>
        </div>
      ) : null}

      {!canManage ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          View only mode — switch to Campus Lead, Secretary, Faculty coordinator, or HQ admin to edit chapter configuration.
        </div>
      ) : null}

      {/* 4. High-Level 4-Metric Overview Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href={`/chapter/${slug}/students`} className="block transition hover:opacity-90">
          <Stat label="Total Members" value={members.length} hint="Verified directory →" />
        </Link>
        <Link href={`/chapter/${slug}/leadership`} className="block transition hover:opacity-90">
          <Stat label="Executives" value={executives.length} hint="Leadership cycle →" />
        </Link>
        <Link href={`/chapter/${slug}/clusters`} className="block transition hover:opacity-90">
          <Stat label="Clusters" value={clusters.length} hint="Domain tracks →" />
        </Link>
        <Stat
          label="Launch Readiness"
          value={`${checklistDone}/${checklist.length}`}
          hint={isChapterActive ? "Active & operational" : `${checklist.length - checklistDone} steps pending`}
          accent={isChapterActive ? "green" : "orange"}
        />
      </div>

      {/* 5. Modern Tabbed Navigation */}
      <div className="flex border-b border-border/80 gap-1 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap",
            activeTab === "general"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]/50 rounded-t-lg font-bold"
              : "border-transparent text-text-dim hover:text-text hover:bg-bg/60 rounded-t-lg"
          )}
        >
          <Building2 size={14} />
          <span>General & Location</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("access")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap",
            activeTab === "access"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]/50 rounded-t-lg font-bold"
              : "border-transparent text-text-dim hover:text-text hover:bg-bg/60 rounded-t-lg"
          )}
        >
          <KeyRound size={14} />
          <span>Access & Departments</span>
          <span className="rounded-full bg-bg px-1.5 py-0.2 text-[10px] font-mono font-bold text-text-muted border border-border/60">
            {(store.departments ?? []).filter((d) => d.chapterId === ch.id).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("onboarding")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap",
            activeTab === "onboarding"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]/50 rounded-t-lg font-bold"
              : "border-transparent text-text-dim hover:text-text hover:bg-bg/60 rounded-t-lg"
          )}
        >
          <CheckCircle2 size={14} />
          <span>Onboarding & Ops</span>
          <span className="rounded-full bg-bg px-1.5 py-0.2 text-[10px] font-mono font-bold text-text-muted border border-border/60">
            {checklistDone}/{checklist.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap",
            activeTab === "activity"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]/50 rounded-t-lg font-bold"
              : "border-transparent text-text-dim hover:text-text hover:bg-bg/60 rounded-t-lg"
          )}
        >
          <History size={14} />
          <span>Activity Logs</span>
          {chapterLogs.length > 0 && (
            <span className="rounded-full bg-bg px-1.5 py-0.2 text-[10px] font-mono font-bold text-text-muted border border-border/60">
              {chapterLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* 6. Tab Contents */}

      {/* TAB 1: General & Location */}
      {activeTab === "general" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section: Profile & Identity */}
          <div className="space-y-6">
            <TerminalPanel title="Chapter Identity & Status">
              <div className="space-y-4">
                <div>
                  <FieldLabel>Chapter Name</FieldLabel>
                  <Input
                    value={formData.name}
                    disabled={!isEditing || !canManage}
                    placeholder="e.g. Eranad Knowledge City Technical Campus"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-text-dim">
                    Official collegiate institution name. Used on certificates and member badges.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>
                      <span>Shortcode</span>
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        (3-4 chars)
                      </span>
                    </FieldLabel>
                    <Input
                      value={formData.shortCode}
                      maxLength={4}
                      disabled={!isEditing || !canManage}
                      placeholder="e.g. SOS"
                      className="font-mono font-bold uppercase tracking-wider"
                      onChange={(e) => {
                        const clean = e.target.value
                          .trim()
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 4);
                        setFormData((prev) => ({ ...prev, shortCode: clean }));
                      }}
                    />
                    <p className="mt-1 text-[10px] text-text-mute">
                      ID Prefix: ELV-{formData.shortCode || "SOS"}-0001
                    </p>
                  </div>

                  <div>
                    <FieldLabel>URL Slug</FieldLabel>
                    <Input
                      value={formData.slug}
                      disabled={!isEditing || !canManage || !isHqRole(session.roleKey)}
                      onChange={(e) => {
                        const clean = formatSlugInput(e.target.value);
                        setFormData((prev) => ({ ...prev, slug: clean }));
                      }}
                    />
                    <p className="mt-1 text-[10px] text-text-mute">
                      {isHqRole(session.roleKey) ? "Elevates HQ permission to edit" : "Locked (HQ only)"}
                    </p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Operational Status</FieldLabel>
                  <Select
                    value={formData.status}
                    disabled={!isEditing || !canManage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as Chapter["status"],
                      }))
                    }
                  >
                    <option value="onboarding">Onboarding — Initial campus setup</option>
                    <option value="active">Active — Live on network & accepting registrations</option>
                    <option value="inactive">Disabled / Inactive</option>
                  </Select>
                </div>
              </div>
            </TerminalPanel>

            <TerminalPanel title="Leadership Appointments">
              <div className="space-y-4">
                <ChapterUserSearchPicker
                  id="campus-lead-picker"
                  label="Campus Lead / Chairman"
                  selectedUserId={formData.campusLeadId}
                  disabled={!isEditing || !canManage}
                  chapterId={ch.id}
                  profiles={chapterMemberCandidates}
                  placeholder="Unassigned — Search Campus Lead"
                  helperText="Primary student officer responsible for campus operations."
                  onSelect={(userId) => {
                    setFormData((prev) => ({ ...prev, campusLeadId: userId }));
                  }}
                />

                <ChapterUserSearchPicker
                  id="faculty-coordinator-picker"
                  label="Faculty Coordinator"
                  selectedUserId={formData.facultyId}
                  disabled={!isEditing || !canManage}
                  chapterId={ch.id}
                  profiles={chapterMemberCandidates}
                  placeholder="Unassigned — Search Faculty Coordinator"
                  helperText="Optional academic faculty liaison for university verification."
                  onSelect={(userId) => {
                    setFormData((prev) => ({ ...prev, facultyId: userId }));
                  }}
                />
              </div>
            </TerminalPanel>
          </div>

          {/* Section: Location & Coordinates */}
          <div className="space-y-6">
            <TerminalPanel title="Campus Venue & Location">
              <div className="space-y-4">
                <ChapterCitySelect
                  city={formData.city}
                  district={formData.district}
                  state={formData.state}
                  disabled={!isEditing || !canManage}
                  onChange={(sel) => {
                    setFormData((prev) => ({
                      ...prev,
                      city: sel.city,
                      district: sel.district,
                      state: sel.state,
                    }));
                  }}
                  onCoordinatesSuggest={(coords) => {
                    if (!formData.coordinates) {
                      setFormData((prev) => ({
                        ...prev,
                        coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                        latitude: coords.lat,
                        longitude: coords.lng,
                      }));
                    }
                  }}
                />

                <ChapterLocationPicker
                  contextQuery={formData.name || formData.city}
                  disabled={!isEditing || !canManage}
                  value={{
                    coordinates: formData.coordinates,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    location: formData.location,
                    mapUrl: formData.mapUrl,
                  }}
                  onChange={(locVal) => {
                    setFormData((prev) => ({
                      ...prev,
                      coordinates: locVal.coordinates,
                      latitude: locVal.latitude,
                      longitude: locVal.longitude,
                      location: locVal.location,
                      mapUrl: locVal.mapUrl,
                    }));
                  }}
                  onCityChange={(city, district, state) => {
                    setFormData((prev) => ({
                      ...prev,
                      city,
                      ...(district ? { district } : {}),
                      ...(state ? { state } : {}),
                    }));
                  }}
                />
              </div>
            </TerminalPanel>

            <TerminalPanel title="Internal Documentation & Notes">
              <FieldLabel>Operational Notes</FieldLabel>
              <TextArea
                rows={3}
                value={formData.notes}
                disabled={!isEditing || !canManage}
                placeholder="HQ & Campus Lead notes, auditorium approvals, or guidelines..."
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, notes: e.target.value }));
                }}
              />

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/80 pt-3 text-[12px]">
                <div>
                  <dt className="text-text-dim text-[11px]">Founded / Created</dt>
                  <dd className="font-medium font-mono text-[11px] text-text mt-0.5">
                    {chapter.createdAt ? formatDateTime(chapter.createdAt) : formatDate(chapter.foundedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-dim text-[11px]">Chapter ID</dt>
                  <dd className="font-medium font-mono text-[11px] text-text mt-0.5 truncate">
                    {chapter.id}
                  </dd>
                </div>
              </dl>
            </TerminalPanel>
          </div>

          {/* Chapter Activity Logs & Edit Settings Action */}
          <div className="lg:col-span-2">
            <TerminalPanel
              title="Chapter Activity"
              meta={`${chapterLogs.length} recent logs`}
              action={
                canManage ? (
                  isEditing ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDiscard}
                        disabled={isSaving}
                        className="gap-1.5 border border-border/80 text-text-dim hover:text-text cursor-pointer"
                      >
                        <X size={13} />
                        <span>Discard</span>
                      </Button>
                      <Button
                        variant="orange"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-1.5 font-bold shadow-xs cursor-pointer"
                      >
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="orange"
                      size="sm"
                      onClick={handleStartEdit}
                      className="gap-1.5 font-bold shadow-xs cursor-pointer"
                    >
                      <Pencil size={13} />
                      <span>Edit Settings</span>
                    </Button>
                  )
                ) : null
              }
            >
              {!chapterLogs.length ? (
                <p className="py-4 text-center text-[13px] text-text-mute">
                  No recent activity logged for this chapter.
                </p>
              ) : (
                <ul className="divide-y divide-border/60 text-[12px]">
                  {chapterLogs.map((log) => {
                    const actor = store.profiles.find((p) => p.id === log.actorId);
                    return (
                      <li key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-text">
                            {actor?.fullName ?? "System Actor"}
                          </span>
                          <span className="font-mono text-[11px] text-text-dim">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-text-dim">
                          <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">
                            {log.action.replaceAll("_", " ")}
                          </span>
                          {log.meta ? (
                            <span className="text-text-mute"> · {log.meta}</span>
                          ) : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TerminalPanel>
          </div>
        </div>
      )}

      {/* TAB 2: Access & Departments */}
      {activeTab === "access" && (
        <div className="space-y-6">
          {/* Join URL Banner */}
          <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 shadow-[var(--shadow-sm)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-text flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--accent)]" />
                <span>Public Membership Join Page</span>
              </p>
              <p className="text-[12px] text-text-dim mt-0.5">
                Students can navigate to <code className="font-mono text-[11px] bg-bg px-1.5 py-0.5 rounded border border-border">{joinUrl}</code> and enter a 3-day invite code to onboard.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={copyJoinLink}
                className="gap-1.5"
              >
                {joinCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{joinCopied ? "Link Copied" : "Copy Join URL"}</span>
              </Button>
              <Link href="/join" target="_blank">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ExternalLink size={13} />
                  <span>Preview</span>
                </Button>
              </Link>
            </div>
          </div>

          {canManage ? (
            <div className="space-y-6">
              <ChapterInviteCodeManager
                chapterId={chapter.id}
                chapterSlug={chapter.slug}
              />
              <ChapterDepartmentManager chapterId={chapter.id} />
            </div>
          ) : (
            <p className="text-xs text-text-dim">
              You must have chapter management permissions to issue invite codes or modify academic departments.
            </p>
          )}
        </div>
      )}

      {/* TAB 3: Onboarding & Operations */}
      {activeTab === "onboarding" && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <TerminalPanel
              title="Launch Readiness Checklist"
              meta={
                checklistDone === checklist.length
                  ? `${checklistDone}/${checklist.length} · 100% Ready`
                  : `${checklistDone}/${checklist.length} Completed`
              }
            >
              <p className="text-xs text-text-dim mb-4">
                Required milestones for establishing a fully certified campus chapter across leadership, members, and active programs.
              </p>

              <ul className="space-y-2.5">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-bg-card/40 p-3 text-[12px] transition-colors hover:border-border hover:bg-bg-card/70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${item.done
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-text-mute"
                          }`}
                      >
                        {item.done ? "✓" : "○"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight text-text truncate">
                          {item.label}
                        </p>
                        {item.detail ? (
                          <p className="text-[11px] text-text-dim truncate mt-0.5">
                            {item.detail}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={item.done ? "green" : "orange"}>
                        {item.done ? "done" : "todo"}
                      </Badge>
                      {item.onAction ? (
                        <button
                          type="button"
                          onClick={item.onAction}
                          disabled={!canManage}
                          className="text-[11px] font-semibold text-[var(--accent)] hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {item.actionLabel}
                        </button>
                      ) : item.href ? (
                        <Link
                          href={item.href}
                          className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                        >
                          {item.actionLabel} →
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              {canManage && !isChapterActive && checklistDone >= 4 ? (
                <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3.5">
                  <p className="text-[12px] font-semibold text-text">
                    Prerequisites Complete! Chapter is ready to be launched.
                  </p>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    Activating opens public registrations, event submissions, and enables student certificates.
                  </p>
                  <Button
                    variant="orange"
                    size="sm"
                    className="mt-2.5 w-full justify-center font-bold"
                    onClick={() => saveDirectField({ status: "active" })}
                  >
                    Activate Chapter Now
                  </Button>
                </div>
              ) : null}

              {isChapterActive && checklistDone === checklist.length ? (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                  <p className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Chapter is fully verified & ready for campus operations
                  </p>
                </div>
              ) : null}
            </TerminalPanel>
          </div>

          <div className="space-y-6">
            <TerminalPanel title="Chapter Operations Hub">
              <p className="text-xs text-text-dim mb-3">
                Quick jump to operational modules for this chapter:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { href: `/chapter/${slug}/leadership`, label: "Leadership Cycle", icon: Shield },
                  { href: `/chapter/${slug}/students`, label: "Students directory", icon: Users },
                  { href: `/chapter/${slug}/events`, label: "Events & Tickets", icon: Calendar },
                  { href: `/chapter/${slug}/clusters`, label: "Interest Clusters", icon: Layers },
                  { href: `/chapter/${slug}/projects`, label: "Builder Projects", icon: FolderGit2 },
                  { href: `/chapter/${slug}/reports`, label: "Formal Reports", icon: FileText },
                  { href: `/chapter/${slug}/analytics`, label: "Chapter Analytics", icon: BarChart2 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-bg p-2.5 text-[12px] font-medium text-text transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <Icon size={14} className="text-text-mute shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </TerminalPanel>

            {(isExecutiveRole(session.roleKey) ||
              isFacultyRole(session.roleKey) ||
              isHqRole(session.roleKey)) &&
              activeTerm ? (
              <TerminalPanel title="Active Leadership Term" meta={activeTerm.academicYear}>
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-text">{activeTerm.title}</p>
                  <p className="text-[12px] text-text-dim">
                    {formatDate(activeTerm.startDate)} – {formatDate(activeTerm.endDate)}
                  </p>
                </div>
                <Link
                  href={`/chapter/${slug}/leadership`}
                  className="mt-3 inline-block text-[12px] font-semibold text-[var(--accent)] hover:underline"
                >
                  Manage leadership tenure →
                </Link>
              </TerminalPanel>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 4: Activity & Audit Logs */}
      {activeTab === "activity" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-6">
            <TerminalPanel
              title="Registered Members"
              meta={`${members.length} members`}
              action={
                <Link
                  href={`/chapter/${slug}/students`}
                  className="text-[12px] font-semibold text-[var(--accent)] hover:underline"
                >
                  View directory →
                </Link>
              }
            >
              <p className="text-[12px] text-text-dim leading-relaxed mb-4">
                {members.length > 0
                  ? `${members.length} verified member profile${members.length === 1 ? "" : "s"} enrolled in ${chapter.name}.`
                  : "No students or members registered yet."}
              </p>
              <Link href={`/chapter/${slug}/students`}>
                <Button variant="secondary" size="sm" className="w-full justify-center text-xs font-semibold">
                  Open Member Directory ({members.length}) →
                </Button>
              </Link>
            </TerminalPanel>
          </div>

          <TerminalPanel
            title="Chapter Mutation Audit Trail"
            meta={`${chapterLogs.length} recent events`}
            action={
              canManage ? (
                isEditing ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-150">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDiscard}
                      disabled={isSaving}
                      className="gap-1.5 border border-border/80 text-text-dim hover:text-text cursor-pointer"
                    >
                      <X size={13} />
                      <span>Discard</span>
                    </Button>
                    <Button
                      variant="orange"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="gap-1.5 font-bold shadow-xs cursor-pointer"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={handleStartEdit}
                    className="gap-1.5 font-bold shadow-xs cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit Settings</span>
                  </Button>
                )
              ) : null
            }
          >
            {!chapterLogs.length ? (
              <p className="py-6 text-center text-[13px] text-text-mute">
                No recent activity logged for this chapter.
              </p>
            ) : (
              <ul className="divide-y divide-border/60 text-[12px]">
                {chapterLogs.map((log) => {
                  const actor = store.profiles.find((p) => p.id === log.actorId);
                  return (
                    <li key={log.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text">
                          {actor?.fullName ?? "System Actor"}
                        </span>
                        <span className="font-mono text-[11px] text-text-dim">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-text-dim">
                        <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">
                          {log.action.replaceAll("_", " ")}
                        </span>
                        {log.meta ? (
                          <span className="text-text-mute"> · {log.meta}</span>
                        ) : null}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </TerminalPanel>
        </div>
      )}
    </div>
  );
}
