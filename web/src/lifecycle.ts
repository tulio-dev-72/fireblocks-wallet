// Maps real Fireblocks transaction status/subStatus onto a visible lifecycle.
// The stages are the canonical Fireblocks journey; we light them up based on the
// furthest real status observed — nothing here is faked.
export const STAGES = [
  { key: "submitted", label: "Submitted", hint: "Transaction created via API" },
  { key: "screening", label: "Screening", hint: "AML / compliance checks" },
  { key: "authorization", label: "Approval & Signing", hint: "Policy approval + MPC signing" },
  { key: "broadcasting", label: "Broadcasting", hint: "Sent to the blockchain" },
  { key: "completed", label: "Completed", hint: "Confirmed on-chain" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

const STATUS_TO_STAGE: Record<string, StageKey> = {
  SUBMITTED: "submitted",
  PENDING_AML_SCREENING: "screening",
  PENDING_ENRICHMENT: "screening",
  PENDING_AUTHORIZATION: "authorization",
  PENDING_SIGNATURE: "authorization",
  PENDING_3RD_PARTY_MANUAL_APPROVAL: "authorization",
  PENDING_3RD_PARTY: "authorization",
  QUEUED: "broadcasting",
  BROADCASTING: "broadcasting",
  CONFIRMING: "broadcasting",
  COMPLETED: "completed",
};

export const FAILURE = ["FAILED", "REJECTED", "CANCELLED", "BLOCKED"];

export function stageIndexForStatus(status: string): number {
  const stage = STATUS_TO_STAGE[status];
  if (!stage) return 0;
  return STAGES.findIndex((s) => s.key === stage);
}

export function isTerminal(status: string): boolean {
  return status === "COMPLETED" || FAILURE.includes(status);
}

export function isFailure(status: string): boolean {
  return FAILURE.includes(status);
}
