import type { DatabaseClient } from "@/lib/db/query";

export async function logAudit(
  db: DatabaseClient,
  orgId: string,
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, any>
) {
  try {
    await db.from("audit_logs").insert([
      {
        org_id: orgId,
        actor_id: actorId,
        action,
        entity,
        entity_id: entityId ?? null,
        metadata: metadata ?? null,
      },
    ]);
  } catch (error) {
    console.error("Audit log insert failed", error);
  }
}
