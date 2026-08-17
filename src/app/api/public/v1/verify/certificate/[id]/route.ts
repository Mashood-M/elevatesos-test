import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createServiceClient();
  if (!admin) return jsonError("Service unavailable", 503);

  const { data, error } = await admin.rpc("verify_certificate", {
    cert_id: id,
  });

  if (error) return jsonError(error.message, 500);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return jsonError("Certificate not found", 404);

  return jsonOk({
    certificateId: row.certificate_id,
    holder: row.holder,
    eventTitle: row.event_title,
    issuedAt: row.issued_at,
    chapterName: row.chapter_name,
    valid: true,
  });
}
