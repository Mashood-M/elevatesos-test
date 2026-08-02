"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  BRAND_COLOR_KEYS,
  BRAND_COLOR_LABELS,
  normalizeHex,
  resolveBrandKit,
  type BrandColorKey,
} from "@/lib/brand/kit";
import { hasPermission } from "@/lib/permissions";
import { resourceCategoryLabel } from "@/lib/resources/categories";
import { cn } from "@/lib/utils";
import type { BrandKit } from "@/types";

const BRAND_CATEGORIES = ["logo", "poster", "certificate", "sponsor_deck"] as const;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type Draft = {
  name: string;
  tagline: string;
  brandKit: BrandKit;
};

export default function HqBrandPage() {
  const { store, updateBrandKit } = useStore();
  const { session } = useCurrentUser();
  const canUpload = hasPermission(store, session.roleKey, "resource.upload");
  const canEdit = hasPermission(store, session.roleKey, "org.manage");

  const brandKit = resolveBrandKit(store.organization);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: store.organization.name,
    tagline: store.organization.tagline,
    brandKit,
  }));
  const [copied, setCopied] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    setDraft({
      name: store.organization.name,
      tagline: store.organization.tagline,
      brandKit: resolveBrandKit(store.organization),
    });
  }, [
    editing,
    store.organization.name,
    store.organization.tagline,
    store.organization.brandKit,
  ]);

  const brandResources = store.resources
    .filter((r) =>
      (BRAND_CATEGORIES as readonly string[]).includes(r.category),
    )
    .slice()
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const viewName = store.organization.name;
  const viewTagline = store.organization.tagline;
  const viewKit = brandKit;
  const displayName = editing ? draft.name : viewName;
  const displayTagline = editing ? draft.tagline : viewTagline;
  const displayKit = editing ? draft.brandKit : viewKit;

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      /* ignore */
    }
  }

  function startEdit() {
    setDraft({
      name: store.organization.name,
      tagline: store.organization.tagline,
      brandKit: resolveBrandKit(store.organization),
    });
    setEditing(true);
    setFlash(null);
  }

  function cancelEdit() {
    setEditing(false);
    setFlash(null);
  }

  function setColor(key: BrandColorKey, value: string) {
    setDraft((d) => ({
      ...d,
      brandKit: {
        ...d.brandKit,
        colors: {
          ...d.brandKit.colors,
          [key]: value,
        },
      },
    }));
  }

  function commitColor(key: BrandColorKey, value: string) {
    setColor(key, normalizeHex(value, viewKit.colors[key]));
  }

  async function onLogoFile(file: File | null) {
    if (!file) return;
    try {
      const url = await readFileAsDataUrl(file);
      if (!url) return;
      setDraft((d) => ({
        ...d,
        brandKit: { ...d.brandKit, logoUrl: url },
      }));
    } catch {
      setFlash("Could not read that file.");
    }
  }

  function save() {
    const ok = updateBrandKit({
      name: draft.name,
      tagline: draft.tagline,
      brandKit: {
        logoUrl: draft.brandKit.logoUrl.trim() || viewKit.logoUrl,
        colors: {
          accent: normalizeHex(draft.brandKit.colors.accent, viewKit.colors.accent),
          charcoal: normalizeHex(
            draft.brandKit.colors.charcoal,
            viewKit.colors.charcoal,
          ),
          sage: normalizeHex(draft.brandKit.colors.sage, viewKit.colors.sage),
          indigo: normalizeHex(
            draft.brandKit.colors.indigo,
            viewKit.colors.indigo,
          ),
        },
      },
    });
    if (!ok) {
      setFlash("Could not save. Check name and permissions.");
      return;
    }
    setEditing(false);
    setFlash("Brand kit saved.");
    window.setTimeout(() => setFlash(null), 2000);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Brand assets"
        description="Logo, color system, typography, and templates for chapters."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {copied ? (
              <span className="text-[12px] text-[var(--accent)]">
                Copied {copied}
              </span>
            ) : null}
            {flash ? (
              <span className="text-[12px] text-[var(--accent)]">{flash}</span>
            ) : null}
            {canEdit && !editing ? (
              <Button type="button" variant="orange" onClick={startEdit}>
                Edit brand
              </Button>
            ) : null}
            {canEdit && editing ? (
              <>
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={save}>
                  Save
                </Button>
              </>
            ) : null}
            {canUpload ? (
              <Link href="/hq/resources">
                <Button type="button" variant="ghost">
                  Manage library
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <TerminalPanel title="Identity" meta={editing ? "Editing" : undefined}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[var(--radius)] bg-bg px-6 py-8 text-center shadow-[var(--shadow-sm)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URLs + local SVG */}
            <img
              src={displayKit.logoUrl}
              alt={`${displayName || "Organization"} mark`}
              className="h-auto w-full max-w-[280px]"
            />
            {!editing ? (
              <>
                <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.02em] text-text">
                  {displayName}
                </p>
                <p className="mt-1 text-[13px] text-text-mute">
                  {displayTagline}
                </p>
              </>
            ) : (
              <div className="mt-4 w-full max-w-sm space-y-3 text-left">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    placeholder="Organization name"
                  />
                </div>
                <div>
                  <FieldLabel>Tagline</FieldLabel>
                  <Input
                    value={draft.tagline}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, tagline: e.target.value }))
                    }
                    placeholder="Short tagline"
                  />
                </div>
                <div>
                  <FieldLabel>Logo URL</FieldLabel>
                  <Input
                    value={draft.brandKit.logoUrl}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        brandKit: {
                          ...d.brandKit,
                          logoUrl: e.target.value,
                        },
                      }))
                    }
                    placeholder="/elevates-mark.svg"
                  />
                </div>
                <div>
                  <FieldLabel>Or upload logo</FieldLabel>
                  <input
                    type="file"
                    accept="image/*,.svg"
                    className="block w-full text-[12px] text-text-dim file:mr-3 file:rounded-full file:border-0 file:bg-[var(--charcoal-900)] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
                    onChange={(e) =>
                      void onLogoFile(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-text">Color system</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {BRAND_COLOR_KEYS.map((key) => {
                const hex = displayKit.colors[key];
                const label = BRAND_COLOR_LABELS[key];
                if (editing) {
                  return (
                    <div
                      key={key}
                      className="rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]"
                    >
                      <div
                        className="h-8 rounded-[10px]"
                        style={{ backgroundColor: hex }}
                      />
                      <p className="mt-2 text-[12px] font-semibold text-text">
                        {label}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHex(hex, viewKit.colors[key])}
                          onChange={(e) => setColor(key, e.target.value)}
                          className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                          aria-label={`${label} color picker`}
                        />
                        <Input
                          value={hex}
                          onChange={(e) => setColor(key, e.target.value)}
                          onBlur={(e) => commitColor(key, e.target.value)}
                          className="h-9 font-[family-name:var(--font-mono)] text-[11px]"
                          aria-label={`${label} hex`}
                        />
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void copyHex(hex)}
                    title={`Copy ${hex}`}
                    className={cn(
                      "rounded-[14px] bg-bg p-3 text-left shadow-[var(--shadow-sm)] transition hover:ring-2 hover:ring-[var(--accent-soft)]",
                      copied === hex && "ring-2 ring-[var(--accent)]",
                    )}
                  >
                    <div
                      className="h-8 rounded-[10px]"
                      style={{ backgroundColor: hex }}
                    />
                    <p className="mt-2 text-[12px] font-semibold text-text">
                      {label}
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      {hex}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[13px] text-text-dim">
              Kit colors for chapter materials — does not restyle the product
              UI. Cool zinc canvas · Plus Jakarta Sans for UI and headlines ·
              accent ≤10% of surface.
            </p>
          </div>
        </div>
      </TerminalPanel>

      <TerminalPanel title="Typography" className="mt-4">
        <div className="space-y-5">
          <div>
            <p className="text-[12px] text-text-mute">Display</p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.03em] text-text">
              Learn. Build. Grow. Ship.
            </p>
          </div>
          <div>
            <p className="text-[12px] text-text-mute">Body / UI</p>
            <p className="text-[14px] text-text-dim">
              Plus Jakarta Sans for headings and product UI. Sentence case.
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

      <TerminalPanel title="Usage" className="mt-4" meta="Quick rules">
        <ul className="space-y-2 text-[13px] text-text-dim">
          <li>
            Keep clear space around the mark — at least the height of the
            orange square.
          </li>
          <li>
            Use accent sparingly (≤10% of a layout); charcoal for type.
          </li>
          <li>
            Prefer sentence case in product UI; display type for hero lines
            only.
          </li>
          <li>
            Do not stretch, recolor, or add drop shadows to the official mark.
          </li>
        </ul>
      </TerminalPanel>

      <TerminalPanel
        title="Downloads"
        meta={`${brandResources.length} files`}
        className="mt-4"
        action={
          canUpload ? (
            <Link
              href="/hq/resources"
              className="text-[12px] font-medium text-[var(--secondary)] hover:underline"
            >
              Upload in Resources
            </Link>
          ) : null
        }
      >
        {!brandResources.length ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-mute">
              No brand files yet. Upload logo, poster, certificate, or sponsor
              deck assets in the resource library.
            </p>
            <Link href="/hq/resources" className="mt-3 inline-block">
              <Button type="button" variant="orange">
                Go to Resources
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {brandResources.map((res) => (
              <article
                key={res.id}
                className="rounded-[var(--radius)] border border-border bg-bg p-4"
              >
                <Badge tone="mute">
                  {resourceCategoryLabel(
                    store.resourceCategories,
                    res.category,
                  )}
                </Badge>
                <h3 className="mt-2 text-[14px] font-bold tracking-[-0.01em] text-text">
                  {res.title}
                </h3>
                <p className="mt-1 text-[12px] text-text-dim">
                  {res.description}
                </p>
                {res.url && res.url !== "#" ? (
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={
                      res.url.startsWith("data:") || res.url.startsWith("/")
                        ? res.title
                        : undefined
                    }
                    className="mt-3 block"
                  >
                    <Button type="button" variant="ghost" className="w-full">
                      Download
                    </Button>
                  </a>
                ) : (
                  <p className="mt-3 text-[11px] text-text-mute">
                    No file linked
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </TerminalPanel>
    </div>
  );
}
