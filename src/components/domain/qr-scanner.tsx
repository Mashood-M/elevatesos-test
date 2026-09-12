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
  const [camRes, setCamRes] = useState<string>("");

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
    setCamRes("");
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
        // Try requested facingMode with crisp resolution & continuous autofocus
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
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

      // Try enabling continuous autofocus on supported mobile lenses
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as {
            focusMode?: string[];
          };
          if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "continuous" } as any],
            });
          }
        }
      } catch {
        /* Focus constraint optional */
      }

      streamRef.current = stream;
      const video = videoRef.current;

      // Ensure explicit DOM properties for mobile browser autoplay
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("autoplay", "true");
      video.srcObject = stream;

      try {
        await video.play();
      } catch {
        /* Autoplay handled */
      }

      // Check for native BarcodeDetector support (hardware accelerated on Android/iOS 17+)
      let nativeDetector: any = null;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const formats = await (window as any).BarcodeDetector.getSupportedFormats();
          if (formats && formats.includes("qr_code")) {
            nativeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
          }
        } catch {
          nativeDetector = null;
        }
      }

      // Offscreen canvas for scanning center reticle square
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const scanFrame = async () => {
        if (cancelled || !videoRef.current) return;

        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          if (!camRes) {
            setCamRes(`${video.videoWidth}×${video.videoHeight}`);
          }

          const now = Date.now();
          if (now >= cooldownUntilRef.current) {
            let detectedCode: string | null = null;

            // 1. Try Hardware-Accelerated Native BarcodeDetector first
            if (nativeDetector) {
              try {
                const barcodes = await nativeDetector.detect(video);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  detectedCode = barcodes[0].rawValue.trim();
                }
              } catch {
                /* fallback to jsQR */
              }
            }

            // 2. High-Resolution 1:1 Center-Square Sampling with jsQR
            if (!detectedCode && ctx) {
              try {
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                // Calculate square area matching the visible viewfinder
                const cropSize = Math.min(vw, vh);
                const cropX = Math.floor((vw - cropSize) / 2);
                const cropY = Math.floor((vh - cropSize) / 2);

                // Sample square at sharp resolution (capped at 720px for optimal speed & module separation)
                const targetSize = Math.min(cropSize, 720);
                canvas.width = targetSize;
                canvas.height = targetSize;

                // Draw center square crop
                ctx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, targetSize, targetSize);

                const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
                const qrRes = jsQR(imgData.data, targetSize, targetSize, {
                  inversionAttempts: "attemptBoth",
                });

                if (qrRes && qrRes.data) {
                  detectedCode = qrRes.data.trim();
                } else if (cropSize > 600) {
                  // Fallback: Full frame scan if student held QR slightly outside center square
                  const fullMax = 640;
                  let fw = vw;
                  let fh = vh;
                  if (fw > fullMax || fh > fullMax) {
                    if (fw > fh) {
                      fh = Math.round((fh * fullMax) / fw);
                      fw = fullMax;
                    } else {
                      fw = Math.round((fw * fullMax) / fh);
                      fh = fullMax;
                    }
                  }
                  canvas.width = fw;
                  canvas.height = fh;
                  ctx.drawImage(video, 0, 0, fw, fh);
                  const fullImg = ctx.getImageData(0, 0, fw, fh);
                  const fullRes = jsQR(fullImg.data, fw, fh, { inversionAttempts: "dontInvert" });
                  if (fullRes && fullRes.data) {
                    detectedCode = fullRes.data.trim();
                  }
                }
              } catch {
                /* Per-frame catch */
              }
            }

            // Handle successful code recognition
            if (detectedCode && detectedCode !== lastRef.current) {
              lastRef.current = detectedCode;
              cooldownUntilRef.current = now + COOLDOWN_MS;

              setLastScannedCode(detectedCode);
              setScannedSuccess(true);
              playSuccessBeep();

              try {
                navigator.vibrate?.([60, 40, 60]);
              } catch {
                /* Vibration optional */
              }

              onScanRef.current(detectedCode);

              window.setTimeout(() => {
                setScannedSuccess(false);
              }, 800);

              window.setTimeout(() => {
                if (lastRef.current === detectedCode) {
                  lastRef.current = "";
                }
              }, COOLDOWN_MS);
            }
          }
        }

        if (!cancelled) {
          rafId = requestAnimationFrame(scanFrame);
        }
      };

      rafId = requestAnimationFrame(scanFrame);
    }

    void startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stopStream();
    };
  }, [active, running, disabled, facingMode, stopStream, camRes]);

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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={running ? "ghost" : "orange"}
            disabled={disabled}
            onClick={() => setRunning((v) => !v)}
            className="h-9 px-4 text-xs font-semibold"
          >
            {running ? "■ Stop Camera" : "📷 Start Camera Scan"}
          </Button>

          {running && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live {camRes ? `(${camRes})` : ""}</span>
            </span>
          )}
        </div>

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
        <div className="relative mx-auto w-full max-w-[320px] aspect-square overflow-hidden rounded-2xl border-2 border-border bg-neutral-950 shadow-lg">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-950/70 backdrop-blur-xs">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xl shadow-md animate-bounce">
                    ✓
                  </div>
                  <span className="text-xs font-bold text-emerald-300">
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
        <div className="rounded-lg border border-border/80 bg-bg-panel px-3 py-1.5 text-center">
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
