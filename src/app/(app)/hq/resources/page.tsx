"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";
import type { Resource } from "@/types";

const categoryLabels: Record<Resource["category"], string> = {
  sop: "SOP",
  workshop_kit: "Workshop Kit",
  ppt: "Presentation",
  poster: "Poster",
  logo: "Logo Pack",
  certificate: "Certificate",
  sponsor_deck: "Sponsor Deck",
  coding: "Coding",
  recording: "Recording",
};

const categoryTone: Record<Resource["category"], "cyan" | "magenta" | "green" | "orange"> = {
  sop: "cyan",
  workshop_kit: "green",
  ppt: "magenta",
  poster: "orange",
  logo: "magenta",
  certificate: "green",
  sponsor_deck: "orange",
  coding: "cyan",
  recording: "orange",
};

export default function HqResourcesPage() {
  const { store } = useStore();
  const byCategory = store.resources.reduce<Record<string, Resource[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Resource Library"
        description="Central HQ asset repository — SOPs, workshop kits, brand packs, and certificate templates for all chapters."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total Assets" value={store.resources.length} accent="cyan" />
        <Stat label="Categories" value={Object.keys(byCategory).length} accent="magenta" />
        <Stat label="Latest Upload" value={formatDateTime(store.resources[0]?.uploadedAt ?? new Date().toISOString())} accent="green" />
      </div>

      <div className="mt-6 space-y-6">
        {Object.entries(byCategory).map(([category, items]) => (
          <TerminalPanel
            key={category}
            title={`category.${category}`}
            meta={`${items.length} files`}
            accent={categoryTone[category as Resource["category"]] ?? "cyan"}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((res) => {
                const uploader = store.profiles.find((p) => p.id === res.uploadedBy);
                return (
                  <article key={res.id} className="border border-border bg-bg p-4 transition hover:border-cyan">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-[family-name:var(--font-display)] font-bold">{res.title}</h3>
                      <Badge tone={categoryTone[res.category]}>{categoryLabels[res.category]}</Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-text-dim">{res.description}</p>
                    <p className="mt-3 text-[10px] text-text-mute">
                      Uploaded by {uploader?.fullName} · {formatDateTime(res.uploadedAt)}
                    </p>
                    <Button variant="ghost" className="mt-3 w-full">
                      Download Asset
                    </Button>
                  </article>
                );
              })}
            </div>
          </TerminalPanel>
        ))}
      </div>
    </div>
  );
}
