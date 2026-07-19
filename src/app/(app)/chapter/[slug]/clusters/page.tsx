"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";

export default function ChapterClustersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, createCluster } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [flash, setFlash] = useState("");

  if (!chapter) return <p className="text-[var(--accent)]">Chapter not found</p>;

  const clusters = store.clusters.filter((c) => c.chapterId === chapter.id);
  const role = store.session.roleKey;
  const canCreate =
    hasPermission(store, role, "chapter.manage") ||
    role === "elevates_coordinator" ||
    role === "secretary" ||
    role === "faculty_coordinator" ||
    role === "founder" ||
    role === "hq_admin";
  const members = store.profiles.filter((p) => p.chapterId === chapter.id);

  function handleCreate() {
    if (!name.trim()) {
      setFlash("Name is required.");
      return;
    }
    const nextSlug =
      slugInput.trim() ||
      name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    if (clusters.some((c) => c.slug === nextSlug)) {
      setFlash("That slug already exists in this chapter.");
      return;
    }
    const cluster = createCluster({
      chapterId: chapter!.id,
      name: name.trim(),
      slug: nextSlug,
      description: description.trim() || "New learning cluster.",
      leaderId: leaderId || undefined,
    });
    setName("");
    setSlugInput("");
    setDescription("");
    setLeaderId("");
    setOpen(false);
    setFlash(`Created ${cluster.name}.`);
  }

  return (
    <div>
      <PageHeader
        title="Learning clusters"
        description="Specialized tracks with weekly roadmaps — AI, Web, IoT, Cyber, and more."
        actions={
          canCreate ? (
            <Button variant="orange" onClick={() => setOpen((v) => !v)}>
              {open ? "Cancel" : "Create cluster"}
            </Button>
          ) : null
        }
      />

      {flash ? (
        <p className="mb-4 text-[13px] text-[var(--accent)]">{flash}</p>
      ) : null}

      {open ? (
        <TerminalPanel title="New cluster" className="mb-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product Design"
              />
            </div>
            <div>
              <FieldLabel>Slug</FieldLabel>
              <Input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="product-design"
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <TextArea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this track focuses on."
              />
            </div>
            <div>
              <FieldLabel>Cluster lead (optional)</FieldLabel>
              <Select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="primary" className="w-full" onClick={handleCreate}>
                Create cluster
              </Button>
            </div>
          </div>
        </TerminalPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clusters.map((cluster) => {
          const leader = store.profiles.find((p) => p.id === cluster.leaderId);
          const faculty = store.profiles.find((p) => p.id === cluster.facultyId);
          const doneWeeks = cluster.roadmap.filter((r) => r.done).length;
          const progress = cluster.roadmap.length
            ? (doneWeeks / cluster.roadmap.length) * 100
            : 0;

          return (
            <TerminalPanel
              key={cluster.id}
              title={cluster.slug}
              meta={`${cluster.memberIds.length} members`}
              action={
                <Link
                  href={`/chapter/${slug}/clusters/${cluster.id}`}
                  className="text-[12px] font-medium text-[var(--accent)] hover:underline"
                >
                  Manage →
                </Link>
              }
            >
              <Link href={`/chapter/${slug}/clusters/${cluster.id}`}>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold hover:text-[var(--accent)]">
                {cluster.name}
              </h3>
              </Link>
              <p className="mt-2 text-[12px] text-text-dim">
                {cluster.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                {leader ? (
                  <Badge tone="magenta">Lead: {leader.fullName}</Badge>
                ) : null}
                {faculty ? (
                  <Badge tone="green">Faculty: {faculty.fullName}</Badge>
                ) : null}
              </div>

              {cluster.roadmap.length > 0 ? (
                <div className="mt-4">
                  <ProgressBar value={progress} label="Roadmap progress" />
                  <ul className="mt-3 space-y-2">
                    {cluster.roadmap.map((week) => (
                      <li
                        key={week.week}
                        className={`flex items-center gap-2 text-[11px] ${
                          week.done ? "text-[var(--success)]" : "text-text-dim"
                        }`}
                      >
                        <span>{week.done ? "✓" : "○"}</span>
                        W{week.week}: {week.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-[11px] text-text-mute">
                  Roadmap not defined yet
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-1">
                {cluster.memberIds.map((id) => {
                  const m = store.profiles.find((p) => p.id === id);
                  return m ? (
                    <Link
                      key={id}
                      href={`/profile/${id}`}
                      className="text-[10px] text-[var(--accent)] hover:underline"
                    >
                      {m.fullName.split(" ")[0]}
                    </Link>
                  ) : null;
                })}
              </div>
            </TerminalPanel>
          );
        })}
      </div>
    </div>
  );
}
