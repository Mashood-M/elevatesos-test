"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    function handleOnline() {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOffline(true);
      setShowReconnected(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none transition-all animate-in fade-in slide-in-from-top-3">
      {isOffline && (
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-amber-950/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-amber-200 shadow-xl shadow-amber-950/40">
          <WifiOff size={15} className="text-amber-400 shrink-0 animate-pulse" />
          <span>You are currently offline. Working with active session.</span>
        </div>
      )}

      {!isOffline && showReconnected && (
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-emerald-500/40 bg-emerald-950/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-emerald-200 shadow-xl shadow-emerald-950/40">
          <Wifi size={15} className="text-emerald-400 shrink-0" />
          <span>Back online — Session re-synchronized</span>
        </div>
      )}
    </div>
  );
}
