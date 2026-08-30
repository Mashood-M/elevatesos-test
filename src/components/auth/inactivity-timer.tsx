"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/context/store-context";
import { createClient } from "@/lib/supabase/client";
import { Clock, LogOut } from "lucide-react";

// 10 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const STORAGE_KEY = "elevates_last_active_timestamp";

export function InactivityTimer() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useCurrentUser();
  const [showModal, setShowModal] = useState(false);
  const lastThrottleRef = useRef<number>(Date.now());

  // Check if user is on a public/auth route where inactivity logout should be disabled
  const isAuthPage =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/join");

  const isAuthenticated = Boolean(session.userId || session.authUserId) && !isAuthPage;

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize last active timestamp
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));

    // Event listener to record user activity with throttling (max 1 update per 2 seconds)
    function handleUserActivity() {
      const currentMs = Date.now();
      if (currentMs - lastThrottleRef.current > 2000) {
        lastThrottleRef.current = currentMs;
        localStorage.setItem(STORAGE_KEY, String(currentMs));
      }
    }

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Interval to check for inactivity every 5 seconds
    const checkInterval = setInterval(async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const lastActive = stored ? parseInt(stored, 10) : Date.now();
      const elapsed = Date.now() - lastActive;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(checkInterval);

        // Perform sign out
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch (err) {
          console.error("Inactivity sign out error:", err);
        }

        // Reset storage timestamp and open modal
        localStorage.removeItem(STORAGE_KEY);
        setShowModal(true);
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isAuthenticated]);

  function handleReLogin() {
    setShowModal(false);
    window.location.href = "/login?reason=inactivity";
  }

  if (!showModal) return null;

  return (
    <Dialog
      open={showModal}
      onClose={handleReLogin}
      title="Session Expired"
      description="You have been logged out due to 10 minutes of inactivity."
      className="max-w-md"
    >
      <div className="space-y-4 pt-1">
        <div className="rounded-[12px] border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text">Inactivity Timeout</p>
                <Badge tone="orange">10 Mins Idle</Badge>
              </div>
              <p className="text-xs text-text-dim mt-1 leading-relaxed">
                For security reasons, your Elevates OS session was automatically closed because no activity was detected for 10 minutes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="orange"
            className="w-full h-10 text-[13px] font-semibold"
            onClick={handleReLogin}
          >
            <LogOut size={16} className="mr-1.5" />
            Sign In Again
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
