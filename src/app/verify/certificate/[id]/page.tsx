"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ElevatesCertificate } from "@/components/domain/elevates-certificate";
import { ShieldCheck, ShieldAlert, Award, Eye, FileText, ArrowLeft, Printer } from "lucide-react";
import { getCertificateTemplates } from "@/lib/certificates/templates";

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { store } = useStore();
  const [showFullCertificate, setShowFullCertificate] = useState(true);

  const cert = store.certificates.find(
    (c) =>
      c.certificateId === id ||
      c.id === id ||
      c.verificationQr === id ||
      c.verificationQr === `VERIFY-${id}`
  );

  const event = cert ? store.events.find((e) => e.id === cert.eventId) : null;
  const user = cert ? store.profiles.find((p) => p.id === cert.userId) : null;
  const chapter = event
    ? store.chapters.find((c) => c.id === event.chapterId)
    : null;

  const templates = getCertificateTemplates(chapter?.id);
  const template = cert?.templateId
    ? templates.find((t) => t.id === cert.templateId) || templates[0]
    : templates[0];

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header className="text-center no-print">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f26430]/10 text-[#f26430] text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck size={14} /> Official Verification Ledger
          </div>
          <h1 className="font-extrabold text-3xl sm:text-4xl text-neutral-900 tracking-tight">
            Elevates OS Credential Verification
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Cryptographically sealed and tamper-evident student achievement credential.
          </p>
        </header>

        {cert ? (
          <div className="space-y-6">
            {/* Status Summary Card */}
            <article className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm no-print">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2">
                  {cert.isRevoked ? (
                    <Badge tone="orange" className="text-xs px-2.5 py-1">
                      <ShieldAlert size={13} className="mr-1 inline" /> Revoked Credential
                    </Badge>
                  ) : (
                    <Badge tone="green" className="text-xs px-2.5 py-1">
                      <ShieldCheck size={13} className="mr-1 inline" /> Verified Valid Credential
                    </Badge>
                  )}
                  <span className="font-mono text-xs text-neutral-500">ID: {cert.certificateId}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowFullCertificate(!showFullCertificate)}
                    className="text-xs flex items-center gap-1.5"
                  >
                    {showFullCertificate ? <FileText size={14} /> : <Eye size={14} />}
                    {showFullCertificate ? "View Metadata" : "View Official Certificate"}
                  </Button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-xs">
                <div>
                  <p className="text-neutral-400 uppercase tracking-wider text-[10px] font-semibold">
                    Recipient
                  </p>
                  <p className="mt-1 text-base font-bold text-neutral-900">
                    {user?.fullName || "Student Member"}
                  </p>
                  <p className="text-[11px] text-neutral-500">{user?.email || "—"}</p>
                </div>

                <div>
                  <p className="text-neutral-400 uppercase tracking-wider text-[10px] font-semibold">
                    Event
                  </p>
                  <p className="mt-1 font-semibold text-neutral-800 text-sm">
                    {event?.title || "Elevates Event"}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {event?.venue} · {event?.startsAt?.slice(0, 10)}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-400 uppercase tracking-wider text-[10px] font-semibold">
                    Chapter
                  </p>
                  <p className="mt-1 font-semibold text-neutral-800 text-sm">
                    {chapter?.name || "Elevates Chapter"}
                  </p>
                  <p className="text-[11px] text-neutral-500">{chapter?.college || "Campus"}</p>
                </div>

                <div>
                  <p className="text-neutral-400 uppercase tracking-wider text-[10px] font-semibold">
                    Achievement & Issued
                  </p>
                  <p className="mt-1 font-semibold text-[#f26430] text-sm">
                    {cert.achievement || "Participation"}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {formatDateTime(cert.issuedAt)}
                  </p>
                </div>
              </div>

              {/* Digital Signature */}
              <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-500">
                <span className="font-mono">
                  Signature: <code className="text-neutral-700">{cert.digitalSignature}</code>
                </span>
                <span className="text-emerald-700 font-medium">✓ Cryptographically Sealed</span>
              </div>
            </article>

            {/* Official Visual Certificate Display */}
            {showFullCertificate && (
              <div className="flex flex-col items-center">
                <ElevatesCertificate
                  recipientName={user?.fullName || "Student Member"}
                  recipientEmail={user?.email}
                  certificateId={cert.certificateId}
                  issuedAt={cert.issuedAt.slice(0, 10)}
                  achievement={cert.achievement}
                  eventTitle={event?.title}
                  chapterName={chapter?.name}
                  institutionName={chapter?.college || chapter?.name || "Elevates Community"}
                  signatory1Name={template?.signatory1Name}
                  signatory1Role={template?.signatory1Role}
                  signatory1SignatureUrl={template?.signatory1SignatureUrl}
                  signatory2Name={template?.signatory2Name}
                  signatory2Role={template?.signatory2Role}
                  signatory2SignatureUrl={template?.signatory2SignatureUrl}
                  showGridPattern={template?.showGridPattern ?? true}
                  showControls={true}
                />
              </div>
            )}
          </div>
        ) : (
          <article className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert size={24} />
            </div>
            <h2 className="text-lg font-bold text-neutral-900">Certificate Not Found</h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 max-w-md mx-auto">
              No record matches certificate identifier <code className="font-mono text-[#f26430]">{id}</code> in the Elevates verification registry.
            </p>
            <p className="text-xs text-neutral-400 mt-4">
              Please check the QR code or verify the URL format (e.g. CERT-EKC-2026-XXXX).
            </p>
          </article>
        )}

        <footer className="text-center pt-4 no-print">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition"
          >
            <ArrowLeft size={13} /> Return to Elevates OS Workspace
          </Link>
        </footer>
      </div>
    </div>
  );
}
