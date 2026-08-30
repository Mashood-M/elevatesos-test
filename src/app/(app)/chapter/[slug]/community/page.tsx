"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChapterCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/chapter/${slug}`);
  }, [router, slug]);

  return null;
}
