"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { useStore } from "@/context/store-context";
import { calculateChapterActivityScore } from "@/lib/analytics";
import { healthLabel } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import { ChapterLocationPicker } from "@/components/chapter/chapter-location-picker";
import { ChapterCitySelect } from "@/components/chapter/chapter-city-select";

type DraftChapter = {
  name: string;
  slug: string;
  city: string;
  district?: string;
  state?: string;
  status: "active" | "inactive" | "onboarding";
  coordinates?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
};

type StatusFilter = "all" | DraftChapter["status"];

const emptyDraft = (): DraftChapter => ({
  name: "",
  slug: "",
  city: "",
  district: "",
  state: "Kerala",
  status: "onboarding",
  coordinates: "",
  latitude: undefined,
  longitude: undefined,
  location: "",
});

function slugify(name: string) {
  return finalizeSlug(name);
}

export default function HqChaptersPage() {
  const router = useRouter();
  const { store, createChapter, deleteChapter } = useStore();
  const [draft, setDraft] = useState<DraftChapter>(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [flash, setFlash] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  function memberCountFor(chapterId: string) {
    return store.profiles.filter((p) => p.chapterId === chapterId).length;
  }

  const totalMembers = store.profiles.filter((p) => p.chapterId).length;
  const activeCount = store.chapters.filter((c) => c.status === "active").length;
  const onboardingCount = store.chapters.filter(
    (c) => c.status === "onboarding",
  ).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.chapters.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.college.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.district && c.district.toLowerCase().includes(q)) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        c.slug.toLowerCase().includes(q)
      );
    });
  }, [store.chapters, query, statusFilter]);

  function openCreate() {
    setDraft(emptyDraft());
    setSlugTouched(false);
    setFlash("");
    setCreateOpen(true);
  }

  function handleCreate() {
    const name = draft.name.trim();
    const city = draft.city.trim();
    if (!name || !city) {
      setFlash("Chapter name and city are required.");
      return;
    }
    const coords =
      draft.coordinates?.trim() ||
      (draft.latitude != null && draft.longitude != null
        ? `${draft.latitude}, ${draft.longitude}`
        : "");
    const loc = draft.location?.trim() || "";
    if (!coords && !loc) {
      setFlash("Please select a location on the map or type coordinates.");
      return;
    }
    const slug = finalizeSlug(draft.slug || name);
    if (!slug) {
      setFlash("Slug is required.");
      return;
    }
    if (store.chapters.some((c) => c.slug === slug)) {
      setFlash("That slug is already taken.");
      return;
    }
    const chapter = createChapter({
      name,
      slug,
      college: name, // Chapter name and college name are the same
      city,
      district: draft.district,
      state: draft.state,
      status: draft.status,
      coordinates: coords || undefined,
      latitude: draft.latitude,
      longitude: draft.longitude,
      location: loc || undefined,
    });
    setCreateOpen(false);
    setDraft(emptyDraft());
    setFlash("");
    router.push(`/chapter/${chapter.slug}/settings`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Chapter management"
        description="Spin up chapters, monitor activity scores, and track onboarding across the Elevates network."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="orange" onClick={openCreate}>
              New chapter
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active chapters" value={activeCount} />
        <Stat label="Total members" value={totalMembers} />
        <Stat label="Onboarding" value={onboardingCount} />
      </div>

      <TerminalPanel
        title="Registry"
        meta={`${filtered.length} of ${store.chapters.length} chapters`}
        className="mt-6"
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-text-mute">Search</span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, college, city, slug…"
            />
          </label>
          <label className="flex min-w-[160px] flex-col gap-1.5">
            <span className="text-[11px] font-medium text-text-mute">Status</span>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="inactive">Inactive</option>
            </Select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-dim">
              {store.chapters.length === 0
                ? "No chapters yet. Create the first campus chapter."
                : "No chapters match this search or filter."}
            </p>
            <Button variant="orange" className="mt-4" onClick={openCreate}>
              New chapter
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-border text-[11px] text-text-mute">
                  <th className="pb-2 pr-4">Chapter</th>
                  <th className="pb-2 pr-4">Coordinates / Map</th>
                  <th className="pb-2 pr-4">City</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Activity Score</th>
                  <th className="pb-2 pr-4">Members</th>
                  <th className="pb-2 pr-4">Founded</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const members = memberCountFor(c.id);
                  const score = calculateChapterActivityScore(store, c.id);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/60 hover:bg-bg-hover"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/chapter/${c.slug}/settings`}
                          className="font-bold text-[var(--accent)] hover:underline"
                        >
                          {c.name}
                        </Link>
                        <p className="text-[10px] text-text-mute">/{c.slug}</p>
                      </td>
                      <td className="py-3 pr-4 text-text-dim">
                        {c.coordinates ? (
                          <a
                            href={
                              c.mapUrl ||
                              `https://www.google.com/maps?q=${c.coordinates}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                          >
                            📍 {c.coordinates}
                          </a>
                        ) : c.location ? (
                          <span className="text-[11px] text-text-dim">
                            📍 {c.location}
                          </span>
                        ) : (
                          <span className="text-text-mute text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-text-dim">
                        <div className="font-medium text-text">{c.city}</div>
                        {c.district || c.state ? (
                          <div className="text-[11px] text-text-mute">
                            {[c.district, c.state].filter(Boolean).join(", ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          tone={
                            c.status === "active"
                              ? "green"
                              : c.status === "onboarding"
                                ? "orange"
                                : "mute"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {score}% · {healthLabel(score)}
                      </td>
                      <td className="py-3 pr-4">{members}</td>
                      <td className="py-3 pr-4">{formatDate(c.foundedAt)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <Link
                            href={`/chapter/${c.slug}/settings`}
                            className="font-medium text-[var(--accent)] hover:underline"
                          >
                            Settings
                          </Link>
                          <Link
                            href={`/chapter/${c.slug}`}
                            className="font-medium text-text-dim hover:text-[var(--accent)]"
                          >
                            Dashboard
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            className="font-medium text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TerminalPanel>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New chapter"
        description="Adds a campus chapter to the network. Continues to chapter settings."
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Chapter name</FieldLabel>
            <Input
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value;
                setDraft((d) => ({
                  ...d,
                  name,
                  slug: slugTouched ? d.slug : slugify(name),
                }));
              }}
              placeholder="NIT Calicut Chapter"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Slug</FieldLabel>
            <Input
              value={draft.slug}
              onChange={(e) => {
                const sanitized = formatSlugInput(e.target.value);
                setSlugTouched(sanitized.length > 0);
                setDraft((d) => ({ ...d, slug: sanitized }));
              }}
              onBlur={() => {
                setDraft((d) => ({ ...d, slug: finalizeSlug(d.slug) }));
              }}
              placeholder="nit-calicut"
            />
          </div>
          <ChapterCitySelect
            city={draft.city}
            district={draft.district}
            state={draft.state}
            onChange={(sel) => {
              setDraft((d) => ({
                ...d,
                city: sel.city,
                district: sel.district,
                state: sel.state,
                coordinates:
                  sel.lat != null && sel.lng != null && !d.coordinates
                    ? `${sel.lat.toFixed(6)}, ${sel.lng.toFixed(6)}`
                    : d.coordinates,
                latitude:
                  sel.lat != null && d.latitude == null ? sel.lat : d.latitude,
                longitude:
                  sel.lng != null && d.longitude == null ? sel.lng : d.longitude,
                location:
                  d.location ||
                  (sel.district ? `${sel.city}, ${sel.district}` : sel.city),
              }));
            }}
            onCoordinatesSuggest={(coords) => {
              setDraft((d) => ({
                ...d,
                coordinates:
                  d.coordinates ||
                  `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                latitude: d.latitude ?? coords.lat,
                longitude: d.longitude ?? coords.lng,
              }));
            }}
          />

          <ChapterLocationPicker
            value={{
              coordinates: draft.coordinates,
              latitude: draft.latitude,
              longitude: draft.longitude,
              location: draft.location,
            }}
            onChange={(locVal) => {
              setDraft((d) => ({
                ...d,
                coordinates: locVal.coordinates,
                latitude: locVal.latitude,
                longitude: locVal.longitude,
                location: locVal.location,
              }));
            }}
            onCityChange={(city, district, state) => {
              setDraft((d) => ({
                ...d,
                city,
                ...(district ? { district } : {}),
                ...(state ? { state } : {}),
              }));
            }}
          />

          <div>
            <FieldLabel>Initial status</FieldLabel>
            <Select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as DraftChapter["status"],
                }))
              }
            >
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          {flash ? (
            <p className="text-[13px] text-[var(--accent)]">{flash}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="orange" onClick={handleCreate}>
              Create chapter
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete chapter"
        description={`Are you sure you want to permanently delete chapter "${deleteTarget?.name}"? All associated settings will be removed.`}
      >
        <div className="space-y-4">
          <p className="text-xs text-red-400">
            Warning: This action is permanent and will delete the chapter from the Elevates OS network and database.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="orange"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) {
                  deleteChapter(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete chapter
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
