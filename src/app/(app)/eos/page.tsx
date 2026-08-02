"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlaybookContent } from "@/components/domain/playbook-content";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useStore } from "@/context/store-context";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";

export default function PlaybookPage() {
  const router = useRouter();
  const { store } = useStore();
  const roleKey = store.session.roleKey;
  const hq = isHqRole(roleKey);

  useEffect(() => {
    if (hq) router.replace("/hq/playbook");
  }, [hq, router]);

  if (hq) {
    return (
      <p className="text-[13px] text-text-mute">Opening HQ Playbook…</p>
    );
  }

  const boardEyebrow =
    isExecutiveRole(roleKey) || isFacultyRole(roleKey) ? "More" : "Explore";

  return (
    <div>
      <PageHeader
        eyebrow={boardEyebrow}
        title="Playbook"
        description="How to start and sustain a chapter — open community, talent discovery, clusters, build-first culture, student leadership. Faculty is optional."
        actions={
          <Link href="/join">
            <Button type="button" variant="orange">
              Join a chapter
            </Button>
          </Link>
        }
      />
      <PlaybookContent variant="community" />
    </div>
  );
}
