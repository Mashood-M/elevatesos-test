"use client";

import { useState, useEffect } from "react";

export type DataSource = "database" | "fallback" | "empty-fallback" | "demo";

interface FallbackWarningBannerProps {
  /** The detected data source — only renders when source is not "database" */
  source: DataSource;
  /** Optional override for context (e.g. "Store Hydration", "Events API") */
  context?: string;
}

/**
 * A fixed, high-contrast, dismissible banner that appears whenever
 * the frontend detects it is displaying non-database (fallback/demo) data.
 *
 * Usage:
 *   <FallbackWarningBanner source={detectedSource} context="Store Hydration" />
 */
export function FallbackWarningBanner({ source, context }: FallbackWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Only show for non-database sources
  if (!mounted || dismissed || source === "database") return null;

  const labels: Record<string, string> = {
    fallback: "FALLBACK / SEED DATA",
    "empty-fallback": "EMPTY FALLBACK (database returned nothing or failed)",
    demo: "DEMO / MOCK DATA",
  };

  const label = labels[source] ?? source.toUpperCase();

  return (
    <div
      id="fallback-warning-banner"
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)",
        color: "#fff",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        boxShadow: "0 4px 24px rgba(220, 38, 38, 0.4), 0 2px 8px rgba(0,0,0,0.3)",
        borderBottom: "2px solid #fca5a5",
        animation: "fallbackBannerSlideIn 0.3s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: "20px",
            lineHeight: 1,
            flexShrink: 0,
            animation: "fallbackBannerPulse 1.5s ease-in-out infinite",
          }}
        >
          ⚠️
        </span>
        <div style={{ minWidth: 0 }}>
          <span style={{ display: "block" }}>
            <strong style={{ color: "#fef2f2", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.1em" }}>
              {label}
            </strong>
          </span>
          <span style={{ display: "block", opacity: 0.95, fontSize: "12px", fontWeight: 400, marginTop: "2px" }}>
            The database connection failed or returned no results.
            What you&apos;re seeing is <strong>NOT live data</strong>.
            {context && (
              <span style={{ opacity: 0.8 }}> — Source: {context}</span>
            )}
          </span>
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss fallback data warning"
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff",
          borderRadius: "6px",
          padding: "6px 14px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 600,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
        }}
      >
        Dismiss
      </button>

      <style>{`
        @keyframes fallbackBannerSlideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fallbackBannerPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
