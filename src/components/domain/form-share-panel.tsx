"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/ui/terminal-panel";

export function FormSharePanel({
  formId,
  title = "Share",
}: {
  formId: string;
  title?: string;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/f/${formId}`);
  }, [formId]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  return (
    <TerminalPanel title="share.public" meta={title} accent="cyan">
      <p className="mb-3 text-[13px] text-text-dim">
        Anyone with this link can open the form. Scan the QR on posters or share
        the URL.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="rounded-[var(--radius-sm)] border border-border bg-white p-3">
          {url ? (
            <QRCode value={url} size={128} style={{ height: "auto", width: 128 }} />
          ) : (
            <div className="h-[128px] w-[128px] bg-bg-elevated" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-all rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 py-2 font-mono text-[12px] text-text">
            {url || "…"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={copy} disabled={!url}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <a href={url || undefined} target="_blank" rel="noreferrer">
              <Button variant="ghost" disabled={!url}>
                Open public page
              </Button>
            </a>
          </div>
        </div>
      </div>
    </TerminalPanel>
  );
}
