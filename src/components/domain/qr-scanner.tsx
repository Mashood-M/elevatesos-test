"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: {
      formats?: string[];
    }) => BarcodeDetectorLike;
  }
}

const COOLDOWN_MS = 1500;

export function QrScanner({
  onScan,
  active,
  disabled,
}: {
  onScan: (code: string) => void;
  active: boolean;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const lastRef = useRef("");
  const cooldownUntilRef = useRef(0);

  onScanRef.current = onScan;

  useEffect(() => {
    if (!active || !running || disabled) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    const Detector = window.BarcodeDetector;

    async function start() {
      setError("");
      if (!Detector) {
        setError(
          "Camera QR needs BarcodeDetector (Chrome/Edge). Use paste below, or a USB scanner.",
        );
        setRunning(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const now = Date.now();
              if (now >= cooldownUntilRef.current) {
                const codes = await detector.detect(videoRef.current);
                const value = codes[0]?.rawValue?.trim();
                if (value && value !== lastRef.current) {
                  lastRef.current = value;
                  cooldownUntilRef.current = now + COOLDOWN_MS;
                  onScanRef.current(value);
                  // Allow re-scan of same code after cooldown (status updates)
                  window.setTimeout(() => {
                    if (lastRef.current === value) lastRef.current = "";
                  }, COOLDOWN_MS);
                }
              }
            }
          } catch {
            /* frame skip */
          }
          raf = requestAnimationFrame(() => {
            void tick();
          });
        };
        void tick();
      } catch {
        setError("Could not open camera — allow permission or use paste.");
        setRunning(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, running, disabled]);

  useEffect(() => {
    if (!active || disabled) {
      setRunning(false);
      lastRef.current = "";
      cooldownUntilRef.current = 0;
    }
  }, [active, disabled]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={running ? "ghost" : "orange"}
          disabled={disabled}
          onClick={() => setRunning((v) => !v)}
        >
          {running ? "Stop camera" : "Start camera scan"}
        </Button>
      </div>
      {running && !disabled ? (
        <div className="overflow-hidden rounded-[12px] bg-bg ring-1 ring-border">
          <video
            ref={videoRef}
            className="aspect-video max-h-[280px] w-full object-cover"
            muted
            playsInline
          />
        </div>
      ) : null}
      {error ? (
        <p className="text-[12px] text-[var(--accent)]">{error}</p>
      ) : (
        <p className="text-[11px] text-text-mute">
          Point at an approved registration QR. Paste still works for HID
          scanners.
        </p>
      )}
    </div>
  );
}
