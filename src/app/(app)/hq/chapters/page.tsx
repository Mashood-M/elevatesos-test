"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
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

export default function HqChaptersPage() {
  const { store, createChapter } = useStore();
  const [draft, setDraft] = useState<DraftChapter>({
    name: "",
    slug: "",
    college: "",
    city: "",
    status: "onboarding",
  });
  const [flash, setFlash] = useState("");

  const totalMembers = store.chapters.reduce((s, c) => s + c.memberCount, 0);

  function handleCreate() {
    if (!draft.name || !draft.college) {
      setFlash("Name and college are required.");
      return;
    }
    const slug =
      draft.slug || draft.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (store.chapters.some((c) => c.slug === slug)) {
      setFlash("That slug is already taken.");
      return;
    }
    const chapter = createChapter({ ...draft, slug });
    setDraft({ name: "", slug: "", college: "", city: "", status: "onboarding" });
    setFlash(`Created ${chapter.name}. It appears on the HQ dashboard.`);
  }

  return (
    <div>
      <PageHeader
        title="Chapter management"
        description="Spin up chapters, monitor health scores, and track onboarding across the Elevates network."
        actions={
          <Link href="/hq">
            <Button variant="ghost">Back to HQ</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Active chapters"
          value={store.chapters.filter((c) => c.status === "active").length}
        />
        <Stat label="Total members" value={totalMembers} />
        <Stat
          label="Onboarding"
          value={store.chapters.filter((c) => c.status === "onboarding").length}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <TerminalPanel title="Registry" meta={`${store.chapters.length} chapters`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-border text-[11px] text-text-mute">
                  <th className="pb-2 pr-4">Chapter</th>
                  <th className="pb-2 pr-4">College</th>
                  <th className="pb-2 pr-4">City</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Health</th>
                  <th className="pb-2 pr-4">Members</th>
                  <th className="pb-2">Founded</th>
                </tr>
              </thead>
              <tbody>
                {store.chapters.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-bg-hover">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/chapter/${c.slug}/settings`}
                        className="font-bold text-[var(--accent)] hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="text-[10px] text-text-mute">
                        /{c.slug} ·{" "}
                        <Link
                          href={`/chapter/${c.slug}`}
                          className="hover:underline"
                        >
                          dashboard
                        </Link>
                      </p>
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
                    <td className="py-3 pr-4">{c.memberCount}</td>
                    <td className="py-3">{formatDate(c.foundedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TerminalPanel>

        <TerminalPanel title="Create chapter">
          <p className="mb-4 text-[12px] text-text-dim">
            Adds the chapter to the demo store (persists for this browser tab).
          </p>
          <div className="space-y-3">
            <div>
              <FieldLabel>Chapter name</FieldLabel>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="NIT Calicut Chapter"
              />
            </div>
            <div>
              <FieldLabel>Slug</FieldLabel>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                placeholder="nit-calicut"
              />
            </div>
            <div>
              <FieldLabel>College</FieldLabel>
              <Input
                value={draft.college}
                onChange={(e) => setDraft((d) => ({ ...d, college: e.target.value }))}
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
              <p className="text-[12px] text-[var(--accent)]">{flash}</p>
            ) : null}
            <Button variant="orange" className="w-full" onClick={handleCreate}>
              Create chapter
            </Button>
          </div>
        </TerminalPanel>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {store.chapters.map((c) => (
          <Link
            key={c.id}
            href={`/chapter/${c.slug}/settings`}
            className="rounded-[var(--radius)] border border-border bg-bg-panel p-4 transition hover:border-[var(--border-strong)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
                {c.name}
              </h3>
              <Badge tone={c.healthScore >= 90 ? "green" : "cyan"}>
                {c.healthScore}%
              </Badge>
            </div>
            <p className="mt-1 text-[12px] text-text-dim">
              {c.college} · {c.city}
            </p>
            <div className="mt-3">
              <ProgressBar
                value={c.healthScore}
                label={healthLabel(c.healthScore)}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
