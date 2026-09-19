"use client";

import { useState, useMemo, useEffect, useRef, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Input, Select, FieldLabel } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isExecutiveRole, resolveChapter, chapterEyebrow } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ElevatesCertificate } from "@/components/domain/elevates-certificate";
import { CertificateCanvaEditor } from "@/components/domain/certificate-canva-editor";
import { exportCertificateAsPptx } from "@/lib/certificates/pptx";
import { CertificateTemplate } from "@/types";
import {
  DEFAULT_CERTIFICATE_TEMPLATES,
  getCertificateTemplates,
  saveCertificateTemplate,
  deleteCertificateTemplate,
} from "@/lib/certificates/templates";
import {
  Award,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode,
  FileUp,
  Filter,
  Image as ImageIcon,
  Layers,
  Palette,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

export default function ChapterCertificatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, issueCertificate, batchIssueCertificates, revokeCertificate } = useStore();
  const { session } = useCurrentUser();

  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);
  const canManage = isExecutiveRole(session.roleKey) || isHqRole(session.roleKey);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"attendance" | "ledger" | "designer">("attendance");

  // Certificate Templates state
  const [templates, setTemplates] = useState<CertificateTemplate[]>(DEFAULT_CERTIFICATE_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    DEFAULT_CERTIFICATE_TEMPLATES[0].id
  );

  // Load custom stored templates on mount
  useEffect(() => {
    if (chapter) {
      const loaded = getCertificateTemplates(chapter.id);
      setTemplates(loaded);
    }
  }, [chapter]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);



  // Chapter-scoped events
  const chapterEvents = useMemo(() => {
    if (!chapter) return [];
    return store.events.filter((e) => e.chapterId === chapter.id);
  }, [store.events, chapter]);

  // Selected event for attendance issuance
  const [selectedEventId, setSelectedEventId] = useState<string>(
    chapterEvents[0]?.id || ""
  );

  const activeEvent = useMemo(() => {
    return chapterEvents.find((e) => e.id === selectedEventId) || chapterEvents[0] || null;
  }, [chapterEvents, selectedEventId]);

  // Filter & Search states for the Ledger tab
  const [searchLedger, setSearchLedger] = useState("");
  const [filterLedgerEvent, setFilterLedgerEvent] = useState("all");
  const [filterLedgerStatus, setFilterLedgerStatus] = useState<"all" | "active" | "revoked">("all");

  // Feedback notifications
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Certificate Modal Preview state
  const [previewCert, setPreviewCert] = useState<{
    certificateId: string;
    recipientName: string;
    recipientEmail?: string;
    issuedAt?: string;
    achievement?: string;
    eventTitle?: string;
    chapterName?: string;
    institutionName?: string;
    mainTitle?: string;
    subTitle?: string;
    preamble?: string;
    description?: string;
    signatory1Name?: string;
    signatory1Role?: string;
    signatory1SignatureUrl?: string;
    signatory2Name?: string;
    signatory2Role?: string;
    signatory2SignatureUrl?: string;
    showGridPattern?: boolean;
  } | null>(null);



  // 1. ATTENDANCE ISSUANCE DATA:
  const attendeesList = useMemo(() => {
    if (!activeEvent) return [];

    const eventAttRecords = store.attendance.filter(
      (a) =>
        a.eventId === activeEvent.id &&
        (a.status === "present" || a.status === "volunteer" || a.status === "speaker")
    );

    return eventAttRecords.map((record) => {
      const student = store.profiles.find((p) => p.id === record.userId);
      const existingCert = store.certificates.find(
        (c) => c.eventId === activeEvent.id && c.userId === record.userId && !c.isRevoked
      );

      return {
        attendanceId: record.id,
        userId: record.userId,
        fullName: student?.fullName || "Student Member",
        email: student?.email || "—",
        elevatesId: student?.elevatesId || `ELV-STU-${record.userId.slice(0, 5).toUpperCase()}`,
        status: record.status,
        checkedInAt: record.checkedInAt,
        certificate: existingCert || null,
      };
    });
  }, [activeEvent, store.attendance, store.profiles, store.certificates]);

  const unissuedAttendees = useMemo(() => {
    return attendeesList.filter((a) => !a.certificate);
  }, [attendeesList]);

  // 2. ISSUED CERTIFICATES (LEDGER DATA):
  const chapterCertificates = useMemo(() => {
    if (!chapter) return [];
    const eventIds = new Set(chapterEvents.map((e) => e.id));
    return store.certificates
      .filter((c) => eventIds.has(c.eventId))
      .map((cert) => {
        const ev = store.events.find((e) => e.id === cert.eventId);
        const profile = store.profiles.find((p) => p.id === cert.userId);
        return {
          ...cert,
          eventTitle: ev?.title || "Elevates Event",
          recipientName: profile?.fullName || "Student Member",
          recipientEmail: profile?.email || "",
          elevatesId: profile?.elevatesId || "",
        };
      });
  }, [chapter, chapterEvents, store.certificates, store.events, store.profiles]);

  const filteredCertificates = useMemo(() => {
    const q = searchLedger.trim().toLowerCase();
    return chapterCertificates.filter((c) => {
      if (filterLedgerStatus === "active" && c.isRevoked) return false;
      if (filterLedgerStatus === "revoked" && !c.isRevoked) return false;
      if (filterLedgerEvent !== "all" && c.eventId !== filterLedgerEvent) return false;
      if (!q) return true;
      return (
        c.certificateId.toLowerCase().includes(q) ||
        c.recipientName.toLowerCase().includes(q) ||
        c.recipientEmail.toLowerCase().includes(q) ||
        c.eventTitle.toLowerCase().includes(q) ||
        c.elevatesId.toLowerCase().includes(q)
      );
    });
  }, [chapterCertificates, searchLedger, filterLedgerEvent, filterLedgerStatus]);

  // HANDLERS:
  function handleSingleIssue(userId: string, recipientName: string) {
    if (!activeEvent) return;
    const res = issueCertificate(
      activeEvent.id,
      userId,
      activeTemplate.achievement,
      activeTemplate.id
    );
    if (res.ok) {
      setNotification({
        type: "success",
        text: `Official certificate issued successfully for ${recipientName}!`,
      });
      setTimeout(() => setNotification(null), 3500);
    } else {
      setNotification({
        type: "error",
        text: res.message || "Failed to issue certificate.",
      });
      setTimeout(() => setNotification(null), 3500);
    }
  }

  function handleBatchIssueAll() {
    if (!activeEvent) return;
    const targetUserIds = unissuedAttendees.map((a) => a.userId);
    if (targetUserIds.length === 0) {
      setNotification({
        type: "error",
        text: "No unissued attendees found for this event.",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const { successCount, failedCount } = batchIssueCertificates(
      activeEvent.id,
      targetUserIds,
      activeTemplate.achievement,
      activeTemplate.id
    );

    setNotification({
      type: successCount > 0 ? "success" : "error",
      text: `Issued ${successCount} certificate${successCount === 1 ? "" : "s"} successfully!${
        failedCount > 0 ? ` (${failedCount} skipped or failed)` : ""
      }`,
    });
    setTimeout(() => setNotification(null), 4000);
  }



  function handleToggleRevoke(certId: string, currentRevoked = false) {
    const ok = revokeCertificate(certId, !currentRevoked);
    if (ok) {
      setNotification({
        type: "success",
        text: `Certificate status updated to ${!currentRevoked ? "Revoked" : "Active"}.`,
      });
      setTimeout(() => setNotification(null), 3000);
    }
  }

  function handleCopyVerifyLink(certId: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://os.elevates.live";
    const url = `${origin}/verify/certificate/${certId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(certId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!chapter) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-dim">Chapter not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Certificates & Credentials Center"
        description={`Official, verifiable Elevates credentials with verified signatures, serial IDs, and template customization for ${chapter.name}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setActiveTab("designer")}
              className="text-xs sm:text-sm flex items-center gap-1.5 font-semibold border border-border/80"
            >
              <Sparkles size={14} className="text-[#f26430]" />
              <span>Canva PPTX Studio</span>
            </Button>
          </div>
        }
      />

      {/* 4-Stat Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Total Issued"
          value={chapterCertificates.length}
          hint="All time credentials"
        />
        <Stat
          label="Active & Verifiable"
          value={chapterCertificates.filter((c) => !c.isRevoked).length}
          hint="Live cryptographic passes"
          accent="orange"
        />
        <Stat
          label="Eligible Attendees"
          value={attendeesList.length}
          hint="Present in selected event"
        />
        <Stat
          label="Configured Templates"
          value={templates.length}
          hint="Available designs"
        />
      </div>

      {/* Unified Segmented Tab Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "attendance"
              ? "bg-text text-bg shadow-sm"
              : "bg-bg-panel border border-border/70 text-text-dim hover:text-text hover:border-border",
          )}
        >
          <Users size={13} />
          <span>Attendance Issuance</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
              activeTab === "attendance" ? "bg-bg/20 text-bg" : "bg-border/60 text-text-dim",
            )}
          >
            {unissuedAttendees.length} pending
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "ledger"
              ? "bg-text text-bg shadow-sm"
              : "bg-bg-panel border border-border/70 text-text-dim hover:text-text hover:border-border",
          )}
        >
          <Layers size={13} />
          <span>Issued Registry</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
              activeTab === "ledger" ? "bg-bg/20 text-bg" : "bg-border/60 text-text-dim",
            )}
          >
            {chapterCertificates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("designer")}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "designer"
              ? "bg-text text-bg shadow-sm"
              : "bg-bg-panel border border-border/70 text-text-dim hover:text-text hover:border-border",
          )}
        >
          <Palette size={13} />
          <span>Template Designer</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
              activeTab === "designer" ? "bg-bg/20 text-bg" : "bg-border/60 text-text-dim",
            )}
          >
            {templates.length}
          </span>
        </button>
      </div>

      {/* Live Notification Bar */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-medium border transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <Check size={16} className="text-emerald-600" />
            ) : (
              <ShieldAlert size={16} className="text-red-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 1: ATTENDANCE ISSUANCE */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Top Event Selection Bar */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <FileCheck2 size={16} className="text-[#f26430]" />
                  Select Event for Credential Issuance
                </h2>
                <p className="text-xs text-neutral-500">
                  Only students with verified check-in attendance (<strong className="text-neutral-700">present</strong>) qualify for certificates.
                </p>
              </div>

              {/* Event Select Dropdown */}
              <div className="flex items-center gap-3">
                <Select
                  value={activeEvent?.id || ""}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="min-w-[260px] text-xs font-medium"
                >
                  {chapterEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.status})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Event Summary Pill Grid */}
            {activeEvent && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-100 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <span className="text-[11px] text-neutral-500">Event Date:</span>
                  <p className="font-semibold text-neutral-800 mt-0.5">{activeEvent.startsAt?.slice(0, 10)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <span className="text-[11px] text-neutral-500">Venue:</span>
                  <p className="font-semibold text-neutral-800 mt-0.5 truncate">{activeEvent.venue}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700">Verified Attendees:</span>
                  <p className="font-bold text-emerald-800 mt-0.5">{attendeesList.length} checked-in</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100">
                  <span className="text-[11px] text-[#f26430]">Ready to Issue:</span>
                  <p className="font-bold text-[#f26430] mt-0.5">{unissuedAttendees.length} remaining</p>
                </div>
              </div>
            )}
          </div>

          {/* Template Selection & Batch Issuance Action Toolbar */}
          {activeEvent && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-neutral-800">Certificate Template:</span>
                <Select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="text-xs w-64 font-medium"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.achievement})
                    </option>
                  ))}
                </Select>

                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("designer")}
                  className="text-xs flex items-center gap-1.5 text-neutral-700 hover:bg-neutral-100"
                >
                  <Sparkles size={13} className="text-[#f26430]" /> Canva PPTX Studio
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="orange"
                  onClick={handleBatchIssueAll}
                  disabled={unissuedAttendees.length === 0 || !canManage}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
                >
                  <Sparkles size={14} />
                  Issue All Pending ({unissuedAttendees.length})
                </Button>
              </div>
            </div>
          )}

          {/* Attendees Attendance Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="text-xs font-semibold text-neutral-800 flex items-center gap-2">
                <Users size={14} className="text-[#f26430]" />
                Event Attendees ({attendeesList.length})
              </h3>
              <span className="text-[11px] text-neutral-500">
                {unissuedAttendees.length === 0 && attendeesList.length > 0
                  ? "✓ All attendees have official certificates"
                  : `${unissuedAttendees.length} pending issuance`}
              </span>
            </div>

            {attendeesList.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <Users size={36} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-sm font-medium text-neutral-800">No verified attendees found for this event.</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Take QR attendance via the Attendance terminal or manually check-in attendees to issue certificates.
                </p>
                <Link
                  href={`/chapter/${chapter.slug}/attendance`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#f26430] font-semibold mt-4 hover:underline"
                >
                  Open QR Attendance Terminal →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-600 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="px-4 py-3">Attendee</th>
                      <th className="px-4 py-3">Elevates ID</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3">Certificate Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {attendeesList.map((attendee) => (
                      <tr key={attendee.attendanceId} className="hover:bg-neutral-50/60 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-neutral-900">{attendee.fullName}</div>
                          <div className="text-[11px] text-neutral-500">{attendee.email}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-neutral-600">
                          {attendee.elevatesId}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone="green">
                            ✓ {attendee.status.toUpperCase()}
                          </Badge>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            {attendee.checkedInAt?.slice(0, 10)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {attendee.certificate ? (
                            <div className="space-y-0.5">
                              <Badge tone="cyan" className="font-mono text-[10px]">
                                <ShieldCheck size={11} className="mr-1 inline" />
                                {attendee.certificate.certificateId}
                              </Badge>
                              <div className="text-[10px] text-neutral-500">
                                {attendee.certificate.achievement || "Participation"}
                              </div>
                            </div>
                          ) : (
                            <Badge tone="orange" className="text-[10px]">
                              Pending Issuance
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {attendee.certificate ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  setPreviewCert({
                                    certificateId: attendee.certificate!.certificateId,
                                    recipientName: attendee.fullName,
                                    recipientEmail: attendee.email,
                                    issuedAt: attendee.certificate!.issuedAt.slice(0, 10),
                                    achievement: attendee.certificate!.achievement,
                                    eventTitle: activeEvent.title,
                                    chapterName: chapter.name,
                                    institutionName: chapter.college || chapter.name,
                                    signatory1SignatureUrl: activeTemplate.signatory1SignatureUrl,
                                    signatory2SignatureUrl: activeTemplate.signatory2SignatureUrl,
                                    showGridPattern: activeTemplate.showGridPattern ?? true,
                                  })
                                }
                                className="text-xs px-2 py-1 flex items-center gap-1 text-neutral-700 hover:text-neutral-900"
                              >
                                <Eye size={13} /> View
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => handleCopyVerifyLink(attendee.certificate!.certificateId)}
                                className="text-xs px-2 py-1 flex items-center gap-1 text-neutral-700"
                              >
                                {copiedId === attendee.certificate.certificateId ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="orange"
                              disabled={!canManage}
                              onClick={() => handleSingleIssue(attendee.userId, attendee.fullName)}
                              className="text-xs px-3 py-1 font-medium"
                            >
                              Issue Credential
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 2: ISSUED CERTIFICATES REGISTRY / LEDGER */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <Input
                value={searchLedger}
                onChange={(e) => setSearchLedger(e.target.value)}
                placeholder="Search recipient name, Elevates ID, certificate serial..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filterLedgerEvent}
                onChange={(e) => setFilterLedgerEvent(e.target.value)}
                className="text-xs w-44"
              >
                <option value="all">All Chapter Events</option>
                {chapterEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </Select>

              <Select
                value={filterLedgerStatus}
                onChange={(e) => setFilterLedgerStatus(e.target.value as any)}
                className="text-xs w-32"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Valid</option>
                <option value="revoked">Revoked</option>
              </Select>
            </div>
          </div>

          {/* Certificate Records Table */}
          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="text-xs font-semibold text-neutral-800 flex items-center gap-2">
                <Layers size={14} className="text-[#f26430]" />
                Issued Credentials Registry ({filteredCertificates.length})
              </h3>
            </div>

            {filteredCertificates.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <Award size={36} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-sm font-medium text-neutral-800">No matching certificates found.</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Issue certificates from event attendance records or adjust your search filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-600 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="px-4 py-3">Certificate ID</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Achievement</th>
                      <th className="px-4 py-3">Issued Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-neutral-50/60 transition">
                        <td className="px-4 py-3.5 font-mono text-neutral-900 font-medium">
                          {cert.certificateId}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-neutral-900">{cert.recipientName}</div>
                          <div className="text-[11px] text-neutral-500">{cert.recipientEmail}</div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-neutral-700">
                          {cert.eventTitle}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone="mute" className="text-[10px]">
                            {cert.achievement || "Participation"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-neutral-500 font-mono text-[11px]">
                          {cert.issuedAt?.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3.5">
                          {cert.isRevoked ? (
                            <Badge tone="orange">Revoked</Badge>
                          ) : (
                            <Badge tone="green">Verified Active</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              onClick={() =>
                                setPreviewCert({
                                  certificateId: cert.certificateId,
                                  recipientName: cert.recipientName,
                                  recipientEmail: cert.recipientEmail,
                                  issuedAt: cert.issuedAt?.slice(0, 10),
                                  achievement: cert.achievement,
                                  eventTitle: cert.eventTitle,
                                  chapterName: chapter.name,
                                  institutionName: chapter.college || chapter.name,
                                  signatory1SignatureUrl: activeTemplate.signatory1SignatureUrl,
                                  signatory2SignatureUrl: activeTemplate.signatory2SignatureUrl,
                                  showGridPattern: activeTemplate.showGridPattern ?? true,
                                })
                              }
                              className="text-xs px-2.5 py-1 flex items-center gap-1 text-neutral-700 hover:text-neutral-900"
                            >
                              <Eye size={13} /> View
                            </Button>

                            <Button
                              variant="ghost"
                              onClick={() => {
                                exportCertificateAsPptx(activeTemplate, {
                                  recipientName: cert.recipientName,
                                  eventTitle: cert.eventTitle,
                                  chapterName: chapter.name,
                                  institutionName: chapter.college || chapter.name,
                                  certificateId: cert.certificateId,
                                  filename: `${cert.recipientName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Certificate.pptx`,
                                });
                              }}
                              className="text-xs px-2.5 py-1 flex items-center gap-1 text-neutral-700 hover:text-neutral-900"
                              title="Download as PowerPoint presentation (.pptx)"
                            >
                              <Download size={13} className="text-[#f26430]" /> PPTX
                            </Button>

                            <Button
                              variant="ghost"
                              onClick={() => handleCopyVerifyLink(cert.certificateId)}
                              className="text-xs px-2.5 py-1 flex items-center gap-1 text-neutral-700"
                              title="Copy Public Verification Link"
                            >
                              {copiedId === cert.certificateId ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </Button>

                            {canManage && (
                              <Button
                                variant="ghost"
                                onClick={() => handleToggleRevoke(cert.id, cert.isRevoked)}
                                className={`text-xs px-2 py-1 ${
                                  cert.isRevoked ? "text-emerald-600" : "text-neutral-400 hover:text-red-600"
                                }`}
                                title={cert.isRevoked ? "Restore Certificate" : "Revoke Certificate"}
                              >
                                {cert.isRevoked ? "Restore" : "Revoke"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TAB 3: CANVA PPTX DESIGNER & TEMPLATE STUDIO */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "designer" && (
        <div className="space-y-4">
          <CertificateCanvaEditor
            initialTemplate={activeTemplate}
            chapterName={chapter.name}
            institutionName={chapter.college || chapter.name}
            chapterSlug={chapter.slug}
            templatesList={templates}
            onSaveTemplate={(saved) => {
              saveCertificateTemplate(saved);
              const updated = getCertificateTemplates(chapter?.id);
              setTemplates(updated);
              setSelectedTemplateId(saved.id);
              setNotification({
                type: "success",
                text: `Template "${saved.name}" saved successfully!`,
              });
              setTimeout(() => setNotification(null), 3500);
            }}
            onSelectTemplate={(tpl) => setSelectedTemplateId(tpl.id)}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* OFFICIAL HIGH-RES CERTIFICATE PREVIEW MODAL */}
      {/* ─────────────────────────────────────────────────────────── */}
      {previewCert && (
        <Dialog
          open={Boolean(previewCert)}
          onClose={() => setPreviewCert(null)}
          title="Official Verified Credential"
        >
          <div className="space-y-4 max-w-4xl mx-auto">
            <ElevatesCertificate
              recipientName={previewCert.recipientName}
              recipientEmail={previewCert.recipientEmail}
              certificateId={previewCert.certificateId}
              issuedAt={previewCert.issuedAt}
              achievement={previewCert.achievement}
              eventTitle={previewCert.eventTitle}
              chapterName={previewCert.chapterName}
              institutionName={previewCert.institutionName || chapter.college || chapter.name}
              signatory1Name={previewCert.signatory1Name || activeTemplate.signatory1Name}
              signatory1Role={previewCert.signatory1Role || activeTemplate.signatory1Role}
              signatory1SignatureUrl={previewCert.signatory1SignatureUrl || activeTemplate.signatory1SignatureUrl}
              signatory2Name={previewCert.signatory2Name || activeTemplate.signatory2Name}
              signatory2Role={previewCert.signatory2Role || activeTemplate.signatory2Role}
              signatory2SignatureUrl={previewCert.signatory2SignatureUrl || activeTemplate.signatory2SignatureUrl}
              showGridPattern={previewCert.showGridPattern ?? true}
              showControls={true}
            />

            <div className="flex justify-end pt-3 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setPreviewCert(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
