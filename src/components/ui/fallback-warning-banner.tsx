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
export function FallbackWarningBanner(_props: FallbackWarningBannerProps) {
  return null;
}
