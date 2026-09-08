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
import { ProgressBar } from "@/components/ui/progress";
import { useStore, useCurrentUser } from "@/context/store-context";
import { calculateChapterActivityScore } from "@/lib/analytics";
import { activityLabel, hasPermission, isHqRole } from "@/lib/permissions";
import { chapterEyebrow, isExecutiveRole, isFacultyRole } from "@/lib/access";
import { formatDate } from "@/lib/utils";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import type { Chapter } from "@/types";
import { ChapterInviteCodeManager } from "@/components/chapter/chapter-invite-code-manager";
import { ChapterDepartmentManager } from "@/components/chapter/chapter-department-manager";
import { ChapterLocationPicker } from "@/components/chapter/chapter-location-picker";
import { ChapterCitySelect } from "@/components/chapter/chapter-city-select";

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
  const termIds = new Set(
    store.leadershipTerms
      .filter((t) => t.chapterId === ch.id)
      .map((t) => t.id),
  );
  const executives = store.leadershipAssignments.filter((a) =>
    termIds.has(a.termId),
  );
  const clusters = store.clusters.filter((c) => c.chapterId === ch.id);
  const facultyCandidates = store.profiles.filter(
    (p) =>
      p.chapterId === ch.id ||
      store.userRoles.some(
        (ur) => ur.userId === p.id && ur.roleId === "r-faculty",
      ),
  );
  const faculty = store.profiles.find((p) => p.id === ch.facultyId);
  const activeTerm = store.leadershipTerms.find(
    (t) => t.chapterId === ch.id && t.status === "active",
  );

  const checklist = [
    {
      label: "Faculty assigned",
      done: Boolean(chapter.facultyId),
      href: undefined as string | undefined,
    },
    {
      label: "Active leadership term",
      done: Boolean(activeTerm),
      href: `/chapter/${slug}/leadership`,
    },
    {
      label: "At least one cluster",
      done: clusters.length > 0,
      href: `/chapter/${slug}/clusters`,
    },
    {
      label: "Students onboarded",
      done: members.length >= 3,
      href: `/chapter/${slug}/students`,
    },
    {
      label: "Chapter status active",
      done: ch.status === "active",
      href: undefined,
    },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;

  function saveField(
    patch: Partial<
      Pick<
        Chapter,
        | "name"
        | "slug"
        | "college"
        | "city"
        | "district"
        | "state"
        | "status"
        | "facultyId"
        | "notes"
        | "healthScore"
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

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Members" value={members.length} />
        <Stat label="Executives" value={executives.length} />
        <Stat label="Clusters" value={clusters.length} />
        <Stat
          label="Activity score"
          value={`${calculateChapterActivityScore(store, chapter.id)}%`}
          hint={activityLabel(calculateChapterActivityScore(store, chapter.id))}
        />
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
              <div>
                <FieldLabel>Faculty coordinator</FieldLabel>
                <Select
                  value={chapter.facultyId ?? ""}
                  disabled={!canManage}
                  onChange={(e) =>
                    saveField({
                      facultyId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  {facultyCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </Select>
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
            <dl className="mt-4 grid gap-2 text-[12px] text-text-dim sm:grid-cols-2">
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <dt>Founded</dt>
                <dd className="font-medium text-text">
                  {formatDate(chapter.foundedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <dt>Faculty</dt>
                <dd className="font-medium text-text">
                  {faculty?.fullName ?? "—"}
                </dd>
              </div>
            </dl>
          </TerminalPanel>

          <TerminalPanel title="Activity Score">
            <ProgressBar
              value={calculateChapterActivityScore(store, chapter.id)}
              label={activityLabel(calculateChapterActivityScore(store, chapter.id))}
            />
            {canManage && isHqRole(session.roleKey) ? (
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <FieldLabel>Override score (HQ)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={chapter.healthScore}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n) && n !== chapter.healthScore) {
                        saveField({
                          healthScore: Math.min(100, Math.max(0, n)),
                        });
                      }
                    }}
                  />
                </div>
              </div>
            ) : null}
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel
            title="Onboarding checklist"
            meta={`${checklistDone}/${checklist.length}`}
          >
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        item.done
                          ? "text-[var(--success)]"
                          : "text-text-mute"
                      }
                    >
                      {item.done ? "✓" : "○"}
                    </span>
                    {item.label}
                  </span>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Open
                    </Link>
                  ) : (
                    <Badge tone={item.done ? "green" : "orange"}>
                      {item.done ? "done" : "todo"}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
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
