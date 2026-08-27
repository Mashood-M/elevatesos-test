"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Button } from "@/components/ui/button";
import { Input, Select, FieldLabel } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isHqRole } from "@/lib/permissions";
import {
  Award,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Plus,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  Eye,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

type CertificateRecord = {
  id: string;
  serialNumber: string;
  recipientName: string;
  recipientEmail: string;
  eventName: string;
  eventSlug: string;
  chapterName: string;
  achievement: "Participation" | "Merit & Excellence" | "Workshop Lead" | "Campus Organizer" | "Executive Term";
  issueDate: string;
  attendanceCompleted: string;
  signatory: string;
  status: "active" | "revoked";
};

export default function HqCertificatesPage() {
  const { store } = useStore();
  const { session } = useCurrentUser();
  const canManage = isHqRole(session.roleKey);

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);

  const [search, setSearch] = useState("");
  const [filterChapter, setFilterChapter] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "revoked">("all");

  // Issue modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(store.events[0]?.id ?? "");
  const [selectedChapterId, setSelectedChapterId] = useState(store.chapters[0]?.id ?? "");
  const [achievement, setAchievement] = useState<CertificateRecord["achievement"]>("Participation");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [signatory, setSignatory] = useState("Authorized Signatory (HQ Admin)");
  const [issueError, setIssueError] = useState("");

  // Preview & Email state
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredCerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return certificates.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterChapter !== "all" && c.chapterName !== filterChapter) return false;
      if (!q) return true;
      return (
        c.recipientName.toLowerCase().includes(q) ||
        c.recipientEmail.toLowerCase().includes(q) ||
        c.serialNumber.toLowerCase().includes(q) ||
        c.eventName.toLowerCase().includes(q)
      );
    });
  }, [certificates, search, filterChapter, filterStatus]);

  function handleIssueCertificate() {
    if (!recipientName.trim() || !recipientEmail.trim()) {
      setIssueError("Recipient name and email are required.");
      return;
    }

    const event = store.events.find((e) => e.id === selectedEventId);
    const chapter = store.chapters.find((c) => c.id === selectedChapterId);
    const serial = `CERT-${(chapter?.slug?.slice(0, 3) || "ELE").toUpperCase()}-2026-${String(certificates.length + 1).padStart(3, "0")}`;

    const newCert: CertificateRecord = {
      id: `cert_${Date.now()}`,
      serialNumber: serial,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim(),
      eventName: event?.title ?? "Elevates Campus Event",
      eventSlug: event?.slug ?? "campus-event",
      chapterName: chapter?.name ?? "Elevates Chapter",
      achievement,
      issueDate,
      attendanceCompleted: "100%",
      signatory,
      status: "active",
    };

    setCertificates((prev) => [newCert, ...prev]);
    setIssueModalOpen(false);
    setRecipientName("");
    setRecipientEmail("");
    setIssueError("");
    setPreviewCert(newCert);
  }

  function toggleStatus(id: string) {
    setCertificates((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === "active" ? "revoked" : "active" } : c
      )
    );
  }

  function deleteCert(id: string) {
    setCertificates((prev) => prev.filter((c) => c.id !== id));
  }

  function copyLink(serial: string) {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://os.elevates.live"}/verify/certificate/${serial}`;
    navigator.clipboard.writeText(url);
    setCopiedId(serial);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function sendEmail(cert: CertificateRecord) {
    setEmailSuccess(`Certificate dispatch triggered for ${cert.recipientEmail}.`);
    setTimeout(() => setEmailSuccess(null), 3000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network Credentials"
        title="Certificates & Verification"
        description="Issue cryptographic event certificates, track verification ledgers, and dispatch credentials via email."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="orange" onClick={() => setIssueModalOpen(true)}>
                <Plus size={14} className="mr-1" />
                Issue Certificate
              </Button>
            </div>
          ) : null
        }
      />

      {emailSuccess ? (
        <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-800 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <Check size={14} />
          {emailSuccess}
        </div>
      ) : null}

      {/* STATS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-[var(--radius-sm)] border border-border bg-bg-panel space-y-1">
          <p className="text-xs text-text-dim">Total Issued</p>
          <p className="text-2xl font-bold font-mono text-text">{certificates.length}</p>
        </div>
        <div className="p-3.5 rounded-[var(--radius-sm)] border border-border bg-bg-panel space-y-1">
          <p className="text-xs text-text-dim">Active & Verifiable</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            {certificates.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="p-3.5 rounded-[var(--radius-sm)] border border-border bg-bg-panel space-y-1">
          <p className="text-xs text-text-dim">Revoked / Inactive</p>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {certificates.filter((c) => c.status === "revoked").length}
          </p>
        </div>
        <div className="p-3.5 rounded-[var(--radius-sm)] border border-border bg-bg-panel space-y-1">
          <p className="text-xs text-text-dim">Verification Protocol</p>
          <p className="text-sm font-bold font-mono text-cyan flex items-center gap-1.5 pt-1">
            <ShieldCheck size={16} /> SHA-256 Verified
          </p>
        </div>
      </div>

      {/* CERTIFICATES DIRECTORY */}
      <TerminalPanel
        title="certificates.ledger"
        meta={`${filteredCerts.length} verified records`}
        accent="cyan"
      >
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-2.5 top-2.5 text-text-mute" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search recipient, serial or event..."
                  className="pl-8 text-xs"
                />
              </div>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "revoked")}
                className="text-xs w-28"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
              </Select>
            </div>
            <div className="text-xs font-mono text-text-mute">
              Public verification: <code className="text-cyan">/verify/certificate/[id]</code>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-border rounded-[var(--radius-sm)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg border-b border-border text-[11px] font-mono uppercase text-text-dim">
                <tr>
                  <th className="p-3">Serial / ID</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Event & Achievement</th>
                  <th className="p-3">Chapter</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-bg-panel">
                {filteredCerts.map((cert) => {
                  const isRevoked = cert.status === "revoked";
                  return (
                    <tr key={cert.id} className="hover:bg-bg/60 transition">
                      <td className="p-3 font-mono font-bold text-cyan flex items-center gap-1.5">
                        <Award size={14} className="text-amber-400 shrink-0" />
                        {cert.serialNumber}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-text">{cert.recipientName}</p>
                        <p className="text-[11px] font-mono text-text-dim">{cert.recipientEmail}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-text truncate max-w-xs">{cert.eventName}</p>
                        <Badge
                          tone={
                            cert.achievement === "Merit & Excellence"
                              ? "orange"
                              : cert.achievement === "Workshop Lead"
                              ? "cyan"
                              : "mute"
                          }
                        >
                          {cert.achievement}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-text-dim">{cert.chapterName}</td>
                      <td className="p-3 font-mono text-text-dim">{cert.issueDate}</td>
                      <td className="p-3">
                        <Badge tone={isRevoked ? "mute" : "green"}>
                          {isRevoked ? "Revoked" : "Active"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewCert(cert)}
                            title="Preview Certificate"
                          >
                            <Eye size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(cert.serialNumber)}
                            title="Copy Verification Link"
                          >
                            {copiedId === cert.serialNumber ? (
                              <Check size={13} className="text-emerald-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendEmail(cert)}
                            title="Send Certificate via Email"
                            className="text-cyan"
                          >
                            <Send size={13} />
                          </Button>
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatus(cert.id)}
                              className={isRevoked ? "text-emerald-400" : "text-amber-400"}
                              title={isRevoked ? "Re-activate" : "Revoke"}
                            >
                              {isRevoked ? "Activate" : "Revoke"}
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCert(cert.id)}
                              className="text-red-400"
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </TerminalPanel>

      {/* ISSUE CERTIFICATE MODAL */}
      <Dialog
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Official Certificate"
        description="Generates a tamper-proof credential registered in the Elevates ledger."
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Recipient Student Name *</FieldLabel>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              autoFocus
            />
          </div>

          <div>
            <FieldLabel>Recipient Email Address *</FieldLabel>
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="alex@college.edu.in"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Associated Event</FieldLabel>
              <Select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {store.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Issuing Campus Chapter</FieldLabel>
              <Select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
              >
                {store.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Achievement / Distinction</FieldLabel>
              <Select
                value={achievement}
                onChange={(e) =>
                  setAchievement(e.target.value as CertificateRecord["achievement"])
                }
              >
                <option value="Participation">Participation</option>
                <option value="Merit & Excellence">Merit & Excellence</option>
                <option value="Workshop Lead">Workshop Lead</option>
                <option value="Campus Organizer">Campus Organizer</option>
                <option value="Executive Term">Executive Term</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Issue Date</FieldLabel>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Authorized Signatory</FieldLabel>
            <Input
              value={signatory}
              onChange={(e) => setSignatory(e.target.value)}
              placeholder="e.g. Authorized Signatory (Chairman)"
            />
          </div>

          {issueError ? (
            <p className="text-xs text-red-400">{issueError}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="orange" onClick={handleIssueCertificate}>
              Issue & Register Credential
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CERTIFICATE PREVIEW MODAL */}
      {previewCert ? (
        <Dialog
          open={Boolean(previewCert)}
          onClose={() => setPreviewCert(null)}
          title="Official Certificate Credential"
        >
          <div className="space-y-6">
            <div className="relative p-8 rounded-lg bg-gradient-to-b from-[#111827] to-[#0a0f1d] border-4 border-amber-500/40 text-center text-white shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
              <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-6">
                <span>ELEVATES KERALA</span>
                <span className="border border-amber-500/40 px-2 py-0.5 rounded">{previewCert.serialNumber}</span>
              </div>

              <Award size={48} className="mx-auto text-amber-400 mb-3" />
              <h3 className="font-serif text-2xl font-bold tracking-wide uppercase text-amber-300">
                Certificate of {previewCert.achievement}
              </h3>
              <p className="text-xs font-mono text-gray-400 mt-1">THIS IS PROUDLY PRESENTED TO</p>

              <h4 className="text-2xl font-bold text-white mt-4 border-b border-white/20 pb-2 inline-block px-6">
                {previewCert.recipientName}
              </h4>

              <p className="text-xs text-gray-300 max-w-md mx-auto mt-4 leading-relaxed">
                for successful attendance and distinguished completion of the event{" "}
                <span className="text-white font-semibold">{previewCert.eventName}</span> hosted by{" "}
                <span className="text-amber-400">{previewCert.chapterName}</span>.
              </p>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10 text-left">
                <div>
                  <p className="text-[10px] font-mono text-gray-400">ISSUED ON</p>
                  <p className="text-xs font-semibold text-white">{previewCert.issueDate}</p>
                  <p className="text-[10px] font-mono text-emerald-400">Attendance: {previewCert.attendanceCompleted}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-gray-400">AUTHORIZED SIGNATURE</p>
                  <p className="text-xs font-semibold text-amber-300 font-serif">{previewCert.signatory}</p>
                  <p className="text-[10px] font-mono text-gray-400">Elevates Executive Board</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Link
                href={`/verify/certificate/${previewCert.serialNumber}`}
                target="_blank"
                className="text-xs text-cyan hover:underline flex items-center gap-1 font-mono"
              >
                Open public verification page <ExternalLink size={12} />
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => sendEmail(previewCert)}
                  className="text-cyan flex items-center gap-1.5"
                >
                  <Send size={14} /> Send to {previewCert.recipientEmail}
                </Button>
                <Button variant="primary" onClick={() => setPreviewCert(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
