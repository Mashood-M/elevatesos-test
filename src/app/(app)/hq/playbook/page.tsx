"use client";

import Link from "next/link";
import { PlaybookContent } from "@/components/domain/playbook-content";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function HqPlaybookPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Playbook"
        description="Chapter doctrine — open community, talent discovery, clusters, build-first culture, and student leadership. Faculty is optional."
        actions={
          <Link href="/hq/guidelines">
            <Button type="button" variant="ghost">
              Policies &amp; guidelines
            </Button>
          </Link>
        }
      />
      <PlaybookContent variant="hq" />
    </div>
  );
}
