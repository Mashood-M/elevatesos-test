"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { chapterEyebrow, isExecutiveRole, isFacultyRole } from "@/lib/access";
import { formatDate } from "@/lib/utils";
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

  function saveField(
    patch: Partial<
      Pick<
        Chapter,
        | "name"
        | "slug"
        | "shortCode"
        | "college"
        | "city"
        | "district"
        | "state"
        | "status"
        | "facultyId"
        | "campusLeadId"
        | "notes"
        | "coordinates"
        | "latitude"
        | "longitude"
        | "location"
        | "mapUrl"
      >
    >,
  ) {
    if (!canManage) return;
    updateChapter(ch.id, patch);
    setFlash("Saved.");
    window.setTimeout(() => setFlash(""), 1600);
    if (patch.slug && patch.slug !== slug) {
      router.replace(`/chapter/${patch.slug}/settings`);
    }
  }

  function focusCampusLead() {
    const el = document.getElementById("campus-lead-picker");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  function focusFaculty() {
    const el = document.getElementById("faculty-coordinator-picker");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
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
          ? () => saveField({ status: "active" })
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
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Chapter management"
        description={`${chapter.name} · college profile, faculty, onboarding, and shortcuts.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/calendar`}>
              <Button variant="ghost">Calendar</Button>
            </Link>
            <Link href={`/chapter/${slug}/students`}>
              <Button variant="ghost">Students</Button>
            </Link>
            <Link href={`/chapter/${slug}`}>
              <Button variant="ghost">Dashboard</Button>
            </Link>
            {isHqRole(session.roleKey) ? (
              <Link href="/hq/chapters">
                <Button variant="ghost">All chapters</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {flash ? (
        <p className="mb-4 text-[13px] text-[var(--accent)]">{flash}</p>
      ) : null}



      {canManage ? (
        <div className="mb-6 space-y-6">
          <ChapterInviteCodeManager
            chapterId={chapter.id}
            chapterSlug={chapter.slug}
          />
          <ChapterDepartmentManager chapterId={chapter.id} />
        </div>
      ) : null}

      {!canManage ? (
        <p className="mb-4 text-[13px] text-text-dim">
          View only — switch to Campus Lead, Secretary, Faculty liaison, or HQ to edit.
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Members" value={members.length} />
        <Stat label="Executives" value={executives.length} />
        <Stat label="Clusters" value={clusters.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <TerminalPanel title="Chapter & Campus profile">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Chapter name</FieldLabel>
                <Input
                  defaultValue={chapter.name}
                  disabled={!canManage}
                  onBlur={(e) => {
                    if (e.target.value !== chapter.name) {
                      saveField({ name: e.target.value, college: e.target.value });
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>
                    <span>Shortcode (3 letters)</span>
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                      Invite prefix
                    </span>
                  </FieldLabel>
                  <Input
                    key={`shortCode-${chapter.shortCode || ""}`}
                    defaultValue={chapter.shortCode || deriveChapterShortCode(chapter.name)}
                    maxLength={4}
                    disabled={!canManage}
                    placeholder="e.g. SOS"
                    className="font-mono font-bold uppercase tracking-wider"
                    onBlur={(e) => {
                      const clean = e.target.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
                      e.target.value = clean;
                      if (clean && clean !== chapter.shortCode) {
                        saveField({ shortCode: clean });
                      }
                    }}
                  />
                </div>
                <div>
                  <FieldLabel>Slug</FieldLabel>
                  <Input
                    defaultValue={chapter.slug}
                    disabled={!canManage || !isHqRole(session.roleKey)}
                    onChange={(e) => {
                      e.target.value = formatSlugInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const finalSlug = finalizeSlug(e.target.value);
                      e.target.value = finalSlug;
                      if (
                        isHqRole(session.roleKey) &&
                        finalSlug !== chapter.slug
                      ) {
                        saveField({ slug: finalSlug });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <ChapterCitySelect
                  city={chapter.city}
                  district={chapter.district}
                  state={chapter.state}
                  disabled={!canManage}
                  onChange={(sel) => {
                    if (canManage) {
                      saveField({
                        city: sel.city,
                        district: sel.district,
                        state: sel.state,
                      });
                    }
                  }}
                  onCoordinatesSuggest={(coords) => {
                    if (canManage && !chapter.coordinates) {
                      saveField({
                        coordinates: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                        latitude: coords.lat,
                        longitude: coords.lng,
                      });
                    }
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <ChapterLocationPicker
                  value={{
                    coordinates: chapter.coordinates,
                    latitude: chapter.latitude,
                    longitude: chapter.longitude,
                    location: chapter.location,
                    mapUrl: chapter.mapUrl,
                  }}
                  onChange={(locVal) => {
                    if (canManage) {
                      saveField({
                        coordinates: locVal.coordinates,
                        latitude: locVal.latitude,
                        longitude: locVal.longitude,
                        location: locVal.location,
                        mapUrl: locVal.mapUrl,
                      });
                    }
                  }}
                  onCityChange={(city, district, state) => {
                    if (canManage) {
                      saveField({
                        city,
                        ...(district ? { district } : {}),
                        ...(state ? { state } : {}),
                      });
                    }
                  }}
                />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={chapter.status}
                  disabled={!canManage}
                  onChange={(e) =>
                    saveField({
                      status: e.target.value as Chapter["status"],
                    })
                  }
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>

              <div className="hidden md:block" />

              <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
                <ChapterUserSearchPicker
                  id="campus-lead-picker"
                  label="Campus Lead"
                  selectedUserId={currentCampusLeadId}
                  disabled={!canManage}
                  chapterId={ch.id}
                  profiles={chapterMemberCandidates}
                  placeholder="Unassigned — Search Campus Lead"
                  helperText="Search by name, unique ID (ELV-...), or email to assign Campus Lead."
                  onSelect={(userId) => {
                    saveField({ campusLeadId: userId });
                  }}
                />

                <ChapterUserSearchPicker
                  id="faculty-coordinator-picker"
                  label="Faculty coordinator"
                  selectedUserId={ch.facultyId}
                  disabled={!canManage}
                  chapterId={ch.id}
                  profiles={chapterMemberCandidates}
                  placeholder="Unassigned — Search Faculty coordinator"
                  helperText="Search by name, unique ID (ELV-...), or email to assign Faculty coordinator."
                  onSelect={(userId) => {
                    saveField({ facultyId: userId });
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Internal notes</FieldLabel>
                <TextArea
                  rows={3}
                  defaultValue={chapter.notes ?? ""}
                  disabled={!canManage}
                  placeholder="HQ / Campus Lead notes for this chapter"
                  onBlur={(e) => {
                    if (e.target.value !== (chapter.notes ?? "")) {
                      saveField({ notes: e.target.value });
                    }
                  }}
                />
              </div>
            </div>
            <dl className="mt-4 grid gap-2 text-[12px] text-text-dim sm:grid-cols-3">
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <dt>Founded</dt>
                <dd className="font-medium text-text">
                  {formatDate(chapter.foundedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <dt>Campus Lead</dt>
                <dd className="font-medium text-text truncate">
                  {campusLead?.fullName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <dt>Faculty</dt>
                <dd className="font-medium text-text truncate">
                  {faculty?.fullName ?? "—"}
                </dd>
              </div>
            </dl>
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel
            title="Onboarding checklist"
            meta={
              checklistDone === checklist.length
                ? `${checklistDone}/${checklist.length} · Ready`
                : `${checklistDone}/${checklist.length}`
            }
          >
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-bg-card/40 p-2.5 text-[12px] transition-colors hover:border-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        item.done
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-text-mute"
                      }`}
                    >
                      {item.done ? "✓" : "○"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight text-text truncate">
                        {item.label}
                      </p>
                      {item.detail ? (
                        <p className="text-[11px] text-text-dim truncate">
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
                        className="text-[11px] font-semibold text-[var(--accent)] hover:underline disabled:opacity-50"
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
              <div className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
                <p className="text-[12px] font-medium text-text">
                  Prerequisites complete! Chapter is ready to be launched.
                </p>
                <Button
                  variant="orange"
                  size="sm"
                  className="mt-2 w-full justify-center"
                  onClick={() => saveField({ status: "active" })}
                >
                  Activate chapter now
                </Button>
              </div>
            ) : null}

            {isChapterActive && checklistDone === checklist.length ? (
              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-center">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Chapter is active & ready for events and registrations
                </p>
              </div>
            ) : null}
          </TerminalPanel>

          <TerminalPanel title="Manage this chapter">
            <ul className="space-y-2 text-[13px]">
              {[
                { href: `/chapter/${slug}/leadership`, label: "Leadership cycle" },
                { href: `/chapter/${slug}/students`, label: "Students & members" },
                { href: `/chapter/${slug}/events`, label: "Events" },
                { href: `/chapter/${slug}/clusters`, label: "Clusters" },
                { href: `/chapter/${slug}/projects`, label: "Projects" },
                { href: `/chapter/${slug}/reports`, label: "Reports" },
                { href: `/chapter/${slug}/analytics`, label: "Analytics" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-medium text-text hover:text-[var(--accent)]"
                  >
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </TerminalPanel>

          <TerminalPanel
            title="Chapter Members"
            meta={`${members.length} registered`}
            action={
              <Link
                href={`/chapter/${slug}/students`}
                className="text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                Full Roster →
              </Link>
            }
          >
            <p className="text-[12px] text-text-dim leading-relaxed mb-3">
              {members.length > 0
                ? `${members.length} verified Supabase user profile${members.length === 1 ? "" : "s"} linked to this chapter.`
                : "No members or students registered yet in this chapter."}
            </p>
            <Link href={`/chapter/${slug}/students`}>
              <Button variant="secondary" size="sm" className="w-full justify-center text-xs">
                Open Member Roster & Database ({members.length}) →
              </Button>
            </Link>
          </TerminalPanel>

          {(isExecutiveRole(session.roleKey) ||
            isFacultyRole(session.roleKey) ||
            isHqRole(session.roleKey)) &&
          activeTerm ? (
            <TerminalPanel title="Active term" meta={activeTerm.academicYear}>
              <p className="text-[13px] font-semibold">{activeTerm.title}</p>
              <p className="mt-1 text-[12px] text-text-dim">
                {formatDate(activeTerm.startDate)} –{" "}
                {formatDate(activeTerm.endDate)}
              </p>
              <Link
                href={`/chapter/${slug}/leadership`}
                className="mt-3 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                Edit leadership →
              </Link>
            </TerminalPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
