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
  const [camRes, setCamRes] = useState<string>("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [supportsZoom, setSupportsZoom] = useState(false);

  const lastRef = useRef("");
  const cooldownUntilRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  onScanRef.current = onScan;

  // Refresh list of available cameras
  const updateDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(cameras);
    } catch {
      /* Device enumeration optional */
    }
  }, []);

  useEffect(() => {
    void updateDeviceList();
  }, [updateDeviceList]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamRes("");
    setSupportsZoom(false);
  }, []);

  // Zoom toggler (e.g. 1x -> 2x for scanning from a distance)
  const toggleZoom = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities.zoom) {
        const nextZoom = zoomLevel === 1 ? Math.min(2, capabilities.zoom.max || 2) : 1;
        await (track as any).applyConstraints({
          advanced: [{ zoom: nextZoom }],
        });
        setZoomLevel(nextZoom);
      }
    } catch {
      /* Zoom constraint optional */
    }
  }, [zoomLevel]);

  // Main camera start & scanning loop
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

      // Build video constraint: prefer selectedDeviceId if user switched, else ideal facingMode
      const videoConstraint: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });
      } catch (errFirst) {
        try {
          // Fallback: relax resolution & deviceId, keep facingMode ideal (always prefer rear camera)
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
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

      // After permission is granted, refresh device list to get real camera labels
      void updateDeviceList();

      // Configure video track (autofocus & zoom capability)
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
          if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "continuous" } as any],
            });
          }
          if (capabilities.zoom && capabilities.zoom.max > 1) {
            setSupportsZoom(true);
            setZoomLevel(1);
          }
        }
      } catch {
        /* Track constraints optional */
      }

      streamRef.current = stream;
      const video = videoRef.current;

      // Configure video element for mobile browser autoplay
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("autoplay", "true");

      video.onloadedmetadata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setCamRes(`${video.videoWidth}×${video.videoHeight}`);
        }
      };

      video.srcObject = stream;

      try {
        await video.play();
      } catch {
        /* Autoplay handled */
      }

      // Initialize native BarcodeDetector if available
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

      // Pre-allocated static canvases:
      // 1. Center reticle canvas (480x480) - high-resolution zoom into the viewfinder square
      const centerCanvas = document.createElement("canvas");
      centerCanvas.width = 480;
      centerCanvas.height = 480;
      const centerCtx = centerCanvas.getContext("2d", { willReadFrequently: true });

      // 2. Full frame canvas (scaled to max 480px width) - catches QR codes held anywhere in frame
      const fullCanvas = document.createElement("canvas");
      let fullConfigured = false;
      const fullCtx = fullCanvas.getContext("2d", { willReadFrequently: true });

      let isScanning = false;
      let frameCounter = 0;

      const scanFrame = async () => {
        if (cancelled || !videoRef.current) return;

        if (!isScanning && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const now = Date.now();
          if (now >= cooldownUntilRef.current) {
            isScanning = true;
            try {
              let detectedCode: string | null = null;
              const vw = video.videoWidth;
              const vh = video.videoHeight;

              // Ensure fullCanvas dimensions are established once
              if (!fullConfigured && fullCtx) {
                const targetW = 480;
                const targetH = Math.round((vh * 480) / vw);
                fullCanvas.width = targetW;
                fullCanvas.height = targetH;
                fullConfigured = true;
              }

              // Scan Phase A: Center Viewfinder Reticle (exact square user sees)
              if (centerCtx) {
                const cropSize = Math.min(vw, vh);
                const cropX = Math.floor((vw - cropSize) / 2);
                const cropY = Math.floor((vh - cropSize) / 2);
                centerCtx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, 480, 480);

                // Check with native BarcodeDetector on canvas first if available
                if (nativeDetector) {
                  try {
                    const barcodes = await nativeDetector.detect(centerCanvas);
                    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                      detectedCode = barcodes[0].rawValue.trim();
                    }
                  } catch {
                    /* fallback to jsQR */
                  }
                }

                // High-performance jsQR check
                if (!detectedCode) {
                  const imgData = centerCtx.getImageData(0, 0, 480, 480);
                  const qrRes = jsQR(imgData.data, 480, 480, {
                    inversionAttempts: "attemptBoth",
                  });
                  if (qrRes && qrRes.data) {
                    detectedCode = qrRes.data.trim();
                  }
                }
              }

              // Scan Phase B: Full Camera Frame (every 2nd frame if center did not detect)
              if (!detectedCode && fullCtx && fullCanvas.width > 0 && frameCounter % 2 === 0) {
                fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);

                if (nativeDetector) {
                  try {
                    const barcodes = await nativeDetector.detect(fullCanvas);
                    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                      detectedCode = barcodes[0].rawValue.trim();
                    }
                  } catch {
                    /* fallback to jsQR */
                  }
                }

                if (!detectedCode) {
                  const fullImg = fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height);
                  const fullRes = jsQR(fullImg.data, fullCanvas.width, fullCanvas.height, {
                    inversionAttempts: "dontInvert",
                  });
                  if (fullRes && fullRes.data) {
                    detectedCode = fullRes.data.trim();
                  }
                }
              }

              frameCounter++;

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
            } finally {
              isScanning = false;
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
  }, [active, running, disabled, facingMode, selectedDeviceId, stopStream, updateDeviceList]);

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

  // Cycle through available cameras if multiple exist
  const cycleCamera = () => {
    if (videoDevices.length <= 1) {
      setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
      return;
    }
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    if (nextDevice) {
      setSelectedDeviceId(nextDevice.deviceId);
    }
  };

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

        {running && (
          <div className="flex items-center gap-1.5">
            {/* Zoom Button (if supported by phone lens) */}
            {supportsZoom && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2.5 text-[11px] font-mono border border-border/70 text-text hover:text-[var(--accent)]"
                onClick={toggleZoom}
                title="Toggle 1x / 2x Zoom"
              >
                {zoomLevel === 1 ? "1x" : "2x"} Zoom
              </Button>
            )}

            {/* Switch Camera / Lens */}
            {videoDevices.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2.5 text-[11px] border border-border/70 text-text-dim hover:text-text"
                onClick={cycleCamera}
                title="Switch camera lens"
              >
                ⇄ Switch Lens
              </Button>
            )}
          </div>
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
              Center QR code • Hold 15-25cm away
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
