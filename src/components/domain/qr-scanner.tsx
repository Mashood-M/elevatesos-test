"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";

const COOLDOWN_MS = 1800;

function playSuccessBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* Audio feedback ignored if blocked by autoplay policy */
  }
}

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
  const [scannedSuccess, setScannedSuccess] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const lastRef = useRef("");
  const cooldownUntilRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  onScanRef.current = onScan;

  // Check available video devices
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      })
      .catch(() => {});
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!active || !running || disabled) {
      stopStream();
      return;
    }

    let rafId = 0;
    let cancelled = false;

    async function startCamera() {
      setError("");
      stopStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera access is not supported by your browser. Please use code entry.");
        setRunning(false);
        return;
      }

      let stream: MediaStream | null = null;

      try {
        // Try requested facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (errFirst) {
        try {
          // Fallback to generic video if ideal constraints failed
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch {
          const errName = (errFirst as { name?: string })?.name || "";
          if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
            setError("Camera permission denied. Please allow camera access in browser settings.");
          } else {
            setError("Could not open camera. Please check device connection or use code entry.");
          }
          setRunning(false);
          return;
        }
      }

      if (cancelled || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      try {
        await video.play();
      } catch {
        /* Autoplay handled */
      }

      // Offscreen canvas for scanning
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const scanFrame = () => {
        if (cancelled || !videoRef.current) return;

        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const now = Date.now();
          if (now >= cooldownUntilRef.current) {
            try {
              // Scale down slightly for ultra-fast jsQR analysis without sacrificing accuracy
              const maxDim = 640;
              let w = video.videoWidth;
              let h = video.videoHeight;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }

              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);

              const imageData = ctx.getImageData(0, 0, w, h);
              const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              }) || jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
              });

              if (qrResult && qrResult.data) {
                const value = qrResult.data.trim();
                if (value && value !== lastRef.current) {
                  lastRef.current = value;
                  cooldownUntilRef.current = now + COOLDOWN_MS;

                  setLastScannedCode(value);
                  setScannedSuccess(true);
                  playSuccessBeep();

                  onScanRef.current(value);

                  window.setTimeout(() => {
                    setScannedSuccess(false);
                  }, 800);

                  window.setTimeout(() => {
                    if (lastRef.current === value) {
                      lastRef.current = "";
                    }
                  }, COOLDOWN_MS);
                }
              }
            } catch {
              /* Ignore per-frame processing hiccups */
            }
          }
        }

        rafId = requestAnimationFrame(scanFrame);
      };

      rafId = requestAnimationFrame(scanFrame);
    }

    void startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stopStream();
    };
  }, [active, running, disabled, facingMode, stopStream]);

  useEffect(() => {
    if (!active || disabled) {
      setRunning(false);
      lastRef.current = "";
      cooldownUntilRef.current = 0;
      setScannedSuccess(false);
      stopStream();
    }
  }, [active, disabled, stopStream]);

  if (!active) return null;

  return (
    <div className="space-y-3">
      {/* Scanner Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant={running ? "ghost" : "orange"}
          disabled={disabled}
          onClick={() => setRunning((v) => !v)}
          className="h-9 px-4 text-xs font-semibold"
        >
          {running ? "■ Stop Camera" : "📷 Start Camera Scan"}
        </Button>

        {running && hasMultipleCameras && (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2.5 text-[11px] border border-border/70 text-text-dim hover:text-text"
            onClick={() =>
              setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
            }
            title="Switch front/back camera"
          >
            ⇄ Flip Camera
          </Button>
        )}
      </div>

      {/* Square Camera Viewfinder */}
      {running && !disabled ? (
        <div className="relative mx-auto w-full max-w-[300px] aspect-square overflow-hidden rounded-2xl border-2 border-border bg-neutral-950 shadow-lg">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
          />

          {/* Square Target Reticle Matching QR Shape */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div
              className={`relative h-full w-full rounded-xl transition-all duration-300 ${
                scannedSuccess
                  ? "border-2 border-emerald-500 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                  : "border border-white/20 bg-black/10"
              }`}
            >
              {/* Corner brackets */}
              <div
                className={`absolute -top-1 -left-1 h-6 w-6 rounded-tl-md border-t-3 border-l-3 transition-colors ${
                  scannedSuccess ? "border-emerald-400" : "border-orange-500"
                }`}
              />
              <div
                className={`absolute -top-1 -right-1 h-6 w-6 rounded-tr-md border-t-3 border-r-3 transition-colors ${
                  scannedSuccess ? "border-emerald-400" : "border-orange-500"
                }`}
              />
              <div
                className={`absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-md border-b-3 border-l-3 transition-colors ${
                  scannedSuccess ? "border-emerald-400" : "border-orange-500"
                }`}
              />
              <div
                className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-br-md border-b-3 border-r-3 transition-colors ${
                  scannedSuccess ? "border-emerald-400" : "border-orange-500"
                }`}
              />

              {/* Scanning laser line indicator */}
              {!scannedSuccess && (
                <div className="absolute inset-x-2 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_10px_rgba(249,115,22,0.8)] top-1/2 -translate-y-1/2" />
              )}

              {/* Success Badge */}
              {scannedSuccess && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-950/60 backdrop-blur-xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-lg shadow-md animate-bounce">
                    ✓
                  </div>
                  <span className="text-[11px] font-bold text-emerald-300">
                    QR Verified
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Guidance Pill */}
          <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center">
            <span className="rounded-full bg-black/75 px-3 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md shadow-sm border border-white/10">
              Align QR code inside square
            </span>
          </div>
        </div>
      ) : null}

      {/* Last Scanned Preview */}
      {lastScannedCode && (
        <div className="rounded-lg border border-border/80 bg-surface/50 px-3 py-1.5 text-center">
          <p className="text-[10px] text-text-dim">Last detected QR:</p>
          <p className="font-mono text-xs font-semibold text-text truncate">
            {lastScannedCode}
          </p>
        </div>
      )}

      {/* Error or Help Text */}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
          <p className="font-semibold">Camera Notice</p>
          <p className="mt-0.5 text-[11px] opacity-90">{error}</p>
        </div>
      ) : (
        <p className="text-[11px] text-text-mute">
          Position the student&apos;s registration QR code inside the square frame. Or type/paste the code below.
        </p>
      )}
    </div>
  );
}
