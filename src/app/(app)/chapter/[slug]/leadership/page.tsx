"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChapterVolunteerTeamPage from "../volunteer-team/page";

export default function ChapterLeadershipRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/chapter/${slug}/volunteer-team`);
  }, [slug, router]);

  return <ChapterVolunteerTeamPage params={params} />;
}
