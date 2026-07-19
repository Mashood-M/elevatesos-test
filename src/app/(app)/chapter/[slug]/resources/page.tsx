"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";
import type { Resource } from "@/types";

const categoryLabels: Record<Resource["category"], string> = {
  sop: "SOP",
  workshop_kit: "Workshop Kit",
  ppt: "Presentation",
  poster: "Poster",
  logo: "Logo",
  certificate: "Certificate",
  sponsor_deck: "Sponsor Deck",
  coding: "Coding",
  recording: "Recording",
};

export default function ChapterResourcesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const chapter = store.chapters.find((c) => c.slug === slug);

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  return (
    <div>
      <PageHeader
        title="HQ Resource Access"
        description="Download SOPs, workshop kits, brand assets, and certificate templates from the central library."
      />

      <TerminalPanel title="hq.library" meta={`${store.resources.length} assets available`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {store.resources.map((res) => {
            const uploader = store.profiles.find((p) => p.id === res.uploadedBy);
            return (
              <article key={res.id} className="border border-border p-4 hover:border-cyan">
                <Badge tone="cyan">{categoryLabels[res.category]}</Badge>
                <h3 className="mt-2 font-bold">{res.title}</h3>
                <p className="mt-1 text-[11px] text-text-dim">{res.description}</p>
                <p className="mt-2 text-[10px] text-text-mute">
                  {uploader?.fullName} · {formatDateTime(res.uploadedAt)}
                </p>
                <Button variant="ghost" className="mt-3 w-full">Download</Button>
              </article>
            );
          })}
        </div>
      </TerminalPanel>
    </div>
  );
}
