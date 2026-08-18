"use client";

import { useState, useMemo, useEffect } from "react";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog } from "@/components/ui/dialog";
import { Copy, Check, Key, Play, Globe, Shield, Calendar, Trash2, CheckSquare, Square } from "lucide-react";

type ApiEndpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  category: "Events" | "Chapters" | "Projects & Labs" | "Community & Stats" | "Webhooks & Auth";
  title: string;
  description: string;
  requiresAuth: boolean;
  sampleBody?: string;
  sampleResponse: string;
};

type ApiTokenItem = {
  id: string;
  label: string;
  token: string;
  env: "production" | "staging" | "development";
  scopes: string[];
  expiresAt: string;
  createdAt: string;
  status: "active" | "revoked";
};

const AVAILABLE_SCOPES = [
  { id: "events:read", label: "Read Events & Checkpoints" },
  { id: "events:write", label: "Create / RSVP Events" },
  { id: "chapters:read", label: "Read Chapters & Leadership" },
  { id: "leads:write", label: "Submit Inquiries & Forms" },
  { id: "webhooks:revalidate", label: "Trigger ISR Cache Purge" },
  { id: "admin:full", label: "Full Administrative Access" },
];

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "get-events",
    method: "GET",
    path: "/events",
    category: "Events",
    title: "List Published Events",
    description: "Fetches all public published chapter events, hackathons, and workshops.",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        events: [
          {
            id: "evt-launch",
            slug: "campus-launch-ekctc",
            title: "Campus Launch — Eranad Knowledge City",
            category: "Workshop",
            venue: "Seminar Hall, EKCTC",
            capacity: 120,
            seatsLeft: 42,
            startsAt: "2026-08-25T09:30:00Z",
            chapter: { name: "Eranad Knowledge City", slug: "eranad-knowledge-city" }
          }
        ]
      },
      null,
      2
    ),
  },
  {
    id: "get-event-detail",
    method: "GET",
    path: "/events/campus-launch-ekctc",
    category: "Events",
    title: "Get Event Detail",
    description: "Returns deep event metadata, description, seat availability, and attendance sessions.",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        event: {
          id: "evt-launch",
          slug: "campus-launch-ekctc",
          title: "Campus Launch — EKCTC",
          category: "Workshop",
          capacity: 120,
          approvedCount: 78,
          seatsLeft: 42,
          attendanceSessions: [
            { id: "s1", name: "Session 1 — Morning Check-in", startsAt: "09:30 AM" },
            { id: "s2", name: "Session 2 — Afternoon Verification", startsAt: "02:00 PM" }
          ]
        }
      },
      null,
      2
    ),
  },
  {
    id: "post-register",
    method: "POST",
    path: "/events/campus-launch-ekctc/register",
    category: "Events",
    title: "Register for Event",
    description: "Submits a student RSVP for chapter review. Rate-limited and validated.",
    requiresAuth: true,
    sampleBody: JSON.stringify(
      {
        fullName: "Alex Rivera",
        email: "alex@college.edu.in",
        phone: "+91 98765 43210",
        college: "Eranad Knowledge City Technical Campus"
      },
      null,
      2
    ),
    sampleResponse: JSON.stringify(
      {
        ok: true,
        message: "Registration received — pending chapter approval. Check your email."
      },
      null,
      2
    ),
  },
  {
    id: "get-chapters",
    method: "GET",
    path: "/chapters",
    category: "Chapters",
    title: "List Campus Chapters",
    description: "Retrieves all verified campus chapters with student counters and college details.",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        chapters: [
          {
            id: "ch-ekc",
            name: "Eranad Knowledge City Technical Campus",
            slug: "eranad-knowledge-city",
            location: "Manjeri, Malappuram, Kerala",
            studentsCount: 214,
            leadName: "Sarhan Qadir"
          }
        ]
      },
      null,
      2
    ),
  },
  {
    id: "get-chapter-detail",
    method: "GET",
    path: "/chapters/eranad-knowledge-city",
    category: "Chapters",
    title: "Get Chapter Detail & Leadership",
    description: "Returns chapter profile, verified execom roster, faculty coordinator, and active events.",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        chapter: {
          id: "ch-ekc",
          name: "Eranad Knowledge City Technical Campus",
          slug: "eranad-knowledge-city",
          leadership: [
            { name: "Sarhan Qadir", role: "Campus Lead / Chairman" },
            { name: "Anu KS", role: "Faculty Coordinator" }
          ]
        }
      },
      null,
      2
    ),
  },
  {
    id: "get-projects",
    method: "GET",
    path: "/projects",
    category: "Projects & Labs",
    title: "List Showcase Projects",
    description: "Fetches flagship developer platforms and student open-source projects.",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        projects: [
          {
            id: "proj-vibranium",
            slug: "vibranium-event-platform",
            title: "Vibranium Event Operations OS",
            category: "Flagship Platform",
            metrics: "1,200+ Active Attendees",
            techStack: ["Next.js", "Supabase", "TailwindCSS"]
          }
        ]
      },
      null,
      2
    ),
  },
  {
    id: "get-peer-labs",
    method: "GET",
    path: "/peer-labs",
    category: "Projects & Labs",
    title: "List Peer Labs & Tracks",
    description: "Retrieves technical tracks (Cybersecurity, Java Systems, IoT Hardware, AI Engineering).",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        tracks: [
          {
            id: "lab-cyber",
            slug: "cybersec-defense-lab",
            title: "Cybersecurity & Offensive Defense Lab",
            domain: "Security",
            studentsEnrolled: 84
          }
        ]
      },
      null,
      2
    ),
  },
  {
    id: "get-stats",
    method: "GET",
    path: "/stats",
    category: "Community & Stats",
    title: "Ecosystem Statistics",
    description: "Aggregated live counters for chapters, active student developers, events hosted, and projects.",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        chaptersCount: 3,
        studentsCount: 380,
        eventsCount: 22,
        projectsCount: 6,
        certificationsCount: 195
      },
      null,
      2
    ),
  },
  {
    id: "post-college-lead",
    method: "POST",
    path: "/leads/college",
    category: "Community & Stats",
    title: "College Partnership Inquiry",
    description: "Processes official college launch requests and MOU applications.",
    requiresAuth: true,
    sampleBody: JSON.stringify(
      {
        collegeName: "Government Engineering College",
        city: "Kozhikode",
        state: "Kerala",
        contactPerson: "Dr. Ramesh Kumar",
        designation: "Head of Dept - CSE",
        email: "ramesh@geckkd.ac.in",
        phone: "+91 94471 23456",
        notes: "Interested in establishing Elevates Chapter for 2026-27"
      },
      null,
      2
    ),
    sampleResponse: JSON.stringify(
      {
        ok: true,
        message: "College inquiry submitted successfully. Elevates HQ will contact within 24 hours."
      },
      null,
      2
    ),
  },
  {
    id: "verify-cert",
    method: "GET",
    path: "/verify/certificate/CERT-EKC-2026-001",
    category: "Community & Stats",
    title: "Cryptographic Certificate Verification",
    description: "Verifies student authenticity, completed attendance terms, and issuing campus lead.",
    requiresAuth: false,
    sampleResponse: JSON.stringify(
      {
        valid: true,
        certificateNumber: "CERT-EKC-2026-001",
        recipient: "Alex Rivera",
        eventName: "Campus Launch & System Architecture",
        attendanceCompleted: "100%",
        issuedAt: "2026-08-25T17:00:00Z"
      },
      null,
      2
    ),
  },
  {
    id: "webhook-revalidate",
    method: "POST",
    path: "/api/webhooks/revalidate",
    category: "Webhooks & Auth",
    title: "On-Demand Cache Revalidation",
    description: "Purges edge ISR cache on elevates.live when content is updated in OS.",
    requiresAuth: true,
    sampleBody: JSON.stringify(
      {
        tags: ["events", "chapters", "stats"]
      },
      null,
      2
    ),
    sampleResponse: JSON.stringify(
      {
        revalidated: true,
        timestamp: "2026-08-18T12:50:00Z"
      },
      null,
      2
    ),
  },
];

