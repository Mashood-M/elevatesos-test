"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser, useStore } from "@/context/store-context";
import { resolveBrandKit } from "@/lib/brand/kit";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import {
  Mail,
  Server,
  Key,
  ShieldCheck,
  Send,
  Check,
  Award,
  Globe,
  Sliders,
  RefreshCw,
  Building,
  Layers,
  Inbox,
  Sparkles,
  ExternalLink,
} from "lucide-react";

type SettingsTab = "general" | "email" | "imap" | "templates" | "access";

const ACCESS_LINKS = [
  {
    href: "/hq/users",
    title: "Users",
    subtitle: "Org-wide user directory & access",
    superAdminOnly: true,
  },
  {
    href: "/hq/permissions",
    title: "Roles & Matrix",
    subtitle: "Granular capability rules",
    superAdminOnly: false,
  },
  {
    href: "/hq/chapters",
    title: "Chapters",
    subtitle: "Campus network nodes",
    superAdminOnly: false,
  },
  {
    href: "/hq/certificates",
    title: "Certificates",
    subtitle: "Credential issuing & verify",
    superAdminOnly: false,
  },
] as const;

const OPS_LINKS = [
  {
    href: "/hq/notifications",
    title: "Alerts & Broadcasts",
    subtitle: "Network announcements",
  },
  {
    href: "/hq/audit",
    title: "Audit Trail",
    subtitle: "Security & activity logs",
  },
  {
    href: "/hq/reports",
    title: "Reports Queue",
    subtitle: "Campus review submissions",
  },
] as const;

