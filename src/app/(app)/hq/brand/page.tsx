"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/context/store-context";

export default function HqBrandPage() {
  const { store } = useStore();
  const brandResources = store.resources.filter((r) =>
    ["logo", "poster", "certificate", "sponsor_deck"].includes(r.category),
  );

  return (
    <div>
      <PageHeader
        title="Brand assets"
        description="Logo packs, color system, typography, and templates for chapters."
      />

      <TerminalPanel title="Identity">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex min-h-[160px] items-center justify-center rounded-[var(--radius)] border border-border bg-bg px-6 text-center">
            <div>
              <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[-0.03em]">
                Elevates
              </p>
              <p className="mt-2 text-[13px] text-text-mute">
                Learn. Build. Grow. Ship. Repeat.
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold">Color system</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { name: "Accent", hex: "#f26430", cls: "bg-[var(--accent)]" },
                { name: "Charcoal", hex: "#2d2d34", cls: "bg-[var(--charcoal-900)]" },
                { name: "Sage", hex: "#758173", cls: "bg-[var(--success)]" },
                { name: "Indigo", hex: "#414066", cls: "bg-[var(--secondary)]" },
              ].map((c) => (
                <div
                  key={c.hex}
                  className="rounded-[var(--radius-sm)] border border-border p-3"
                >
                  <div className={`h-8 rounded-[var(--radius-sm)] ${c.cls}`} />
                  <p className="mt-2 text-[12px] font-semibold">{c.name}</p>
                  <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                    {c.hex}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-text-dim">
              Cool zinc canvas · Syne + IBM Plex · orange ≤10% of surface
            </p>
          </div>
        </div>
      </TerminalPanel>

      <TerminalPanel title="Typography" className="mt-4">
        <div className="space-y-5">
          <div>
            <p className="text-[12px] text-text-mute">Display</p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em]">
              Learn. Build. Grow. Ship.
            </p>
          </div>
          <div>
            <p className="text-[12px] text-text-mute">Body / UI</p>
            <p className="text-[14px] text-text-dim">
              IBM Plex Sans for product UI. Sentence case. No serif display.
            </p>
          </div>
          <div>
            <p className="text-[12px] text-text-mute">Mono</p>
            <p className="font-[family-name:var(--font-mono)] text-[12px] text-text-dim">
              IBM Plex Mono for ticket IDs, timestamps, and tabular stats.
            </p>
          </div>
        </div>
      </TerminalPanel>

      <TerminalPanel
        title="Downloads"
        meta={`${brandResources.length} files`}
        className="mt-4"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {brandResources.map((res) => (
            <article
              key={res.id}
              className="rounded-[var(--radius)] border border-border p-4"
            >
              <Badge tone="mute">{res.category.replaceAll("_", " ")}</Badge>
              <h3 className="mt-2 text-[14px] font-bold tracking-[-0.01em]">
                {res.title}
              </h3>
              <p className="mt-1 text-[12px] text-text-dim">{res.description}</p>
              <Button variant="ghost" className="mt-3 w-full">
                Download
              </Button>
            </article>
          ))}
        </div>
      </TerminalPanel>
    </div>
  );
}
