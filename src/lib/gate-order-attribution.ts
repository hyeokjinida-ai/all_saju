import { createServiceClient } from "@/lib/supabase/server";
import { gateProps, readGateAssignment } from "@/lib/gate-experiment";
import { worldOfSlug } from "@/lib/world";

// Link only an order successfully created by our server. Payment amounts/statuses are never changed.
export async function recordGateOrder(token: string | undefined, orderId: string, slug: string) {
  if (worldOfSlug(slug) !== "sangun") return;
  const assignment = readGateAssignment(token);
  if (!assignment) return;
  try {
    const { error } = await createServiceClient().from("analytics_events").insert({
      event: "gate_order_link", path: "/api/orders/create", visitor_id: assignment.subject,
      props: { ...gateProps(assignment), orderId, slug, source: "server" },
    }).abortSignal(AbortSignal.timeout(1500));
    if (error) console.error("Gate order attribution unavailable", { code: error.code });
  } catch { console.error("Gate order attribution unavailable"); }
}