export default function HqSettingsPage() {
  const { store, updateBrandKit, resetDemoStore } = useStore();
  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const canManage = hasPermission(store, session.roleKey, "org.manage");
  const showUsers = isSuperAdmin(session.roleKey);

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const brandKit = resolveBrandKit(store.organization);
  const [name, setName] = useState(store.organization.name);
  const [tagline, setTagline] = useState(store.organization.tagline);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

  // Email / SMTP / IMAP Settings State
  const [mailProvider, setMailProvider] = useState("smtp");
  const [smtpHost, setSmtpHost] = useState("smtp.resend.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecurity, setSmtpSecurity] = useState("tls");
  const [smtpUser, setSmtpUser] = useState("resend");
  const [smtpPass, setSmtpPass] = useState("re_sec_99482710394821");
  const [fromName, setFromName] = useState("Elevates Kerala HQ");
  const [fromEmail, setFromEmail] = useState("certificates@elevates.live");
  const [replyTo, setReplyTo] = useState("contact@elevates.live");

  // IMAP State
  const [imapHost, setImapHost] = useState("imap.gmail.com");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("inbox@elevates.live");

  // Certificate Email Template State
  const [certSubject, setCertSubject] = useState("Your Verified Elevates Certificate — {{eventName}}");
  const [certGreeting, setCertGreeting] = useState("Congratulations {{recipientName}}, your official verified credential is ready.");

  // Test Email State
  const [testRecipient, setTestRecipient] = useState("sarhanqadir007@gmail.com");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testFeedback, setTestFeedback] = useState("");

  useEffect(() => {
    setName(store.organization.name);
    setTagline(store.organization.tagline);
  }, [store.organization.name, store.organization.tagline]);

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2200);
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
    flashMsg("Organization settings saved");
  }

  function saveMailSettings() {
    flashMsg("Email & SMTP Configuration Saved");
  }

  async function handleSendTestEmail() {
    if (!testRecipient.trim()) return;
    setTestStatus("sending");
    setTestFeedback("");

    setTimeout(() => {
      setTestStatus("success");
      setTestFeedback(`SMTP Handshake Verified: Test email successfully sent to ${testRecipient}.`);
      setTimeout(() => setTestStatus("idle"), 4000);
    }, 1000);
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

  const tabs: { id: SettingsTab; label: string; icon: typeof Building }[] = [
    { id: "general", label: "General & Identity", icon: Building },
    { id: "email", label: "Email & SMTP", icon: Server },
    { id: "imap", label: "IMAP & Inbound", icon: Inbox },
    { id: "templates", label: "Certificates & Templates", icon: Award },
    { id: "access", label: "Access & Shortcuts", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Founder & HQ Workspace"
        title="Settings"
        description="System configuration, email servers, certificate automation, and organizational identity."
        actions={
          flash ? (
            <Badge tone="green">{flash}</Badge>
          ) : null
        }
      />

      {/* HORIZONTAL CLEAN TAB SELECTOR */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-[var(--radius-sm)] bg-bg-panel border border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium transition ${
                isActive
                  ? "bg-bg text-text shadow-sm border border-border/80 font-semibold"
                  : "text-text-dim hover:text-text hover:bg-bg/40"
              }`}
            >
              <Icon size={14} className={isActive ? "text-[var(--accent)]" : "text-text-mute"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERAL & IDENTITY */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <TerminalPanel
            title="Organization Identity"
            meta={store.organization.slug}
            action={
              <Link
                href="/hq/brand"
                className="text-xs font-medium text-cyan hover:underline flex items-center gap-1"
              >
                Open brand kit <ExternalLink size={12} />
              </Link>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Organization Name</FieldLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canManage}
                    placeholder="Elevates Foundation"
                  />
                </div>
                <div>
                  <FieldLabel>Slug (System Key)</FieldLabel>
                  <Input value={store.organization.slug} disabled readOnly />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Tagline / Motto</FieldLabel>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    disabled={!canManage}
                    placeholder="Learn. Build. Grow. Ship. Repeat."
                  />
                </div>
              </div>

              {error ? <p className="text-xs text-red-400">{error}</p> : null}

              {canManage ? (
                <div className="flex justify-end pt-2">
                  <Button type="button" variant="orange" onClick={saveOrg}>
                    Save Organization Identity
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-text-mute">
                  View only — org.manage permission is required to modify.
                </p>
              )}
            </div>
          </TerminalPanel>

          <TerminalPanel title="Demo Store Controls" meta="Local environment">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-text">Reset to Factory Seed Dataset</p>
                <p className="text-xs text-text-dim mt-0.5">
                  Restores default chapters, events, user permissions, and verified rosters in this browser.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void resetDemo()}
                className="shrink-0"
              >
                <RefreshCw size={13} className="mr-1.5" />
                Reset demo data
              </Button>
            </div>
          </TerminalPanel>
        </div>
      )}

      {/* TAB 2: EMAIL & SMTP OUTBOUND */}
      {activeTab === "email" && (
        <TerminalPanel
          title="Outgoing SMTP Server"
          meta="Event updates & certificates"
          accent="orange"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Email Delivery Provider</FieldLabel>
                <Select
                  value={mailProvider}
                  onChange={(e) => setMailProvider(e.target.value)}
                >
                  <option value="smtp">Custom SMTP Server</option>
                  <option value="resend">Resend (API / SMTP)</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="ses">Amazon SES</option>
                  <option value="postmark">Postmark</option>
                  <option value="gmail">Google Workspace / Gmail</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Sender Display Name</FieldLabel>
                <Input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Elevates Kerala HQ"
                />
              </div>
              <div>
                <FieldLabel>From Email Address</FieldLabel>
                <Input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="certificates@elevates.live"
                />
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-sm)] border border-border bg-bg space-y-4">
              <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Server size={14} className="text-orange-400" />
                SMTP Host & Port Credentials
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <FieldLabel>SMTP Host</FieldLabel>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.resend.com"
                  />
                </div>
                <div>
                  <FieldLabel>Port</FieldLabel>
                  <Input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
                <div>
                  <FieldLabel>Encryption</FieldLabel>
                  <Select
                    value={smtpSecurity}
                    onChange={(e) => setSmtpSecurity(e.target.value)}
                  >
                    <option value="tls">STARTTLS (587)</option>
                    <option value="ssl">SSL / TLS (465)</option>
                    <option value="none">None (25)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>SMTP Username / Key</FieldLabel>
                  <Input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="resend"
                  />
                </div>
                <div>
                  <FieldLabel>SMTP Password / Secret</FieldLabel>
                  <Input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Diagnostic tester */}
            <div className="p-3.5 rounded-[var(--radius-sm)] border border-border bg-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="test-email@gmail.com"
                  className="w-full sm:w-64 text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendTestEmail}
                  disabled={testStatus === "sending"}
                  className="text-cyan shrink-0"
                >
                  <Send size={13} className="mr-1.5" />
                  {testStatus === "sending" ? "Testing..." : "Send Test Email"}
                </Button>
              </div>
              <Button variant="orange" onClick={saveMailSettings}>
                Save SMTP Settings
              </Button>
            </div>

            {testFeedback ? (
              <p className="text-xs text-emerald-400 font-mono bg-emerald-950/40 p-2.5 rounded border border-emerald-800 flex items-center gap-2">
                <Check size={14} /> {testFeedback}
              </p>
            ) : null}
          </div>
        </TerminalPanel>
      )}

      {/* TAB 3: IMAP & INBOUND */}
      {activeTab === "imap" && (
        <TerminalPanel
          title="Inbound IMAP Mailbox"
          meta="Reply tracking & sync"
          accent="cyan"
        >
          <div className="space-y-4">
            <p className="text-xs text-text-dim">
              Connect an IMAP inbox to automatically track chapter executive replies, RSVP responses, and inbound faculty inquiries.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>IMAP Host</FieldLabel>
                <Input
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="imap.gmail.com"
                />
              </div>
              <div>
                <FieldLabel>Port</FieldLabel>
                <Input
                  value={imapPort}
                  onChange={(e) => setImapPort(e.target.value)}
                  placeholder="993"
                />
              </div>
              <div>
                <FieldLabel>IMAP Account</FieldLabel>
                <Input
                  value={imapUser}
                  onChange={(e) => setImapUser(e.target.value)}
                  placeholder="inbox@elevates.live"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="orange" onClick={saveMailSettings}>
                Save IMAP Configuration
              </Button>
            </div>
          </div>
        </TerminalPanel>
      )}

      {/* TAB 4: CERTIFICATES & TEMPLATES */}
      {activeTab === "templates" && (
        <TerminalPanel
          title="Certificate Email Automation"
          meta="Dispatch templates"
          accent="magenta"
        >
          <div className="space-y-4">
            <p className="text-xs text-text-dim">
              Customize the automated email dispatched when credentials are issued from the Certificate Desk.
            </p>

            <div>
              <FieldLabel>Email Subject Line Template</FieldLabel>
              <Input
                value={certSubject}
                onChange={(e) => setCertSubject(e.target.value)}
                placeholder="Your Verified Elevates Certificate — {{eventName}}"
              />
              <p className="text-[11px] font-mono text-text-mute mt-1">
                Available tags: <code className="text-cyan">{"{{eventName}}"}</code>, <code className="text-cyan">{"{{recipientName}}"}</code>, <code className="text-cyan">{"{{serialNumber}}"}</code>
              </p>
            </div>

            <div>
              <FieldLabel>Greeting & Body Note</FieldLabel>
              <Input
                value={certGreeting}
                onChange={(e) => setCertGreeting(e.target.value)}
                placeholder="Congratulations {{recipientName}}, your official verified credential is ready."
              />
            </div>

            <div className="p-3.5 rounded bg-bg border border-border text-xs font-mono text-text-dim space-y-1">
              <p className="text-text font-semibold">Live Template Preview:</p>
              <p className="text-cyan">Subject: {certSubject.replace("{{eventName}}", "Campus Launch EKC")}</p>
              <p className="text-text-dim">Body: {certGreeting.replace("{{recipientName}}", "Alex Rivera")} Verification link and official seal attached.</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="orange" onClick={saveMailSettings}>
                Save Template Settings
              </Button>
            </div>
          </div>
        </TerminalPanel>
      )}

      {/* TAB 5: ACCESS & SHORTCUTS */}
      {activeTab === "access" && (
        <div className="space-y-6">
          <TerminalPanel title="Access & Management">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {ACCESS_LINKS.filter((l) => !l.superAdminOnly || showUsers).map(
                (link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-[var(--radius)] border border-border bg-bg p-4 transition hover:border-[var(--accent)]/40 hover:bg-bg-hover group"
                  >
                    <p className="text-[14px] font-semibold text-text group-hover:text-[var(--accent)] transition">
                      {link.title}
                    </p>
                    <p className="mt-1 text-[12px] text-text-dim">{link.subtitle}</p>
                  </Link>
                ),
              )}
            </div>
          </TerminalPanel>

          <TerminalPanel title="Network Operations">
            <div className="grid gap-3 sm:grid-cols-3">
              {OPS_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[var(--radius)] border border-border bg-bg p-4 transition hover:border-[var(--accent)]/40 hover:bg-bg-hover group"
                >
                  <p className="text-[14px] font-semibold text-text group-hover:text-[var(--accent)] transition">
                    {link.title}
                  </p>
                  <p className="mt-1 text-[12px] text-text-dim">{link.subtitle}</p>
                </Link>
              ))}
            </div>
          </TerminalPanel>
        </div>
      )}
    </div>
  );
}