export default function DeveloperPortalPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [language, setLanguage] = useState<"curl" | "typescript" | "python">("curl");
  const [dynamicOrigin, setDynamicOrigin] = useState<string>("");
  const [customOrigin, setCustomOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setDynamicOrigin(origin);
      setCustomOrigin(origin);
    }
  }, []);

  const [tokens, setTokens] = useState<ApiTokenItem[]>([
    {
      id: "tok_1",
      label: "Elevates Web Client (Production)",
      token: "76566c5f3f4667c3eaf17cd8161c532fdbf558a6671d618a45499e37089bba41",
      env: "production",
      scopes: ["events:read", "events:write", "chapters:read", "leads:write"],
      expiresAt: "Never",
      createdAt: "2026-08-18",
      status: "active",
    },
  ]);

  // Create token form state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenEnv, setTokenEnv] = useState<"production" | "staging" | "development">("production");
  const [tokenExpiry, setTokenExpiry] = useState("90");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "events:read",
    "events:write",
    "chapters:read",
    "leads:write",
  ]);
  const [createError, setCreateError] = useState("");
  const [createdSecretModal, setCreatedSecretModal] = useState<{ token: string; label: string } | null>(null);

  const [activeToken, setActiveToken] = useState<string>(tokens[0].token);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<string>("");

  function handleCreateToken() {
    if (!tokenName.trim() || tokenName.trim().length < 3) {
      setCreateError("Token name must be at least 3 characters long.");
      return;
    }
    if (selectedScopes.length === 0) {
      setCreateError("Select at least one API scope.");
      return;
    }

    setCreateError("");
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");

    let expStr = "Never";
    if (tokenExpiry !== "never") {
      const days = parseInt(tokenExpiry, 10);
      const d = new Date();
      d.setDate(d.getDate() + days);
      expStr = d.toISOString().split("T")[0];
    }

    const newItem: ApiTokenItem = {
      id: `tok_${Date.now()}`,
      label: tokenName.trim(),
      token: hex,
      env: tokenEnv,
      scopes: selectedScopes,
      expiresAt: expStr,
      createdAt: new Date().toISOString().split("T")[0],
      status: "active",
    };

    setTokens((prev) => [newItem, ...prev]);
    setActiveToken(hex);
    setCreateModalOpen(false);
    setCreatedSecretModal({ token: hex, label: newItem.label });

    // Reset form
    setTokenName("");
    setTokenExpiry("90");
    setSelectedScopes(["events:read", "events:write", "chapters:read", "leads:write"]);
  }

  function toggleScope(scopeId: string) {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  }

  function toggleTokenStatus(id: string) {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "active" ? "revoked" : "active" } : t
      )
    );
  }

  function deleteToken(id: string) {
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const effectiveBaseUrl = (customOrigin.trim() || dynamicOrigin || "https://os.elevates.live").replace(/\/$/, "");

  const snippet = useMemo(() => {
    const ep = selectedEndpoint;
    const isFullUrl = ep.path.startsWith("/api/");
    const fullUrl = isFullUrl
      ? `${effectiveBaseUrl}${ep.path}`
      : `${effectiveBaseUrl}/api/public/v1${ep.path}`;

    if (language === "curl") {
      if (ep.method === "GET") {
        return `curl -X GET "${fullUrl}" \\
  -H "Accept: application/json" \\
  -H "x-elevates-client: web" \\
  -H "x-elevates-token: ${activeToken}"`;
      }
      return `curl -X POST "${fullUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-elevates-client: web" \\
  -H "x-elevates-token: ${activeToken}" \\
  -d '${ep.sampleBody ?? "{}"}'`;
    }

    if (language === "typescript") {
      if (ep.method === "GET") {
        return `// Fetch ${ep.title}
const response = await fetch("${fullUrl}", {
  method: "GET",
  headers: {
    "Accept": "application/json",
    "x-elevates-client": "web",
    "x-elevates-token": "${activeToken}",
  },
  next: { tags: ["${ep.category.toLowerCase()}"] }, // Next.js ISR Tag
});

const data = await response.json();
console.log(data);`;
      }
      return `// Submit to ${ep.title}
const response = await fetch("${fullUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-elevates-client": "web",
    "x-elevates-token": "${activeToken}",
  },
  body: JSON.stringify(${ep.sampleBody ?? "{}"}),
});

const result = await response.json();
console.log(result);`;
    }

    if (language === "python") {
      if (ep.method === "GET") {
        return `import requests

url = "${fullUrl}"
headers = {
    "Accept": "application/json",
    "x-elevates-client": "web",
    "x-elevates-token": "${activeToken}"
}

response = requests.get(url, headers=headers)
print(response.json())`;
      }
      return `import requests

url = "${fullUrl}"
headers = {
    "Content-Type": "application/json",
    "x-elevates-client": "web",
    "x-elevates-token": "${activeToken}"
}
payload = ${ep.sampleBody ?? "{}"}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`;
    }

    return "";
  }, [selectedEndpoint, language, activeToken, effectiveBaseUrl]);

  async function testLiveEndpoint() {
    setTestStatus("loading");
    setTestResult("");
    const ep = selectedEndpoint;
    const isFullUrl = ep.path.startsWith("/api/");
    const localUrl = isFullUrl
      ? ep.path
      : `/api/public/v1${ep.path}`;

    try {
      const res = await fetch(localUrl, {
        method: ep.method,
        headers: {
          "Content-Type": "application/json",
          "x-elevates-client": "web",
          "x-elevates-token": activeToken,
        },
        body: ep.method === "POST" ? ep.sampleBody : undefined,
      });
      const data = await res.json();
      setTestStatus(res.ok ? "success" : "error");
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setTestStatus("error");
      setTestResult(JSON.stringify({ error: "Network Error", details: String(err) }, null, 2));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Elevates Developer Ecosystem"
        title="Developer API & Tokens"
        description="High-performance REST API endpoints, dynamic origin resolution, token validation with custom expiry & scopes."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="cyan">
              API v1.0.0
            </Badge>
            <Badge tone="green">
              60 req/min limit
            </Badge>
          </div>
        }
      />

      {/* DYNAMIC SERVER ORIGIN SWITCHER */}
      <TerminalPanel
        title="Server Origin & Environment"
        meta="dynamic resolution"
        accent="cyan"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Globe size={15} className="text-cyan-400" />
              Target API Server URL
            </p>
            <p className="text-xs text-text-dim">
              URLs in code snippets dynamically adapt to your domain or local port.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={customOrigin}
              onChange={(e) => setCustomOrigin(e.target.value)}
              placeholder="e.g. https://os.elevates.live or http://localhost:3001"
              className="font-mono text-xs w-full sm:w-80"
            />
            {dynamicOrigin && customOrigin !== dynamicOrigin ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomOrigin(dynamicOrigin)}
                title="Reset to current browser origin"
              >
                Auto
              </Button>
            ) : null}
          </div>
        </div>
      </TerminalPanel>

      {/* SECTION 1: API TOKEN GENERATOR & VAULT */}
      <TerminalPanel
        title="API Token Vault & Generator"
        meta="x-elevates-token"
        accent="orange"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-text-dim max-w-xl">
              Generate 256-bit cryptographic API tokens with custom expiration policies, environment tags, and fine-grained permission scopes.
            </p>
            <Button variant="orange" onClick={() => setCreateModalOpen(true)}>
              <Key size={14} className="mr-1.5" />
              Create API Key
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            {tokens.map((t) => {
              const isSelected = activeToken === t.token;
              const isRevoked = t.status === "revoked";
              return (
                <div
                  key={t.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--radius-sm)] border transition ${
                    isRevoked
                      ? "border-border bg-bg/50 opacity-60"
                      : isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-border bg-bg"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-text">{t.label}</span>
                      <Badge
                        tone={
                          t.env === "production"
                            ? "orange"
                            : t.env === "staging"
                            ? "cyan"
                            : "mute"
                        }
                      >
                        {t.env}
                      </Badge>
                      <span className="text-[11px] font-mono text-text-mute flex items-center gap-1">
                        <Calendar size={11} /> Exp: {t.expiresAt}
                      </span>
                      {isRevoked ? (
                        <Badge tone="mute">Revoked</Badge>
                      ) : isSelected ? (
                        <Badge tone="green">Selected for Snippets</Badge>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {t.scopes.map((s) => (
                        <span
                          key={s}
                          className="font-mono text-[10px] bg-bg-panel px-1.5 py-0.5 rounded border border-border text-text-dim"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <p className="font-mono text-xs text-text-dim tracking-wider select-all pt-0.5">
                      {t.token.slice(0, 16)}••••••••••••••••••••••••••••••••{t.token.slice(-8)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isRevoked ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveToken(t.token)}
                      >
                        Use
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyText(t.token, t.id)}
                      title="Copy Token"
                    >
                      {copiedKey === t.id ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTokenStatus(t.id)}
                      className={isRevoked ? "text-emerald-400" : "text-amber-400"}
                    >
                      {isRevoked ? "Activate" : "Revoke"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteToken(t.id)}
                      className="text-red-400"
                      title="Delete key"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </TerminalPanel>

      {/* CREATE API TOKEN MODAL */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New API Key"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Token Name / Application Identifier *
            </label>
            <Input
              placeholder="e.g. Elevates Web (Vercel Production), College Sync Bot"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Environment</label>
              <Select
                value={tokenEnv}
                onChange={(e) =>
                  setTokenEnv(e.target.value as "production" | "staging" | "development")
                }
              >
                <option value="production">Production</option>
                <option value="staging">Staging / Preview</option>
                <option value="development">Development</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Expiration</label>
              <Select
                value={tokenExpiry}
                onChange={(e) => setTokenExpiry(e.target.value)}
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
                <option value="never">No Expiration (Never)</option>
              </Select>
            </div>
          </div>

          {/* Scopes with Checkbox Ticks */}
          <div>
            <label className="block text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
              <Shield size={14} className="text-[var(--accent)]" />
              API Scopes & Permissions (Select all that apply)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-bg p-3 rounded-[var(--radius-sm)] border border-border">
              {AVAILABLE_SCOPES.map((sc) => {
                const checked = selectedScopes.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => toggleScope(sc.id)}
                    className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-bg-panel transition"
                  >
                    {checked ? (
                      <CheckSquare size={16} className="text-[var(--accent)]" />
                    ) : (
                      <Square size={16} className="text-text-mute" />
                    )}
                    <span className="text-xs text-text">{sc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {createError ? (
            <p className="text-xs text-red-400">{createError}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="orange" onClick={handleCreateToken}>
              Generate Key
            </Button>
          </div>
        </div>
      </Dialog>

      {/* NEW KEY CREATED SECRET POPUP */}
      <Dialog
        open={Boolean(createdSecretModal)}
        onClose={() => setCreatedSecretModal(null)}
        title="API Key Created Successfully"
      >
        <div className="space-y-3">
          <p className="text-xs text-amber-400">
            ⚠️ Copy your API key now. For security purposes, this full token will not be shown again.
          </p>
          <div className="p-3 bg-[#0d1117] rounded-[var(--radius-sm)] border border-border flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-emerald-400 break-all select-all">
              {createdSecretModal?.token}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyText(createdSecretModal?.token ?? "", "new_secret")}
            >
              {copiedKey === "new_secret" ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setCreatedSecretModal(null)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* SECTION 2: INTERACTIVE REST API EXPLORER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoints Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-text-dim px-1">
            API Endpoints Catalog
          </p>
          <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
            {API_ENDPOINTS.map((ep) => {
              const active = selectedEndpoint.id === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => {
                    setSelectedEndpoint(ep);
                    setTestStatus("idle");
                    setTestResult("");
                  }}
                  className={`w-full text-left p-3 rounded-[var(--radius-sm)] border transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-border bg-bg-panel hover:bg-bg"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ep.method === "GET"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-[10px] font-mono text-text-mute">{ep.category}</span>
                  </div>
                  <p className="font-semibold text-xs text-text truncate">{ep.title}</p>
                  <p className="font-mono text-[11px] text-text-dim truncate">{ep.path}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Endpoint Inspector & Code Playground */}
        <div className="lg:col-span-8 space-y-4">
          <TerminalPanel
            title={selectedEndpoint.title}
            meta={`${selectedEndpoint.method} · ${selectedEndpoint.path}`}
            accent="cyan"
          >
            <div className="space-y-4">
              <p className="text-sm text-text-dim">{selectedEndpoint.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border">
                <div className="flex items-center gap-2">
                  <Badge tone={selectedEndpoint.requiresAuth ? "orange" : "green"}>
                    {selectedEndpoint.requiresAuth ? "Requires API Token" : "Public Endpoint"}
                  </Badge>
                  <span className="text-xs font-mono text-text-mute">
                    Rate Limit: 60 req/min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-dim">Language:</span>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "curl" | "typescript" | "python")}
                    className="w-32 text-xs py-1"
                  >
                    <option value="curl">cURL</option>
                    <option value="typescript">TypeScript (Fetch)</option>
                    <option value="python">Python (Requests)</option>
                  </Select>
                </div>
              </div>

              {/* Code Snippet */}
              <div className="relative rounded-[var(--radius-sm)] bg-[#0d1117] border border-border p-4">
                <button
                  onClick={() => copyText(snippet, "snippet")}
                  className="absolute top-3 right-3 p-1.5 rounded hover:bg-white/10 text-text-dim transition"
                  title="Copy snippet"
                >
                  {copiedKey === "snippet" ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
                <pre className="font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {snippet}
                </pre>
              </div>

              {/* Request Payload (if POST) */}
              {selectedEndpoint.sampleBody ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-mono uppercase text-text-dim">Request Body Schema</p>
                  <pre className="font-mono text-xs text-amber-300 bg-bg p-3 rounded-[var(--radius-sm)] border border-border overflow-x-auto">
                    {selectedEndpoint.sampleBody}
                  </pre>
                </div>
              ) : null}

              {/* Live Playground & Tester */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border">
                <Button
                  variant="primary"
                  onClick={testLiveEndpoint}
                  disabled={testStatus === "loading"}
                >
                  <Play size={14} className="mr-1.5" />
                  {testStatus === "loading" ? "Executing..." : "Execute Test Call"}
                </Button>
                {testStatus === "success" ? (
                  <Badge tone="green">Status: 200 OK</Badge>
                ) : testStatus === "error" ? (
                  <Badge tone="orange">Response Received</Badge>
                ) : null}
              </div>

              {/* Live Output */}
              {testResult ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-mono uppercase text-text-dim">Live Server Output</p>
                  <pre className="font-mono text-xs text-cyan-300 bg-[#0d1117] p-3 rounded-[var(--radius-sm)] border border-border overflow-x-auto max-h-64">
                    {testResult}
                  </pre>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs font-mono uppercase text-text-dim">Sample Response</p>
                  <pre className="font-mono text-xs text-text-mute bg-bg p-3 rounded-[var(--radius-sm)] border border-border overflow-x-auto max-h-48">
                    {selectedEndpoint.sampleResponse}
                  </pre>
                </div>
              )}
            </div>
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}
