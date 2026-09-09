import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--charcoal-900,#0e0e10)] text-white px-6 py-12 selection:bg-orange-500/30">
      <div className="w-full max-w-md text-center">
        {/* Terminal / Status Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 text-[11px] font-mono tracking-wider text-red-400 mb-6">
          <ShieldAlert size={13} className="text-red-400" />
          HTTP 404 · NOT FOUND / EXPIRED
        </div>

        {/* 404 Display */}
        <h1 className="font-[family-name:var(--font-mono,monospace)] text-6xl sm:text-7xl font-extrabold tracking-tight text-white/90 mb-2">
          404
        </h1>

        <h2 className="font-[family-name:var(--font-display,sans-serif)] text-xl sm:text-2xl font-bold text-white mb-3">
          Link Expired or Not Found
        </h2>

        <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto mb-8">
          This referral or invite link is expired, revoked, or no longer exists.
          Please request a fresh link from your campus coordinator or peer.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="orange" className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold gap-2">
              <Home size={14} />
              Go to Home
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold gap-2 border-white/10 hover:bg-white/5 text-white/80">
              <KeyRound size={14} />
              Sign In
            </Button>
          </Link>
        </div>

        {/* Footer info */}
        <p className="mt-12 text-[11px] font-mono text-white/20">
          Elevates OS · Campus Operating System
        </p>
      </div>
    </div>
  );
}
