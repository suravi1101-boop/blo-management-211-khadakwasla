import { createActor } from "@/backend";

// Internal helper to get actor instance — only used inside this service via hooks.
// For direct (non-hook) service calls, callers must pass a pre-resolved actor.

/**
 * Deletes all BLOs belonging to the given constituency.
 * Wraps actor.deleteBLOsByConstituency(constituencyId).
 */
export async function deleteBLOsByConstituency(
  actor: Awaited<ReturnType<typeof createActor>>,
  constituencyId: string,
): Promise<boolean> {
  return (actor as any).deleteBLOsByConstituency(constituencyId);
}

/**
 * Records a deletion event for audit/history purposes.
 * Wraps actor.recordDeletion(recordType, recordName, deletedBy, reason).
 */
export async function recordDeletion(
  actor: Awaited<ReturnType<typeof createActor>>,
  recordType: string,
  recordName: string,
  deletedBy: string,
  reason: string,
): Promise<void> {
  return (actor as any).recordDeletion(
    recordType,
    recordName,
    deletedBy,
    reason,
  );
}

/**
 * Returns the full deletion history log.
 * Wraps actor.getDeleteHistory().
 * Each entry is a tuple: [recordType, recordName, deletedBy, reason, timestamp (bigint)]
 */
export async function getDeleteHistory(
  actor: Awaited<ReturnType<typeof createActor>>,
): Promise<Array<[string, string, string, string, bigint]>> {
  return (actor as any).getDeleteHistory();
}

export { createActor };
