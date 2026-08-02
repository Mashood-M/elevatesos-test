"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { resolveBrandKit } from "@/lib/brand/kit";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";

const ACCESS_LINKS = [
  {
    href: "/hq/users",
    title: "Users",
    subtitle: "Org-wide user management",
    superAdminOnly: true,
  },
  {
    href: "/hq/permissions",
    title: "Roles",
    subtitle: "Permission matrix",
    superAdminOnly: false,
  },
  {
    href: "/hq/chapters",
    title: "Chapters",
    subtitle: "Campus network",
    superAdminOnly: false,
  },
] as const;

const OPS_LINKS = [
  {
    href: "/hq/notifications",
    title: "Alerts",
    subtitle: "Inbox & network broadcasts",
  },
  {
    href: "/hq/audit",
    title: "Audit",
    subtitle: "Activity trail",
  },
  {
    href: "/hq/reports",
    title: "Reports",
    subtitle: "HQ review queue",
  },
] as const;

export default function HqSettingsPage() {
  const { store, updateBrandKit, resetDemoStore } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const canManage = hasPermission(store, session.roleKey, "org.manage");
  const showUsers = isSuperAdmin(session.roleKey);

  const brandKit = resolveBrandKit(store.organization);
  const [name, setName] = useState(store.organization.name);
  const [tagline, setTagline] = useState(store.organization.tagline);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(store.organization.name);
    setTagline(store.organization.tagline);
  }, [store.organization.name, store.organization.tagline]);

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1800);
  }

  function saveOrg() {
    setError("");
    if (!canManage) {
      setError("You need org.manage to edit organization settings.");
      return;
    }
    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }
    const ok = updateBrandKit({
      name,
      tagline,
      brandKit,
    });
    if (!ok) {
      setError("Could not save organization.");
      return;
    }
    flashMsg("Organization saved");
  }

  async function resetDemo() {
    const ok = await confirm({
      title: "Reset demo data",
      description:
        "This replaces the local demo store with the seed dataset. Unsaved edits will be lost.",
      confirmLabel: "Reset demo",
      danger: true,
    });
    if (!ok) return;
    resetDemoStore();
    flashMsg("Demo data reset");
  }

  return (
    <div>
      <PageHeader
        eyebrow="More"
        title="Settings"
        description="System-wide organization controls — identity, access shortcuts, network ops, and demo reset."
        actions={
          flash ? (
            <span className="text-[12px] text-[var(--accent)]">{flash}</span>
          ) : null
        }
      />

      <TerminalPanel
        title="Organization"
        meta={store.organization.slug}
        action={
          <Link
            href="/hq/brand"
            className="text-[12px] font-medium text-[var(--secondary)] hover:underline"
          >
            Open brand kit
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              placeholder="Organization name"
            />
          </div>
          <div>
            <FieldLabel>Slug</FieldLabel>
            <Input value={store.organization.slug} disabled readOnly />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Tagline</FieldLabel>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              disabled={!canManage}
              placeholder="Short tagline"
            />
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-[12px] text-[var(--danger)]">{error}</p>
        ) : null}
        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={saveOrg}>
              Save organization
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-text-mute">
            View only — org.manage required to edit.
          </p>
        )}
      </TerminalPanel>

      <TerminalPanel title="Access & people" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {ACCESS_LINKS.filter((l) => !l.superAdminOnly || showUsers).map(
            (link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius)] border border-border bg-bg p-4 transition hover:border-[var(--accent)]/40 hover:bg-bg-hover"
              >
                <p className="text-[14px] font-semibold text-text">
                  {link.title}
                </p>
                <p className="mt-1 text-[12px] text-text-dim">{link.subtitle}</p>
              </Link>
            ),
          )}
        </div>
      </TerminalPanel>

      <TerminalPanel title="Network ops" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {OPS_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius)] border border-border bg-bg p-4 transition hover:border-[var(--accent)]/40 hover:bg-bg-hover"
            >
              <p className="text-[14px] font-semibold text-text">{link.title}</p>
              <p className="mt-1 text-[12px] text-text-dim">{link.subtitle}</p>
            </Link>
          ))}
        </div>
      </TerminalPanel>

      <TerminalPanel
        title="Demo"
        meta="Local demo store"
        className="mt-4"
      >
        <p className="text-[13px] text-text-dim">
          Reset restores the seeded Elevates HQ dataset in this browser
          (chapters, users, events, guidelines, notifications).
        </p>
        <Button
          type="button"
          variant="danger"
          className="mt-4"
          onClick={() => void resetDemo()}
        >
          Reset demo data
        </Button>
      </TerminalPanel>
    </div>
  );
}
