import { createServiceClient } from "@/lib/supabase/server";
import { gateProps, readGateAssignment } from "@/lib/gate-experiment";
import { worldOfSlug } from "@/lib/world";
import { detailProps, readDetailAssignment } from "@/lib/detail-experiment";

// Link only an order successfully created by our server. Payment amounts/statuses are never changed.
export async function recordGateOrder(token: string | undefined, orderId: string, slug: string, detailToken?: string) {
  if (worldOfSlug(slug) !== "sangun") return;
  const assignment = readGateAssignment(token);
  const detail = readDetailAssignment(detailToken);
  if (!assignment && !detail) return;
  try {
    const common = { path: "/api/orders/create", props: {
      ...(assignment ? gateProps(assignment) : {}), ...(detail ? detailProps(detail) : {}),
      qa: assignment?.qa === true || detail?.qa === true || process.env.VERCEL_ENV === "preview",
      orderId, slug, source: "server",
    } };
    const rows = [
      ...(assignment ? [{ ...common, event: "gate_order_link", visitor_id: assignment.subject }] : []),
      ...(detail ? [{ ...common, event: "detail_order_link", visitor_id: detail.subject }] : []),
    ];
    const { error } = await createServiceClient().from("analytics_events").insert(rows).abortSignal(AbortSignal.timeout(1500));
    if (error) console.error("Gate order attribution unavailable", { code: error.code });
  } catch { console.error("Gate order attribution unavailable"); }
}
