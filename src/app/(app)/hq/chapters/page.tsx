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
import { healthLabel } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

type DraftChapter = {
  name: string;
  slug: string;
  college: string;
  city: string;
  status: "active" | "inactive" | "onboarding";
};

type StatusFilter = "all" | DraftChapter["status"];

const emptyDraft = (): DraftChapter => ({
  name: "",
  slug: "",
  college: "",
  city: "",
  status: "onboarding",
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function HqChaptersPage() {
  const router = useRouter();
  const { store, createChapter } = useStore();
  const [draft, setDraft] = useState<DraftChapter>(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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
    const college = draft.college.trim();
    const city = draft.city.trim();
    if (!name || !college || !city) {
      setFlash("Name, college, and city are required.");
      return;
    }
    const slug = (draft.slug.trim() || slugify(name)).replace(/^-+|-+$/g, "");
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
      college,
      city,
      status: draft.status,
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
        description="Spin up chapters, monitor health scores, and track onboarding across the Elevates network."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="orange" onClick={openCreate}>
              New chapter
            </Button>
            <Link href="/hq">
              <Button variant="ghost">Back to HQ</Button>
            </Link>
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
                  <th className="pb-2 pr-4">College</th>
                  <th className="pb-2 pr-4">City</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Health</th>
                  <th className="pb-2 pr-4">Members</th>
                  <th className="pb-2 pr-4">Founded</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const members = memberCountFor(c.id);
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
                      <td className="py-3 pr-4 text-text-dim">{c.college}</td>
                      <td className="py-3 pr-4 text-text-dim">{c.city}</td>
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
                        {c.healthScore}% · {healthLabel(c.healthScore)}
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
      >
        <div className="space-y-3">
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
                setSlugTouched(true);
                setDraft((d) => ({ ...d, slug: e.target.value }));
              }}
              placeholder="nit-calicut"
            />
          </div>
          <div>
            <FieldLabel>College</FieldLabel>
            <Input
              value={draft.college}
              onChange={(e) =>
                setDraft((d) => ({ ...d, college: e.target.value }))
              }
              placeholder="National Institute of Technology"
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Calicut"
            />
          </div>
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
    </div>
  );
}
