"use client";

import { use } from "react";
import Link from "next/link";
import { useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { store } = useStore();

  const cert = store.certificates.find(
    (c) =>
      c.certificateId === id ||
      c.id === id ||
      c.verificationQr === id ||
      c.verificationQr === `VERIFY-${id}`,
  );

  const event = cert ? store.events.find((e) => e.id === cert.eventId) : null;
  const user = cert ? store.profiles.find((p) => p.id === cert.userId) : null;
  const chapter = event
    ? store.chapters.find((c) => c.id === event.chapterId)
    : null;

  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <p className="text-sm font-medium text-cyan">Elevates OS</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Certificate verification
          </h1>
          <p className="mt-1 text-sm text-text-mute">Public verification portal</p>
        </header>

        <article className="rounded-2xl border border-border bg-bg-panel p-6 shadow-[var(--shadow)]">
          {cert ? (
            <>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <Badge tone="green">Verified</Badge>
                <span className="text-xs text-text-mute">{cert.certificateId}</span>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-text-mute">Recipient</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
                    {user?.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-mute">Event</p>
                  <p className="mt-1 font-medium text-cyan">{event?.title}</p>
                  <p className="text-xs text-text-dim">
                    {event?.category} · {event?.venue}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-mute">Chapter</p>
                  <p className="mt-1 font-medium">{chapter?.name}</p>
                  <p className="text-xs text-text-dim">{chapter?.college}</p>
                </div>
                <div>
                  <p className="text-xs text-text-mute">Issued</p>
                  <p className="mt-1">{formatDateTime(cert.issuedAt)}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg p-3">
                  <p className="text-xs text-text-mute">Digital signature</p>
                  <p className="mt-1 break-all text-xs text-green">
                    {cert.digitalSignature}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <Badge tone="orange">Not found</Badge>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">
                Certificate not found
              </h2>
              <p className="mt-2 text-sm text-text-dim">
                ID <span className="text-magenta">{id}</span> does not match any
                issued certificate.
              </p>
              <p className="mt-4 text-xs text-text-mute">
                Example format: ELV-CERT-2026-XXXXX
              </p>
            </div>
          )}
        </article>

        <p className="mt-6 text-center text-sm text-text-mute">
          <Link href="/login" className="text-cyan hover:underline">
            ← Back to Elevates OS
          </Link>
        </p>
      </div>
    </div>
  );
}
