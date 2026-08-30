"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HqReferralsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/referrals");
  }, [router]);

  return (
    <div className="py-12 text-center text-sm text-text-mute animate-pulse">
      Redirecting to Referrals & Invites…
    </div>
  );
}
