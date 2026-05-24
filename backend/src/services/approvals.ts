import { randomUUID } from "node:crypto";
import type { CreateTransferInput } from "./wallet-service.js";

// DEMO governance layer: above-threshold transfers are held here for a second
// actor to approve before they are ever sent to Fireblocks. This demonstrates
// segregation of duties at the application tier. In production the authoritative
// enforcement is the Fireblocks Transaction Authorization Policy (TAP) + roles.

export type ApprovalState = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface Approval {
  id: string;
  input: CreateTransferInput;
  requestedByRole: string;
  state: ApprovalState;
  createdAt: number;
  txId?: string;
  decidedByRole?: string;
}

const approvals = new Map<string, Approval>();

export function enqueue(input: CreateTransferInput, requestedByRole: string): Approval {
  const approval: Approval = {
    id: randomUUID(),
    input,
    requestedByRole,
    state: "PENDING_APPROVAL",
    createdAt: Date.now(),
  };
  approvals.set(approval.id, approval);
  return approval;
}

export function listPending(): Approval[] {
  return [...approvals.values()]
    .filter((a) => a.state === "PENDING_APPROVAL")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function get(id: string): Approval | undefined {
  return approvals.get(id);
}

export function markApproved(id: string, txId: string, decidedByRole: string) {
  const a = approvals.get(id);
  if (a) {
    a.state = "APPROVED";
    a.txId = txId;
    a.decidedByRole = decidedByRole;
  }
}

export function markRejected(id: string, decidedByRole: string) {
  const a = approvals.get(id);
  if (a) {
    a.state = "REJECTED";
    a.decidedByRole = decidedByRole;
  }
}
